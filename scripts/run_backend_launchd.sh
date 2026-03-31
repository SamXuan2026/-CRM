#!/bin/bash

set -euo pipefail

source "$(cd "$(dirname "$0")" && pwd)/common.sh"

ensure_runtime_dirs
echo $$ >"$BACKEND_PID_FILE"
export PATH="$LAUNCHD_PATH"

cd "$BACKEND_DIR"
exec python3 app.py
