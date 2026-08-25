from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db

router = APIRouter()


@router.get("", response_model=list[schemas.RecipeOut])
def list_recipes(db: Session = Depends(get_db)):
    return db.query(models.Recipe).order_by(models.Recipe.created_at.desc()).all()


@router.post("", response_model=schemas.RecipeDetailOut, status_code=201)
def create_recipe(payload: schemas.RecipeCreate, db: Session = Depends(get_db)):
    data = payload.model_dump(exclude={"pour_steps"})
    recipe = models.Recipe(**data)
    for index, step in enumerate(payload.pour_steps):
        step_data = step.model_dump()
        if step_data.get("step_order") is None:
            step_data["step_order"] = index
        recipe.pour_steps.append(models.PourStep(**step_data))
    db.add(recipe)
    db.commit()
    db.refresh(recipe)
    return recipe


def _get_recipe_or_404(recipe_id: int, db: Session) -> models.Recipe:
    recipe = db.get(models.Recipe, recipe_id)
    if recipe is None:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return recipe


@router.get("/{recipe_id}", response_model=schemas.RecipeDetailOut)
def get_recipe(recipe_id: int, db: Session = Depends(get_db)):
    return _get_recipe_or_404(recipe_id, db)


@router.put("/{recipe_id}", response_model=schemas.RecipeDetailOut)
def update_recipe(recipe_id: int, payload: schemas.RecipeUpdate, db: Session = Depends(get_db)):
    recipe = _get_recipe_or_404(recipe_id, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(recipe, field, value)
    db.commit()
    db.refresh(recipe)
    return recipe


@router.delete("/{recipe_id}", status_code=204)
def delete_recipe(recipe_id: int, db: Session = Depends(get_db)):
    recipe = _get_recipe_or_404(recipe_id, db)
    db.delete(recipe)
    db.commit()
