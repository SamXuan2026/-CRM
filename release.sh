#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
SMOKE_SCRIPT="$ROOT_DIR/smoke_test.sh"
BUILD_DMG_SCRIPT="$ROOT_DIR/build_dmg.sh"
OUTPUT_DMG="$ROOT_DIR/build/八戒CRM启动器.dmg"

run_step() {
  local title="$1"
  shift

  echo
  echo "==> $title"
  "$@"
}

echo "CRM release pipeline started."

run_step "Release smoke test" "$SMOKE_SCRIPT"
run_step "Build DMG package" "$BUILD_DMG_SCRIPT"

echo
echo "Release pipeline passed."
echo "DMG artifact: $OUTPUT_DMG"
