#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/_common.sh"

require_az_login
require_tool zip
require_tool curl
require_env AZ_SUBSCRIPTION_ID AZ_RESOURCE_GROUP AZ_BACKEND_WEBAPP

set_subscription

repo_root="$(cd "$SCRIPT_DIR/../.." && pwd)"
backend_dir="$repo_root/backend_flask"
[ -d "$backend_dir" ] || fail "Backend directory not found: $backend_dir"

deploy_zip="${DEPLOY_ZIP:-/tmp/eligio-backend-$(date +%s).zip}"
rm -f "$deploy_zip"

log "Packaging backend for deployment: $deploy_zip"
(
  cd "$backend_dir"
  zip -r "$deploy_zip" . \
    -x \
      ".venv/*" \
      "venv/*" \
      "__pycache__/*" \
      "*.pyc" \
      ".pytest_cache/*" \
      "tests/*" \
      "uploads/*" \
      "eligio.db" \
      ".env" \
      ".env.*"
)

log "Deploying backend zip to Azure App Service"
az webapp deploy \
  --resource-group "$AZ_RESOURCE_GROUP" \
  --name "$AZ_BACKEND_WEBAPP" \
  --src-path "$deploy_zip" \
  --type zip \
  --restart true \
  --output none

backend_host="$(az webapp show --resource-group "$AZ_RESOURCE_GROUP" --name "$AZ_BACKEND_WEBAPP" --query defaultHostName -o tsv)"
ready_url="https://${backend_host}/ready"

log "Waiting for backend readiness: $ready_url"
for attempt in $(seq 1 25); do
  http_code="$(curl -sS -o /tmp/eligio-ready.json -w "%{http_code}" "$ready_url" || true)"
  if [ "$http_code" = "200" ]; then
    log "Backend is ready."
    cat /tmp/eligio-ready.json
    echo
    exit 0
  fi
  sleep 10
  log "Attempt ${attempt}/25 not ready yet (HTTP ${http_code})."
done

log "Backend deployment finished, but readiness check did not return HTTP 200 in time."
log "Inspect logs with: az webapp log tail --resource-group $AZ_RESOURCE_GROUP --name $AZ_BACKEND_WEBAPP"
exit 1
