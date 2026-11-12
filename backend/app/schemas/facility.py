# backend/app/schemas/facility.py
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.constants import FACILITY_CATEGORIES, FACILITY_STATUSES

FacilityCategory = Literal[*FACILITY_CATEGORIES]
FacilityStatus = Literal[*FACILITY_STATUSES]


class FacilityCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    category: FacilityCategory
    description: str | None = Field(default=None, max_length=1000)
    status: FacilityStatus = "operational"
    capacity: int | None = Field(default=None, ge=0)
    contact: str | None = Field(default=None, max_length=120)
    area: str | None = Field(default=None, max_length=120)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)


class FacilityUpdate(BaseModel):
    """All fields optional: send only what you want to change."""
    name: str | None = Field(default=None, min_length=2, max_length=120)
    category: FacilityCategory | None = None
    description: str | None = Field(default=None, max_length=1000)
    status: FacilityStatus | None = None
    capacity: int | None = Field(default=None, ge=0)
    contact: str | None = Field(default=None, max_length=120)
    area: str | None = Field(default=None, max_length=120)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)


class FacilityOut(BaseModel):
    id: int
    name: str
    category: str
    description: str | None
    status: str
    capacity: int | None
    contact: str | None
    area: str | None
    latitude: float
    longitude: float
    is_simulated: bool
    created_at: datetime


class NearbyFacilityOut(FacilityOut):
    distance_m: float