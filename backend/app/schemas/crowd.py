# backend/app/schemas/crowd.py
from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class CameraCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    rtsp_url: str | None = Field(default=None, max_length=500)
    is_simulated: bool = False

    @field_validator("rtsp_url")
    @classmethod
    def check_rtsp(cls, v):
        if not v:
            return None
        if not v.lower().startswith(("rtsp://", "rtsps://")):
            raise ValueError("RTSP URL must start with rtsp:// or rtsps://")
        return v


class CameraOut(BaseModel):
    """NOTE: there is deliberately NO rtsp_url field. Only a has_rtsp flag leaves the server."""
    id: int
    name: str
    latitude: float
    longitude: float
    is_simulated: bool
    is_active: bool
    has_rtsp: bool
    created_at: datetime


class ObservationOut(BaseModel):
    id: int
    camera_id: int
    camera_name: str
    person_count: int
    level: str
    source_image: str | None
    annotated_image: str | None
    is_simulated: bool
    observed_at: datetime


class Box(BaseModel):
    x1: int
    y1: int
    x2: int
    y2: int
    confidence: float


class DetectionOut(BaseModel):
    observation: ObservationOut
    boxes: list[Box]
    avg_confidence: float | None
    model: str


class LatestOut(BaseModel):
    camera: CameraOut
    observation: ObservationOut