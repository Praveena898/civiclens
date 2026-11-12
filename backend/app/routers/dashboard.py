# backend/app/routers/dashboard.py
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Camera, CrowdObservation, Facility, Incident, Route

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


def _group_counts(db: Session, column) -> list[dict]:
    rows = db.query(column, func.count()).group_by(column).order_by(column).all()
    return [{"name": name, "value": count} for name, count in rows]


@router.get("/summary")
def summary(db: Session = Depends(get_db)):
    def count_facilities(category: str | None = None) -> int:
        q = db.query(func.count(Facility.id))
        if category:
            q = q.filter(Facility.category == category)
        return q.scalar()

    # Latest observation per camera (PostgreSQL DISTINCT ON).
    latest = (
        db.query(CrowdObservation)
        .distinct(CrowdObservation.camera_id)
        .order_by(CrowdObservation.camera_id, CrowdObservation.observed_at.desc())
        .all()
    )
    crowd = {"low": 0, "moderate": 0, "high": 0, "critical": 0}
    for obs in latest:
        crowd[obs.level] += 1

    recent = []
    for i in db.query(Incident).order_by(Incident.reported_at.desc()).limit(5).all():
        recent.append({"type": "incident", "title": i.title,
                       "detail": f"{i.severity} · {i.status}", "timestamp": i.reported_at})
    for o in db.query(CrowdObservation).order_by(CrowdObservation.observed_at.desc()).limit(5).all():
        recent.append({"type": "crowd", "title": f"{o.camera.name}: {o.person_count} people",
                       "detail": o.level, "timestamp": o.observed_at})
    recent.sort(key=lambda item: item["timestamp"], reverse=True)

    return {
        "totals": {
            "facilities": count_facilities(),
            "parking": count_facilities("parking"),
            "medical_posts": count_facilities("medical_post"),
            "help_desks": count_facilities("help_desk"),
            "incidents": db.query(func.count(Incident.id)).scalar(),
            "open_incidents": db.query(func.count(Incident.id)).filter(Incident.status == "open").scalar(),
            "routes": db.query(func.count(Route.id)).scalar(),
            "cameras": db.query(func.count(Camera.id)).scalar(),
        },
        "crowd": {**crowd, "cameras_reporting": len(latest)},
        "recent_activity": recent[:8],
    }


@router.get("/charts")
def charts(db: Session = Depends(get_db)):
    return {
        "facilities_by_category": _group_counts(db, Facility.category),
        "incidents_by_category": _group_counts(db, Incident.category),
        "incidents_by_severity": _group_counts(db, Incident.severity),
        "incidents_by_status": _group_counts(db, Incident.status),
    }