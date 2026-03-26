#!/bin/bash

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_DIR="$ROOT_DIR/run"
LOG_DIR="$ROOT_DIR/logs"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

BACKEND_PORT=5006
FRONTEND_PORT=3000

BACKEND_PID_FILE="$RUN_DIR/backend.pid"
FRONTEND_PID_FILE="$RUN_DIR/frontend.pid"

BACKEND_LOG="$LOG_DIR/backend.log"
FRONTEND_LOG="$LOG_DIR/frontend.log"

BACKEND_PUBLIC_URL="http://172.16.1.32:5006"
FRONTEND_PUBLIC_URL="http://172.16.1.32:3000"

BACKEND_HEALTH_URL="http://127.0.0.1:${BACKEND_PORT}/health"
FRONTEND_HEALTH_URL="http://127.0.0.1:${FRONTEND_PORT}/"

HEALTH_RETRIES=20
HEALTH_DELAY=1
STOP_WAIT_SECONDS=10

ensure_runtime_dirs() {
  mkdir -p "$RUN_DIR" "$LOG_DIR"
}

get_listen_pid() {
  local port="$1"
  lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null | head -n 1
}

get_pid_from_file() {
  local pid_file="$1"

  if [[ -f "$pid_file" ]]; then
    local pid
    pid="$(cat "$pid_file")"
    if kill -0 "$pid" >/dev/null 2>&1; then
      echo "$pid"
      return 0
    fi
    rm -f "$pid_file"
  fi

  return 1
}

track_service_pid() {
  local pid_file="$1"
  local port="$2"
  local pid=""

  if pid="$(get_pid_from_file "$pid_file")"; then
    echo "$pid"
    return 0
  fi

  pid="$(get_listen_pid "$port")"
  if [[ -n "$pid" ]]; then
    echo "$pid" >"$pid_file"
    echo "$pid"
    return 0
  fi

  return 1
}

health_check() {
  local url="$1"
  curl --silent --fail --max-time 2 "$url" >/dev/null 2>&1
}

wait_for_health() {
  local name="$1"
  local pid_file="$2"
  local port="$3"
  local health_url="$4"

  local attempt
  for ((attempt = 1; attempt <= HEALTH_RETRIES; attempt++)); do
    local pid=""
    if ! pid="$(track_service_pid "$pid_file" "$port")"; then
      sleep "$HEALTH_DELAY"
      continue
    fi

    if ! kill -0 "$pid" >/dev/null 2>&1; then
      rm -f "$pid_file"
      sleep "$HEALTH_DELAY"
      continue
    fi

    if health_check "$health_url"; then
      echo "$name is healthy."
      return 0
    fi

    sleep "$HEALTH_DELAY"
  done

  return 1
}

wait_for_shutdown() {
  local pid="$1"
  local port="$2"

  local second
  for ((second = 1; second <= STOP_WAIT_SECONDS; second++)); do
    if ! kill -0 "$pid" >/dev/null 2>&1; then
      return 0
    fi

    local listen_pid
    listen_pid="$(get_listen_pid "$port")"
    if [[ -z "$listen_pid" || "$listen_pid" != "$pid" ]]; then
      return 0
    fi

    sleep 1
  done

  return 1
}

print_log_tail() {
  local log_file="$1"
  if [[ -f "$log_file" ]]; then
    echo "Recent log output from $log_file:"
    tail -n 40 "$log_file"
  else
    echo "Log file not found: $log_file"
  fi
}
