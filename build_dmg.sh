#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
ASSET_DIR="$ROOT_DIR/dmg_assets"
BUILD_DIR="$ROOT_DIR/build"
DMG_ROOT="$BUILD_DIR/dmg_root"
APP_DIR="$DMG_ROOT/八戒CRM启动器"
OUTPUT_DMG="$BUILD_DIR/八戒CRM启动器.dmg"

rm -rf "$DMG_ROOT"
mkdir -p "$APP_DIR"

cp "$ASSET_DIR/README.txt" "$APP_DIR/README.txt"
cp "$ASSET_DIR/启动CRM.command" "$APP_DIR/启动CRM.command"
cp "$ASSET_DIR/停止CRM.command" "$APP_DIR/停止CRM.command"
cp "$ASSET_DIR/查看CRM状态.command" "$APP_DIR/查看CRM状态.command"
cp "$ASSET_DIR/start.applescript" "$APP_DIR/start.applescript"
cp "$ASSET_DIR/stop.applescript" "$APP_DIR/stop.applescript"
cp "$ASSET_DIR/status.applescript" "$APP_DIR/status.applescript"
chmod +x "$APP_DIR/启动CRM.command" "$APP_DIR/停止CRM.command" "$APP_DIR/查看CRM状态.command"

rm -f "$OUTPUT_DMG"
hdiutil create \
  -volname "八戒CRM启动器" \
  -srcfolder "$APP_DIR" \
  -format UDZO \
  -imagekey zlib-level=9 \
  "$OUTPUT_DMG"

echo "DMG created: $OUTPUT_DMG"
