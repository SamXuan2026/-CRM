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

services_healthy=false
if "$STATUS_SCRIPT" >/dev/null 2>&1; then
  services_healthy=true
  echo "Detected healthy local services."
else
  echo "Local services are not healthy or not running. Frontend page smoke will be skipped in this run."
fi

run_step "Frontend production build" bash -lc "cd \"$FRONTEND_DIR\" && npm run build"
run_step "Backend scenario smoke test" bash -lc "cd \"$BACKEND_DIR\" && python3 scenario_smoke_test.py"

if [[ "$services_healthy" == true ]]; then
  run_step "Frontend page smoke test" bash -lc "cd \"$FRONTEND_DIR\" && npm run page-smoke"
else
  echo
  echo "==> Frontend page smoke test"
  echo "Skipped because local services are not healthy."
  echo "Run 'cd \"$FRONTEND_DIR\" && npm run page-smoke' after starting CRM to verify demo logins and key routes."
fi

echo
echo "Smoke test passed."
