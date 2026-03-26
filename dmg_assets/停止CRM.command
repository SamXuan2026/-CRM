#!/bin/bash

set -uo pipefail

PROJECT_ROOT="/Users/samxuan/sam/code/crm_system"

cd "$PROJECT_ROOT" || {
  echo "无法进入项目目录: $PROJECT_ROOT"
  echo
  read -n 1 -s -r -p "按任意键关闭窗口..."
  exit 1
}

if ./stop.sh; then
  echo
  ./status.sh || true
else
  status=$?
  echo
  echo "停止脚本返回异常，请稍后再检查状态。"
  echo
  read -n 1 -s -r -p "按任意键关闭窗口..."
  exit "$status"
fi

echo
read -n 1 -s -r -p "按任意键关闭窗口..."
