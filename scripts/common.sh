#!/bin/bash

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

RUN_DIR="$ROOT_DIR/run"
LOG_DIR="$ROOT_DIR/logs"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
LAUNCHD_DIR="$HOME/Library/LaunchAgents"

BACKEND_PORT="${CRM_BACKEND_PORT:-5006}"
FRONTEND_PORT="${CRM_FRONTEND_PORT:-3000}"

BACKEND_PID_FILE="$RUN_DIR/backend.pid"
FRONTEND_PID_FILE="$RUN_DIR/frontend.pid"

BACKEND_LOG="$LOG_DIR/backend.log"
FRONTEND_LOG="$LOG_DIR/frontend.log"

PUBLIC_HOST="${CRM_PUBLIC_HOST:-172.16.1.32}"
DEV_HOST="${CRM_DEV_HOST:-0.0.0.0}"
BACKEND_BIND_HOST="${CRM_BACKEND_BIND_HOST:-0.0.0.0}"
LAUNCHD_PATH="${CRM_LAUNCHD_PATH:-/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin}"

BACKEND_PUBLIC_URL="http://${PUBLIC_HOST}:${BACKEND_PORT}"
FRONTEND_PUBLIC_URL="http://${PUBLIC_HOST}:${FRONTEND_PORT}"

BACKEND_HEALTH_URL="http://127.0.0.1:${BACKEND_PORT}/health"
FRONTEND_HEALTH_URL="http://127.0.0.1:${FRONTEND_PORT}/"

HEALTH_RETRIES=20
HEALTH_DELAY=1
STOP_WAIT_SECONDS=10

LAUNCHD_BACKEND_LABEL="com.bajiecrm.backend"
LAUNCHD_FRONTEND_LABEL="com.bajiecrm.frontend"
LAUNCHD_BACKEND_PLIST="$LAUNCHD_DIR/${LAUNCHD_BACKEND_LABEL}.plist"
LAUNCHD_FRONTEND_PLIST="$LAUNCHD_DIR/${LAUNCHD_FRONTEND_LABEL}.plist"
LAUNCHD_TEMPLATE_DIR="$ROOT_DIR/launchd"
LAUNCHD_BACKEND_TEMPLATE="$LAUNCHD_TEMPLATE_DIR/com.bajiecrm.backend.plist.template"
LAUNCHD_FRONTEND_TEMPLATE="$LAUNCHD_TEMPLATE_DIR/com.bajiecrm.frontend.plist.template"
LAUNCHD_BACKEND_RUNNER="$ROOT_DIR/scripts/run_backend_launchd.sh"
LAUNCHD_FRONTEND_RUNNER="$ROOT_DIR/scripts/run_frontend_launchd.sh"

ensure_runtime_dirs() {
  mkdir -p "$RUN_DIR" "$LOG_DIR"
}

launchd_target() {
  echo "gui/${UID}"
}

launchd_is_available() {
  command -v launchctl >/dev/null 2>&1
}

launchd_service_installed() {
  local plist="$1"
  [[ -f "$plist" ]]
}

launchd_service_loaded() {
  local label="$1"
  launchd_is_available && launchctl print "$(launchd_target)/${label}" >/dev/null 2>&1
}

render_launchd_plist() {
  local template="$1"
  local output="$2"
  local label="$3"
  local runner="$4"
  local working_dir="$5"
  local log_file="$6"

  sed \
    -e "s#__LABEL__#${label}#g" \
    -e "s#__RUNNER__#${runner}#g" \
    -e "s#__WORKING_DIR__#${working_dir}#g" \
    -e "s#__LOG_FILE__#${log_file}#g" \
    -e "s#__PATH__#${LAUNCHD_PATH}#g" \
    "$template" >"$output"
}

launchd_bootout_service() {
  local label="$1"
  local plist="$2"

  if ! launchd_is_available; then
    return 1
  fi

  launchctl bootout "$(launchd_target)" "$plist" >/dev/null 2>&1 || \
    launchctl bootout "$(launchd_target)/${label}" >/dev/null 2>&1 || true
}

launchd_bootstrap_service() {
  local label="$1"
  local plist="$2"

  if ! launchd_is_available; then
    echo "launchctl is not available on this system."
    return 1
  fi

  launchd_bootout_service "$label" "$plist"
  launchctl bootstrap "$(launchd_target)" "$plist"
  launchctl kickstart -k "$(launchd_target)/${label}" >/dev/null 2>&1 || true
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
