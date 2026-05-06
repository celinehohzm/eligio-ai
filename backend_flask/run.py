#!/usr/bin/env python3
"""
Eligio AI Backend Server
Main entry point for the Flask application
"""

import os
import sys

# Backend root (directory containing this file). Set path and .env before importing
# the app so `config.config.Config` reads the correct environment.
_ROOT = os.path.dirname(os.path.abspath(__file__))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

from dotenv import load_dotenv

load_dotenv(os.path.join(_ROOT, ".env"))

from app import create_app


def main():
    """Main function to run the Flask application"""

    app = create_app()
    
    # Get configuration
    host = os.environ.get('API_HOST', '0.0.0.0')
    port = int(os.environ.get('API_PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    
    print(f"🚀 Starting Eligio AI Backend Server")
    print(f"📍 Host: {host}")
    print(f"🔌 Port: {port}")
    print(f"🐛 Debug: {debug}")
    print(f"🌐 Environment: {os.environ.get('FLASK_ENV', 'development')}")
    print("=" * 50)
    
    # Run the application
    app.run(
        host=host,
        port=port,
        debug=debug
    )

if __name__ == '__main__':
    main()
