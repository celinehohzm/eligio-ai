#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/_common.sh"

require_az_login
require_env \
  AZ_SUBSCRIPTION_ID \
  AZ_LOCATION \
  AZ_RESOURCE_GROUP \
  AZ_APP_PLAN \
  AZ_BACKEND_WEBAPP \
  AZ_STATIC_WEBAPP_NAME \
  AZ_POSTGRES_SERVER \
  AZ_POSTGRES_DB \
  AZ_POSTGRES_ADMIN \
  AZ_POSTGRES_PASSWORD \
  AZ_STORAGE_ACCOUNT \
  AZ_STORAGE_CONTAINER \
  AZ_KEYVAULT_NAME \
  AZ_APPINSIGHTS_NAME \
  AZ_LOG_ANALYTICS_WORKSPACE \
  AZ_ALERT_EMAIL

set_subscription

AZ_ACTION_GROUP_NAME="${AZ_ACTION_GROUP_NAME:-ag-eligio-prod}"
AZ_STATIC_WEBAPP_LOCATION="${AZ_STATIC_WEBAPP_LOCATION:-$AZ_LOCATION}"
AZ_APP_PLAN_SKU="${AZ_APP_PLAN_SKU:-B1}"

log "Creating resource group: $AZ_RESOURCE_GROUP"
az group create \
  --name "$AZ_RESOURCE_GROUP" \
  --location "$AZ_LOCATION" \
  --output none

log "Creating Log Analytics workspace: $AZ_LOG_ANALYTICS_WORKSPACE"
az monitor log-analytics workspace create \
  --resource-group "$AZ_RESOURCE_GROUP" \
  --workspace-name "$AZ_LOG_ANALYTICS_WORKSPACE" \
  --location "$AZ_LOCATION" \
  --output none

workspace_id="$(az monitor log-analytics workspace show \
  --resource-group "$AZ_RESOURCE_GROUP" \
  --workspace-name "$AZ_LOG_ANALYTICS_WORKSPACE" \
  --query id -o tsv)"

log "Creating Application Insights: $AZ_APPINSIGHTS_NAME"
az monitor app-insights component create \
  --app "$AZ_APPINSIGHTS_NAME" \
  --location "$AZ_LOCATION" \
  --resource-group "$AZ_RESOURCE_GROUP" \
  --workspace "$workspace_id" \
  --application-type web \
  --output none

log "Creating App Service plan: $AZ_APP_PLAN"
az appservice plan create \
  --name "$AZ_APP_PLAN" \
  --resource-group "$AZ_RESOURCE_GROUP" \
  --location "$AZ_LOCATION" \
  --is-linux \
  --sku "$AZ_APP_PLAN_SKU" \
  --output none

if az webapp show --resource-group "$AZ_RESOURCE_GROUP" --name "$AZ_BACKEND_WEBAPP" >/dev/null 2>&1; then
  log "Backend web app exists: $AZ_BACKEND_WEBAPP"
else
  log "Creating backend web app: $AZ_BACKEND_WEBAPP"
  az webapp create \
    --resource-group "$AZ_RESOURCE_GROUP" \
    --plan "$AZ_APP_PLAN" \
    --name "$AZ_BACKEND_WEBAPP" \
    --runtime "PYTHON|3.11" \
    --output none
fi

log "Enabling App Service logs"
az webapp log config \
  --resource-group "$AZ_RESOURCE_GROUP" \
  --name "$AZ_BACKEND_WEBAPP" \
  --application-logging filesystem \
  --detailed-error-messages true \
  --failed-request-tracing true \
  --output none || true

log "Assigning managed identity to backend app"
backend_principal_id="$(az webapp identity assign \
  --resource-group "$AZ_RESOURCE_GROUP" \
  --name "$AZ_BACKEND_WEBAPP" \
  --query principalId -o tsv)"

if az postgres flexible-server show --resource-group "$AZ_RESOURCE_GROUP" --name "$AZ_POSTGRES_SERVER" >/dev/null 2>&1; then
  log "PostgreSQL flexible server exists: $AZ_POSTGRES_SERVER"
