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
OPENCLAW_IMAGE="ghcr.io/openclaw/openclaw:latest"
DAEMON_STARTED=false
DOCKER_AVAILABLE=false
PODMAN_AVAILABLE=false
ISOLATION_MODE="none"

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

# ─────────────────────────────────────────────────
# Step 1: Check Node.js
# ─────────────────────────────────────────────────

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

# ─────────────────────────────────────────────────
# Step 2: Check Docker / Podman
# ─────────────────────────────────────────────────

echo ""
echo -e "\${BLUE}Checking container runtime...\${NC}"

# Check Docker
if command -v docker &> /dev/null; then
    if docker info &>/dev/null 2>&1; then
        DOCKER_AVAILABLE=true
        ISOLATION_MODE="docker"
        DOCKER_VERSION=$(docker --version | head -1)
        echo -e "\${GREEN}✓\${NC} Docker detected: \$DOCKER_VERSION"
    else
        echo -e "\${YELLOW}⚠\${NC} Docker installed but not running or no permission"
    fi
fi

# Check Podman (fallback)
if [ "\$DOCKER_AVAILABLE" = false ] && command -v podman &> /dev/null; then
    if podman info &>/dev/null 2>&1; then
        PODMAN_AVAILABLE=true
        ISOLATION_MODE="podman"
        PODMAN_VERSION=$(podman --version | head -1)
        echo -e "\${GREEN}✓\${NC} Podman detected: \$PODMAN_VERSION"
    fi
fi

# Attempt rootless Docker install if nothing found
if [ "\$DOCKER_AVAILABLE" = false ] && [ "\$PODMAN_AVAILABLE" = false ]; then
    echo -e "\${YELLOW}No container runtime found.\${NC}"
    echo ""
    echo "  Docker provides strong isolation between agents on your machine."
    echo "  Without it, agents run with limited isolation (shared filesystem)."
    echo ""
    printf "Attempt to install Docker rootless (no sudo needed)? (Y/n): "
    read INSTALL_DOCKER < /dev/tty

    if [ "\$INSTALL_DOCKER" != "n" ] && [ "\$INSTALL_DOCKER" != "N" ]; then
        echo ""
        echo -e "\${BLUE}Installing Docker rootless...\${NC}"
        echo "  This may take a few minutes."
        echo ""

        # Check prerequisites
        DOCKER_PREREQS_OK=true

        if ! command -v newuidmap &>/dev/null; then
            echo -e "\${YELLOW}⚠ newuidmap not found. Required for rootless Docker.\${NC}"
            echo "  Install with: sudo apt install uidmap"
            DOCKER_PREREQS_OK=false
        fi

        if [ ! -f /etc/subuid ] || ! grep -q "^\$(whoami):" /etc/subuid 2>/dev/null; then
            echo -e "\${YELLOW}⚠ /etc/subuid not configured for \$(whoami).\${NC}"
            echo "  Ask an admin to add: \$(whoami):100000:65536"
            DOCKER_PREREQS_OK=false
        fi

        if [ "\$DOCKER_PREREQS_OK" = true ]; then
            if curl -fsSL https://get.docker.com/rootless | sh 2>&1; then
                # Add Docker to PATH for this session
                export PATH="\$HOME/bin:\$PATH"
                export DOCKER_HOST="unix:///run/user/\$(id -u)/docker.sock"

                # Persist in .bashrc
                if ! grep -q "DOCKER_HOST" "\$HOME/.bashrc" 2>/dev/null; then
                    echo 'export PATH="\$HOME/bin:\$PATH"' >> "\$HOME/.bashrc"
                    echo "export DOCKER_HOST=unix:///run/user/\$(id -u)/docker.sock" >> "\$HOME/.bashrc"
                fi

                if docker info &>/dev/null 2>&1; then
                    DOCKER_AVAILABLE=true
                    ISOLATION_MODE="docker"
                    echo -e "\${GREEN}✓\${NC} Docker rootless installed successfully!"
                else
                    echo -e "\${YELLOW}⚠ Docker installed but not yet functional.\${NC}"
                    echo "  Try restarting your shell and running the installer again."
                fi
            else
                echo -e "\${YELLOW}⚠ Docker rootless install failed.\${NC}"
            fi
        else
            echo -e "\${YELLOW}⚠ Prerequisites not met. Skipping Docker install.\${NC}"
            echo "  Install prerequisites first, then re-run this script."
        fi
    fi

    if [ "\$DOCKER_AVAILABLE" = false ] && [ "\$PODMAN_AVAILABLE" = false ]; then
        ISOLATION_MODE="profile"
        echo ""
        echo -e "\${YELLOW}⚠ Running without container isolation.\${NC}"
        echo "  Agents will use OpenClaw --profile mode (limited isolation)."
        echo "  For better security, install Docker and re-run this script."
    fi
