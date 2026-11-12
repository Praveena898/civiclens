# backend/app/routers/routes.py
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi import status as http_status
from sqlalchemy import cast, func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Route
from app.schemas.facility import FacilityCategory, NearbyFacilityOut
from app.schemas.route import RouteCreate, RouteOut, RouteType, RouteUpdate
from app.services.geo import make_line
from app.services.serializers import facility_dict, route_dict
from app.services.spatial import GEOG, find_facilities_near_route

router = APIRouter(prefix="/api/routes", tags=["Routes"])

# ST_Length on a geography column returns the line's length in metres.
_length = func.ST_Length(cast(Route.path, GEOG)).label("length_m")


def _get_with_length(db: Session, route_id: int):
    row = db.query(Route, _length).filter(Route.id == route_id).first()
    if row is None:
        raise HTTPException(http_status.HTTP_404_NOT_FOUND, "Route not found")
    return row


@router.get("", response_model=list[RouteOut])
def list_routes(route_type: RouteType | None = None, db: Session = Depends(get_db)):
    query = db.query(Route, _length)
    if route_type:
        query = query.filter(Route.route_type == route_type)
    return [route_dict(r, length) for r, length in query.order_by(Route.id).all()]


@router.get("/{route_id}", response_model=RouteOut)
def get_route(route_id: int, db: Session = Depends(get_db)):
    route, length = _get_with_length(db, route_id)
    return route_dict(route, length)


@router.post("", response_model=RouteOut, status_code=http_status.HTTP_201_CREATED)
def create_route(payload: RouteCreate, db: Session = Depends(get_db)):
    route = Route(name=payload.name, route_type=payload.route_type,
                  description=payload.description, path=make_line(payload.coordinates))
    db.add(route)
    db.commit()
    route, length = _get_with_length(db, route.id)
    return route_dict(route, length)


@router.patch("/{route_id}", response_model=RouteOut)
def update_route(route_id: int, payload: RouteUpdate, db: Session = Depends(get_db)):
    route, _ = _get_with_length(db, route_id)
    for field, value in payload.model_dump(exclude_unset=True, exclude_none=True).items():
        setattr(route, field, value)
    db.commit()
    route, length = _get_with_length(db, route_id)
    return route_dict(route, length)


@router.delete("/{route_id}", status_code=http_status.HTTP_204_NO_CONTENT)
def delete_route(route_id: int, db: Session = Depends(get_db)):
    route, _ = _get_with_length(db, route_id)
    db.delete(route)
    db.commit()


@router.get("/{route_id}/nearby-facilities", response_model=list[NearbyFacilityOut])
def facilities_near_route(
    route_id: int,
    radius: Annotated[float, Query(gt=0, le=5000, description="metres")] = 200,
    category: FacilityCategory | None = None,
    db: Session = Depends(get_db),
):
    _get_with_length(db, route_id)  # 404 if the route doesn't exist
    rows = find_facilities_near_route(db, route_id, radius, category)
    return [facility_dict(f, d) for f, d in rows]