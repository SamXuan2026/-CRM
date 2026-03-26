#!/bin/bash

set -euo pipefail

source "$(cd "$(dirname "$0")" && pwd)/scripts/common.sh"

print_status() {
  local name="$1"
  local pid_file="$2"
  local url="$3"
  local port="$4"
  local health_url="$5"

  local pid
  if pid="$(track_service_pid "$pid_file" "$port")"; then
    if health_check "$health_url"; then
      echo "$name: running and healthy (PID $pid) - $url"
      return 0
    fi
    echo "$name: process found but health check failed (PID $pid) - $url"
    return 1
  fi

  echo "$name: stopped"
  return 1
}

backend_status=0
frontend_status=0

print_status "CRM backend" "$BACKEND_PID_FILE" "$BACKEND_PUBLIC_URL" "$BACKEND_PORT" "$BACKEND_HEALTH_URL" || backend_status=$?
print_status "CRM frontend" "$FRONTEND_PID_FILE" "$FRONTEND_PUBLIC_URL" "$FRONTEND_PORT" "$FRONTEND_HEALTH_URL" || frontend_status=$?

if [[ "$backend_status" -ne 0 || "$frontend_status" -ne 0 ]]; then
  exit 1
fi
