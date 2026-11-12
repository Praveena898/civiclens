# backend/app/schemas/route.py
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator

from app.constants import ROUTE_TYPES

RouteType = Literal[*ROUTE_TYPES]


class RouteCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    route_type: RouteType
    description: str | None = Field(default=None, max_length=1000)
    # Each point is [latitude, longitude]; at least 2 points make a line.
    coordinates: list[tuple[float, float]] = Field(min_length=2)

    @field_validator("coordinates")
    @classmethod
    def check_ranges(cls, v):
        for lat, lon in v:
            if not (-90 <= lat <= 90 and -180 <= lon <= 180):
                raise ValueError(f"Invalid coordinate [{lat}, {lon}]: expected [lat, lon]")
        return v


class RouteUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    route_type: RouteType | None = None
    description: str | None = Field(default=None, max_length=1000)


class RouteOut(BaseModel):
    id: int
    name: str
    route_type: str
    description: str | None
    coordinates: list[list[float]]
    length_m: float | None
    is_simulated: bool
    created_at: datetime