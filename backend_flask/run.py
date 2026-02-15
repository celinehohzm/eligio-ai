#!/usr/bin/env python3
"""
Eligio AI Backend Server
Main entry point for the Flask application
"""

import os
import sys
from app import create_app

def main():
    """Main function to run the Flask application"""
    
    # Add the project root to Python path
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    
    # Create Flask app
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
