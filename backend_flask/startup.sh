#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="${APP_ROOT:-/home/site/wwwroot}"
EXTRACT_ROOT="${APP_EXTRACT_ROOT:-/tmp/eligio-app}"
PORT="${WEBSITES_PORT:-${PORT:-8000}}"
WORKERS="${GUNICORN_WORKERS:-2}"
TIMEOUT="${GUNICORN_TIMEOUT:-600}"
INSTALL_PDF_OCR_SYSTEM_PACKAGES_ON_STARTUP="${INSTALL_PDF_OCR_SYSTEM_PACKAGES_ON_STARTUP:-true}"

run_privileged() {
  if [[ "$(id -u)" == "0" ]]; then
    "$@"
    return
  fi

  if command -v sudo >/dev/null 2>&1; then
    sudo "$@"
    return
  fi

  return 1
}

ensure_pdf_ocr_system_dependencies() {
  local enable_pdf_ocr="${ENABLE_PDF_OCR:-true}"
  enable_pdf_ocr="$(printf '%s' "$enable_pdf_ocr" | tr '[:upper:]' '[:lower:]')"

  if [[ "$enable_pdf_ocr" != "1" && "$enable_pdf_ocr" != "true" && "$enable_pdf_ocr" != "yes" && "$enable_pdf_ocr" != "on" ]]; then
    echo "PDF OCR disabled; skipping system dependency install." >&2
    return
  fi

  local install_flag
  install_flag="$(printf '%s' "$INSTALL_PDF_OCR_SYSTEM_PACKAGES_ON_STARTUP" | tr '[:upper:]' '[:lower:]')"
  if [[ "$install_flag" != "1" && "$install_flag" != "true" && "$install_flag" != "yes" && "$install_flag" != "on" ]]; then
    echo "Startup OCR package installation disabled by app setting." >&2
    return
  fi

  if command -v tesseract >/dev/null 2>&1 && command -v gs >/dev/null 2>&1; then
    echo "OCR system dependencies already available." >&2
    return
  fi

  if ! command -v apt-get >/dev/null 2>&1; then
    echo "apt-get is unavailable; cannot install OCR system dependencies automatically." >&2
    return
  fi

  if ! run_privileged true >/dev/null 2>&1; then
    echo "No privileged execution path available; cannot install OCR system dependencies automatically." >&2
    return
  fi

  echo "Installing OCR system dependencies (tesseract-ocr, tesseract-ocr-eng, ghostscript)..." >&2
  export DEBIAN_FRONTEND=noninteractive
  run_privileged apt-get update -y
  run_privileged apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-eng \
    ghostscript
}

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

ensure_pdf_ocr_system_dependencies

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
