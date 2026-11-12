# backend/app/models/tables.py
from datetime import datetime

from geoalchemy2 import Geometry
from sqlalchemy import (
    Boolean, CheckConstraint, DateTime, Float, ForeignKey, Integer, String, Text, func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.constants import (
    CROWD_LEVELS, FACILITY_CATEGORIES, FACILITY_STATUSES, INCIDENT_CATEGORIES,
    INCIDENT_STATUSES, ROUTE_TYPES, SEVERITIES, SURVEY_STATUSES, USER_ROLES,
)
from app.database import Base


def _in(column: str, values) -> str:
    """Build SQL like: category IN ('a', 'b') for CHECK constraints."""
    return f"{column} IN ({', '.join(repr(v) for v in values)})"


def _now():
    return mapped_column(DateTime(timezone=True), server_default=func.now())


class User(Base):
    __tablename__ = "users"
    __table_args__ = (CheckConstraint(_in("role", USER_ROLES), name="ck_users_role"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    full_name: Mapped[str | None] = mapped_column(String(120))
    hashed_password: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(20), default="operator")
    created_at: Mapped[datetime] = _now()


class Facility(Base):
    __tablename__ = "facilities"
    __table_args__ = (
        CheckConstraint(_in("category", FACILITY_CATEGORIES), name="ck_facilities_category"),
        CheckConstraint(_in("status", FACILITY_STATUSES), name="ck_facilities_status"),
        CheckConstraint("capacity IS NULL OR capacity >= 0", name="ck_facilities_capacity"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), index=True)
    category: Mapped[str] = mapped_column(String(30), index=True)
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="operational")
    capacity: Mapped[int | None] = mapped_column(Integer)
    contact: Mapped[str | None] = mapped_column(String(120))
    area: Mapped[str | None] = mapped_column(String(120))
    is_simulated: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = _now()
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    # PostGIS POINT in GPS coordinates (SRID 4326). Stored as (lon, lat).
    location = mapped_column(Geometry("POINT", srid=4326), nullable=False)


class Route(Base):
    __tablename__ = "routes"
    __table_args__ = (CheckConstraint(_in("route_type", ROUTE_TYPES), name="ck_routes_type"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), index=True)
    route_type: Mapped[str] = mapped_column(String(20))
    description: Mapped[str | None] = mapped_column(Text)
    is_simulated: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = _now()
    # PostGIS LINESTRING: the whole path is one geometry value.
    path = mapped_column(Geometry("LINESTRING", srid=4326), nullable=False)


class Incident(Base):
    __tablename__ = "incidents"
    __table_args__ = (
        CheckConstraint(_in("category", INCIDENT_CATEGORIES), name="ck_incidents_category"),
        CheckConstraint(_in("severity", SEVERITIES), name="ck_incidents_severity"),
        CheckConstraint(_in("status", INCIDENT_STATUSES), name="ck_incidents_status"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(160))
    category: Mapped[str] = mapped_column(String(30), index=True)
    description: Mapped[str | None] = mapped_column(Text)
    severity: Mapped[str] = mapped_column(String(20), index=True)
    status: Mapped[str] = mapped_column(String(20), default="open", index=True)
    image_path: Mapped[str | None] = mapped_column(String(255))
    is_simulated: Mapped[bool] = mapped_column(Boolean, default=False)
    reported_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    location = mapped_column(Geometry("POINT", srid=4326), nullable=False)


class Camera(Base):
    __tablename__ = "cameras"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    # SERVER-ONLY secret: may contain credentials. Never put this in a response schema.
    rtsp_url: Mapped[str | None] = mapped_column(Text)
    is_simulated: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = _now()
    location = mapped_column(Geometry("POINT", srid=4326), nullable=False)

    observations = relationship(
        "CrowdObservation", back_populates="camera", cascade="all, delete-orphan"
    )


class CrowdObservation(Base):
    __tablename__ = "crowd_observations"
    __table_args__ = (
        CheckConstraint(_in("level", CROWD_LEVELS), name="ck_crowd_level"),
        CheckConstraint("person_count >= 0", name="ck_crowd_count"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    camera_id: Mapped[int] = mapped_column(ForeignKey("cameras.id", ondelete="CASCADE"), index=True)
    person_count: Mapped[int] = mapped_column(Integer)
    level: Mapped[str] = mapped_column(String(20))
    source_image: Mapped[str | None] = mapped_column(String(255))
    annotated_image: Mapped[str | None] = mapped_column(String(255))
    is_simulated: Mapped[bool] = mapped_column(Boolean, default=False)
    observed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )

    camera = relationship("Camera", back_populates="observations")


class FieldSurvey(Base):
    __tablename__ = "field_surveys"
    __table_args__ = (
        CheckConstraint(_in("facility_type", FACILITY_CATEGORIES), name="ck_surveys_type"),
        CheckConstraint(_in("operational_status", FACILITY_STATUSES), name="ck_surveys_opstatus"),
        CheckConstraint(_in("review_status", SURVEY_STATUSES), name="ck_surveys_review"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(160))
    facility_type: Mapped[str] = mapped_column(String(30))
    description: Mapped[str | None] = mapped_column(Text)
    operational_status: Mapped[str] = mapped_column(String(20), default="operational")
    surveyor_name: Mapped[str] = mapped_column(String(120))
    photo_path: Mapped[str | None] = mapped_column(String(255))
    review_status: Mapped[str] = mapped_column(String(20), default="pending", index=True)
    # Set when an approved survey is converted into a facility.
    facility_id: Mapped[int | None] = mapped_column(ForeignKey("facilities.id", ondelete="SET NULL"))
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    location = mapped_column(Geometry("POINT", srid=4326), nullable=False)


class DroneImagery(Base):
    __tablename__ = "drone_imagery"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(160))
    file_path: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text)
    # Geographic bounds of the image (degrees). These make it georeferenced.
    south: Mapped[float] = mapped_column(Float)
    west: Mapped[float] = mapped_column(Float)
    north: Mapped[float] = mapped_column(Float)
    east: Mapped[float] = mapped_column(Float)
    is_simulated: Mapped[bool] = mapped_column(Boolean, default=False)
    uploaded_at: Mapped[datetime] = _now()
    # The same bounds as a PostGIS POLYGON, so we can run spatial queries on it.
    bounds = mapped_column(Geometry("POLYGON", srid=4326), nullable=False)


class GISImport(Base):
    __tablename__ = "gis_imports"

    id: Mapped[int] = mapped_column(primary_key=True)
    filename: Mapped[str] = mapped_column(String(255))
    file_type: Mapped[str] = mapped_column(String(20))
    total_records: Mapped[int] = mapped_column(Integer, default=0)
    success_count: Mapped[int] = mapped_column(Integer, default=0)
    failed_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = _now()