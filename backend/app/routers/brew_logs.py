from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db

router = APIRouter()


@router.get("", response_model=list[schemas.BrewLogWithRecipeName])
def list_brew_logs(
    recipe_id: int | None = Query(default=None), db: Session = Depends(get_db)
):
    query = db.query(models.BrewLog, models.Recipe.name).join(
        models.Recipe, models.BrewLog.recipe_id == models.Recipe.id
    )
    if recipe_id is not None:
        query = query.filter(models.BrewLog.recipe_id == recipe_id)
    rows = query.order_by(models.BrewLog.brewed_at.desc()).all()
    return [
        schemas.BrewLogWithRecipeName(
            **schemas.BrewLogOut.model_validate(log).model_dump(),
            recipe_name=recipe_name,
        )
        for log, recipe_name in rows
    ]


@router.post("", response_model=schemas.BrewLogOut, status_code=201)
def create_brew_log(payload: schemas.BrewLogCreate, db: Session = Depends(get_db)):
    recipe = db.get(models.Recipe, payload.recipe_id)
    if recipe is None:
        raise HTTPException(status_code=404, detail="Recipe not found")
    log = models.BrewLog(**payload.model_dump())
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


def _get_log_or_404(log_id: int, db: Session) -> models.BrewLog:
    log = db.get(models.BrewLog, log_id)
    if log is None:
        raise HTTPException(status_code=404, detail="Brew log not found")
    return log


@router.get("/{log_id}", response_model=schemas.BrewLogOut)
def get_brew_log(log_id: int, db: Session = Depends(get_db)):
    return _get_log_or_404(log_id, db)


@router.put("/{log_id}", response_model=schemas.BrewLogOut)
def update_brew_log(
    log_id: int, payload: schemas.BrewLogUpdate, db: Session = Depends(get_db)
):
    log = _get_log_or_404(log_id, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(log, field, value)
    db.commit()
    db.refresh(log)
    return log


@router.delete("/{log_id}", status_code=204)
def delete_brew_log(log_id: int, db: Session = Depends(get_db)):
    log = _get_log_or_404(log_id, db)
    db.delete(log)
    db.commit()
