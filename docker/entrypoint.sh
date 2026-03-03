#!/bin/bash
set -e

# OpenClaw config directory (where OpenClaw reads openclaw.json)
OPENCLAW_DIR="$HOME/.openclaw"
mkdir -p "$OPENCLAW_DIR"

# 1. Link workspace: OpenClaw expects workspace at ~/.openclaw/workspace
#    We mount the persistent volume at /workspace
if [ -d "/workspace" ] && [ ! -e "$OPENCLAW_DIR/workspace" ]; then
  ln -sf /workspace "$OPENCLAW_DIR/workspace"
elif [ -d "/workspace" ] && [ -L "$OPENCLAW_DIR/workspace" ]; then
  # Already a symlink, ensure it points to /workspace
  ln -sf /workspace "$OPENCLAW_DIR/workspace"
fi

# 2. Copy OpenClaw config from /state to where OpenClaw reads it
#    The daemon writes openclaw-config.json to /state, but OpenClaw reads openclaw.json from ~/.openclaw/
if [ -f "/state/openclaw-config.json" ]; then
  cp /state/openclaw-config.json "$OPENCLAW_DIR/openclaw.json"
  echo "[entrypoint] Copied config from /state/openclaw-config.json to $OPENCLAW_DIR/openclaw.json"
fi

# 3. Copy auth profiles if they exist in /state
if [ -d "/state/agents" ]; then
  cp -r /state/agents "$OPENCLAW_DIR/" 2>/dev/null || true
fi

# 4. Start OpenClaw gateway
exec openclaw gateway start --foreground "$@"
