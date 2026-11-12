# backend/app/routers/cameras.py
from fastapi import APIRouter, Depends, HTTPException
from fastapi import status as http_status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Camera
from app.schemas.crowd import CameraCreate, CameraOut
from app.services.geo import make_point
from app.services.serializers import camera_dict

router = APIRouter(prefix="/api/cameras", tags=["Cameras"])


@router.get("", response_model=list[CameraOut])
def list_cameras(db: Session = Depends(get_db)):
    return [camera_dict(c) for c in db.query(Camera).order_by(Camera.id).all()]


@router.post("", response_model=CameraOut, status_code=http_status.HTTP_201_CREATED)
def create_camera(payload: CameraCreate, db: Session = Depends(get_db)):
    # The RTSP URL (it may contain a username/password) goes into the DB only. We never log or return it.
    camera = Camera(
        name=payload.name, rtsp_url=payload.rtsp_url, is_simulated=payload.is_simulated,
        location=make_point(payload.latitude, payload.longitude),
    )
    db.add(camera)
    db.commit()
    db.refresh(camera)
    return camera_dict(camera)


@router.delete("/{camera_id}", status_code=http_status.HTTP_204_NO_CONTENT)
def delete_camera(camera_id: int, db: Session = Depends(get_db)):
    camera = db.get(Camera, camera_id)
    if camera is None:
        raise HTTPException(http_status.HTTP_404_NOT_FOUND, "Camera not found")
    db.delete(camera)  # its observations are removed too (cascade)
    db.commit()