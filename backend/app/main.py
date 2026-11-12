# backend/app/main.py
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

import app.models  # noqa: F401  (registers all tables with SQLAlchemy)
from app.config import settings
from app.database import Base, SessionLocal, engine
from app.routers import dashboard, facilities, incidents, routes


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Creates any missing tables on startup. (In production we'd use Alembic migrations.)
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="CivicLens API",
    description="Geospatial Intelligence for Smarter Civic Operations.",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS: lets the React dev server (a different origin) call this API from the browser.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for module in (facilities, incidents, routes, dashboard):
    app.include_router(module.router)


@app.get("/api/health", tags=["System"])
def health():
    with SessionLocal() as db:
        postgis = db.execute(text("SELECT PostGIS_Version()")).scalar()
    return {"status": "ok", "postgis": postgis}