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

def upload_url(rel_path: str | None) -> str | None:
    return f"/uploads/{rel_path}" if rel_path else None


def camera_dict(c) -> dict:
    lat, lon = point_to_latlon(c.location)
    return {
        "id": c.id, "name": c.name, "latitude": lat, "longitude": lon,
        "is_simulated": c.is_simulated, "is_active": c.is_active,
        "has_rtsp": bool(c.rtsp_url),          # a yes/no flag, never the URL itself
        "created_at": c.created_at,
    }


def observation_dict(o) -> dict:
    return {
        "id": o.id, "camera_id": o.camera_id, "camera_name": o.camera.name,
        "person_count": o.person_count, "level": o.level,
        "source_image": upload_url(o.source_image),
        "annotated_image": upload_url(o.annotated_image),
        "is_simulated": o.is_simulated, "observed_at": o.observed_at,
    }