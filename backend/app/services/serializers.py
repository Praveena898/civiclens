# backend/app/services/serializers.py
from app.services.geo import line_to_latlons, point_to_latlon


def facility_dict(f, distance_m: float | None = None) -> dict:
    lat, lon = point_to_latlon(f.location)
    data = {
        "id": f.id, "name": f.name, "category": f.category, "description": f.description,
        "status": f.status, "capacity": f.capacity, "contact": f.contact, "area": f.area,
        "latitude": lat, "longitude": lon,
        "is_simulated": f.is_simulated, "created_at": f.created_at,
    }
    if distance_m is not None:
        data["distance_m"] = round(float(distance_m), 1)
    return data


def incident_dict(i) -> dict:
    lat, lon = point_to_latlon(i.location)
    return {
        "id": i.id, "title": i.title, "category": i.category, "description": i.description,
        "severity": i.severity, "status": i.status, "image_path": i.image_path,
        "latitude": lat, "longitude": lon,
        "is_simulated": i.is_simulated, "reported_at": i.reported_at,
    }


def route_dict(r, length_m: float | None = None) -> dict:
    return {
        "id": r.id, "name": r.name, "route_type": r.route_type, "description": r.description,
        "coordinates": line_to_latlons(r.path),
        "length_m": round(float(length_m), 1) if length_m is not None else None,
        "is_simulated": r.is_simulated, "created_at": r.created_at,
    }