fi

echo -e "\${GREEN}✓\${NC} Isolation mode: \${ISOLATION_MODE}"

# ─────────────────────────────────────────────────
# Step 3: Pull OpenClaw Docker image
# ─────────────────────────────────────────────────

if [ "\$DOCKER_AVAILABLE" = true ] || [ "\$PODMAN_AVAILABLE" = true ]; then
    RUNTIME="docker"
    [ "\$PODMAN_AVAILABLE" = true ] && RUNTIME="podman"

    echo ""
    echo -e "\${BLUE}Pulling OpenClaw Docker image...\${NC}"
    echo "  This may take a few minutes on first install (~500MB)."
    if \$RUNTIME pull "\$OPENCLAW_IMAGE" 2>&1; then
        echo -e "\${GREEN}✓\${NC} OpenClaw image ready"
    else
        echo -e "\${YELLOW}⚠ Failed to pull image. Will retry on first agent deploy.\${NC}"
    fi
fi

# ─────────────────────────────────────────────────
# Step 4: Create directory + download daemon
# ─────────────────────────────────────────────────

mkdir -p "\$SPAREBOX_DIR"
echo -e "\${GREEN}✓\${NC} Directory: \$SPAREBOX_DIR"

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

# ─────────────────────────────────────────────────
# Step 5: Configure daemon
# ─────────────────────────────────────────────────

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
    fi
}

echo ""
echo -e "\${YELLOW}Configuration\${NC}"
echo ""

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

# ─────────────────────────────────────────────────
# Step 6: System configuration recommendations
# ─────────────────────────────────────────────────

echo ""
echo -e "\${BLUE}System Recommendations\${NC}"
echo ""

# Check loginctl linger (keeps user services running after logout)
if command -v loginctl &>/dev/null; then
    LINGER_STATUS=$(loginctl show-user "\$(whoami)" --property=Linger 2>/dev/null | cut -d= -f2)
    if [ "\$LINGER_STATUS" = "yes" ]; then
        echo -e "\${GREEN}✓\${NC} Lingering enabled (services survive logout)"
    else
        echo -e "\${YELLOW}⚠\${NC} Lingering not enabled. Run: loginctl enable-linger \$(whoami)"
        echo "    (may need sudo — keeps daemon running after SSH disconnect)"
    fi
fi

# Check swap
SWAP_TOTAL=$(free -m 2>/dev/null | awk '/Swap:/ {print \$2}' || echo "0")
if [ "\$SWAP_TOTAL" -gt 0 ] 2>/dev/null; then
    echo -e "\${GREEN}✓\${NC} Swap available: \${SWAP_TOTAL}MB"
else
    echo -e "\${YELLOW}⚠\${NC} No swap configured. Recommended: 2GB+ for stability"
    echo "    sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile"
    echo "    sudo mkswap /swapfile && sudo swapon /swapfile"
fi

# Check cgroups v2 (needed for Docker resource limits)
if [ -f /sys/fs/cgroup/cgroup.controllers ]; then
    echo -e "\${GREEN}✓\${NC} cgroups v2 enabled (Docker resource limits work)"
else
    echo -e "\${YELLOW}⚠\${NC} cgroups v1 detected. Docker resource limits may not work."
    echo "    Ubuntu 22.04+ defaults to v2. Consider upgrading."
fi

# ─────────────────────────────────────────────────
# Step 7: Verify installation
# ─────────────────────────────────────────────────

echo ""
echo -e "\${BLUE}Verifying installation...\${NC}"
if [ -f "\$SPAREBOX_DIR/sparebox-daemon.cjs" ]; then
    node "\$SPAREBOX_DIR/sparebox-daemon.cjs" --verify && echo "" || true
fi

# ─────────────────────────────────────────────────
# Step 8: Systemd service setup (Linux only)
# ─────────────────────────────────────────────────

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

# ─────────────────────────────────────────────────
# Done
# ─────────────────────────────────────────────────

echo ""
echo -e "\${GREEN}╔══════════════════════════════════════════╗"
echo -e "║         Installation Complete! ✓         ║"
echo -e "╚══════════════════════════════════════════╝\${NC}"
echo ""
echo "  Isolation:  \${ISOLATION_MODE}"
if [ "\$DAEMON_STARTED" = true ]; then
    echo -e "  Status:     \${GREEN}Running\${NC}"
else
    echo "  Status:     Not running (start with: node ~/.sparebox/sparebox-daemon.cjs)"
fi
echo "  Dashboard:  https://www.sparebox.dev/dashboard/hosts"
echo "  Docs:       https://www.sparebox.dev/install"
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
