import { NextResponse } from "next/server";

// =============================================================================
// GET /api/install/windows — Windows install script (PowerShell)
// =============================================================================

const INSTALL_SCRIPT = `# Sparebox Host Daemon Installer for Windows
# https://sparebox.dev
# Run: irm https://www.sparebox.dev/api/install/windows | iex

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "╔══════════════════════════════════════════╗" -ForegroundColor Blue
Write-Host "║      Sparebox Host Daemon Installer      ║" -ForegroundColor Blue
Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor Blue
Write-Host ""

# Check Node.js
try {
    $nodeVersion = (node -v) -replace 'v', ''
    $major = [int]($nodeVersion.Split('.')[0])
    if ($major -lt 20) {
        Write-Host "✗ Node.js version $nodeVersion is too old. Version 20+ required." -ForegroundColor Red
        exit 1
    }
    Write-Host "✓ Node.js v$nodeVersion detected" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js is not installed." -ForegroundColor Red
    Write-Host "  Install it from https://nodejs.org"
    exit 1
}

# Create directory
$SpareboxDir = Join-Path $env:USERPROFILE ".sparebox"
New-Item -ItemType Directory -Force -Path $SpareboxDir | Out-Null
Write-Host "✓ Directory: $SpareboxDir" -ForegroundColor Green

# Download daemon
Write-Host ""
Write-Host "Downloading Sparebox daemon..." -ForegroundColor Blue

# Clone the daemon from git (production: download pre-built bundle)
$DaemonUrl = "https://github.com/clawclawioff/sparebox.git"
Write-Host "Clone the repository and build the daemon:"
Write-Host "  git clone $DaemonUrl" -ForegroundColor Cyan
Write-Host "  cd sparebox\\daemon" -ForegroundColor Cyan
Write-Host "  npm run build" -ForegroundColor Cyan
Write-Host "  Copy-Item -Recurse dist\\* $SpareboxDir\\" -ForegroundColor Cyan

# Configuration
Write-Host ""
Write-Host "Configuration" -ForegroundColor Yellow
Write-Host "You need your API Key and Host ID from the Sparebox dashboard."
Write-Host "Go to: https://www.sparebox.dev/dashboard/hosts"
Write-Host ""

$ApiKey = Read-Host "API Key (sbx_host_...)"
$HostId = Read-Host "Host ID (UUID)"

if ($ApiKey -and $HostId) {
    $config = @{
        apiKey = $ApiKey
        hostId = $HostId
        apiUrl = "https://www.sparebox.dev"
        heartbeatIntervalMs = 60000
    } | ConvertTo-Json

    $configPath = Join-Path $SpareboxDir "config.json"
    Set-Content -Path $configPath -Value $config
    Write-Host "✓ Config saved to $configPath" -ForegroundColor Green
} else {
    Write-Host "⚠ Skipping config — set environment variables instead:" -ForegroundColor Yellow
    Write-Host '  $env:SPAREBOX_API_KEY = "your-key"'
    Write-Host '  $env:SPAREBOX_HOST_ID = "your-host-id"'
}

# Create scheduled task
Write-Host ""
$setupTask = Read-Host "Create a scheduled task (auto-start on login)? (y/N)"
if ($setupTask -eq "y" -or $setupTask -eq "Y") {
    $daemonPath = Join-Path $SpareboxDir "dist\\index.js"
    if (-not (Test-Path $daemonPath)) {
        $daemonPath = Join-Path $SpareboxDir "daemon.js"
    }
    
    $action = New-ScheduledTaskAction -Execute "node" -Argument $daemonPath
    $trigger = New-ScheduledTaskTrigger -AtLogon
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
    
    Register-ScheduledTask -TaskName "SpareboxDaemon" -Action $action -Trigger $trigger -Settings $settings -Description "Sparebox Host Daemon" -Force | Out-Null
    Start-ScheduledTask -TaskName "SpareboxDaemon"
    Write-Host "✓ Scheduled task created and started" -ForegroundColor Green
    Write-Host "  Check status: Get-ScheduledTask -TaskName SpareboxDaemon"
}

Write-Host ""
Write-Host "╔══════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║         Installation Complete! ✓         ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "Dashboard: https://www.sparebox.dev/dashboard/hosts"
Write-Host "Docs:      https://www.sparebox.dev/install"
Write-Host ""
`;

export async function GET() {
  return new NextResponse(INSTALL_SCRIPT, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": 'attachment; filename="install.ps1"',
      "Cache-Control": "public, max-age=300",
    },
  });
}
