#!/bin/bash

set -euo pipefail

source "$(cd "$(dirname "$0")" && pwd)/scripts/common.sh"

ensure_runtime_dirs
mkdir -p "$LAUNCHD_DIR"

render_launchd_plist \
  "$LAUNCHD_BACKEND_TEMPLATE" \
  "$LAUNCHD_BACKEND_PLIST" \
  "$LAUNCHD_BACKEND_LABEL" \
  "$LAUNCHD_BACKEND_RUNNER" \
  "$BACKEND_DIR" \
  "$BACKEND_LOG"

render_launchd_plist \
  "$LAUNCHD_FRONTEND_TEMPLATE" \
  "$LAUNCHD_FRONTEND_PLIST" \
  "$LAUNCHD_FRONTEND_LABEL" \
  "$LAUNCHD_FRONTEND_RUNNER" \
  "$FRONTEND_DIR" \
  "$FRONTEND_LOG"

chmod 644 "$LAUNCHD_BACKEND_PLIST" "$LAUNCHD_FRONTEND_PLIST"
chmod +x "$LAUNCHD_BACKEND_RUNNER" "$LAUNCHD_FRONTEND_RUNNER"

launchd_bootstrap_service "$LAUNCHD_BACKEND_LABEL" "$LAUNCHD_BACKEND_PLIST"
launchd_bootstrap_service "$LAUNCHD_FRONTEND_LABEL" "$LAUNCHD_FRONTEND_PLIST"

wait_for_health "CRM backend" "$BACKEND_PID_FILE" "$BACKEND_PORT" "$BACKEND_HEALTH_URL"
wait_for_health "CRM frontend" "$FRONTEND_PID_FILE" "$FRONTEND_PORT" "$FRONTEND_HEALTH_URL"

echo "CRM launchd services installed."
echo "Backend plist: $LAUNCHD_BACKEND_PLIST"
echo "Frontend plist: $LAUNCHD_FRONTEND_PLIST"
echo "Visit: $FRONTEND_PUBLIC_URL"
