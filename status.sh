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

print_status() {
  local name="$1"
  local pid_file="$2"
  local url="$3"
  local port="$4"

  if [[ -f "$pid_file" ]]; then
    local pid
    pid="$(cat "$pid_file")"
    if kill -0 "$pid" >/dev/null 2>&1; then
      echo "$name: running (PID $pid) - $url"
      return
    fi
  fi

  local port_pid
  port_pid="$(get_listen_pid "$port")"
  if [[ -n "$port_pid" ]]; then
    echo "$name: running (PID $port_pid) - $url"
    return
  fi

  echo "$name: stopped"
}

print_status "CRM backend" "$BACKEND_PID_FILE" "http://172.16.1.32:5006" "$BACKEND_PORT"
print_status "CRM frontend" "$FRONTEND_PID_FILE" "http://172.16.1.32:3000" "$FRONTEND_PORT"
