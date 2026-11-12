# backend/app/routers/facilities.py
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi import status as http_status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Facility
from app.schemas.facility import (
    FacilityCategory, FacilityCreate, FacilityOut, FacilityStatus,
    FacilityUpdate, NearbyFacilityOut,
)
from app.services.geo import make_point, point_to_latlon
from app.services.serializers import facility_dict
from app.services.spatial import find_facilities_in_bounds, find_nearby_facilities

router = APIRouter(prefix="/api/facilities", tags=["Facilities"])


def _get_or_404(db: Session, facility_id: int) -> Facility:
    facility = db.get(Facility, facility_id)
    if facility is None:
        raise HTTPException(http_status.HTTP_404_NOT_FOUND, "Facility not found")
    return facility


@router.get("", response_model=list[FacilityOut])
def list_facilities(
    q: str | None = Query(None, description="Search in name or area"),
    category: FacilityCategory | None = None,
    status: FacilityStatus | None = None,
    limit: int = Query(500, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    query = db.query(Facility)
    if q:
        like = f"%{q}%"
        query = query.filter(or_(Facility.name.ilike(like), Facility.area.ilike(like)))
    if category:
        query = query.filter(Facility.category == category)
    if status:
        query = query.filter(Facility.status == status)
    rows = query.order_by(Facility.id).offset(offset).limit(limit).all()
    return [facility_dict(f) for f in rows]


@router.get("/nearby", response_model=list[NearbyFacilityOut])
def nearby_facilities(
    lat: Annotated[float, Query(ge=-90, le=90)],
    lon: Annotated[float, Query(ge=-180, le=180)],
    radius: Annotated[float, Query(gt=0, le=20000, description="metres")] = 500,
    category: FacilityCategory | None = None,
    limit: Annotated[int, Query(ge=1, le=50)] = 10,
    db: Session = Depends(get_db),
):
    rows = find_nearby_facilities(db, lat, lon, radius, [category] if category else None, limit)
    return [facility_dict(f, d) for f, d in rows]


@router.get("/in-bounds", response_model=list[FacilityOut])
def facilities_in_bounds(
    south: Annotated[float, Query(ge=-90, le=90)],
    west: Annotated[float, Query(ge=-180, le=180)],
    north: Annotated[float, Query(ge=-90, le=90)],
    east: Annotated[float, Query(ge=-180, le=180)],
    category: FacilityCategory | None = None,
    db: Session = Depends(get_db),
):
    return [facility_dict(f) for f in find_facilities_in_bounds(db, south, west, north, east, category)]


@router.get("/{facility_id}", response_model=FacilityOut)
def get_facility(facility_id: int, db: Session = Depends(get_db)):
    return facility_dict(_get_or_404(db, facility_id))


@router.post("", response_model=FacilityOut, status_code=http_status.HTTP_201_CREATED)
def create_facility(payload: FacilityCreate, db: Session = Depends(get_db)):
    facility = Facility(
        name=payload.name, category=payload.category, description=payload.description,
        status=payload.status, capacity=payload.capacity, contact=payload.contact,
        area=payload.area, location=make_point(payload.latitude, payload.longitude),
    )
    db.add(facility)
    db.commit()
    db.refresh(facility)
    return facility_dict(facility)


@router.patch("/{facility_id}", response_model=FacilityOut)
def update_facility(facility_id: int, payload: FacilityUpdate, db: Session = Depends(get_db)):
    facility = _get_or_404(db, facility_id)
    # Only fields the client actually sent. (Limitation: you can't set a field back to null.)
    data = payload.model_dump(exclude_unset=True, exclude_none=True)

    lat, lon = data.pop("latitude", None), data.pop("longitude", None)
    if lat is not None or lon is not None:
        cur_lat, cur_lon = point_to_latlon(facility.location)
        facility.location = make_point(lat if lat is not None else cur_lat,
                                       lon if lon is not None else cur_lon)
    for field, value in data.items():
        setattr(facility, field, value)

    db.commit()
    db.refresh(facility)
    return facility_dict(facility)


@router.delete("/{facility_id}", status_code=http_status.HTTP_204_NO_CONTENT)
def delete_facility(facility_id: int, db: Session = Depends(get_db)):
    db.delete(_get_or_404(db, facility_id))
    db.commit()