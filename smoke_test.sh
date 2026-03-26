#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_DIR="$ROOT_DIR/backend"
STATUS_SCRIPT="$ROOT_DIR/status.sh"

run_step() {
  local title="$1"
  shift

  echo
  echo "==> $title"
  "$@"
}

echo "CRM smoke test started."

if "$STATUS_SCRIPT" >/dev/null 2>&1; then
  echo "Detected healthy local services."
else
  echo "Local services are not healthy or not running. Continuing with offline checks."
fi

run_step "Frontend production build" bash -lc "cd \"$FRONTEND_DIR\" && npm run build"
run_step "Backend scenario smoke test" bash -lc "cd \"$BACKEND_DIR\" && python3 scenario_smoke_test.py"

echo
echo "Smoke test passed."
