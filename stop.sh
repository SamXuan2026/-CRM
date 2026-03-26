#!/bin/bash

set -euo pipefail

source "$(cd "$(dirname "$0")" && pwd)/scripts/common.sh"

stop_service() {
  local name="$1"
  local pid_file="$2"
  local port="$3"
  local pid=""

  if ! pid="$(track_service_pid "$pid_file" "$port")"; then
    echo "$name is not running."
    return 0
  fi

  if kill -0 "$pid" >/dev/null 2>&1; then
    kill "$pid"
    if wait_for_shutdown "$pid" "$port"; then
      echo "$name stopped gracefully."
    else
      echo "$name did not stop in ${STOP_WAIT_SECONDS}s, forcing shutdown."
      kill -9 "$pid" >/dev/null 2>&1 || true
      if wait_for_shutdown "$pid" "$port"; then
        echo "$name was force stopped."
      else
        echo "$name may still be running."
        return 1
      fi
    fi
  else
    echo "$name was not running."
  fi

  rm -f "$pid_file"
  return 0
}

stop_frontend_first() {
  local frontend_status=0
  local backend_status=0

  stop_service "CRM frontend" "$FRONTEND_PID_FILE" "$FRONTEND_PORT" || frontend_status=$?
  stop_service "CRM backend" "$BACKEND_PID_FILE" "$BACKEND_PORT" || backend_status=$?

  if [[ "$frontend_status" -ne 0 || "$backend_status" -ne 0 ]]; then
    exit 1
  fi
}

stop_frontend_first
