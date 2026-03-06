#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/_common.sh"

require_az_login
require_env AZ_SUBSCRIPTION_ID AZ_RESOURCE_GROUP AZ_BACKEND_WEBAPP AZ_POSTGRES_SERVER

set_subscription

log "Stopping backend web app: $AZ_BACKEND_WEBAPP"
az webapp stop \
  --resource-group "$AZ_RESOURCE_GROUP" \
  --name "$AZ_BACKEND_WEBAPP" \
  --output none

log "Stopping PostgreSQL server: $AZ_POSTGRES_SERVER"
az postgres flexible-server stop \
  --resource-group "$AZ_RESOURCE_GROUP" \
  --name "$AZ_POSTGRES_SERVER" \
  --output none || true

log "Services stopped."
log "Note: Static Web App remains publicly reachable but API calls will fail while backend is stopped."
