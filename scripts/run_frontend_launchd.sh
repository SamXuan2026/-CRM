#!/bin/bash

set -euo pipefail

source "$(cd "$(dirname "$0")" && pwd)/common.sh"

ensure_runtime_dirs
echo $$ >"$FRONTEND_PID_FILE"
export PATH="$LAUNCHD_PATH"

cd "$FRONTEND_DIR"
exec npm run dev
