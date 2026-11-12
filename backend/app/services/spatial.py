# backend/app/services/spatial.py
from geoalchemy2 import Geography
from sqlalchemy import cast, func
from sqlalchemy.orm import Session

from app.models import Facility, Route

# geography = measure in real metres on the Earth's surface (geometry would give degrees).
GEOG = Geography(srid=4326)


def find_nearby_facilities(
    db: Session, lat: float, lon: float, radius_m: float = 1000,
    categories: list[str] | None = None, limit: int = 10, exclude_closed: bool = False,
):
    """Facilities within radius_m metres of (lat, lon), nearest first.

    Roughly this SQL:
        SELECT f.*, ST_Distance(f.location::geography, origin) AS distance_m
        FROM facilities f
        WHERE ST_DWithin(f.location::geography, origin, :radius)   -- filter by distance
        ORDER BY distance_m LIMIT :limit;                          -- nearest first
    where origin = ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography
    """
    origin = cast(func.ST_SetSRID(func.ST_MakePoint(lon, lat), 4326), GEOG)
    facility_geog = cast(Facility.location, GEOG)
    distance = func.ST_Distance(facility_geog, origin).label("distance_m")

    query = db.query(Facility, distance).filter(func.ST_DWithin(facility_geog, origin, radius_m))
    if categories:
        query = query.filter(Facility.category.in_(categories))
    if exclude_closed:
        query = query.filter(Facility.status != "closed")
    return query.order_by(distance).limit(limit).all()


def find_facilities_in_bounds(db: Session, south: float, west: float, north: float, east: float,
                              category: str | None = None):
    """Facilities inside a rectangle (e.g. what the map is currently showing).

    ST_MakeEnvelope builds a rectangle polygon; ST_Contains(polygon, point) is true
    when the point lies inside it. Argument order is (xmin=west, ymin=south, xmax=east, ymax=north).
    """
    box = func.ST_MakeEnvelope(west, south, east, north, 4326)
    query = db.query(Facility).filter(func.ST_Contains(box, Facility.location))
    if category:
        query = query.filter(Facility.category == category)
    return query.order_by(Facility.id).all()


def find_facilities_near_route(db: Session, route_id: int, radius_m: float = 200,
                               category: str | None = None):
    """Facilities within radius_m metres of ANY point along a route's line.

    ST_Distance(point, line) is the shortest distance from the point to the line.
    """
    route_geog = cast(Route.path, GEOG)
    facility_geog = cast(Facility.location, GEOG)
    distance = func.ST_Distance(facility_geog, route_geog).label("distance_m")

    query = (
        db.query(Facility, distance)
        .select_from(Facility)
        .join(Route, Route.id == route_id)
        .filter(func.ST_DWithin(facility_geog, route_geog, radius_m))
    )
    if category:
        query = query.filter(Facility.category == category)
    return query.order_by(distance).all()