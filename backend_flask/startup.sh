#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="${APP_ROOT:-/home/site/wwwroot}"
EXTRACT_ROOT="${APP_EXTRACT_ROOT:-/tmp/eligio-app}"
PORT="${WEBSITES_PORT:-${PORT:-8000}}"
WORKERS="${GUNICORN_WORKERS:-2}"
TIMEOUT="${GUNICORN_TIMEOUT:-600}"

resolve_runtime_root() {
  if [[ -f "$APP_ROOT/wsgi.py" && -d "$APP_ROOT/app" ]]; then
    printf '%s\n' "$APP_ROOT"
    return
  fi

  if [[ -f "$APP_ROOT/output.tar.zst" ]]; then
    echo "Extracting Oryx build artifact to $EXTRACT_ROOT" >&2
    rm -rf "$EXTRACT_ROOT"
    mkdir -p "$EXTRACT_ROOT"
    zstd -dc "$APP_ROOT/output.tar.zst" | tar -xf - -C "$EXTRACT_ROOT"
    printf '%s\n' "$EXTRACT_ROOT"
    return
  fi

  if [[ -f "$APP_ROOT/output.tar.gz" ]]; then
    echo "Extracting Oryx build artifact to $EXTRACT_ROOT" >&2
    rm -rf "$EXTRACT_ROOT"
    mkdir -p "$EXTRACT_ROOT"
    tar -xzf "$APP_ROOT/output.tar.gz" -C "$EXTRACT_ROOT"
    printf '%s\n' "$EXTRACT_ROOT"
    return
  fi

  if [[ -f "/home/site/startup.sh" ]]; then
    cd "$(dirname "$0")"
    printf '%s\n' "$(pwd)"
    return
  fi

  printf '%s\n' "$APP_ROOT"
}

RUNTIME_ROOT="$(resolve_runtime_root)"
cd "$RUNTIME_ROOT"

PYTHON_BIN="${PYTHON_BIN:-python}"

if [[ -x "$RUNTIME_ROOT/antenv/bin/python" ]]; then
  PYTHON_BIN="$RUNTIME_ROOT/antenv/bin/python"
fi

export PYTHONPATH="$RUNTIME_ROOT${PYTHONPATH:+:$PYTHONPATH}"
export FLASK_APP="${FLASK_APP:-app:create_app}"

echo "Startup runtime root: $RUNTIME_ROOT" >&2
echo "Startup python: $PYTHON_BIN" >&2
ls -la "$RUNTIME_ROOT" | sed -n '1,40p' >&2

"$PYTHON_BIN" -c 'import os, sys, wsgi; print(f"Startup import check cwd={os.getcwd()}", file=sys.stderr); print(f"Startup import check path={sys.path[:5]}", file=sys.stderr); print("Startup import check ok", file=sys.stderr)'

if [[ "${RUN_DB_MIGRATIONS_ON_STARTUP:-false}" == "true" ]]; then
  echo "Applying database migrations..."
  "$PYTHON_BIN" -m flask db upgrade
else
  echo "Skipping database migrations on startup."
fi

echo "Starting Gunicorn from $RUNTIME_ROOT"
exec "$PYTHON_BIN" -m gunicorn \
  --bind "0.0.0.0:${PORT}" \
  --workers "$WORKERS" \
  --timeout "$TIMEOUT" \
  --access-logfile - \
  --error-logfile - \
  wsgi:app
