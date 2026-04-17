from flask import Flask, jsonify, request
from flask_cors import CORS
from config.config import Config
import os
import logging

from sqlalchemy import inspect, text
from werkzeug.middleware.proxy_fix import ProxyFix

from app.extensions import db, jwt, limiter, migrate
from app.models import TokenBlocklist, User
from app.roles import ROLE_PATIENT_SCHEDULER
from app.services.ai_service import AIService
from app.services.storage_service import StorageService


def _validate_production_secrets(app):
    if app.config.get("FLASK_ENV", "development").lower() != "production":
        return

    insecure = []
    if app.config.get("SECRET_KEY") == "dev-secret-key-change-in-production":
        insecure.append("SECRET_KEY")
    if app.config.get("JWT_SECRET_KEY") == "your-super-secret-jwt-key-for-development-32-chars-minimum":
        insecure.append("JWT_SECRET_KEY")

    if insecure:
        raise RuntimeError(
            "Missing production secrets. Configure: " + ", ".join(insecure)
        )


def ensure_demo_user():
    """Create the demo user once so frontend demo credentials keep working."""
    inspector = inspect(db.engine)
    if "users" not in inspector.get_table_names():
        return

    demo_email = "demo@eligio.ai"
    existing_user = User.query.filter_by(email=demo_email).first()
    if existing_user:
        return

    demo_user = User(
        email=demo_email,
        name="Demo User",
        role=ROLE_PATIENT_SCHEDULER,
    )
    demo_user.set_password("demo123")
    db.session.add(demo_user)
    db.session.commit()
    logging.info("Seeded default demo user.")


def create_app(test_config=None):
    app = Flask(__name__)
    
    # Load configuration
    app.config.from_object(Config)
    if test_config:
        app.config.update(test_config)
    _validate_production_secrets(app)

    # Initialize extensions
    CORS(app, origins=app.config["CORS_ORIGINS"])
    if app.config.get("TRUST_PROXY"):
        app.wsgi_app = ProxyFix(
            app.wsgi_app,
            x_for=1,
            x_proto=1,
            x_host=1,
            x_port=1,
        )
    db.init_app(app)
    jwt.init_app(app)
    limiter.init_app(app)
    migrate.init_app(app, db)
    app.storage_service = StorageService(app.config)
    app.ai_service = AIService()

    @jwt.token_in_blocklist_loader
    def is_token_revoked(jwt_header, jwt_payload):
        jti = jwt_payload.get("jti")
        if not jti:
            return False
        return db.session.query(TokenBlocklist.id).filter_by(jti=jti).scalar() is not None
    
    # Register blueprints
    from app.api.chat import chat_bp
    from app.api.referrals import referrals_bp
    from app.api.upload import upload_bp
    from app.api.auth import auth_bp
    
    app.register_blueprint(chat_bp, url_prefix='/api')
    app.register_blueprint(referrals_bp, url_prefix='/api')
    app.register_blueprint(upload_bp, url_prefix='/api')
    app.register_blueprint(auth_bp, url_prefix='/api')
    
    # Create upload directory if it doesn't exist
    if not os.path.exists(app.config['UPLOAD_FOLDER']):
        os.makedirs(app.config['UPLOAD_FOLDER'])

    with app.app_context():
        if app.config.get("AUTO_CREATE_TABLES", True):
            db.create_all()
        if app.config.get("SEED_DEMO_USER", False):
            try:
                ensure_demo_user()
            except Exception as exc:
                logging.warning("Could not seed demo user: %s", exc)

    @app.before_request
    def enforce_request_security():
        is_health_endpoint = request.endpoint in {"health_check", "readiness_check"}

        allowed_hosts = [host.lower() for host in app.config.get("ALLOWED_HOSTS", [])]
        if allowed_hosts and not is_health_endpoint:
            request_host = (request.host or "").split(":")[0].lower()
            if request_host not in allowed_hosts:
                return jsonify({"error": "Host not allowed"}), 400

        if app.config.get("FORCE_HTTPS"):
            forwarded_proto = request.headers.get("X-Forwarded-Proto", "")
            forwarded_proto = forwarded_proto.split(",")[0].strip().lower()
            is_https = request.is_secure or forwarded_proto == "https"
            if not is_https and not is_health_endpoint:
                return jsonify({"error": "HTTPS is required"}), 426

    @app.after_request
    def apply_security_headers(response):
        if not app.config.get("ENABLE_SECURITY_HEADERS", True):
            return response

        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "no-referrer")
        response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
        response.headers.setdefault("Cache-Control", "no-store")
        if app.config.get("FORCE_HTTPS"):
            response.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
        return response
    
    @app.route('/health')
    def health_check():
        return {'status': 'healthy', 'service': 'Eligio AI Backend'}

    @app.route('/ready')
    def readiness_check():
        try:
            db.session.execute(text("SELECT 1"))
            return {
                'status': 'ready',
                'service': 'Eligio AI Backend',
                'database': 'ok',
                'storage_provider': app.config.get('STORAGE_PROVIDER', 'local'),
            }
        except Exception as exc:
            return {
                'status': 'not_ready',
                'service': 'Eligio AI Backend',
                'error': str(exc),
            }, 503
    
    return app
