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
# Step 0: Detect platform (Windows / WSL / macOS / Linux)
# ─────────────────────────────────────────────────

IS_WSL=false
IS_WINDOWS=false

# Detect WSL
if grep -qi microsoft /proc/version 2>/dev/null || [ -n "\${WSL_DISTRO_NAME:-}" ]; then
    IS_WSL=true
    WSL_DISTRO="\${WSL_DISTRO_NAME:-\$(grep -oP 'Microsoft.*\$' /proc/version 2>/dev/null || echo 'unknown')}"
    echo -e "\${BLUE}Detected: Windows Subsystem for Linux (WSL)\${NC}"
    echo -e "  Distro: \$WSL_DISTRO"
    echo ""
    echo -e "\${GREEN}✓\${NC} WSL is fully supported. Docker Desktop integration recommended."
    echo ""

    # Check if Docker Desktop WSL integration is available
    if command -v docker &>/dev/null && docker info &>/dev/null 2>&1; then
        echo -e "\${GREEN}✓\${NC} Docker Desktop WSL integration detected"
    else
        echo -e "\${YELLOW}Note:\${NC} For Docker isolation in WSL:"
        echo "  1. Install Docker Desktop for Windows: https://docker.com/products/docker-desktop"
        echo "  2. In Docker Desktop → Settings → Resources → WSL Integration"
        echo "  3. Enable integration with your WSL distro (\$WSL_DISTRO)"
        echo ""
    fi
fi

# Detect native Windows (Git Bash, MSYS, Cygwin)
if [ "\$IS_WSL" = false ]; then
    case "\$(uname -s)" in
        MINGW*|MSYS*|CYGWIN*)
            IS_WINDOWS=true
            echo -e "\${YELLOW}⚠ Native Windows detected (Git Bash / MSYS / Cygwin)\${NC}"
            echo ""
            echo "  For the best experience, we recommend one of these options:"
            echo ""
            echo "  Option 1 (Recommended): Use WSL"
            echo "    wsl --install"
            echo "    # Then re-run this installer inside WSL"
            echo ""
            echo "  Option 2: Use the PowerShell installer"
            echo "    irm https://www.sparebox.dev/api/install/windows | iex"
            echo ""
            printf "Continue with Git Bash anyway? (y/N): "
            read CONTINUE_WINDOWS < /dev/tty
            if [ "\$CONTINUE_WINDOWS" != "y" ] && [ "\$CONTINUE_WINDOWS" != "Y" ]; then
                echo "Exiting. Use one of the options above."
                exit 0
            fi
            ;;
    esac
fi

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

