# backend/app/schemas/incident.py
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.constants import INCIDENT_CATEGORIES, INCIDENT_STATUSES, SEVERITIES
from app.schemas.facility import NearbyFacilityOut

IncidentCategory = Literal[*INCIDENT_CATEGORIES]
Severity = Literal[*SEVERITIES]
IncidentStatus = Literal[*INCIDENT_STATUSES]


class IncidentCreate(BaseModel):
    title: str = Field(min_length=3, max_length=160)
    category: IncidentCategory
    description: str | None = Field(default=None, max_length=2000)
    severity: Severity
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)


class IncidentUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=160)
    category: IncidentCategory | None = None
    description: str | None = Field(default=None, max_length=2000)
    severity: Severity | None = None
    status: IncidentStatus | None = None
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)


class IncidentOut(BaseModel):
    id: int
    title: str
    category: str
    description: str | None
    severity: str
    status: str
    image_path: str | None
    latitude: float
    longitude: float
    is_simulated: bool
    reported_at: datetime


class IncidentCreated(BaseModel):
    """Returned when an incident is created: the incident plus nearest responders."""
    incident: IncidentOut
    nearby_facilities: list[NearbyFacilityOut]
    search_radius_m: float