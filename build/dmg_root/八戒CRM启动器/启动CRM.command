#!/bin/bash

set -uo pipefail

PROJECT_ROOT="/Users/samxuan/sam/code/crm_system"
PUBLIC_FRONTEND_URL="http://172.16.1.32:3000"
PUBLIC_BACKEND_URL="http://172.16.1.32:5006"

cd "$PROJECT_ROOT" || {
  echo "无法进入项目目录: $PROJECT_ROOT"
  echo
  read -n 1 -s -r -p "按任意键关闭窗口..."
  exit 1
}

if ./start.sh; then
  echo
  ./status.sh || true
  echo
  echo "前端地址: $PUBLIC_FRONTEND_URL"
  echo "后端地址: $PUBLIC_BACKEND_URL"
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
