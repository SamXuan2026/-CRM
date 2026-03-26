#!/bin/bash

set -uo pipefail

PROJECT_ROOT="/Users/samxuan/sam/code/crm_system"

cd "$PROJECT_ROOT" || {
  echo "无法进入项目目录: $PROJECT_ROOT"
  echo
  read -n 1 -s -r -p "按任意键关闭窗口..."
  exit 1
}

source "$PROJECT_ROOT/scripts/common.sh"

if ./start.sh; then
  echo
  ./status.sh || true
  echo
  echo "前端地址: $FRONTEND_PUBLIC_URL"
  echo "后端地址: $BACKEND_PUBLIC_URL"
  echo "日志目录: $PROJECT_ROOT/logs"
else
  status=$?
  echo
  echo "启动失败，请检查日志:"
  echo "  $PROJECT_ROOT/logs/backend.log"
  echo "  $PROJECT_ROOT/logs/frontend.log"
  echo
  read -n 1 -s -r -p "按任意键关闭窗口..."
  exit "$status"
fi

echo
read -n 1 -s -r -p "按任意键关闭窗口..."
