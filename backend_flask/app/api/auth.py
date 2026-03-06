from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, create_refresh_token, get_jwt, get_jwt_identity, jwt_required
from datetime import timedelta
from config.config import Config
import logging

from app.extensions import db, limiter
from app.models import TokenBlocklist, User

auth_bp = Blueprint('auth', __name__)


def normalize_email(raw_email):
    return (raw_email or "").strip().lower()

@auth_bp.route('/auth/login', methods=['POST'])
@limiter.limit("15 per minute")
def login():
    """Authenticate user and return JWT token"""
    try:
        data = request.get_json(silent=True) or {}
        
        if not data or 'email' not in data or 'password' not in data:
            return jsonify({'error': 'Email and password are required'}), 400
        
        email = normalize_email(data['email'])
        password = data['password']
        
        # Validate credentials
        user = User.query.filter_by(email=email).first()
        if not user or not user.check_password(password):
            return jsonify({'error': 'Invalid credentials'}), 401
        
        # Create access token
        access_token = create_access_token(
            identity=email,
            expires_delta=timedelta(seconds=Config.JWT_ACCESS_TOKEN_EXPIRES)
        )
        refresh_token = create_refresh_token(
            identity=email,
            expires_delta=timedelta(seconds=Config.JWT_REFRESH_TOKEN_EXPIRES)
        )
        
        return jsonify({
            'access_token': access_token,
            'refresh_token': refresh_token,
            'token_type': 'Bearer',
            'expires_in': Config.JWT_ACCESS_TOKEN_EXPIRES,
            'user': user.to_dict()
        })
        
    except Exception as e:
        logging.error(f"Login error: {str(e)}")
        return jsonify({'error': 'Login failed'}), 500

@auth_bp.route('/auth/register', methods=['POST'])
@limiter.limit("10 per minute")
def register():
    """Register a new user"""
    try:
        data = request.get_json(silent=True) or {}
        
        required_fields = ['email', 'password', 'name']
        missing_fields = [field for field in required_fields if not data.get(field)]
        
        if missing_fields:
            return jsonify({'error': f'Missing required fields: {", ".join(missing_fields)}'}), 400
        
        email = normalize_email(data['email'])
        password = data['password']
        name = data['name'].strip()

        if len(password) < 8:
            return jsonify({'error': 'Password must be at least 8 characters'}), 400
        
        # Check if user already exists
        if User.query.filter_by(email=email).first():
            return jsonify({'error': 'User already exists'}), 409
        
        # Create new user
        user = User(
            email=email,
            name=name,
            role=data.get('role', 'provider')
        )
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        
        logging.info(f"New user registered: {email}")
        
        return jsonify({
            'message': 'User registered successfully',
            'user': user.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logging.error(f"Registration error: {str(e)}")
        return jsonify({'error': 'Registration failed'}), 500

@auth_bp.route('/auth/me', methods=['GET'])
@jwt_required()
@limiter.limit("120 per minute")
def get_current_user():
    """Get current user information"""
    try:
        current_email = get_jwt_identity()
        user = User.query.filter_by(email=current_email).first()
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify(user.to_dict())
        
    except Exception as e:
        logging.error(f"Get user error: {str(e)}")
        return jsonify({'error': 'Failed to get user information'}), 500

@auth_bp.route('/auth/refresh', methods=['POST'])
@jwt_required(refresh=True)
@limiter.limit("30 per minute")
def refresh():
    """Refresh JWT token"""
    try:
        current_email = get_jwt_identity()
        new_token = create_access_token(
            identity=current_email,
            expires_delta=timedelta(seconds=Config.JWT_ACCESS_TOKEN_EXPIRES)
        )
        
        return jsonify({
            'access_token': new_token,
            'token_type': 'Bearer',
            'expires_in': Config.JWT_ACCESS_TOKEN_EXPIRES
        })
        
    except Exception as e:
        logging.error(f"Token refresh error: {str(e)}")
        return jsonify({'error': 'Token refresh failed'}), 500

@auth_bp.route('/auth/logout', methods=['POST'])
@jwt_required()
@limiter.limit("30 per minute")
def logout():
    """Logout user by revoking current token"""
    try:
        token_payload = get_jwt()
        token_jti = token_payload.get("jti")
        token_type = token_payload.get("type", "access")
        if token_jti:
            db.session.add(TokenBlocklist(jti=token_jti, token_type=token_type))
            db.session.commit()
        return jsonify({'message': 'Successfully logged out'})
    except Exception as e:
        db.session.rollback()
        logging.error(f"Logout error: {str(e)}")
        return jsonify({'error': 'Logout failed'}), 500

@auth_bp.route('/auth/health', methods=['GET'])
def auth_health():
    """Health check endpoint for auth service"""
    return jsonify({
        'status': 'healthy',
        'service': 'Authentication Service',
        'jwt_configured': bool(Config.JWT_SECRET_KEY),
        'database_configured': bool(Config.SQLALCHEMY_DATABASE_URI)
    })
