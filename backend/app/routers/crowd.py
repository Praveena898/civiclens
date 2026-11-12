# backend/app/routers/crowd.py
import logging
from uuid import uuid4

import cv2
import numpy as np
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi import status as http_status
from sqlalchemy.orm import Session

from app.config import settings
from app.cv.detector import MODEL_NAME, detect_people
from app.database import get_db
from app.models import Camera, CrowdObservation
from app.paths import UPLOAD_DIR
from app.schemas.crowd import DetectionOut, LatestOut, ObservationOut
from app.services.crowd import classify_crowd
from app.services.serializers import camera_dict, observation_dict

router = APIRouter(prefix="/api/crowd", tags=["Crowd"])
log = logging.getLogger("civiclens.crowd")

ALLOWED_TYPES = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
MAX_BYTES = 10 * 1024 * 1024  # 10 MB upload limit


@router.get("/thresholds")
def thresholds():
    """The DEMO thresholds (people-in-frame counts) that decide each level."""
    return {
        "moderate_min": settings.crowd_moderate_min,
        "high_min": settings.crowd_high_min,
        "critical_min": settings.crowd_critical_min,
    }


@router.get("/observations", response_model=list[ObservationOut])
def list_observations(
    camera_id: int | None = None, limit: int = Query(30, ge=1, le=200), db: Session = Depends(get_db),
):
    q = db.query(CrowdObservation)
    if camera_id:
        q = q.filter(CrowdObservation.camera_id == camera_id)
    return [observation_dict(o) for o in q.order_by(CrowdObservation.observed_at.desc()).limit(limit).all()]


@router.get("/latest", response_model=list[LatestOut])
def latest_per_camera(db: Session = Depends(get_db)):
    """Newest observation for each camera: what the map draws as hotspots.
    DISTINCT ON (camera_id) + ORDER BY observed_at DESC keeps one row per camera."""
    rows = (
        db.query(CrowdObservation)
        .distinct(CrowdObservation.camera_id)
        .order_by(CrowdObservation.camera_id, CrowdObservation.observed_at.desc())
        .all()
    )
    return [{"camera": camera_dict(o.camera), "observation": observation_dict(o)} for o in rows]


# A plain "def" (not async) so FastAPI runs the slow YOLO call in a worker thread
# and the server stays responsive for other requests.
@router.post("/analyze", response_model=DetectionOut, status_code=http_status.HTTP_201_CREATED)
def analyze_image(
    camera_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    camera = db.get(Camera, camera_id)
    if camera is None:
        raise HTTPException(http_status.HTTP_404_NOT_FOUND, "Camera not found")

    # 1) Validate the upload: type, size, and that it really decodes as an image.
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(http_status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "Upload a JPEG, PNG or WebP image.")
    data = file.file.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise HTTPException(http_status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "Image is larger than 10 MB.")
    image = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
    if image is None:
        raise HTTPException(http_status.HTTP_400_BAD_REQUEST, "The file is not a readable image.")

    # 2) Run YOLO.
    try:
        boxes, annotated = detect_people(image)
    except Exception:
        log.exception("YOLO detection failed")
        raise HTTPException(http_status.HTTP_500_INTERNAL_SERVER_ERROR,
                            "Detection failed. Check the server log (first run needs internet to fetch the model).")

    # 3) Save files with random names (never trust the uploaded filename).
    name = uuid4().hex
    src_rel = f"crowd/{name}_src{ALLOWED_TYPES[file.content_type]}"
    ann_rel = f"crowd/{name}_det.jpg"
    (UPLOAD_DIR / src_rel).write_bytes(data)
    cv2.imwrite(str(UPLOAD_DIR / ann_rel), annotated, [cv2.IMWRITE_JPEG_QUALITY, 88])

    # 4) Count -> level -> save as an observation tied to the camera's map location.
    count = len(boxes)
    obs = CrowdObservation(
        camera_id=camera.id, person_count=count, level=classify_crowd(count),
        source_image=src_rel, annotated_image=ann_rel, is_simulated=False,
    )
    db.add(obs)
    db.commit()
    db.refresh(obs)
    # Phase 7 will broadcast a WebSocket "new crowd observation" message here.

    avg = round(sum(b["confidence"] for b in boxes) / count, 2) if count else None
    return {"observation": observation_dict(obs), "boxes": boxes, "avg_confidence": avg, "model": MODEL_NAME}