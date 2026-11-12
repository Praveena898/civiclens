# backend/app/paths.py
from pathlib import Path

# backend/uploads/  (the folder we created in Phase 2)
UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"
(UPLOAD_DIR / "crowd").mkdir(parents=True, exist_ok=True)