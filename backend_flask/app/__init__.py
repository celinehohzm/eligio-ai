from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from config.config import Config
import os

def create_app():
    app = Flask(__name__)
    
    # Load configuration
    app.config.from_object(Config)
    
    # Initialize extensions
    CORS(app)
    jwt = JWTManager(app)
    
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
    
    @app.route('/health')
    def health_check():
        return {'status': 'healthy', 'service': 'Eligio AI Backend'}
    
    return app
