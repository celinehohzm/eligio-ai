#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/_common.sh"

require_az_login
require_env \
  AZ_SUBSCRIPTION_ID \
  AZ_RESOURCE_GROUP \
  AZ_BACKEND_WEBAPP \
  AZ_POSTGRES_SERVER \
  AZ_POSTGRES_DB \
  AZ_POSTGRES_ADMIN \
  AZ_POSTGRES_PASSWORD \
  AZ_STORAGE_ACCOUNT \
  AZ_STORAGE_CONTAINER \
  AZ_KEYVAULT_NAME \
  AZ_APPINSIGHTS_NAME

set_subscription

CORS_ORIGINS="${CORS_ORIGINS:-https://eligio.net,https://www.eligio.net}"
ALLOWED_HOSTS="${ALLOWED_HOSTS:-api.eligio.net,${AZ_BACKEND_WEBAPP}.azurewebsites.net}"
OPENAI_MODEL="${OPENAI_MODEL:-gpt-4o-mini}"
RATELIMIT_STORAGE_URI="${RATELIMIT_STORAGE_URI:-memory://}"

if [ -z "${SECRET_KEY:-}" ]; then
  SECRET_KEY="$(python - <<'PY'
import secrets
print(secrets.token_urlsafe(48))
PY
)"
fi

if [ -z "${JWT_SECRET_KEY:-}" ]; then
  JWT_SECRET_KEY="$(python - <<'PY'
import secrets
print(secrets.token_urlsafe(48))
PY
)"
fi

if [ -z "${UPLOAD_API_KEY:-}" ]; then
  UPLOAD_API_KEY="$(python - <<'PY'
import secrets
print(secrets.token_urlsafe(32))
PY
)"
fi

postgres_fqdn="$(az postgres flexible-server show \
  --resource-group "$AZ_RESOURCE_GROUP" \
  --name "$AZ_POSTGRES_SERVER" \
  --query fullyQualifiedDomainName -o tsv)"

if [[ "$AZ_POSTGRES_ADMIN" == *"@"* ]]; then
  postgres_user="$AZ_POSTGRES_ADMIN"
else
  postgres_user="${AZ_POSTGRES_ADMIN}@${AZ_POSTGRES_SERVER}"
fi

encoded_password="$(python - <<'PY'
import os
import urllib.parse
print(urllib.parse.quote_plus(os.environ["AZ_POSTGRES_PASSWORD"]))
PY
)"

database_url="postgresql+psycopg2://${postgres_user}:${encoded_password}@${postgres_fqdn}:5432/${AZ_POSTGRES_DB}?sslmode=require"
storage_connection_string="$(az storage account show-connection-string --name "$AZ_STORAGE_ACCOUNT" --resource-group "$AZ_RESOURCE_GROUP" --query connectionString -o tsv)"

log "Writing secrets into Key Vault: $AZ_KEYVAULT_NAME"
az keyvault secret set --vault-name "$AZ_KEYVAULT_NAME" --name "database-url" --value "$database_url" --output none
az keyvault secret set --vault-name "$AZ_KEYVAULT_NAME" --name "flask-secret-key" --value "$SECRET_KEY" --output none
az keyvault secret set --vault-name "$AZ_KEYVAULT_NAME" --name "jwt-secret-key" --value "$JWT_SECRET_KEY" --output none
az keyvault secret set --vault-name "$AZ_KEYVAULT_NAME" --name "upload-api-key" --value "$UPLOAD_API_KEY" --output none
az keyvault secret set --vault-name "$AZ_KEYVAULT_NAME" --name "azure-storage-connection-string" --value "$storage_connection_string" --output none

if [ -n "${OPENAI_API_KEY:-}" ]; then
  az keyvault secret set --vault-name "$AZ_KEYVAULT_NAME" --name "openai-api-key" --value "$OPENAI_API_KEY" --output none
else
  az keyvault secret set --vault-name "$AZ_KEYVAULT_NAME" --name "openai-api-key" --value "" --output none
  log "OPENAI_API_KEY is not set. Backend chat will run in mock mode until you add it."
fi

kv_base_uri="https://${AZ_KEYVAULT_NAME}.vault.azure.net/secrets"

kv_ref() {
  local secret_name="$1"
  printf "@Microsoft.KeyVault(SecretUri=%s/%s)" "$kv_base_uri" "$secret_name"
}

appinsights_connection_string="$(az monitor app-insights component show \
  --app "$AZ_APPINSIGHTS_NAME" \
  --resource-group "$AZ_RESOURCE_GROUP" \
  --query connectionString -o tsv)"

log "Configuring backend app settings with Key Vault references"
az webapp config appsettings set \
  --resource-group "$AZ_RESOURCE_GROUP" \
  --name "$AZ_BACKEND_WEBAPP" \
  --settings \
    FLASK_ENV=production \
    FLASK_DEBUG=false \
    AUTO_CREATE_TABLES=false \
    TRUST_PROXY=true \
    FORCE_HTTPS=true \
    ENABLE_SECURITY_HEADERS=true \
    OPENAI_MODEL="$OPENAI_MODEL" \
    DATABASE_URL="$(kv_ref database-url)" \
    SECRET_KEY="$(kv_ref flask-secret-key)" \
    JWT_SECRET_KEY="$(kv_ref jwt-secret-key)" \
    OPENAI_API_KEY="$(kv_ref openai-api-key)" \
    UPLOAD_API_KEY="$(kv_ref upload-api-key)" \
    STORAGE_PROVIDER=azure \
    AZURE_STORAGE_CONTAINER="$AZ_STORAGE_CONTAINER" \
    AZURE_STORAGE_CONNECTION_STRING="$(kv_ref azure-storage-connection-string)" \
    CORS_ORIGINS="$CORS_ORIGINS" \
    ALLOWED_HOSTS="$ALLOWED_HOSTS" \
    RATELIMIT_STORAGE_URI="$RATELIMIT_STORAGE_URI" \
    RATELIMIT_HEADERS_ENABLED=true \
    FLASK_APP=app:create_app \
    WEBSITES_PORT=8000 \
    SCM_DO_BUILD_DURING_DEPLOYMENT=true \
    APPLICATIONINSIGHTS_CONNECTION_STRING="$appinsights_connection_string" \
    --output none

log "Setting backend startup command"
az webapp config set \
  --resource-group "$AZ_RESOURCE_GROUP" \
  --name "$AZ_BACKEND_WEBAPP" \
  --startup-file "bash startup.sh" \
  --output none

log "Key Vault + app settings configuration complete."
