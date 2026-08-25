from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


# ---- PourStep ----


class PourStepBase(BaseModel):
    target_time_sec: int = Field(ge=0)
    cumulative_water_ml: float = Field(gt=0)
    notes: str | None = None


class PourStepCreate(PourStepBase):
    step_order: int | None = None


class PourStepUpdate(BaseModel):
    step_order: int | None = None
    target_time_sec: int | None = Field(default=None, ge=0)
    cumulative_water_ml: float | None = Field(default=None, gt=0)
    notes: str | None = None


class PourStepOut(PourStepBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    recipe_id: int
    step_order: int


# ---- Recipe ----


class RecipeBase(BaseModel):
    name: str
    bean_origin: str | None = None
    dose_g: float = Field(gt=0)
    water_ml: float = Field(gt=0)
    water_temp_c: float = Field(gt=0)
    grind_size: str | None = None
    total_time_sec: int | None = Field(default=None, ge=0)
    notes: str | None = None


class RecipeCreate(RecipeBase):
    pour_steps: list[PourStepCreate] = []


class RecipeUpdate(BaseModel):
    name: str | None = None
    bean_origin: str | None = None
    dose_g: float | None = Field(default=None, gt=0)
    water_ml: float | None = Field(default=None, gt=0)
    water_temp_c: float | None = Field(default=None, gt=0)
    grind_size: str | None = None
    total_time_sec: int | None = Field(default=None, ge=0)
    notes: str | None = None


class RecipeOut(RecipeBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class RecipeDetailOut(RecipeOut):
    pour_steps: list[PourStepOut] = []


# ---- BrewLog ----


class BrewLogBase(BaseModel):
    brewed_at: datetime
    rating: int = Field(ge=1, le=5)
    notes: str | None = None


class BrewLogCreate(BrewLogBase):
    recipe_id: int


class BrewLogUpdate(BaseModel):
    brewed_at: datetime | None = None
    rating: int | None = Field(default=None, ge=1, le=5)
    notes: str | None = None


class BrewLogOut(BrewLogBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    recipe_id: int
    created_at: datetime


class BrewLogWithRecipeName(BrewLogOut):
    recipe_name: str
