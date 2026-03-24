#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
RUN_DIR="$ROOT_DIR/run"
BACKEND_PID_FILE="$RUN_DIR/backend.pid"
FRONTEND_PID_FILE="$RUN_DIR/frontend.pid"
BACKEND_PORT=5006
FRONTEND_PORT=3000

get_listen_pid() {
  local port="$1"
  lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null | head -n 1
}

stop_service() {
  local name="$1"
  local pid_file="$2"
  local port="$3"
  local pid=""

  if [[ -f "$pid_file" ]]; then
    pid="$(cat "$pid_file")"
  else
    pid="$(get_listen_pid "$port")"
  fi

  if [[ -z "$pid" ]]; then
    echo "$name is not running."
    return
  fi

  if kill -0 "$pid" >/dev/null 2>&1; then
    kill "$pid"
    echo "$name stopped."
  else
    echo "$name was not running."
  fi

  rm -f "$pid_file"
}

stop_frontend_first() {
  stop_service "CRM frontend" "$FRONTEND_PID_FILE" "$FRONTEND_PORT"
  stop_service "CRM backend" "$BACKEND_PID_FILE" "$BACKEND_PORT"
}

stop_frontend_first
