# backend/app/services/crowd.py
from app.config import settings


def classify_crowd(person_count: int) -> str:
    """DEMO classification from a people-in-frame count.

    A count in one camera frame is NOT a true physical density (that needs the
    area covered, camera angle, occlusion handling, etc). These thresholds are
    configurable placeholders for demonstration.
    """
    if person_count >= settings.crowd_critical_min:
        return "critical"
    if person_count >= settings.crowd_high_min:
        return "high"
    if person_count >= settings.crowd_moderate_min:
        return "moderate"
    return "low"