else
  log "Creating PostgreSQL flexible server: $AZ_POSTGRES_SERVER"
  az postgres flexible-server create \
    --resource-group "$AZ_RESOURCE_GROUP" \
    --name "$AZ_POSTGRES_SERVER" \
    --location "$AZ_LOCATION" \
    --admin-user "$AZ_POSTGRES_ADMIN" \
    --admin-password "$AZ_POSTGRES_PASSWORD" \
    --tier Burstable \
    --sku-name Standard_B1ms \
    --storage-size 32 \
    --version 16 \
    --backup-retention 7 \
    --public-access 0.0.0.0 \
    --yes \
    --output none
fi

log "Creating PostgreSQL database: $AZ_POSTGRES_DB"
az postgres flexible-server db create \
  --resource-group "$AZ_RESOURCE_GROUP" \
  --server-name "$AZ_POSTGRES_SERVER" \
  --database-name "$AZ_POSTGRES_DB" \
  --output none || true

log "Ensuring firewall rule for Azure services"
az postgres flexible-server firewall-rule create \
  --resource-group "$AZ_RESOURCE_GROUP" \
  --name "$AZ_POSTGRES_SERVER" \
  --rule-name allow-azure-services \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0 \
  --output none || true

log "Creating storage account: $AZ_STORAGE_ACCOUNT"
az storage account create \
  --resource-group "$AZ_RESOURCE_GROUP" \
  --name "$AZ_STORAGE_ACCOUNT" \
  --location "$AZ_LOCATION" \
  --sku Standard_LRS \
  --kind StorageV2 \
  --https-only true \
  --allow-blob-public-access false \
  --min-tls-version TLS1_2 \
  --output none

storage_key="$(az storage account keys list \
  --resource-group "$AZ_RESOURCE_GROUP" \
  --account-name "$AZ_STORAGE_ACCOUNT" \
  --query "[0].value" -o tsv)"

log "Creating private blob container: $AZ_STORAGE_CONTAINER"
az storage container create \
  --name "$AZ_STORAGE_CONTAINER" \
  --account-name "$AZ_STORAGE_ACCOUNT" \
  --account-key "$storage_key" \
  --public-access off \
  --output none

log "Enabling blob soft delete/versioning"
az storage account blob-service-properties update \
  --resource-group "$AZ_RESOURCE_GROUP" \
  --account-name "$AZ_STORAGE_ACCOUNT" \
  --enable-versioning true \
  --enable-delete-retention true \
  --delete-retention-days 14 \
  --output none

if az keyvault show --resource-group "$AZ_RESOURCE_GROUP" --name "$AZ_KEYVAULT_NAME" >/dev/null 2>&1; then
  log "Key Vault exists: $AZ_KEYVAULT_NAME"
else
  log "Creating Key Vault: $AZ_KEYVAULT_NAME"
  az keyvault create \
    --resource-group "$AZ_RESOURCE_GROUP" \
    --name "$AZ_KEYVAULT_NAME" \
    --location "$AZ_LOCATION" \
    --sku standard \
    --enable-rbac-authorization true \
    --output none
fi

kv_id="$(az keyvault show --resource-group "$AZ_RESOURCE_GROUP" --name "$AZ_KEYVAULT_NAME" --query id -o tsv)"

log "Granting backend identity access to Key Vault secrets"
az role assignment create \
  --assignee-object-id "$backend_principal_id" \
  --assignee-principal-type ServicePrincipal \
  --role "Key Vault Secrets User" \
  --scope "$kv_id" \
  --output none || true

if signed_in_user_id="$(az ad signed-in-user show --query id -o tsv 2>/dev/null)"; then
  log "Granting signed-in user access to manage Key Vault secrets"
  az role assignment create \
    --assignee-object-id "$signed_in_user_id" \
    --assignee-principal-type User \
    --role "Key Vault Secrets Officer" \
    --scope "$kv_id" \
    --output none || true
