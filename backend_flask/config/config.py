import os
from dotenv import load_dotenv

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
load_dotenv(os.path.join(BASE_DIR, ".env"))


def _parse_csv_env(name):
    raw_value = os.environ.get(name, "")
    return [item.strip() for item in raw_value.split(",") if item.strip()]


def _env_bool(name, default=False):
    raw_value = os.environ.get(name)
    if raw_value is None:
        return default
    return raw_value.strip().lower() in {"1", "true", "yes", "on"}


def _env_stripped(name, default=None, empty_as_none=False):
    raw_value = os.environ.get(name)
    if raw_value is None:
        return default

    normalized = raw_value.strip()
    if empty_as_none and normalized == "":
        return None
    return normalized


def _default_cors_origins():
    """Use explicit CORS in production, localhost-only defaults in development."""
    configured_origins = _parse_csv_env("CORS_ORIGINS")
    if configured_origins:
        return configured_origins

    if os.environ.get("FLASK_ENV", "development").lower() == "production":
        return [
            "https://eligio.net",
            "https://www.eligio.net",
        ]

    return [
        r"http://localhost:\d+",
        r"http://127\.0\.0\.1:\d+",
    ]


def _database_uri():
    configured_uri = os.environ.get("DATABASE_URL")
    if configured_uri:
        if configured_uri.startswith("postgres://"):
            return configured_uri.replace("postgres://", "postgresql://", 1)
        return configured_uri

    return f"sqlite:///{os.path.join(BASE_DIR, 'eligio.db')}"

class Config:
    """Application configuration class"""
    
    # Flask Configuration
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    DEBUG = _env_bool('FLASK_DEBUG', False)
    
    # API Configuration
    HOST = os.environ.get('API_HOST', '0.0.0.0')
    PORT = int(os.environ.get('API_PORT', 5000))

    # Database Configuration
    SQLALCHEMY_DATABASE_URI = _database_uri()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True}
    if SQLALCHEMY_DATABASE_URI.startswith("postgresql"):
        SQLALCHEMY_ENGINE_OPTIONS["connect_args"] = {"connect_timeout": 10}
    AUTO_CREATE_TABLES = _env_bool(
        "AUTO_CREATE_TABLES",
        os.environ.get("FLASK_ENV", "development").lower() != "production",
    )
    
    # OpenAI Configuration
    OPENAI_API_KEY = _env_stripped('OPENAI_API_KEY', empty_as_none=True)
    OPENAI_MODEL = _env_stripped('OPENAI_MODEL', default='gpt-4o-mini') or 'gpt-4o-mini'
    
    # JWT Configuration
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or 'your-super-secret-jwt-key-for-development-32-chars-minimum'
    JWT_ACCESS_TOKEN_EXPIRES = int(os.environ.get('JWT_ACCESS_TOKEN_EXPIRES', 3600))
    JWT_REFRESH_TOKEN_EXPIRES = int(os.environ.get('JWT_REFRESH_TOKEN_EXPIRES', 1209600))  # 14 days
    JWT_TOKEN_LOCATION = ['headers']
    
    # File Upload Configuration
    UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER', 'uploads')
    MAX_CONTENT_LENGTH = int(os.environ.get('MAX_CONTENT_LENGTH', 16 * 1024 * 1024))  # 16MB
    ALLOWED_EXTENSIONS = set(os.environ.get('ALLOWED_EXTENSIONS', 'pdf,doc,docx,jpg,jpeg,png').split(','))
    UPLOAD_API_KEY = os.environ.get("UPLOAD_API_KEY")
    STORAGE_PROVIDER = os.environ.get("STORAGE_PROVIDER", "local").lower()
    AZURE_STORAGE_CONNECTION_STRING = os.environ.get("AZURE_STORAGE_CONNECTION_STRING")
    AZURE_STORAGE_CONTAINER = os.environ.get("AZURE_STORAGE_CONTAINER", "uploads")
    
    # Rate limiting
    RATELIMIT_STORAGE_URI = os.environ.get("RATELIMIT_STORAGE_URI", "memory://")
    RATELIMIT_HEADERS_ENABLED = _env_bool("RATELIMIT_HEADERS_ENABLED", True)
    DEFAULT_RATE_LIMITS = _parse_csv_env("DEFAULT_RATE_LIMITS") or ["300 per hour", "100 per minute"]
    
    # CORS Configuration
    CORS_ORIGINS = _default_cors_origins()

    # Security Hardening
    FLASK_ENV = os.environ.get("FLASK_ENV", "development")
    TRUST_PROXY = _env_bool("TRUST_PROXY", FLASK_ENV.lower() == "production")
    FORCE_HTTPS = _env_bool("FORCE_HTTPS", FLASK_ENV.lower() == "production")
    ENABLE_SECURITY_HEADERS = _env_bool("ENABLE_SECURITY_HEADERS", True)
    ALLOWED_HOSTS = _parse_csv_env("ALLOWED_HOSTS")
    SEED_DEMO_USER = _env_bool(
        "SEED_DEMO_USER",
        os.environ.get("FLASK_ENV", "development").lower() != "production",
    )
