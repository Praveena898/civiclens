# backend/seed.py
"""Insert SIMULATED demo data. Safe to re-run: it replaces only rows flagged is_simulated."""
from datetime import datetime, timedelta, timezone

from app.database import Base, SessionLocal, engine
from app.models import Camera, CrowdObservation, Facility, Incident, Route
from app.services.crowd import classify_crowd
from app.services.geo import make_line, make_point

# (name, category, lat, lon, capacity, status, area)
FACILITIES = [
    ("Parking A - North Lot", "parking", 12.9535, 77.5845, 200, "operational", "North Zone"),
    ("Parking B - East Lot", "parking", 12.9500, 77.5895, 150, "operational", "East Zone"),
    ("Parking C - South Lot", "parking", 12.9465, 77.5855, 120, "operational", "South Zone"),
    ("Toilets T1", "toilet", 12.9528, 77.5835, 12, "operational", "North Zone"),
    ("Toilets T2", "toilet", 12.9510, 77.5870, 12, "maintenance", "Central Plaza"),
    ("Toilets T3", "toilet", 12.9490, 77.5835, 10, "operational", "West Zone"),
    ("Toilets T4", "toilet", 12.9475, 77.5875, 10, "operational", "South Zone"),
    ("Medical Post 1", "medical_post", 12.9525, 77.5858, 6, "operational", "North Zone"),
    ("Medical Post 2", "medical_post", 12.9495, 77.5880, 6, "operational", "East Zone"),
    ("Medical Post 3", "medical_post", 12.9472, 77.5842, 4, "operational", "South Zone"),
    ("Main Help Desk", "help_desk", 12.9518, 77.5850, None, "operational", "Central Plaza"),
    ("East Help Desk", "help_desk", 12.9502, 77.5888, None, "operational", "East Zone"),
    ("South Help Desk", "help_desk", 12.9480, 77.5858, None, "operational", "South Zone"),
    ("Water Station W1", "water_station", 12.9520, 77.5840, None, "operational", "North Zone"),
    ("Water Station W2", "water_station", 12.9498, 77.5865, None, "closed", "Central Plaza"),
    ("Water Station W3", "water_station", 12.9478, 77.5868, None, "operational", "South Zone"),
    ("Main Gate (Entrance)", "entrance", 12.9540, 77.5848, None, "operational", "North Zone"),
    ("East Gate (Entrance)", "entrance", 12.9500, 77.5900, None, "operational", "East Zone"),
    ("South Exit", "exit", 12.9460, 77.5850, None, "operational", "South Zone"),
    ("West Exit", "exit", 12.9500, 77.5805, None, "operational", "West Zone"),
    ("Main Stage", "other", 12.9505, 77.5850, 2000, "operational", "Central Plaza"),
    ("Food Court", "other", 12.9512, 77.5862, 400, "operational", "Central Plaza"),
]
CONTACTS = {"medical_post": "Radio Ch. 2 (demo)", "help_desk": "Radio Ch. 1 (demo)"}

# (name, type, [[lat, lon], ...])
ROUTES = [
    ("Main Gate to Stage", "walking",
     [[12.9540, 77.5848], [12.9528, 77.5849], [12.9515, 77.5850], [12.9505, 77.5850]]),
    ("Stage to East Gate", "walking",
     [[12.9505, 77.5850], [12.9502, 77.5870], [12.9500, 77.5888], [12.9500, 77.5900]]),
    ("Stage to South Exit", "walking",
     [[12.9505, 77.5850], [12.9490, 77.5851], [12.9475, 77.5851], [12.9460, 77.5850]]),
    ("Parking A Access Road", "vehicle",
     [[12.9548, 77.5825], [12.9542, 77.5836], [12.9535, 77.5845]]),
    ("Parking B Access Road", "vehicle",
     [[12.9500, 77.5915], [12.9500, 77.5905], [12.9500, 77.5895]]),
]

# (camera name, lat, lon, [people counts, oldest -> newest])
CAMERAS = [
    ("Main Gate Camera (simulated)", 12.9540, 77.5848, [4, 9, 18, 27, 34, 22]),
    ("Central Plaza Camera (simulated)", 12.9508, 77.5855, [12, 20, 28, 33, 41, 38]),
    ("East Gate Camera (simulated)", 12.9500, 77.5898, [3, 5, 8, 11, 14, 9]),
    ("South Exit Camera (simulated)", 12.9462, 77.5850, [2, 3, 6, 5, 4, 7]),
]

# (title, category, severity, status, lat, lon, description, minutes_ago)
INCIDENTS = [
    ("Person fainted near main stage", "medical_emergency", "high", "open",
     12.9507, 77.5853, "Adult collapsed in the front crowd. Bystanders are assisting.", 12),
    ("Vehicle breakdown blocking East access road", "road_blockage", "medium", "acknowledged",
     12.9500, 77.5908, "Stalled van is narrowing the road near Parking B.", 35),
    ("Water leak at Toilets T2", "infrastructure_issue", "low", "open",
     12.9510, 77.5871, "Pipe leak. The facility is marked under maintenance.", 90),
    ("Overcrowding at Main Gate", "safety_concern", "high", "open",
     12.9539, 77.5848, "Queue spilling onto the approach road.", 20),
    ("Lost child reported", "safety_concern", "critical", "resolved",
     12.9515, 77.5858, "Child reunited with family at the Main Help Desk.", 180),
]


def main() -> None:
    Base.metadata.create_all(bind=engine)
    now = datetime.now(timezone.utc)
    with SessionLocal() as db:
        # Remove previous simulated rows (children first because of foreign keys).
        db.query(CrowdObservation).filter(CrowdObservation.is_simulated.is_(True)).delete()
        db.query(Camera).filter(Camera.is_simulated.is_(True)).delete()
        db.query(Incident).filter(Incident.is_simulated.is_(True)).delete()
        db.query(Route).filter(Route.is_simulated.is_(True)).delete()
        db.query(Facility).filter(Facility.is_simulated.is_(True)).delete()

        for name, cat, lat, lon, cap, status, area in FACILITIES:
            db.add(Facility(
                name=name, category=cat, capacity=cap, status=status, area=area,
                contact=CONTACTS.get(cat), is_simulated=True,
                description="SIMULATED demo facility", location=make_point(lat, lon),
            ))

        for name, rtype, coords in ROUTES:
            db.add(Route(name=name, route_type=rtype, is_simulated=True,
                         description="SIMULATED demo route", path=make_line(coords)))

        for title, cat, sev, status, lat, lon, desc, mins in INCIDENTS:
            db.add(Incident(
                title=title, category=cat, severity=sev, status=status, description=desc,
                is_simulated=True, reported_at=now - timedelta(minutes=mins),
                location=make_point(lat, lon),
            ))

        for name, lat, lon, counts in CAMERAS:
            camera = Camera(name=name, is_simulated=True, rtsp_url=None, location=make_point(lat, lon))
            for idx, count in enumerate(counts):
                camera.observations.append(CrowdObservation(
                    person_count=count, level=classify_crowd(count), is_simulated=True,
                    observed_at=now - timedelta(minutes=15 * (len(counts) - 1 - idx)),
                ))
            db.add(camera)

        db.commit()
        print(f"Seeded: {len(FACILITIES)} facilities, {len(ROUTES)} routes, "
              f"{len(INCIDENTS)} incidents, {len(CAMERAS)} cameras with observations.")


if __name__ == "__main__":
    main()