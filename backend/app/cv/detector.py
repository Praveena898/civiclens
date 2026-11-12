# backend/app/cv/detector.py
from functools import lru_cache

import cv2

MODEL_NAME = "yolov8n.pt"   # pretrained; auto-downloaded (~6 MB) on first use
PERSON_CLASS_ID = 0         # class 0 = "person" in the COCO dataset
CONFIDENCE = 0.25           # ignore detections the model is less sure about
MAX_SIDE = 1600             # shrink huge photos so CPU inference stays fast
TEAL_BGR = (166, 184, 20)   # OpenCV colours are BGR, not RGB


@lru_cache(maxsize=1)
def get_model():
    """Load YOLO once and reuse it. Imported lazily so the API still starts if torch has a problem."""
    from ultralytics import YOLO
    return YOLO(MODEL_NAME)


def detect_people(image_bgr):
    """Return (boxes, annotated_image). image_bgr is what cv2.imdecode produces."""
    h, w = image_bgr.shape[:2]
    scale = min(1.0, MAX_SIDE / max(h, w))
    if scale < 1.0:
        image_bgr = cv2.resize(image_bgr, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)

    # classes=[0] -> only people. imgsz=1280 helps find small people in crowd photos.
    result = get_model().predict(
        image_bgr, classes=[PERSON_CLASS_ID], conf=CONFIDENCE, imgsz=1280, verbose=False
    )[0]

    annotated = image_bgr.copy()
    thickness = max(2, round(max(annotated.shape[:2]) / 500))
    boxes = []
    for b in result.boxes:
        x1, y1, x2, y2 = (int(v) for v in b.xyxy[0].tolist())
        conf = float(b.conf[0])
        boxes.append({"x1": x1, "y1": y1, "x2": x2, "y2": y2, "confidence": round(conf, 2)})
        cv2.rectangle(annotated, (x1, y1), (x2, y2), TEAL_BGR, thickness)

    # Confidence labels only when there are few boxes (otherwise the picture gets unreadable).
    if len(boxes) <= 25:
        for b in boxes:
            cv2.putText(annotated, f"{b['confidence']:.2f}", (b["x1"], max(14, b["y1"] - 6)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5 * thickness / 2 + 0.3, TEAL_BGR, 1, cv2.LINE_AA)

    # Banner with the count in the top-left corner.
    label = f"People: {len(boxes)}"
    scale_txt = max(0.8, thickness / 2)
    (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, scale_txt, 2)
    cv2.rectangle(annotated, (0, 0), (tw + 20, th + 20), (45, 27, 15), -1)
    cv2.putText(annotated, label, (10, th + 8), cv2.FONT_HERSHEY_SIMPLEX, scale_txt,
                (255, 255, 255), 2, cv2.LINE_AA)
    return boxes, annotated