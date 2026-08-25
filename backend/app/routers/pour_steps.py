from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db

router = APIRouter()


def _get_recipe_or_404(recipe_id: int, db: Session) -> models.Recipe:
    recipe = db.get(models.Recipe, recipe_id)
    if recipe is None:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return recipe


def _get_step_or_404(recipe_id: int, step_id: int, db: Session) -> models.PourStep:
    step = (
        db.query(models.PourStep)
        .filter(models.PourStep.id == step_id, models.PourStep.recipe_id == recipe_id)
        .first()
    )
    if step is None:
        raise HTTPException(status_code=404, detail="Pour step not found")
    return step


@router.get("/{recipe_id}/pour-steps", response_model=list[schemas.PourStepOut])
def list_pour_steps(recipe_id: int, db: Session = Depends(get_db)):
    _get_recipe_or_404(recipe_id, db)
    return (
        db.query(models.PourStep)
        .filter(models.PourStep.recipe_id == recipe_id)
        .order_by(models.PourStep.step_order, models.PourStep.id)
        .all()
    )


@router.post("/{recipe_id}/pour-steps", response_model=schemas.PourStepOut, status_code=201)
def create_pour_step(
    recipe_id: int, payload: schemas.PourStepCreate, db: Session = Depends(get_db)
):
    _get_recipe_or_404(recipe_id, db)
    data = payload.model_dump()
    if data.get("step_order") is None:
        max_order = (
            db.query(models.PourStep.step_order)
            .filter(models.PourStep.recipe_id == recipe_id)
            .order_by(models.PourStep.step_order.desc())
            .first()
        )
        data["step_order"] = (max_order[0] + 1) if max_order else 0
    step = models.PourStep(recipe_id=recipe_id, **data)
    db.add(step)
    db.commit()
    db.refresh(step)
    return step


@router.put("/{recipe_id}/pour-steps/{step_id}", response_model=schemas.PourStepOut)
def update_pour_step(
    recipe_id: int,
    step_id: int,
    payload: schemas.PourStepUpdate,
    db: Session = Depends(get_db),
):
    step = _get_step_or_404(recipe_id, step_id, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(step, field, value)
    db.commit()
    db.refresh(step)
    return step


@router.delete("/{recipe_id}/pour-steps/{step_id}", status_code=204)
def delete_pour_step(recipe_id: int, step_id: int, db: Session = Depends(get_db)):
    step = _get_step_or_404(recipe_id, step_id, db)
    db.delete(step)
    db.commit()
