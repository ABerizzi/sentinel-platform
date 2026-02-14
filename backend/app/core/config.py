"""
Application configuration loaded from environment variables.
"""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "Sentinel Agency Platform"
    APP_VERSION: str = "1.1.0"
    DEBUG: bool = False
    SECRET_KEY: str = "CHANGE-ME-IN-PRODUCTION"
    
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://localhost:5432/sentinel"
    
    # Redis (for background jobs)
    REDIS_URL: str = "redis://localhost:6379"
    
    # Auth
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 hours
    ALGORITHM: str = "HS256"
    
    # Microsoft 365 / Graph API
    MICROSOFT_CLIENT_ID: Optional[str] = None
    MICROSOFT_CLIENT_SECRET: Optional[str] = None
    MICROSOFT_TENANT_ID: Optional[str] = None
    MICROSOFT_REDIRECT_URI: str = "http://localhost:8000/api/auth/microsoft/callback"
    
    # Review URLs (configured by admin)
    GOOGLE_REVIEW_URL: Optional[str] = None
    ALLSTATE_REVIEW_URL: Optional[str] = None
    
    # Agency Info (used in templates)
    AGENCY_NAME: str = "Sentinel Insurance, LLC"
    AGENCY_PHONE: str = ""
    AGENCY_EMAIL: str = ""
    
    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
