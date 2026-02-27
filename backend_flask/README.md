# Eligio AI Backend

A Python Flask backend service for the Eligio AI patient triaging application.

## Features

- **AI Chat Service**: Patient triaging with OpenAI integration
- **Document Upload**: Medical document processing and storage
- **Authentication**: JWT-based user authentication with persistent users
- **Database Persistence**: SQLAlchemy models for users, submissions, and documents
- **File Management**: Secure file upload and validation

## API Endpoints

### Chat Service
- `POST /api/ai-chat` - AI-powered patient triaging chat
- `GET /api/chat/health` - Chat service health check

### Document Upload
- `POST /api/upload-documents` - Upload medical documents
- `GET /api/document-categories` - Get document categories
- `GET /api/submissions/<id>` - Get submission details
- `GET /api/upload/health` - Upload service health check

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/logout` - User logout

## Setup

1. **Install Dependencies**
   ```bash
   cd backend_flask
   pip install -r requirements.txt
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Required Environment Variables**
   ```
   OPENAI_API_KEY=your-openai-api-key
   SECRET_KEY=your-flask-secret-key
   JWT_SECRET_KEY=your-jwt-secret-key
   DATABASE_URL=postgresql+psycopg2://user:password@server.postgres.database.azure.com:5432/eligio?sslmode=require
   ```

   Notes:
   - Leave `DATABASE_URL` empty to use local SQLite (`backend_flask/eligio.db`).
   - Set `AUTO_CREATE_TABLES=true` for auto table creation during local development.

4. **Run the Server**
   ```bash
   python run.py
   ```

The server will start on `http://localhost:5000`

## Development

### Project Structure
```
backend_flask/
├── app/
│   ├── api/          # API blueprints
│   ├── services/     # Business logic services
│   ├── utils/        # Utility functions
│   └── __init__.py   # Flask app factory
├── config/
│   └── config.py     # Configuration settings
├── uploads/          # File upload directory
├── tests/            # Test files
├── requirements.txt  # Python dependencies
└── run.py           # Application entry point
```

### Testing
```bash
# Run all tests
python -m pytest tests/

# Run specific test
python -m pytest tests/test_chat.py
```

### Database Notes

- On startup, the app auto-creates tables when `AUTO_CREATE_TABLES=true`.
- The backend seeds a default demo account if missing:
  - `demo@eligio.ai / demo123`
- For Azure PostgreSQL, use a connection string in `DATABASE_URL` with `sslmode=require`.

### API Documentation

#### AI Chat Endpoint
```bash
curl -X POST http://localhost:5000/api/ai-chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Patient has chest pain and shortness of breath"}
    ]
  }'
```

#### Document Upload Endpoint
```bash
curl -X POST http://localhost:5000/api/upload-documents \
  -F "fullName=John Doe" \
  -F "age=45" \
  -F "dateOfBirth=1980-01-01" \
  -F "address=123 Main St" \
  -F "phoneNumber=555-123-4567" \
  -F "file_0=@document.pdf"
```

## Security Notes

- All file uploads are validated for type and size
- JWT tokens are used for authentication
- Environment variables store sensitive configuration
- CORS is configured for frontend integration

## Deployment

For production deployment:

1. Set `FLASK_ENV=production`
2. Use a WSGI server like Gunicorn
3. Configure proper logging
4. Set up database for persistent storage
5. Use environment-specific configuration

## License

© 2024 Eligio AI. All rights reserved.
