# backend/verify_db.py
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()
engine = create_engine(os.environ["DATABASE_URL"])

with engine.connect() as conn:
    print("PostGIS:", conn.execute(text("SELECT PostGIS_Version();")).scalar())
    dist = conn.execute(text("""
        SELECT ST_Distance(
            ST_SetSRID(ST_MakePoint(77.5946, 12.9716), 4326)::geography,
            ST_SetSRID(ST_MakePoint(77.6046, 12.9716), 4326)::geography
        );
    """)).scalar()
    print("Distance (m):", round(dist))