fi

if az extension show --name staticwebapp >/dev/null 2>&1; then
  az extension update --name staticwebapp --yes >/dev/null 2>&1 || true
else
  az extension add --name staticwebapp --yes >/dev/null 2>&1 || true
fi

if az staticwebapp show --name "$AZ_STATIC_WEBAPP_NAME" --resource-group "$AZ_RESOURCE_GROUP" >/dev/null 2>&1; then
  log "Static Web App exists: $AZ_STATIC_WEBAPP_NAME"
else
  log "Creating Static Web App: $AZ_STATIC_WEBAPP_NAME"
  if ! az staticwebapp create \
    --name "$AZ_STATIC_WEBAPP_NAME" \
    --resource-group "$AZ_RESOURCE_GROUP" \
    --location "$AZ_STATIC_WEBAPP_LOCATION" \
    --sku Free \
    --output none; then
    fail "Static Web App creation failed. Verify 'staticwebapp' extension and location support."
  fi
fi

log "Creating action group for alert notifications"
az monitor action-group create \
  --resource-group "$AZ_RESOURCE_GROUP" \
  --name "$AZ_ACTION_GROUP_NAME" \
  --short-name eligioops \
  --action email ops "$AZ_ALERT_EMAIL" \
  --output none || true

action_group_id="$(az monitor action-group show \
  --resource-group "$AZ_RESOURCE_GROUP" \
  --name "$AZ_ACTION_GROUP_NAME" \
  --query id -o tsv)"
backend_id="$(az webapp show --resource-group "$AZ_RESOURCE_GROUP" --name "$AZ_BACKEND_WEBAPP" --query id -o tsv)"
app_plan_id="$(az appservice plan show --resource-group "$AZ_RESOURCE_GROUP" --name "$AZ_APP_PLAN" --query id -o tsv)"
postgres_id="$(az postgres flexible-server show --resource-group "$AZ_RESOURCE_GROUP" --name "$AZ_POSTGRES_SERVER" --query id -o tsv)"

log "Creating backend HTTP 5xx alert"
az monitor metrics alert create \
  --resource-group "$AZ_RESOURCE_GROUP" \
  --name "${AZ_BACKEND_WEBAPP}-http5xx" \
  --scopes "$backend_id" \
  --condition "total Http5xx > 5" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --severity 2 \
  --description "Backend is returning excessive 5xx responses" \
  --action "$action_group_id" \
  --output none || true

log "Creating backend CPU alert"
az monitor metrics alert create \
  --resource-group "$AZ_RESOURCE_GROUP" \
  --name "${AZ_BACKEND_WEBAPP}-cpu" \
  --scopes "$app_plan_id" \
  --condition "avg CpuPercentage > 80" \
  --window-size 10m \
  --evaluation-frequency 5m \
  --severity 3 \
  --description "Backend CPU is above 80%" \
  --action "$action_group_id" \
  --output none || true

log "Creating PostgreSQL CPU alert"
az monitor metrics alert create \
  --resource-group "$AZ_RESOURCE_GROUP" \
  --name "${AZ_POSTGRES_SERVER}-cpu" \
  --scopes "$postgres_id" \
  --condition "avg cpu_percent > 80" \
  --window-size 10m \
  --evaluation-frequency 5m \
  --severity 3 \
  --description "PostgreSQL CPU is above 80%" \
  --action "$action_group_id" \
  --output none || true

backend_hostname="$(az webapp show --resource-group "$AZ_RESOURCE_GROUP" --name "$AZ_BACKEND_WEBAPP" --query defaultHostName -o tsv)"
frontend_hostname="$(az staticwebapp show --name "$AZ_STATIC_WEBAPP_NAME" --resource-group "$AZ_RESOURCE_GROUP" --query defaultHostname -o tsv)"

log "Provisioning complete."
log "Backend default URL: https://${backend_hostname}"
log "Frontend default URL: https://${frontend_hostname}"
