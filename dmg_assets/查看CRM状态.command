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

./status.sh || true
echo
echo "前端地址: $FRONTEND_PUBLIC_URL"
echo "后端地址: $BACKEND_PUBLIC_URL"
echo "日志目录: $PROJECT_ROOT/logs"
echo
read -n 1 -s -r -p "按任意键关闭窗口..."
