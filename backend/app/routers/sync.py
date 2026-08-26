from datetime import UTC, datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import get_current_user
from app.database import get_db

router = APIRouter()


def _upsert_recipe(db: Session, user: models.User, item: schemas.RecipeSyncItem) -> bool:
    recipe = (
        db.query(models.Recipe)
        .filter(models.Recipe.public_id == item.id, models.Recipe.user_id == user.id)
        .first()
    )
    data = item.model_dump(exclude={"id", "created_at"})
    if recipe is None:
        db.add(
            models.Recipe(public_id=item.id, user_id=user.id, created_at=item.created_at, **data)
        )
        return True
    for field, value in data.items():
        setattr(recipe, field, value)
    return False


def _upsert_pour_step(
    db: Session, user: models.User, item: schemas.PourStepSyncItem
) -> bool | None:
    recipe = (
        db.query(models.Recipe)
        .filter(models.Recipe.public_id == item.recipe_id, models.Recipe.user_id == user.id)
        .first()
    )
    if recipe is None:
        return None
    step = (
        db.query(models.PourStep)
        .join(models.Recipe, models.PourStep.recipe_id == models.Recipe.id)
        .filter(models.PourStep.public_id == item.id, models.Recipe.user_id == user.id)
        .first()
    )
    data = item.model_dump(exclude={"id", "recipe_id"})
    if step is None:
        db.add(models.PourStep(public_id=item.id, recipe_id=recipe.id, **data))
        return True
    for field, value in data.items():
        setattr(step, field, value)
    return False


def _upsert_brew_log(db: Session, user: models.User, item: schemas.BrewLogSyncItem) -> bool | None:
    recipe = (
        db.query(models.Recipe)
        .filter(models.Recipe.public_id == item.recipe_id, models.Recipe.user_id == user.id)
        .first()
    )
    if recipe is None:
        return None
    log = (
        db.query(models.BrewLog)
        .join(models.Recipe, models.BrewLog.recipe_id == models.Recipe.id)
        .filter(models.BrewLog.public_id == item.id, models.Recipe.user_id == user.id)
        .first()
    )
    data = item.model_dump(exclude={"id", "recipe_id"})
    if log is None:
        db.add(models.BrewLog(public_id=item.id, recipe_id=recipe.id, **data))
        return True
    for field, value in data.items():
        setattr(log, field, value)
    return False


def _soft_delete_recipe(db: Session, user: models.User, public_id: str) -> bool:
    recipe = (
        db.query(models.Recipe)
        .filter(models.Recipe.public_id == public_id, models.Recipe.user_id == user.id)
        .first()
    )
    if recipe is None:
        return False
    now = datetime.now(UTC)
    setattr(recipe, "deleted_at", now)  # noqa: B010 -- ty misreads Column[] attrs on direct assign
    db.query(models.PourStep).filter(models.PourStep.recipe_id == recipe.id).update(
        {"deleted_at": now}
    )
    db.query(models.BrewLog).filter(models.BrewLog.recipe_id == recipe.id).update(
        {"deleted_at": now}
    )
    return True


def _soft_delete_pour_step(db: Session, user: models.User, public_id: str) -> bool:
    step = (
        db.query(models.PourStep)
        .join(models.Recipe, models.PourStep.recipe_id == models.Recipe.id)
        .filter(models.PourStep.public_id == public_id, models.Recipe.user_id == user.id)
        .first()
    )
    if step is None:
        return False
    setattr(step, "deleted_at", datetime.now(UTC))  # noqa: B010 -- see _soft_delete_recipe
    return True


def _soft_delete_brew_log(db: Session, user: models.User, public_id: str) -> bool:
    log = (
        db.query(models.BrewLog)
        .join(models.Recipe, models.BrewLog.recipe_id == models.Recipe.id)
        .filter(models.BrewLog.public_id == public_id, models.Recipe.user_id == user.id)
        .first()
    )
    if log is None:
        return False
    setattr(log, "deleted_at", datetime.now(UTC))  # noqa: B010 -- see _soft_delete_recipe
    return True


@router.post("/push", response_model=schemas.SyncPushResponse)
def push(
    payload: schemas.SyncPushRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    recipes_upserted = sum(_upsert_recipe(db, current_user, item) for item in payload.recipes)
    db.flush()  # newly-created recipes must be visible to pour_step/brew_log parent lookups below
    pour_steps_upserted = sum(
        bool(_upsert_pour_step(db, current_user, item)) for item in payload.pour_steps
    )
    brew_logs_upserted = sum(
        bool(_upsert_brew_log(db, current_user, item)) for item in payload.brew_logs
    )
    pour_steps_deleted = sum(
        _soft_delete_pour_step(db, current_user, public_id)
        for public_id in payload.pour_steps_deleted
    )
    brew_logs_deleted = sum(
        _soft_delete_brew_log(db, current_user, public_id)
        for public_id in payload.brew_logs_deleted
    )
    recipes_deleted = sum(
        _soft_delete_recipe(db, current_user, public_id) for public_id in payload.recipes_deleted
    )
    db.commit()
    return schemas.SyncPushResponse(
        recipes_upserted=recipes_upserted,
        recipes_deleted=recipes_deleted,
        pour_steps_upserted=pour_steps_upserted,
        pour_steps_deleted=pour_steps_deleted,
        brew_logs_upserted=brew_logs_upserted,
        brew_logs_deleted=brew_logs_deleted,
    )


@router.get("/pull", response_model=schemas.SyncPullResponse)
def pull(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    recipes = (
        db.query(models.Recipe)
        .filter(models.Recipe.user_id == current_user.id, models.Recipe.deleted_at.is_(None))
        .all()
    )
    pour_steps = (
        db.query(models.PourStep)
        .join(models.Recipe, models.PourStep.recipe_id == models.Recipe.id)
        .filter(
            models.Recipe.user_id == current_user.id,
            models.Recipe.deleted_at.is_(None),
            models.PourStep.deleted_at.is_(None),
        )
        .all()
    )
    brew_logs = (
        db.query(models.BrewLog)
        .join(models.Recipe, models.BrewLog.recipe_id == models.Recipe.id)
        .filter(
            models.Recipe.user_id == current_user.id,
            models.Recipe.deleted_at.is_(None),
            models.BrewLog.deleted_at.is_(None),
        )
        .all()
    )
    return schemas.SyncPullResponse(
        recipes=[
            schemas.RecipeSyncItem.model_validate(
                {
                    "id": r.public_id,
                    "name": r.name,
                    "bean_origin": r.bean_origin,
                    "dose_g": r.dose_g,
                    "water_ml": r.water_ml,
                    "water_temp_c": r.water_temp_c,
                    "grind_size": r.grind_size,
                    "total_time_sec": r.total_time_sec,
                    "notes": r.notes,
                    "created_at": r.created_at,
                    "updated_at": r.updated_at,
                }
            )
            for r in recipes
        ],
        pour_steps=[
            schemas.PourStepSyncItem.model_validate(
                {
                    "id": s.public_id,
                    "recipe_id": s.recipe.public_id,
                    "step_order": s.step_order,
                    "target_time_sec": s.target_time_sec,
                    "cumulative_water_ml": s.cumulative_water_ml,
                    "notes": s.notes,
                }
            )
            for s in pour_steps
        ],
        brew_logs=[
            schemas.BrewLogSyncItem.model_validate(
                {
                    "id": log.public_id,
                    "recipe_id": log.recipe.public_id,
                    "brewed_at": log.brewed_at,
                    "rating": log.rating,
                    "notes": log.notes,
                    "created_at": log.created_at,
                }
            )
            for log in brew_logs
        ],
    )
