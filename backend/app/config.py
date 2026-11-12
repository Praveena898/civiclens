# backend/app/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Read from backend/.env (DATABASE_URL -> database_url, case-insensitive)
    database_url: str
    cors_origins: str = "http://localhost:5173"

    # DEMO crowd thresholds: minimum people-in-frame count for each level.
    # Below crowd_moderate_min -> "low". Override in .env if you want.
    crowd_moderate_min: int = 6
    crowd_high_min: int = 16
    crowd_critical_min: int = 31

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()