# Attempt Docker install if nothing found
if [ "\$DOCKER_AVAILABLE" = false ] && [ "\$PODMAN_AVAILABLE" = false ]; then
    echo -e "\${YELLOW}No container runtime found.\${NC}"
    echo ""
    echo "  Docker provides strong isolation between agents on your machine."
    echo "  Without it, agents run with limited isolation (shared filesystem)."
    echo ""

    OS_TYPE=\$(uname -s)

    if [ "\$IS_WSL" = true ]; then
        # WSL — Docker Desktop with WSL integration
        echo "  In WSL, Docker works best via Docker Desktop for Windows."
        echo ""
        echo "  Setup steps:"
        echo "    1. Install Docker Desktop: https://docker.com/products/docker-desktop"
        echo "    2. Open Docker Desktop → Settings → Resources → WSL Integration"
        echo "    3. Enable your WSL distro, then re-run this installer"
        echo ""

        # Check if Docker Desktop might be installed on Windows side
        if command -v docker.exe &>/dev/null || [ -f "/mnt/c/Program Files/Docker/Docker/Docker Desktop.exe" ]; then
            echo -e "\${YELLOW}⚠\${NC} Docker Desktop appears installed on Windows but WSL integration isn't working."
            echo "  Open Docker Desktop → Settings → Resources → WSL Integration"
            echo "  Make sure your distro is enabled, then restart Docker Desktop."
        fi

        printf "Continue without Docker? (Y/n): "
        read SKIP_DOCKER < /dev/tty
        if [ "\$SKIP_DOCKER" = "n" ] || [ "\$SKIP_DOCKER" = "N" ]; then
            echo "Set up Docker Desktop WSL integration, then re-run:"
            echo "  curl -fsSL https://www.sparebox.dev/api/install | bash"
            exit 0
        fi
    elif [ "\$OS_TYPE" = "Darwin" ]; then
        # macOS — Docker Desktop required
        echo "  On macOS, Docker Desktop is required for container isolation."
        echo ""

        # Check if Docker Desktop is installed but not running
        if [ -d "/Applications/Docker.app" ]; then
            echo -e "\${YELLOW}⚠\${NC} Docker Desktop is installed but not running."
            printf "Start Docker Desktop now? (Y/n): "
            read START_DOCKER < /dev/tty
            if [ "\$START_DOCKER" != "n" ] && [ "\$START_DOCKER" != "N" ]; then
                echo -e "\${BLUE}Starting Docker Desktop...\${NC}"
                open -a Docker
                echo "  Waiting for Docker to start (this can take 30-60 seconds)..."
                for i in \$(seq 1 60); do
                    if docker info &>/dev/null 2>&1; then
                        DOCKER_AVAILABLE=true
                        ISOLATION_MODE="docker"
                        echo -e "\${GREEN}✓\${NC} Docker Desktop is running!"
                        break
                    fi
                    sleep 2
                done
                if [ "\$DOCKER_AVAILABLE" = false ]; then
                    echo -e "\${YELLOW}⚠\${NC} Docker Desktop is still starting. Re-run the installer once it's ready."
                fi
            fi
        else
            # Check if Homebrew is available for install
            if command -v brew &>/dev/null; then
                printf "Install Docker Desktop via Homebrew? (Y/n): "
                read INSTALL_DOCKER < /dev/tty
                if [ "\$INSTALL_DOCKER" != "n" ] && [ "\$INSTALL_DOCKER" != "N" ]; then
                    echo -e "\${BLUE}Installing Docker Desktop via Homebrew...\${NC}"
                    echo "  This may take a few minutes."
                    if brew install --cask docker 2>&1; then
                        echo -e "\${GREEN}✓\${NC} Docker Desktop installed!"
                        echo -e "\${BLUE}Starting Docker Desktop...\${NC}"
                        open -a Docker
                        echo "  Waiting for Docker to start (this can take 30-60 seconds)..."
                        for i in \$(seq 1 60); do
                            if docker info &>/dev/null 2>&1; then
                                DOCKER_AVAILABLE=true
                                ISOLATION_MODE="docker"
                                echo -e "\${GREEN}✓\${NC} Docker Desktop is running!"
                                break
                            fi
                            sleep 2
                        done
                        if [ "\$DOCKER_AVAILABLE" = false ]; then
                            echo -e "\${YELLOW}⚠\${NC} Docker Desktop is still starting."
                            echo "  Open Docker Desktop manually, then re-run the installer."
                        fi
                    else
                        echo -e "\${YELLOW}⚠\${NC} Homebrew install failed."
                        echo "  Download Docker Desktop from: https://docker.com/products/docker-desktop"
                    fi
                fi
            else
                echo "  Install options:"
                echo "    1. Download from: https://docker.com/products/docker-desktop"
                echo "    2. Install Homebrew first: https://brew.sh"
                echo "       Then run: brew install --cask docker"
                echo ""
                printf "Continue without Docker? (Y/n): "
                read SKIP_DOCKER < /dev/tty
                if [ "\$SKIP_DOCKER" = "n" ] || [ "\$SKIP_DOCKER" = "N" ]; then
                    echo "Install Docker Desktop and re-run: curl -fsSL https://www.sparebox.dev/api/install | bash"
                    exit 0
                fi
            fi
        fi
    else
        # Linux — rootless Docker
        printf "Attempt to install Docker rootless (no sudo needed)? (Y/n): "
        read INSTALL_DOCKER < /dev/tty

        if [ "\$INSTALL_DOCKER" != "n" ] && [ "\$INSTALL_DOCKER" != "N" ]; then
            echo ""
            echo -e "\${BLUE}Installing Docker rootless...\${NC}"
            echo "  This may take a few minutes."
            echo ""

            # Check prerequisites
            DOCKER_PREREQS_OK=true
            MISSING_PKGS=""

            if ! command -v newuidmap &>/dev/null; then
                echo -e "\${YELLOW}⚠\${NC} newuidmap not found (required for rootless Docker)"
                DOCKER_PREREQS_OK=false
                MISSING_PKGS="uidmap"
            fi

            if ! command -v slirp4netns &>/dev/null; then
                echo -e "\${YELLOW}⚠\${NC} slirp4netns not found (required for rootless networking)"
                DOCKER_PREREQS_OK=false
                MISSING_PKGS="\$MISSING_PKGS slirp4netns"
            fi

            if [ ! -f /etc/subuid ] || ! grep -q "^\$(whoami):" /etc/subuid 2>/dev/null; then
                echo -e "\${YELLOW}⚠\${NC} /etc/subuid not configured for \$(whoami)"
                DOCKER_PREREQS_OK=false
            fi

            if [ "\$DOCKER_PREREQS_OK" = false ] && [ -n "\$MISSING_PKGS" ]; then
                echo ""
                echo "  Missing packages:\$MISSING_PKGS"
                echo ""

                # Try to install missing packages
                if command -v apt-get &>/dev/null; then
                    printf "Install missing packages with sudo? (Y/n): "
                    read INSTALL_PKGS < /dev/tty
                    if [ "\$INSTALL_PKGS" != "n" ] && [ "\$INSTALL_PKGS" != "N" ]; then
                        echo -e "\${BLUE}Installing:\$MISSING_PKGS\${NC}"
                        if sudo apt-get update -qq && sudo apt-get install -y -qq \$MISSING_PKGS; then
                            echo -e "\${GREEN}✓\${NC} Packages installed"
                            # Re-check newuidmap
                            if command -v newuidmap &>/dev/null; then
                                DOCKER_PREREQS_OK=true
                            fi
                        else
                            echo -e "\${YELLOW}⚠\${NC} Package install failed"
                        fi
                    fi
                elif command -v dnf &>/dev/null; then
                    printf "Install missing packages with sudo? (Y/n): "
                    read INSTALL_PKGS < /dev/tty
                    if [ "\$INSTALL_PKGS" != "n" ] && [ "\$INSTALL_PKGS" != "N" ]; then
                        echo -e "\${BLUE}Installing: shadow-utils slirp4netns\${NC}"
                        if sudo dnf install -y shadow-utils slirp4netns; then
                            DOCKER_PREREQS_OK=true
                        fi
                    fi
                else
                    echo "  Install manually: sudo apt install\$MISSING_PKGS"
                fi
            fi

            # Check/fix subuid
            if [ ! -f /etc/subuid ] || ! grep -q "^\$(whoami):" /etc/subuid 2>/dev/null; then
                echo ""
                echo -e "\${YELLOW}⚠\${NC} /etc/subuid not configured for \$(whoami)"
                printf "Configure subuid/subgid with sudo? (Y/n): "
                read FIX_SUBUID < /dev/tty
                if [ "\$FIX_SUBUID" != "n" ] && [ "\$FIX_SUBUID" != "N" ]; then
                    if sudo sh -c "echo \$(whoami):100000:65536 >> /etc/subuid && echo \$(whoami):100000:65536 >> /etc/subgid"; then
                        echo -e "\${GREEN}✓\${NC} subuid/subgid configured"
                        DOCKER_PREREQS_OK=true
                    else
                        echo -e "\${YELLOW}⚠\${NC} Failed to configure subuid/subgid"
                    fi
                fi
            fi

            if [ "\$DOCKER_PREREQS_OK" = true ]; then
                if curl -fsSL https://get.docker.com/rootless | sh 2>&1; then
                    export PATH="\$HOME/bin:\$PATH"
                    export DOCKER_HOST="unix:///run/user/\$(id -u)/docker.sock"

                    if ! grep -q "DOCKER_HOST" "\$HOME/.bashrc" 2>/dev/null; then
                        echo 'export PATH="\$HOME/bin:\$PATH"' >> "\$HOME/.bashrc"
                        echo "export DOCKER_HOST=unix:///run/user/\$(id -u)/docker.sock" >> "\$HOME/.bashrc"
                    fi

                    if docker info &>/dev/null 2>&1; then
                        DOCKER_AVAILABLE=true
                        ISOLATION_MODE="docker"
                        echo -e "\${GREEN}✓\${NC} Docker rootless installed successfully!"
                    else
                        echo -e "\${YELLOW}⚠\${NC} Docker installed but not yet functional."
                        echo "  Try restarting your shell and running the installer again."
                    fi
                else
                    echo -e "\${YELLOW}⚠\${NC} Docker rootless install failed."
                fi
            else
                echo -e "\${YELLOW}⚠\${NC} Prerequisites not met. Skipping Docker install."
                echo "  Install prerequisites first, then re-run this script."
            fi
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

