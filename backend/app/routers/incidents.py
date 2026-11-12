# backend/app/routers/incidents.py
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi import status as http_status
from sqlalchemy.orm import Session

from app.constants import INCIDENT_RESPONDERS
from app.database import get_db
from app.models import Incident
from app.schemas.facility import FacilityCategory, NearbyFacilityOut
from app.schemas.incident import (
    IncidentCategory, IncidentCreate, IncidentCreated, IncidentOut,
    IncidentStatus, IncidentUpdate, Severity,
)
from app.services.geo import make_point, point_to_latlon
from app.services.serializers import facility_dict, incident_dict
from app.services.spatial import find_nearby_facilities

router = APIRouter(prefix="/api/incidents", tags=["Incidents"])

RESPONSE_RADIUS_M = 1500  # how far we look for responders when an incident is created


def _get_or_404(db: Session, incident_id: int) -> Incident:
    incident = db.get(Incident, incident_id)
    if incident is None:
        raise HTTPException(http_status.HTTP_404_NOT_FOUND, "Incident not found")
    return incident


@router.get("", response_model=list[IncidentOut])
def list_incidents(
    category: IncidentCategory | None = None,
    severity: Severity | None = None,
    status: IncidentStatus | None = None,
    limit: int = Query(200, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    query = db.query(Incident)
    if category:
        query = query.filter(Incident.category == category)
    if severity:
        query = query.filter(Incident.severity == severity)
    if status:
        query = query.filter(Incident.status == status)
    return [incident_dict(i) for i in query.order_by(Incident.reported_at.desc()).limit(limit).all()]


@router.post("", response_model=IncidentCreated, status_code=http_status.HTTP_201_CREATED)
def create_incident(payload: IncidentCreate, db: Session = Depends(get_db)):
    incident = Incident(
        title=payload.title, category=payload.category, description=payload.description,
        severity=payload.severity, status="open",
        location=make_point(payload.latitude, payload.longitude),
    )
    db.add(incident)
    db.commit()
    db.refresh(incident)

    # PostGIS: nearest *open* responders suited to this incident type.
    rows = find_nearby_facilities(
        db, payload.latitude, payload.longitude, RESPONSE_RADIUS_M,
        INCIDENT_RESPONDERS[payload.category], limit=3, exclude_closed=True,
    )
    # Phase 7 will add a WebSocket broadcast here ("new incident").
    return {
        "incident": incident_dict(incident),
        "nearby_facilities": [facility_dict(f, d) for f, d in rows],
        "search_radius_m": RESPONSE_RADIUS_M,
    }


@router.get("/{incident_id}", response_model=IncidentOut)
def get_incident(incident_id: int, db: Session = Depends(get_db)):
    return incident_dict(_get_or_404(db, incident_id))


@router.patch("/{incident_id}", response_model=IncidentOut)
def update_incident(incident_id: int, payload: IncidentUpdate, db: Session = Depends(get_db)):
    incident = _get_or_404(db, incident_id)
    data = payload.model_dump(exclude_unset=True, exclude_none=True)

    lat, lon = data.pop("latitude", None), data.pop("longitude", None)
    if lat is not None or lon is not None:
        cur_lat, cur_lon = point_to_latlon(incident.location)
        incident.location = make_point(lat if lat is not None else cur_lat,
                                       lon if lon is not None else cur_lon)
    for field, value in data.items():
        setattr(incident, field, value)

    db.commit()
    db.refresh(incident)
    return incident_dict(incident)


@router.get("/{incident_id}/nearby", response_model=list[NearbyFacilityOut])
def incident_nearby_facilities(
    incident_id: int,
    radius: Annotated[float, Query(gt=0, le=20000, description="metres")] = 1000,
    category: FacilityCategory | None = None,
    db: Session = Depends(get_db),
):
    incident = _get_or_404(db, incident_id)
    lat, lon = point_to_latlon(incident.location)
    rows = find_nearby_facilities(db, lat, lon, radius, [category] if category else None, limit=10)
    return [facility_dict(f, d) for f, d in rows]