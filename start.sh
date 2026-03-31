#!/bin/bash

set -euo pipefail

source "$(cd "$(dirname "$0")" && pwd)/scripts/common.sh"

ensure_runtime_dirs

start_launchd_managed_service() {
  local name="$1"
  local label="$2"
  local plist="$3"
  local pid_file="$4"
  local port="$5"
  local health_url="$6"
  local public_url="$7"

  if ! launchd_service_installed "$plist"; then
    return 1
  fi

  launchd_bootstrap_service "$label" "$plist"
  if wait_for_health "$name" "$pid_file" "$port" "$health_url"; then
    echo "$name started via launchd: $public_url"
    return 0
  fi

  echo "$name failed to become healthy under launchd."
  return 1
}

is_running() {
  local pid_file="$1"
  local port="$2"
  local health_url="$3"

  local tracked_pid
  tracked_pid="$(track_service_pid "$pid_file" "$port" || true)"
  if [[ -z "$tracked_pid" ]]; then
    return 1
  fi

  if health_check "$health_url"; then
    return 0
  fi

  echo "Found process for $(basename "$pid_file" .pid), but health check failed."
  return 1
}

start_service() {
  local name="$1"
  local work_dir="$2"
  local command="$3"
  local pid_file="$4"
  local port="$5"
  local health_url="$6"
  local public_url="$7"
  local log_file="$8"

  : >"$log_file"

  (
    cd "$work_dir"
    nohup bash -lc "$command" >"$log_file" 2>&1 &
    echo $! >"$pid_file"
  )

  if wait_for_health "$name" "$pid_file" "$port" "$health_url"; then
    echo "$name started: $public_url"
    return 0
  fi

  echo "$name failed to become healthy."
  print_log_tail "$log_file"
  rm -f "$pid_file"
  return 1
}

adopt_running_service() {
  local name="$1"
  local pid_file="$2"
  local port="$3"
  local public_url="$4"
  local pid

  pid="$(track_service_pid "$pid_file" "$port")"
  echo "$name is already running (PID $pid): $public_url"
}

start_backend() {
  if launchd_service_installed "$LAUNCHD_BACKEND_PLIST"; then
    start_launchd_managed_service \
      "CRM backend" \
      "$LAUNCHD_BACKEND_LABEL" \
      "$LAUNCHD_BACKEND_PLIST" \
      "$BACKEND_PID_FILE" \
      "$BACKEND_PORT" \
      "$BACKEND_HEALTH_URL" \
      "$BACKEND_PUBLIC_URL"
    return 0
  fi

  if is_running "$BACKEND_PID_FILE" "$BACKEND_PORT" "$BACKEND_HEALTH_URL"; then
    adopt_running_service "CRM backend" "$BACKEND_PID_FILE" "$BACKEND_PORT" "$BACKEND_PUBLIC_URL"
    return 0
  fi

  start_service \
    "CRM backend" \
    "$BACKEND_DIR" \
    "python3 app.py" \
    "$BACKEND_PID_FILE" \
    "$BACKEND_PORT" \
    "$BACKEND_HEALTH_URL" \
    "$BACKEND_PUBLIC_URL" \
    "$BACKEND_LOG"
}

start_frontend() {
  if launchd_service_installed "$LAUNCHD_FRONTEND_PLIST"; then
    start_launchd_managed_service \
      "CRM frontend" \
      "$LAUNCHD_FRONTEND_LABEL" \
      "$LAUNCHD_FRONTEND_PLIST" \
      "$FRONTEND_PID_FILE" \
      "$FRONTEND_PORT" \
      "$FRONTEND_HEALTH_URL" \
      "$FRONTEND_PUBLIC_URL"
    return 0
  fi

  if is_running "$FRONTEND_PID_FILE" "$FRONTEND_PORT" "$FRONTEND_HEALTH_URL"; then
    adopt_running_service "CRM frontend" "$FRONTEND_PID_FILE" "$FRONTEND_PORT" "$FRONTEND_PUBLIC_URL"
    return 0
  fi

  start_service \
    "CRM frontend" \
    "$FRONTEND_DIR" \
    "npm run dev" \
    "$FRONTEND_PID_FILE" \
    "$FRONTEND_PORT" \
    "$FRONTEND_HEALTH_URL" \
    "$FRONTEND_PUBLIC_URL" \
    "$FRONTEND_LOG"
}

start_backend
start_frontend

echo "Logs:"
echo "  Backend: $BACKEND_LOG"
echo "  Frontend: $FRONTEND_LOG"