SYS_OS=\$(uname -s)

if [ "\$IS_WSL" = true ]; then
    # WSL-specific recommendations
    RAM_KB=\$(grep MemTotal /proc/meminfo 2>/dev/null | awk '{print \$2}')
    RAM_GB=\$((RAM_KB / 1048576))
    if [ "\$RAM_GB" -ge 8 ] 2>/dev/null; then
        echo -e "\${GREEN}✓\${NC} RAM: \${RAM_GB}GB (sufficient)"
    else
        echo -e "\${YELLOW}⚠\${NC} RAM: \${RAM_GB}GB allocated to WSL (8GB+ recommended)"
        echo "    Increase in: %USERPROFILE%\\\\.wslconfig → [wsl2] memory=8GB"
    fi

    # Check .wslconfig for swap
    SWAP_TOTAL=\$(free -m 2>/dev/null | awk '/Swap:/ {print \$2}' || echo "0")
    if [ "\$SWAP_TOTAL" -gt 0 ] 2>/dev/null; then
        echo -e "\${GREEN}✓\${NC} Swap available: \${SWAP_TOTAL}MB"
    else
        echo -e "\${YELLOW}⚠\${NC} No swap in WSL. Configure in %USERPROFILE%\\\\.wslconfig:"
        echo "    [wsl2]"
        echo "    swap=4GB"
    fi

    # Check systemd support (needed for Docker rootless in WSL)
    if [ -d /run/systemd/system ]; then
        echo -e "\${GREEN}✓\${NC} systemd enabled in WSL"
    else
        echo -e "\${YELLOW}⚠\${NC} systemd not enabled. Add to /etc/wsl.conf:"
        echo "    [boot]"
        echo "    systemd=true"
        echo "    Then: wsl --shutdown && wsl"
    fi
