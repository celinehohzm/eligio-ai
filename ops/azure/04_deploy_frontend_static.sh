#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/_common.sh"

require_az_login
require_tool node
require_tool npm
require_env AZ_SUBSCRIPTION_ID AZ_RESOURCE_GROUP AZ_STATIC_WEBAPP_NAME

set_subscription

repo_root="$(cd "$SCRIPT_DIR/../.." && pwd)"
frontend_dir="$repo_root/front_react"
[ -d "$frontend_dir" ] || fail "Frontend directory not found: $frontend_dir"

VITE_API_BASE_URL="${VITE_API_BASE_URL:-https://api.eligio.net/api}"

log "Installing frontend dependencies"
(
  cd "$frontend_dir"
  npm ci
)

log "Building frontend with VITE_API_BASE_URL=$VITE_API_BASE_URL"
(
  cd "$frontend_dir"
  VITE_API_BASE_URL="$VITE_API_BASE_URL" npm run build
)

deployment_token="$(az staticwebapp secrets list \
  --name "$AZ_STATIC_WEBAPP_NAME" \
  --resource-group "$AZ_RESOURCE_GROUP" \
  --query properties.apiKey -o tsv)"

if [ -z "$deployment_token" ]; then
  fail "Could not obtain Static Web App deployment token."
fi

log "Deploying static frontend assets"
if az staticwebapp upload -h >/dev/null 2>&1 && az staticwebapp upload \
  --name "$AZ_STATIC_WEBAPP_NAME" \
  --resource-group "$AZ_RESOURCE_GROUP" \
  --source "$frontend_dir/dist" \
  --deployment-token "$deployment_token" \
  --output none; then
  log "Frontend upload completed with az staticwebapp upload."
else
  swa_cmd=""

  if command -v swa >/dev/null 2>&1; then
    swa_cmd="$(command -v swa)"
  else
    swa_cli_dir="${SWA_CLI_INSTALL_DIR:-/tmp/eligio-swa-cli}"
    log "Installing Static Web Apps CLI to ${swa_cli_dir}"
    rm -rf "$swa_cli_dir"
    mkdir -p "$swa_cli_dir"
    npm install --prefix "$swa_cli_dir" @azure/static-web-apps-cli@latest >/dev/null
    swa_cmd="$swa_cli_dir/node_modules/.bin/swa"
  fi

  if [ ! -x "$swa_cmd" ]; then
    fail "Frontend upload failed because SWA CLI is unavailable after installation."
  fi

  log "Using SWA CLI fallback for frontend deployment"
  (
    cd "$frontend_dir"
    "$swa_cmd" deploy dist --deployment-token "$deployment_token" --env production
  )
fi

frontend_host="$(az staticwebapp show --name "$AZ_STATIC_WEBAPP_NAME" --resource-group "$AZ_RESOURCE_GROUP" --query defaultHostname -o tsv)"
log "Frontend deployed: https://${frontend_host}"
