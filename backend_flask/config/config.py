import os
from dotenv import load_dotenv

load_dotenv()


def _default_cors_origins():
    """Allow localhost/127.0.0.1 on any port for local frontend dev."""
    configured_origins = os.environ.get('CORS_ORIGINS')
    if configured_origins:
        return [origin.strip() for origin in configured_origins.split(',') if origin.strip()]

    return [
        r"http://localhost:\d+",
        r"http://127\.0\.0\.1:\d+",
    ]

class Config:
    """Application configuration class"""
    
    # Flask Configuration
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    DEBUG = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    
    # API Configuration
    HOST = os.environ.get('API_HOST', '0.0.0.0')
    PORT = int(os.environ.get('API_PORT', 5000))
    
    # OpenAI Configuration
    OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')
    OPENAI_MODEL = os.environ.get('OPENAI_MODEL', 'gpt-4-turbo-preview')
    
    # JWT Configuration
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or 'your-super-secret-jwt-key-for-development-32-chars-minimum'
    JWT_ACCESS_TOKEN_EXPIRES = int(os.environ.get('JWT_ACCESS_TOKEN_EXPIRES', 3600))
    
    # File Upload Configuration
    UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER', 'uploads')
    MAX_CONTENT_LENGTH = int(os.environ.get('MAX_CONTENT_LENGTH', 16 * 1024 * 1024))  # 16MB
    ALLOWED_EXTENSIONS = set(os.environ.get('ALLOWED_EXTENSIONS', 'pdf,doc,docx,jpg,jpeg,png').split(','))
    
    # CORS Configuration
    CORS_ORIGINS = _default_cors_origins()
