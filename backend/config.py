import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    # MongoDB settings
    # Default to local mongodb container for ease of onboarding
    MONGODB_URI: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "vayudrishti"

    # API Keys
    OPENWEATHERMAP_API_KEY: str = ""
    AQICN_API_KEY: str = ""
    TOMTOM_API_KEY: str = ""
    NASA_FIRMS_MAP_KEY: str = ""
    GEMINI_API_KEY: str = ""

    # App Config
    ENVIRONMENT: str = "development"
    CORS_ORIGINS: str = "http://localhost:5173"
    PORT: int = 8000
    HOST: str = "0.0.0.0"

    # Model Configuration to read from .env file
    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(__file__), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

settings = Settings()
