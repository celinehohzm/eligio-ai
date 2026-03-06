# Azure Production Deployment (eligio.net)

This folder contains deployment scripts to stand up production Azure infrastructure and deploy:

- Frontend: Azure Static Web App (`eligio.net`, `www.eligio.net`)
- Backend: Azure App Service (`api.eligio.net`)
- Database: Azure PostgreSQL Flexible Server
- Upload storage: Azure Blob Storage
- Secrets: Azure Key Vault (with App Service Key Vault references)
- Monitoring: Application Insights + metric alerts

## Important Safety Note

This project is healthcare-adjacent. Do not collect real PHI publicly until your compliance program is complete (BAA/HIPAA controls, access audits, retention policy, incident response, and legal review).

## Prerequisites

- Azure subscription (prefer one with spending limit / credits)
- Azure CLI installed and authenticated (`az login`)
- Node.js + npm installed (for frontend build/deploy)
- DNS control for `eligio.net`

## Required Environment Variables

```bash
export AZ_SUBSCRIPTION_ID="<subscription-id>"
export AZ_LOCATION="eastus2"
export AZ_RESOURCE_GROUP="rg-eligio-prod"

export AZ_APP_PLAN="asp-eligio-prod"
export AZ_BACKEND_WEBAPP="eligio-api-prod"
export AZ_STATIC_WEBAPP_NAME="eligio-web-prod"

export AZ_POSTGRES_SERVER="eligio-pg-prod"
export AZ_POSTGRES_DB="eligio"
export AZ_POSTGRES_ADMIN="eligioadmin"
export AZ_POSTGRES_PASSWORD="<strong-password>"

export AZ_STORAGE_ACCOUNT="eligiostoreprod"
export AZ_STORAGE_CONTAINER="uploads"

export AZ_KEYVAULT_NAME="kv-eligio-prod"
export AZ_APPINSIGHTS_NAME="appi-eligio-prod"
export AZ_LOG_ANALYTICS_WORKSPACE="log-eligio-prod"

export AZ_ALERT_EMAIL="you@example.com"
```

Optional:

```bash
export AZ_STATIC_WEBAPP_LOCATION="eastus2"
export AZ_ROOT_DOMAIN="eligio.net"
export AZ_WWW_DOMAIN="www.eligio.net"
export AZ_API_DOMAIN="api.eligio.net"

export OPENAI_API_KEY="<new-rotated-key>"
export SECRET_KEY="<optional-flask-secret>"
export JWT_SECRET_KEY="<optional-jwt-secret>"
export UPLOAD_API_KEY="<optional-upload-api-key>"

# Frontend build target
export VITE_API_BASE_URL="https://api.eligio.net/api"
```

## Execution Order

1. Provision infrastructure
```bash
bash ops/azure/01_provision_infra.sh
```

2. Configure Key Vault secrets and backend app settings
```bash
bash ops/azure/02_configure_keyvault_and_appsettings.sh
```

3. Deploy backend package (runs migrations at startup)
```bash
bash ops/azure/03_deploy_backend.sh
```

4. Build + deploy frontend to Static Web App
```bash
bash ops/azure/04_deploy_frontend_static.sh
```

5. DNS + SSL checklist (dry run by default)
```bash
bash ops/azure/05_dns_ssl_checklist.sh
```

To apply DNS/SSL binding commands after DNS records are created:
```bash
AZ_APPLY_DNS_CHANGES=true bash ops/azure/05_dns_ssl_checklist.sh
```

## What These Scripts Configure

- PostgreSQL with backup retention
- Blob storage private container + soft delete/versioning
- App Service managed identity
- Key Vault references for runtime secrets
- App settings for production CORS and security headers
- Flask migration-first startup (`startup.sh` -> `flask db upgrade` -> `gunicorn`)
- Alerts for backend 5xx, backend CPU, and PostgreSQL CPU

## Cost Control Expectations

- Budgets/alerts notify; they do not always hard-stop resources automatically.
- A hard stop when credits are exhausted depends on your subscription type (e.g., Azure sponsorship/student spending limit).
- If your subscription allows it, keep spending limit enabled.
- Emergency service control scripts:
  - Stop API + DB: `bash ops/azure/90_stop_services.sh`
  - Start API + DB: `bash ops/azure/91_start_services.sh`

## OpenAI Key Rotation

Because an API key was exposed, rotate it first, then set only the new value through Key Vault (`OPENAI_API_KEY` env when running script 02).

## Readiness Validation

After deployment:

- Backend readiness: `https://api.eligio.net/ready`
- Backend auth health: `https://api.eligio.net/api/auth/health`
- Frontend app: `https://eligio.net`
