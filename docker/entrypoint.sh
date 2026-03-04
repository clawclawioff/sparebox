#!/bin/bash
set -e

# OpenClaw directory is bind-mounted from the host at /home/node/.openclaw/
# This includes:
#   ~/.openclaw/openclaw.json   — OpenClaw config (written by daemon)
#   ~/.openclaw/workspace/      — Workspace files (SOUL.md, USER.md, etc.)
#
# No symlinks or copies needed — the volume mount handles everything.

OPENCLAW_DIR="$HOME/.openclaw"

# Verify config exists
if [ -f "$OPENCLAW_DIR/openclaw.json" ]; then
  echo "[entrypoint] OpenClaw config found at $OPENCLAW_DIR/openclaw.json"
else
  echo "[entrypoint] WARNING: No openclaw.json found at $OPENCLAW_DIR/openclaw.json"
fi

# Verify workspace exists
if [ -d "$OPENCLAW_DIR/workspace" ]; then
  echo "[entrypoint] Workspace found at $OPENCLAW_DIR/workspace"
  ls -la "$OPENCLAW_DIR/workspace/" 2>/dev/null | head -10
else
  echo "[entrypoint] WARNING: No workspace directory at $OPENCLAW_DIR/workspace"
  mkdir -p "$OPENCLAW_DIR/workspace"
fi

# Start OpenClaw gateway
exec openclaw gateway start --foreground "$@"
