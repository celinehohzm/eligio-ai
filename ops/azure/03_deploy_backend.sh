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
  --restart false \
  --track-status false \
  --clean true \
  --output none

log "Syncing startup.sh to the App Service wwwroot launcher path"
publishing_username="$(az webapp deployment list-publishing-credentials \
  --resource-group "$AZ_RESOURCE_GROUP" \
  --name "$AZ_BACKEND_WEBAPP" \
  --query publishingUserName -o tsv)"
publishing_password="$(az webapp deployment list-publishing-credentials \
  --resource-group "$AZ_RESOURCE_GROUP" \
  --name "$AZ_BACKEND_WEBAPP" \
  --query publishingPassword -o tsv)"

curl -fsS \
  --user "$publishing_username:$publishing_password" \
  --upload-file "$backend_dir/startup.sh" \
  "https://${AZ_BACKEND_WEBAPP}.scm.azurewebsites.net/api/vfs/site/wwwroot/startup.sh" \
  >/dev/null

log "Ensuring backend startup command points to startup.sh"
az webapp config set \
  --resource-group "$AZ_RESOURCE_GROUP" \
  --name "$AZ_BACKEND_WEBAPP" \
  --startup-file "startup.sh" \
  --output none

log "Restarting backend app"
az webapp restart \
  --resource-group "$AZ_RESOURCE_GROUP" \
  --name "$AZ_BACKEND_WEBAPP" \
  --output none

backend_host="$(az webapp show --resource-group "$AZ_RESOURCE_GROUP" --name "$AZ_BACKEND_WEBAPP" --query defaultHostName -o tsv)"
ready_url="https://${backend_host}/ready"

wait_for_ready() {
  local phase="$1"
  local attempts="$2"

  log "Waiting for backend readiness (${phase}): $ready_url"
  for attempt in $(seq 1 "$attempts"); do
    http_code="$(curl -sS -m 20 -o /tmp/eligio-ready.json -w "%{http_code}" "$ready_url" || true)"
    if [ "$http_code" = "200" ]; then
      log "Backend is ready."
      cat /tmp/eligio-ready.json
      echo
      return 0
    fi
    sleep 10
    log "Attempt ${attempt}/${attempts} (${phase}) not ready yet (HTTP ${http_code:-timeout})."
  done

  return 1
}

if wait_for_ready "initial" 25; then
  exit 0
fi

log "Initial readiness window expired. Restarting once more to recover from transient App Service startup issues."
az webapp restart \
  --resource-group "$AZ_RESOURCE_GROUP" \
  --name "$AZ_BACKEND_WEBAPP" \
  --output none

if wait_for_ready "retry" 18; then
  exit 0
fi

log "Backend deployment finished, but readiness check did not return HTTP 200 after retry."
log "Inspect logs with: az webapp log tail --resource-group $AZ_RESOURCE_GROUP --name $AZ_BACKEND_WEBAPP"
exit 1
