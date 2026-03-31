#!/bin/bash

set -euo pipefail

source "$(cd "$(dirname "$0")" && pwd)/scripts/common.sh"

launchd_bootout_service "$LAUNCHD_FRONTEND_LABEL" "$LAUNCHD_FRONTEND_PLIST"
launchd_bootout_service "$LAUNCHD_BACKEND_LABEL" "$LAUNCHD_BACKEND_PLIST"

rm -f "$LAUNCHD_FRONTEND_PLIST" "$LAUNCHD_BACKEND_PLIST"
rm -f "$FRONTEND_PID_FILE" "$BACKEND_PID_FILE"

echo "CRM launchd services uninstalled."
