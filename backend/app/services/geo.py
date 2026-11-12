# backend/app/services/geo.py
from geoalchemy2.shape import from_shape, to_shape
from shapely.geometry import LineString, Point

SRID = 4326


def make_point(lat: float, lon: float):
    # Shapely wants (x, y) = (longitude, latitude). This is the swap.
    return from_shape(Point(lon, lat), srid=SRID)


def make_line(coords):
    """coords: [[lat, lon], ...] -> PostGIS LineString."""
    return from_shape(LineString([(lon, lat) for lat, lon in coords]), srid=SRID)


def point_to_latlon(geom) -> tuple[float, float]:
    p = to_shape(geom)
    return p.y, p.x  # y = latitude, x = longitude


def line_to_latlons(geom) -> list[list[float]]:
    """PostGIS LineString -> [[lat, lon], ...] (the order Leaflet wants)."""
    return [[y, x] for x, y in to_shape(geom).coords]