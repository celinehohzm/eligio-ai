#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/_common.sh"

require_az_login
require_env AZ_SUBSCRIPTION_ID AZ_RESOURCE_GROUP AZ_BACKEND_WEBAPP AZ_STATIC_WEBAPP_NAME

set_subscription

AZ_ROOT_DOMAIN="${AZ_ROOT_DOMAIN:-eligio.net}"
AZ_WWW_DOMAIN="${AZ_WWW_DOMAIN:-www.eligio.net}"
AZ_API_DOMAIN="${AZ_API_DOMAIN:-api.eligio.net}"
AZ_APPLY_DNS_CHANGES="${AZ_APPLY_DNS_CHANGES:-false}"

backend_default_host="$(az webapp show --resource-group "$AZ_RESOURCE_GROUP" --name "$AZ_BACKEND_WEBAPP" --query defaultHostName -o tsv)"
frontend_default_host="$(az staticwebapp show --resource-group "$AZ_RESOURCE_GROUP" --name "$AZ_STATIC_WEBAPP_NAME" --query defaultHostname -o tsv)"

log "DNS targets"
log "  Root domain (${AZ_ROOT_DOMAIN}) and WWW (${AZ_WWW_DOMAIN}) -> ${frontend_default_host}"
log "  API domain (${AZ_API_DOMAIN}) -> ${backend_default_host}"

echo
log "Create/verify these DNS records at your registrar:"
echo "  1) CNAME ${AZ_WWW_DOMAIN} -> ${frontend_default_host}"
echo "  2) CNAME ${AZ_API_DOMAIN} -> ${backend_default_host}"
echo "  3) Apex ${AZ_ROOT_DOMAIN}: use ALIAS/ANAME flattening to ${frontend_default_host} (or provider-specific apex CNAME flattening)"
echo

if [ "$AZ_APPLY_DNS_CHANGES" != "true" ]; then
  log "Dry run only. To attempt Azure hostname + SSL binding automatically, run:"
  echo "  AZ_APPLY_DNS_CHANGES=true bash ops/azure/05_dns_ssl_checklist.sh"
  exit 0
fi

if az extension show --name staticwebapp >/dev/null 2>&1; then
  az extension update --name staticwebapp --yes >/dev/null 2>&1 || true
else
  az extension add --name staticwebapp --yes >/dev/null 2>&1 || true
fi

log "Binding Static Web App custom domains"
az staticwebapp hostname set \
  --name "$AZ_STATIC_WEBAPP_NAME" \
  --resource-group "$AZ_RESOURCE_GROUP" \
  --hostname "$AZ_ROOT_DOMAIN" \
  --validation-method dns-txt-token \
  --output none || true

az staticwebapp hostname set \
  --name "$AZ_STATIC_WEBAPP_NAME" \
  --resource-group "$AZ_RESOURCE_GROUP" \
  --hostname "$AZ_WWW_DOMAIN" \
  --validation-method cname-delegation \
  --output none || true

log "Binding App Service custom API domain"
az webapp config hostname add \
  --resource-group "$AZ_RESOURCE_GROUP" \
  --webapp-name "$AZ_BACKEND_WEBAPP" \
  --hostname "$AZ_API_DOMAIN" \
  --output none || true

log "Requesting managed certificate for ${AZ_API_DOMAIN}"
az webapp config ssl create \
  --resource-group "$AZ_RESOURCE_GROUP" \
  --name "$AZ_BACKEND_WEBAPP" \
  --hostname "$AZ_API_DOMAIN" \
  --output none || true

cert_thumbprint="$(az webapp config ssl list \
  --resource-group "$AZ_RESOURCE_GROUP" \
  --query "[?hostNames && contains(join(',', hostNames), '${AZ_API_DOMAIN}')].thumbprint | [0]" -o tsv)"

if [ -n "$cert_thumbprint" ]; then
  log "Binding managed certificate to API hostname"
  az webapp config ssl bind \
    --resource-group "$AZ_RESOURCE_GROUP" \
    --name "$AZ_BACKEND_WEBAPP" \
    --certificate-thumbprint "$cert_thumbprint" \
    --ssl-type SNI \
    --output none || true
else
  log "Managed certificate thumbprint not available yet. Re-run after DNS validation completes."
fi

log "DNS/SSL automation attempted. Validate HTTPS endpoints:"
log "  https://${AZ_ROOT_DOMAIN}"
log "  https://${AZ_WWW_DOMAIN}"
log "  https://${AZ_API_DOMAIN}/ready"
