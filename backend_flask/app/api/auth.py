from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from datetime import timedelta
from config.config import Config
import logging

auth_bp = Blueprint('auth', __name__)

# Mock user database (in production, use a real database)
USERS = {
    'demo@eligio.ai': {
        'password': 'demo123',  # In production, use hashed passwords
        'name': 'Demo User',
        'role': 'provider'
    }
}

@auth_bp.route('/auth/login', methods=['POST'])
def login():
    """Authenticate user and return JWT token"""
    try:
        data = request.get_json()
        
        if not data or 'email' not in data or 'password' not in data:
            return jsonify({'error': 'Email and password are required'}), 400
        
        email = data['email']
        password = data['password']
        
        # Validate credentials
        user = USERS.get(email)
        if not user or user['password'] != password:
            return jsonify({'error': 'Invalid credentials'}), 401
        
        # Create access token
        access_token = create_access_token(
            identity=email,
            expires_delta=timedelta(seconds=Config.JWT_ACCESS_TOKEN_EXPIRES)
        )
        
        return jsonify({
            'access_token': access_token,
            'token_type': 'Bearer',
            'expires_in': Config.JWT_ACCESS_TOKEN_EXPIRES,
            'user': {
                'email': email,
                'name': user['name'],
                'role': user['role']
            }
        })
        
    except Exception as e:
        logging.error(f"Login error: {str(e)}")
        return jsonify({'error': 'Login failed'}), 500

@auth_bp.route('/auth/register', methods=['POST'])
def register():
    """Register a new user"""
    try:
        data = request.get_json()
        
        required_fields = ['email', 'password', 'name']
        missing_fields = [field for field in required_fields if field not in data]
        
        if missing_fields:
            return jsonify({'error': f'Missing required fields: {", ".join(missing_fields)}'}), 400
        
        email = data['email']
        password = data['password']
        name = data['name']
        
        # Check if user already exists
        if email in USERS:
            return jsonify({'error': 'User already exists'}), 409
        
        # Create new user (in production, hash password)
        USERS[email] = {
            'password': password,  # In production, use hashed passwords
            'name': name,
            'role': data.get('role', 'provider')
        }
        
        logging.info(f"New user registered: {email}")
        
        return jsonify({
            'message': 'User registered successfully',
            'user': {
                'email': email,
                'name': name,
                'role': USERS[email]['role']
            }
        }), 201
        
    except Exception as e:
        logging.error(f"Registration error: {str(e)}")
        return jsonify({'error': 'Registration failed'}), 500

@auth_bp.route('/auth/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """Get current user information"""
    try:
        current_email = get_jwt_identity()
        user = USERS.get(current_email)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify({
            'email': current_email,
            'name': user['name'],
            'role': user['role']
        })
        
    except Exception as e:
        logging.error(f"Get user error: {str(e)}")
        return jsonify({'error': 'Failed to get user information'}), 500

@auth_bp.route('/auth/refresh', methods=['POST'])
@jwt_required(refresh=True)
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
def logout():
    """Logout user (token invalidation would be handled client-side)"""
    return jsonify({'message': 'Successfully logged out'})

@auth_bp.route('/auth/health', methods=['GET'])
def auth_health():
    """Health check endpoint for auth service"""
    return jsonify({
        'status': 'healthy',
        'service': 'Authentication Service',
        'jwt_configured': bool(Config.JWT_SECRET_KEY)
    })
