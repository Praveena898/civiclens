# backend/app/models/__init__.py
from app.models.tables import (  # noqa: F401
    Camera, CrowdObservation, DroneImagery, Facility, FieldSurvey,
    GISImport, Incident, Route, User,
)