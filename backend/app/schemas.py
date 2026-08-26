from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

# ---- Sync ----
#
# Recipe/PourStep/BrewLog have no per-resource CRUD schemas or routers; the sync
# router is their only backend entry point. Field lists mirror the frontend's
# IndexedDB-backed Recipe/PourStep/BrewLog types exactly (all-string ids) so the
# client can push/pull without reshaping. `id` is always the resource's
# client-generated UUID (stored server-side as `public_id`); `recipe_id` on a
# PourStep/BrewLog always refers to the parent Recipe's `public_id`, never its
# internal integer id.


class RecipeSyncItem(BaseModel):
    id: str
    name: str
    bean_origin: str | None = None
    dose_g: float = Field(gt=0)
    water_ml: float = Field(gt=0)
    water_temp_c: float = Field(gt=0)
    grind_size: str | None = None
    total_time_sec: int | None = Field(default=None, ge=0)
    notes: str | None = None
    created_at: datetime
    updated_at: datetime


class PourStepSyncItem(BaseModel):
    id: str
    recipe_id: str
    step_order: int
    target_time_sec: int = Field(ge=0)
    cumulative_water_ml: float = Field(gt=0)
    notes: str | None = None


class BrewLogSyncItem(BaseModel):
    id: str
    recipe_id: str
    brewed_at: datetime
    rating: int = Field(ge=1, le=5)
    notes: str | None = None
    created_at: datetime


class SyncPushRequest(BaseModel):
    recipes: list[RecipeSyncItem] = []
    recipes_deleted: list[str] = []
    pour_steps: list[PourStepSyncItem] = []
    pour_steps_deleted: list[str] = []
    brew_logs: list[BrewLogSyncItem] = []
    brew_logs_deleted: list[str] = []


class SyncPushResponse(BaseModel):
    recipes_upserted: int
    recipes_deleted: int
    pour_steps_upserted: int
    pour_steps_deleted: int
    brew_logs_upserted: int
    brew_logs_deleted: int


class SyncPullResponse(BaseModel):
    recipes: list[RecipeSyncItem]
    pour_steps: list[PourStepSyncItem]
    brew_logs: list[BrewLogSyncItem]


# ---- User ----


class UserBase(BaseModel):
    email: EmailStr


class UserCreate(UserBase):
    password: str = Field(min_length=8)


class UserLogin(UserBase):
    password: str


class UserOut(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: str = Field(validation_alias="public_id")
    created_at: datetime
