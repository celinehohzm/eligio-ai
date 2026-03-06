#!/usr/bin/env bash

set -euo pipefail

log() {
  printf "[%s] %s\n" "$(date +"%Y-%m-%d %H:%M:%S")" "$*"
}

fail() {
  log "ERROR: $*"
  exit 1
}

require_env() {
  local missing=0
  for var_name in "$@"; do
    if [ -z "${!var_name:-}" ]; then
      log "Missing required env var: ${var_name}"
      missing=1
    fi
  done
  if [ "$missing" -ne 0 ]; then
    fail "Set the missing environment variables and re-run."
  fi
}

require_tool() {
  local tool_name="$1"
  command -v "$tool_name" >/dev/null 2>&1 || fail "Missing required tool: $tool_name"
}

require_az_login() {
  require_tool az
  az account show >/dev/null 2>&1 || fail "Azure CLI is not logged in. Run: az login"
}

set_subscription() {
  require_env AZ_SUBSCRIPTION_ID
  az account set --subscription "$AZ_SUBSCRIPTION_ID"
}

contains_csv_item() {
  local needle="$1"
  local csv="$2"
  local old_ifs="$IFS"
  IFS=','
  for item in $csv; do
    if [ "$(echo "$item" | xargs)" = "$needle" ]; then
      IFS="$old_ifs"
      return 0
    fi
  done
  IFS="$old_ifs"
  return 1
}
