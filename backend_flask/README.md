# Eligio AI Backend (Flask)

Flask API for auth, AI chat, and medical document upload.

## Core Capabilities

- JWT auth with DB-backed users (register/login/me/refresh/logout)
- AI chat endpoint with streaming support
- Document uploads with metadata persistence
- Storage abstraction:
  - local disk (dev)
  - Azure Blob Storage (prod)
- SQLAlchemy + Flask-Migrate for PostgreSQL/SQLite
- Rate limiting (Flask-Limiter)
- Production hardening hooks (CORS allowlist, host allowlist, HTTPS enforcement, security headers)

## API Endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `POST /api/ai-chat`
- `POST /api/upload-documents`
- `GET /api/document-categories`
- `GET /api/submissions/<id>`
- `GET /health`
- `GET /ready`

## Local Setup

1. Install dependencies
```bash
cd backend_flask
sudo apt-get update
sudo apt-get install -y tesseract-ocr ghostscript
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

2. Configure environment
```bash
cp .env.example .env
```

3. Run migrations (recommended)
```bash
export FLASK_APP=app:create_app
flask db upgrade
```

4. Start development server
```bash
python run.py
```

Backend runs on `http://localhost:5000` by default.

## Database Modes

- Local default: SQLite (`backend_flask/eligio.db`) when `DATABASE_URL` is empty
- Production recommended: Azure PostgreSQL via `DATABASE_URL`

Example:
```env
DATABASE_URL=postgresql+psycopg2://user:password@server.postgres.database.azure.com:5432/eligio?sslmode=require
AUTO_CREATE_TABLES=false
```

## Storage Modes

- `STORAGE_PROVIDER=local`: files saved under `UPLOAD_FOLDER`
- `STORAGE_PROVIDER=azure`: files saved to Azure Blob Storage

Required for Azure Blob mode:

```env
AZURE_STORAGE_CONNECTION_STRING=...
AZURE_STORAGE_CONTAINER=uploads
```

## OCR for Scanned PDFs

- Native PDF text extraction is attempted first.
- If the extracted text is missing or very short, the backend can fall back to OCRmyPDF + Tesseract and store the searchable OCR-enhanced PDF.
- OCR requires both the Python package in `requirements.txt` and system binaries for Tesseract + Ghostscript.

Relevant environment variables:

```env
ENABLE_PDF_OCR=true
PDF_OCR_LANGUAGE=eng
PDF_OCR_TRIGGER_MIN_CHARS=32
PDF_OCR_TESSERACT_TIMEOUT=180
PDF_OCR_PROCESS_TIMEOUT=240
```

## Production Notes

Set at minimum:

```env
FLASK_ENV=production
FLASK_DEBUG=false
AUTO_CREATE_TABLES=false
CORS_ORIGINS=https://eligio.net,https://www.eligio.net
ALLOWED_HOSTS=api.eligio.net,<your-app>.azurewebsites.net
TRUST_PROXY=true
FORCE_HTTPS=true
ENABLE_SECURITY_HEADERS=true
```

Start with Gunicorn + migrations:

```bash
bash startup.sh
```

`startup.sh` runs:
1. `flask db upgrade`
2. `gunicorn --bind 0.0.0.0:$PORT wsgi:app`

## Testing

```bash
python -m pytest tests -q
```

## Security Guidance

- Never commit `.env` or secrets
- Store secrets in Azure Key Vault for production
- Rotate exposed API keys immediately
- Do not accept real PHI in public production until compliance controls are completed
