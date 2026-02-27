from flask import Flask
from flask_cors import CORS
from config.config import Config
import os
import logging

from app.extensions import db, jwt, migrate
from app.models import User


def ensure_demo_user():
    """Create the demo user once so frontend demo credentials keep working."""
    demo_email = "demo@eligio.ai"
    existing_user = User.query.filter_by(email=demo_email).first()
    if existing_user:
        return

    demo_user = User(
        email=demo_email,
        name="Demo User",
        role="provider",
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
    
    # Initialize extensions
    CORS(app, origins=app.config["CORS_ORIGINS"])
    db.init_app(app)
    jwt.init_app(app)
    migrate.init_app(app, db)
    
    # Register blueprints
    from app.api.chat import chat_bp
    from app.api.upload import upload_bp
    from app.api.auth import auth_bp
    
    app.register_blueprint(chat_bp, url_prefix='/api')
    app.register_blueprint(upload_bp, url_prefix='/api')
    app.register_blueprint(auth_bp, url_prefix='/api')
    
    # Create upload directory if it doesn't exist
    if not os.path.exists(app.config['UPLOAD_FOLDER']):
        os.makedirs(app.config['UPLOAD_FOLDER'])

    with app.app_context():
        if app.config.get("AUTO_CREATE_TABLES", True):
            db.create_all()
        try:
            ensure_demo_user()
        except Exception as exc:
            logging.warning("Could not seed demo user: %s", exc)
    
    @app.route('/health')
    def health_check():
        return {'status': 'healthy', 'service': 'Eligio AI Backend'}
    
    return app