elif [ "\$SYS_OS" = "Darwin" ]; then
    # macOS-specific recommendations
    RAM_GB=\$(sysctl -n hw.memsize 2>/dev/null | awk '{printf "%.0f", \$1/1073741824}')
    if [ "\$RAM_GB" -ge 8 ] 2>/dev/null; then
        echo -e "\${GREEN}✓\${NC} RAM: \${RAM_GB}GB (sufficient)"
    else
        echo -e "\${YELLOW}⚠\${NC} RAM: \${RAM_GB}GB (8GB+ recommended for hosting agents)"
    fi

    # Check if running on battery
    if command -v pmset &>/dev/null; then
        POWER_SOURCE=\$(pmset -g batt 2>/dev/null | head -1 | grep -o "'[^']*'" | tr -d "'")
        if [ "\$POWER_SOURCE" = "AC Power" ]; then
            echo -e "\${GREEN}✓\${NC} Running on AC power"
        else
            echo -e "\${YELLOW}⚠\${NC} Running on battery. Plug in for stable hosting."
        fi
    fi

    # Check if sleep is disabled
    if command -v pmset &>/dev/null; then
        SLEEP_VAL=\$(pmset -g custom 2>/dev/null | grep '^ sleep' | awk '{print \$2}')
        if [ "\$SLEEP_VAL" = "0" ]; then
            echo -e "\${GREEN}✓\${NC} System sleep disabled (good for hosting)"
        else
            echo -e "\${YELLOW}⚠\${NC} System may sleep. Prevent with: sudo pmset -a sleep 0"
        fi
    fi
else
    # Linux-specific recommendations
    # Check loginctl linger (keeps user services running after logout)
    if command -v loginctl &>/dev/null; then
        LINGER_STATUS=\$(loginctl show-user "\$(whoami)" --property=Linger 2>/dev/null | cut -d= -f2)
        if [ "\$LINGER_STATUS" = "yes" ]; then
            echo -e "\${GREEN}✓\${NC} Lingering enabled (services survive logout)"
        else
            echo -e "\${YELLOW}⚠\${NC} Lingering not enabled. Run: loginctl enable-linger \$(whoami)"
            echo "    (may need sudo — keeps daemon running after SSH disconnect)"
        fi
    fi

    # Check swap
    SWAP_TOTAL=\$(free -m 2>/dev/null | awk '/Swap:/ {print \$2}' || echo "0")
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
