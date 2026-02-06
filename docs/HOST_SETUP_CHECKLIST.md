# Sparebox Host Setup Checklist

Preparing a machine to be a reliable 24/7 Sparebox host.

---

## 1. Operating System

### Windows 11
- [ ] Run all pending Windows Updates before starting (get current first)
- [ ] Pause Windows Updates for max period (Settings → Windows Update → Pause for 5 weeks)
- [ ] Disable "Get me up to date" (Settings → Windows Update → Advanced options)
- [ ] Set Active Hours to widest range (Settings → Windows Update → Advanced options → Active hours)
- [ ] Disable Fast Startup (Control Panel → Power Options → Choose what power buttons do → Uncheck fast startup)
- [ ] Disable auto-restart on system failure (System Properties → Advanced → Startup & Recovery → Uncheck auto restart)
- [ ] Set power plan to **High Performance** (`powercfg /setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c`)

### Ubuntu / Linux
- [ ] Enable unattended security updates only (`sudo apt install unattended-upgrades`)
- [ ] Disable automatic reboot after updates (`/etc/apt/apt.conf.d/50unattended-upgrades` → `Automatic-Reboot "false"`)
- [ ] Set up systemd watchdog for critical services

---

## 2. Power Settings

- [ ] **Never sleep** — standby timeout = 0 (AC and battery)
- [ ] **Never hibernate** — hibernate timeout = 0, `powercfg /hibernate off`
- [ ] **Monitor timeout = 0** (or a low value — doesn't affect operation but saves energy)
- [ ] **Disable USB selective suspend** (Power Options → Advanced → USB settings)
- [ ] **Disable PCI Express link state power management** (Power Options → Advanced → PCI Express)
- [ ] **Processor minimum state = 5%** (prevents aggressive CPU throttling)

### BIOS/UEFI
- [ ] **Enable "Restore on AC Power Loss"** (auto-boot after power outage)
- [ ] **Disable Wake-on-LAN** unless needed (can cause unexpected wakes/shutdowns)
- [ ] **Set boot order** — primary disk first, no USB/network boot

---

## 3. Network

- [ ] **Static IP or DHCP reservation** on local network
- [ ] **Port forwarding** configured if behind NAT (or use Tailscale/WireGuard)
- [ ] **Disable Wi-Fi power saving** (Device Manager → Wi-Fi adapter → Power Management → Uncheck "allow computer to turn off this device")
- [ ] **Ethernet preferred** over Wi-Fi for reliability
- [ ] **Router UPnP disabled** (security — use explicit port forwards)
- [ ] **DNS set to reliable provider** (1.1.1.1, 8.8.8.8)
- [ ] **Firewall rules** — allow Sparebox agent ports

---

## 4. Software Prerequisites

- [ ] **Docker Desktop** (Windows) or **Docker Engine** (Linux) installed and running
- [ ] **Docker set to start on boot** (Settings → General → Start Docker Desktop when you log in)
- [ ] **WSL2** installed and updated (Windows: `wsl --update`)
- [ ] **Tailscale** or **WireGuard** for secure agent networking
- [ ] **Node.js** LTS installed (for Sparebox agent)
- [ ] **Git** installed

---

## 5. Security

- [ ] **OS firewall enabled** with only necessary ports open
- [ ] **Automatic login disabled** (require password on wake — unless headless)
- [ ] **Remote Desktop / SSH** configured securely if needed for management
- [ ] **Antivirus exclusions** for Docker and Sparebox directories
- [ ] **BitLocker** or full-disk encryption enabled (protects agent data at rest)
- [ ] **User account** — run Sparebox agent as a non-admin user

---

## 6. Monitoring & Recovery

- [ ] **Sparebox agent set to auto-start on boot** (systemd service or Windows Task Scheduler)
- [ ] **Watchdog/health check** — auto-restart agent if it crashes
- [ ] **Disk space monitoring** — alert if < 10GB free
- [ ] **UPS recommended** for protection against power surges/outages
- [ ] **Remote access** configured (SSH, RDP, or Tailscale) for troubleshooting
- [ ] **Scheduled restart** — optional weekly reboot at low-traffic time (e.g., 4 AM Sunday)

---

## 7. Performance Optimization

- [ ] **Disable unnecessary startup programs** (Task Manager → Startup tab)
- [ ] **Disable Windows tips/suggestions** (Settings → System → Notifications)
- [ ] **Disable background apps** you don't need (Settings → Apps → Installed apps → Advanced options per app)
- [ ] **Disable search indexing** on non-system drives (Services → Windows Search → Disabled)
- [ ] **Disable Cortana / Widgets** (unnecessary resource use)
- [ ] **SSD preferred** over HDD for agent storage
- [ ] **Sufficient RAM** — 8GB minimum, 16GB+ recommended

---

## 8. Windows-Specific Automation Script

Run the included PowerShell script as Administrator to apply power/update settings automatically:

```powershell
# From elevated PowerShell:
Set-ExecutionPolicy Bypass -Scope Process -Force
& "\\wsl$\Ubuntu\home\isaac\.openclaw\workspace\scripts\prevent-shutdown.ps1"
```

Or from WSL:
```bash
powershell.exe -ExecutionPolicy Bypass -File "$(wslpath -w ~/workspace/scripts/prevent-shutdown.ps1)"
```

---

## 9. Recurring Maintenance

| Task | Frequency | How |
|------|-----------|-----|
| Re-pause Windows Updates | Every 35 days | Settings → Windows Update → Pause |
| Check disk space | Weekly | `df -h` or Disk Management |
| Review agent logs | Weekly | Dashboard or `journalctl` |
| Install security updates | Monthly | Manual controlled reboot |
| Verify backups | Monthly | Test restore procedure |
| Check UPS battery | Quarterly | UPS self-test |

---

## Quick Validation

After setup, verify:
```bash
# Power plan
powercfg /getactivescheme  # Should show High Performance

# Sleep settings
powercfg /query | findstr "Sleep"  # All should be 0 or Never

# Docker running
docker ps  # Should respond without error

# Network
ping -n 3 8.8.8.8  # Should succeed
```

---

*This checklist is maintained by Sparebox. Last updated: 2026-02-06.*
