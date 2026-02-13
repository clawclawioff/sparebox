import { NextResponse } from "next/server";

// =============================================================================
// GET /api/install — Linux/macOS install script (bash)
// =============================================================================

const INSTALL_SCRIPT = `#!/usr/bin/env bash
set -euo pipefail

# Sparebox Host Daemon Installer
# https://sparebox.dev

SPAREBOX_DIR="\$HOME/.sparebox"
DAEMON_URL="https://www.sparebox.dev/api/install/daemon"
VERSION_URL="https://www.sparebox.dev/api/install/version"
DAEMON_STARTED=false

# Colors
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
BLUE='\\033[0;34m'
NC='\\033[0m' # No Color

echo ""
echo -e "\${BLUE}╔══════════════════════════════════════════╗"
echo -e "║      Sparebox Host Daemon Installer      ║"
echo -e "╚══════════════════════════════════════════╝\${NC}"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "\${RED}✗ Node.js is not installed.\${NC}"
    echo "  Sparebox requires Node.js 20 or later."
    echo "  Install it from https://nodejs.org or via your package manager."
    exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "\$NODE_VERSION" -lt 20 ]; then
    echo -e "\${RED}✗ Node.js version \$NODE_VERSION is too old. Version 20+ required.\${NC}"
    exit 1
fi
echo -e "\${GREEN}✓\${NC} Node.js $(node -v) detected"

# Check curl
if ! command -v curl &> /dev/null; then
    echo -e "\${RED}✗ curl is not installed.\${NC}"
    exit 1
fi
echo -e "\${GREEN}✓\${NC} curl available"

# Create directory
mkdir -p "\$SPAREBOX_DIR"
echo -e "\${GREEN}✓\${NC} Directory: \$SPAREBOX_DIR"

# Download daemon bundle
echo ""
echo -e "\${BLUE}Downloading Sparebox daemon...\${NC}"
curl -fsSL "\$DAEMON_URL" -o "\$SPAREBOX_DIR/sparebox-daemon.cjs"

# Verify download is actual JS (not JSON error)
if head -1 "\$SPAREBOX_DIR/sparebox-daemon.cjs" | grep -q '^{'; then
    echo -e "\${RED}✗ Download failed — received error response instead of daemon code.\${NC}"
    cat "\$SPAREBOX_DIR/sparebox-daemon.cjs"
    rm -f "\$SPAREBOX_DIR/sparebox-daemon.cjs"
    exit 1
fi

echo -e "\${GREEN}✓\${NC} Daemon downloaded"

# Function to configure daemon (must be defined before use)
# Reads from /dev/tty so it works when piped (curl | bash)
configure_daemon() {
    echo -e "\${YELLOW}Enter your credentials from the Sparebox dashboard.\${NC}"
    echo "  (Get them at: https://www.sparebox.dev/dashboard/hosts)"
    echo "  Press Enter to skip and configure later."
    echo ""
    printf "API Key (sbx_host_...): "
    read API_KEY < /dev/tty
    printf "Host ID (UUID): "
    read HOST_ID < /dev/tty

    if [ -z "\$API_KEY" ] || [ -z "\$HOST_ID" ]; then
        echo ""
        echo -e "\${YELLOW}⚠ Skipping config — you can configure later:\${NC}"
        echo "  export SPAREBOX_API_KEY=<your-key>"
        echo "  export SPAREBOX_HOST_ID=<your-host-id>"
        echo "  Or edit: \$SPAREBOX_DIR/config.json"
    else
        cat > "\$SPAREBOX_DIR/config.json" << EOFCONF
{
  "apiKey": "\$API_KEY",
  "hostId": "\$HOST_ID",
  "apiUrl": "https://www.sparebox.dev",
  "heartbeatIntervalMs": 60000
}
EOFCONF
        echo -e "\${GREEN}✓\${NC} Config saved to \$SPAREBOX_DIR/config.json"

        # Auto-start daemon in background
        echo ""
        echo -e "\${BLUE}Starting daemon...\${NC}"
        node "\$SPAREBOX_DIR/sparebox-daemon.cjs" > /dev/null 2>&1 &
        DAEMON_PID=\$!
        DAEMON_STARTED=true
        echo -e "\${GREEN}✓\${NC} Daemon started (PID: \$DAEMON_PID)"
        echo ""
        echo "  Stop it:       kill \$DAEMON_PID  or  pkill -f sparebox-daemon"
        echo "  View logs:     Run with output redirect:"
        echo "                 node ~/.sparebox/sparebox-daemon.cjs > ~/.sparebox/daemon.log 2>&1 &"
    fi
}

# Get configuration
echo ""
echo -e "\${YELLOW}Configuration\${NC}"
echo ""

# Check if config already exists
if [ -f "\$SPAREBOX_DIR/config.json" ]; then
    echo -e "\${YELLOW}Existing config found at \$SPAREBOX_DIR/config.json\${NC}"
    printf "Overwrite? (y/N): "
    read OVERWRITE < /dev/tty
    if [ "\$OVERWRITE" != "y" ] && [ "\$OVERWRITE" != "Y" ]; then
        echo "Keeping existing config."
    else
        configure_daemon
    fi
else
    configure_daemon
fi

# Verify installation
echo ""
echo -e "\${BLUE}Verifying installation...\${NC}"
if [ -f "\$SPAREBOX_DIR/sparebox-daemon.cjs" ]; then
    node "\$SPAREBOX_DIR/sparebox-daemon.cjs" --verify && echo "" || true
fi

# Systemd service setup (Linux only)
if command -v systemctl &> /dev/null && [ -d "/etc/systemd/system" ] || [ -d "\$HOME/.config/systemd/user" ]; then
    echo ""
    printf "Set up as a systemd service (auto-start on boot)? (y/N): "
    read SETUP_SERVICE < /dev/tty
    if [ "\$SETUP_SERVICE" = "y" ] || [ "\$SETUP_SERVICE" = "Y" ]; then
        SERVICE_DIR="\$HOME/.config/systemd/user"
        mkdir -p "\$SERVICE_DIR"
        
        DAEMON_PATH="\$SPAREBOX_DIR/sparebox-daemon.cjs"
        
        cat > "\$SERVICE_DIR/sparebox-daemon.service" << EOFSVC
[Unit]
Description=Sparebox Host Daemon
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=$(which node) \$DAEMON_PATH
Restart=always
RestartSec=10
Environment=HOME=\$HOME

[Install]
WantedBy=default.target
EOFSVC
        
        systemctl --user daemon-reload
        systemctl --user enable sparebox-daemon
        systemctl --user start sparebox-daemon
        echo -e "\${GREEN}✓\${NC} Systemd service installed and started"
        echo "  Status: systemctl --user status sparebox-daemon"
        echo "  Logs:   journalctl --user -u sparebox-daemon -f"
    fi
fi

# Done
echo ""
echo -e "\${GREEN}╔══════════════════════════════════════════╗"
echo -e "║         Installation Complete! ✓         ║"
echo -e "╚══════════════════════════════════════════╝\${NC}"
echo ""
if [ "\$DAEMON_STARTED" = true ]; then
    echo -e "\${GREEN}✓ Daemon is running!\${NC}"
    echo "  Dashboard: https://www.sparebox.dev/dashboard/hosts"
    echo "  Logs:      https://www.sparebox.dev/install"
else
    echo "To start manually:"
    echo "  node \$SPAREBOX_DIR/sparebox-daemon.cjs"
    echo ""
    echo "Dashboard: https://www.sparebox.dev/dashboard/hosts"
    echo "Docs:      https://www.sparebox.dev/install"
fi
echo ""
`;

export async function GET() {
  return new NextResponse(INSTALL_SCRIPT, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": 'attachment; filename="install.sh"',
      "Cache-Control": "public, max-age=300",
    },
  });
}
