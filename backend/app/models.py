from sqlalchemy import (
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import relationship

from app.database import Base


class Recipe(Base):
    __tablename__ = "recipes"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    bean_origin = Column(String, nullable=True)
    dose_g = Column(Float, nullable=False)
    water_ml = Column(Float, nullable=False)
    water_temp_c = Column(Float, nullable=False)
    grind_size = Column(String, nullable=True)
    total_time_sec = Column(Integer, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    pour_steps = relationship(
        "PourStep",
        back_populates="recipe",
        cascade="all, delete-orphan",
        order_by="PourStep.step_order, PourStep.id",
    )
    brew_logs = relationship(
        "BrewLog",
        back_populates="recipe",
        cascade="all, delete-orphan",
    )


class PourStep(Base):
    __tablename__ = "pour_steps"

    id = Column(Integer, primary_key=True)
    recipe_id = Column(
        Integer, ForeignKey("recipes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    step_order = Column(Integer, nullable=False)
    target_time_sec = Column(Integer, nullable=False)
    cumulative_water_ml = Column(Float, nullable=False)
    notes = Column(Text, nullable=True)

    recipe = relationship("Recipe", back_populates="pour_steps")


class BrewLog(Base):
    __tablename__ = "brew_logs"

    id = Column(Integer, primary_key=True)
    recipe_id = Column(
        Integer, ForeignKey("recipes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    brewed_at = Column(DateTime, nullable=False, server_default=func.now())
    rating = Column(Integer, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    recipe = relationship("Recipe", back_populates="brew_logs")
