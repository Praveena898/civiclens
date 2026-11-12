# backend/app/constants.py
FACILITY_CATEGORIES = (
    "parking", "toilet", "medical_post", "help_desk",
    "water_station", "entrance", "exit", "other",
)
FACILITY_STATUSES = ("operational", "maintenance", "closed")

INCIDENT_CATEGORIES = (
    "medical_emergency", "infrastructure_issue", "road_blockage",
    "safety_concern", "other",
)
SEVERITIES = ("low", "medium", "high", "critical")
INCIDENT_STATUSES = ("open", "acknowledged", "resolved")

ROUTE_TYPES = ("walking", "vehicle")
CROWD_LEVELS = ("low", "moderate", "high", "critical")
SURVEY_STATUSES = ("pending", "approved", "rejected")
USER_ROLES = ("admin", "operator")

# Which facility types are useful responders for each incident category.
INCIDENT_RESPONDERS = {
    "medical_emergency": ["medical_post"],
    "safety_concern": ["help_desk", "medical_post"],
    "road_blockage": ["help_desk"],
    "infrastructure_issue": ["help_desk"],
    "other": ["help_desk"],
}