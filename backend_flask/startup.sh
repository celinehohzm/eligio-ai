#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

export FLASK_APP="${FLASK_APP:-app:create_app}"

echo "Applying database migrations..."
python -m flask db upgrade

echo "Starting Gunicorn..."
exec gunicorn \
  --bind "0.0.0.0:${PORT:-8000}" \
  --workers "${GUNICORN_WORKERS:-2}" \
  --timeout "${GUNICORN_TIMEOUT:-120}" \
  wsgi:app
