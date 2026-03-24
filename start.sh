#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
RUN_DIR="$ROOT_DIR/run"
LOG_DIR="$ROOT_DIR/logs"
BACKEND_PID_FILE="$RUN_DIR/backend.pid"
FRONTEND_PID_FILE="$RUN_DIR/frontend.pid"
BACKEND_LOG="$LOG_DIR/backend.log"
FRONTEND_LOG="$LOG_DIR/frontend.log"
BACKEND_PORT=5006
FRONTEND_PORT=3000

mkdir -p "$RUN_DIR" "$LOG_DIR"

get_listen_pid() {
  local port="$1"
  lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null | head -n 1
}

is_running() {
  local pid_file="$1"
  local port="$2"

  if [[ -f "$pid_file" ]]; then
    local pid
    pid="$(cat "$pid_file")"
    if kill -0 "$pid" >/dev/null 2>&1; then
      return 0
    fi
    rm -f "$pid_file"
  fi

  local port_pid
  port_pid="$(get_listen_pid "$port")"
  if [[ -n "$port_pid" ]]; then
    echo "$port_pid" >"$pid_file"
    return 0
  fi

  return 1
}

start_backend() {
  if is_running "$BACKEND_PID_FILE" "$BACKEND_PORT"; then
    echo "CRM backend is already running."
    return
  fi

  (
    cd "$BACKEND_DIR"
    nohup python3 app.py >"$BACKEND_LOG" 2>&1 &
    echo $! >"$BACKEND_PID_FILE"
  )
  echo "CRM backend started: http://172.16.1.32:5006"
}

start_frontend() {
  if is_running "$FRONTEND_PID_FILE" "$FRONTEND_PORT"; then
    echo "CRM frontend is already running."
    return
  fi

  (
    cd "$FRONTEND_DIR"
    nohup npm run dev >"$FRONTEND_LOG" 2>&1 &
    echo $! >"$FRONTEND_PID_FILE"
  )
  echo "CRM frontend started: http://172.16.1.32:3000"
}

start_backend
start_frontend

echo "Logs:"
echo "  Backend: $BACKEND_LOG"
echo "  Frontend: $FRONTEND_LOG"
