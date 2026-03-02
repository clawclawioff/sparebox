# Sprint 7: Multi-Agent Host Infrastructure

**Status:** Planning  
**Date:** 2025-07-18  
**Parent:** [MVP.md](./MVP.md)

---

## 1. Overview

Sprint 7 transforms Sparebox from a basic host-to-agent mapping into a true multi-tenant hosting platform. Key changes:

1. Hosts register machines → daemon auto-detects all specs → awaits deploy commands
2. Each deployed agent gets its own Docker container provisioned on demand
3. Agents have full CLI access inside their container (install tools, create files, etc.)
4. Platform tracks remaining host capacity and auto-delists full hosts
5. Deployers see a streamlined flow: select host → enter API key → deploy → chat

---

## 2. Architecture

```
Host Machine
├── Sparebox Daemon (standalone Node.js CJS bundle)
│   ├── Auto-detects: OS, RAM, storage, CPU cores/model, GPU (nvidia-smi/rocm-smi)
│   ├── Auto-installs Docker if not present
│   ├── Heartbeat → reports machine specs + per-agent metrics + remaining capacity
│   ├── Agent Manager → provisions Docker containers on demand per deploy command
│   └── Message Relay → long-poll for chat relay
│
├── Agent Container 1 (Docker, provisioned on demand)
│   ├── Base image: ghcr.io/openclaw/openclaw:latest (custom)
│   │   ├── Node.js + npm (pre-installed)
│   │   ├── OpenClaw (pre-installed)
│   │   ├── Common tools: curl, git, python3, pip, build-essential
│   │   └── Entrypoint: starts OpenClaw gateway
│   ├── Writable filesystem (NOT read-only)
│   ├── Full root inside container (apt, pip, npm all work)
│   ├── /workspace (persistent volume — agent's working directory)
│   ├── /state (persistent volume — OpenClaw config, auth)
│   ├── Resource limits: --memory, --cpus, --pids-limit, --storage-opt
│   ├── Security: --cap-drop=ALL, --no-new-privileges, no Docker socket
│   └── Network: internet access via bridge, no host/sibling container access
│
├── Agent Container 2 (completely isolated from Container 1)
│   └── ...
│
└── Reserved: ~1GB RAM + 1 CPU core for host OS + daemon overhead
```

---

## 3. Host Registration Flow (Revised)

### Current (v1)
Host manually enters specs in a web form → installs daemon → daemon heartbeats

### New (v2)
1. Host signs up, creates machine entry (name + location + pricing only)
2. Dashboard shows install command: `curl -fsSL https://sparebox.dev/install | sh`
3. Install script:
   - Installs Node.js if not present (via nvm or system package)
   - Installs Docker if not present (via official install script)
   - Downloads daemon bundle
   - Prompts for API key
   - Runs `--verify` to auto-detect all specs
4. First heartbeat sends full machine specs to platform:
   - OS (distro, version, arch)
   - Total RAM (GB)
   - Total storage (GB)
   - CPU cores, model
   - GPU model, VRAM (if nvidia-smi/rocm-smi available)
   - Docker version
   - Node.js version
5. Platform stores specs → admin approves → host goes live on marketplace
6. Daemon enters idle state, awaiting deploy commands via heartbeat

### What the daemon does NOT do on install:
- Does NOT pre-provision any Docker containers
- Does NOT pull images until a deploy command arrives
- Minimal resource footprint when idle (~30MB RSS)

---

## 4. Resource Capacity Tracking

### Heartbeat Payload (v2 additions)
```typescript
interface HeartbeatPayload {
  // Existing fields...
  cpuUsage: number;
  ramUsage: number;
  diskUsage: number;
  totalRamGb: number;
  totalDiskGb: number;
  cpuCores: number;
  cpuModel: string;
  
  // New fields
  gpuModel: string | null;         // e.g. "NVIDIA RTX 4090"
  gpuVramGb: number | null;        // e.g. 24
  gpuUsage: number | null;         // percentage, if available
  
  allocatedResources: {            // Sum of all agent allocations
    ramMb: number;
    cpuCores: number;
    diskGb: number;
  };
  
  remainingResources: {            // Total - allocated - reserved
    ramMb: number;
    cpuCores: number;
    diskGb: number;
  };
  
  agentStatuses: AgentStatus[];    // Per-agent live metrics (existing)
}
```

### Server-Side Availability Calculation
```
HOST_RESERVED_RAM_MB = 1024    // 1GB for OS + daemon
HOST_RESERVED_CPU = 1          // 1 core for OS + daemon

available_ram = (total_ram_mb - HOST_RESERVED_RAM_MB) - sum(agent.resources.ramMb)
available_cpu = (total_cores - HOST_RESERVED_CPU) - sum(agent.resources.cpuCores)

// Minimum tier requirements (Lite)
MIN_RAM_MB = 1024
MIN_CPU = 0.5

// Host is listed on marketplace only if:
can_accept_agents = available_ram >= MIN_RAM_MB && available_cpu >= MIN_CPU
```

### Marketplace Listing
- Browse page shows "X slots available" based on how many Lite-tier agents could fit
- Filter by: location, min RAM, max price, GPU available, slots available
- Hosts at capacity are hidden from browse (not shown as "full")

---

## 5. Container Security Model (Revised)

### Removed Constraints
- ~~`--read-only`~~ — agents need writable filesystem for installs

### Kept Constraints
- `--cap-drop=ALL` — no Linux capabilities
- `--no-new-privileges` — no privilege escalation
- No Docker socket mount — agent cannot control Docker
- No host network — agent cannot reach host services or sibling containers

### New Constraints
- `--pids-limit=256` — prevent fork bombs
- `--storage-opt size=XG` — disk quota per container (requires overlay2 + xfs)
- `--tmpfs /tmp:rw,noexec,nosuid,size=512m` — writable tmp
- Per-agent Docker network (optional, for full sibling isolation)
- `--ulimit nofile=65536:65536` — file descriptor limit

### What agents CAN do inside their container:
- `apt-get install` any package
- `pip install`, `npm install`, `cargo install`, etc.
- Create/modify/delete any files
- Run any process (within pids-limit)
- Access the internet (outbound)
- Full root access

### What agents CANNOT do:
- Modify their allocated RAM/CPU/disk limits
- Access host filesystem or host network
- Access other agent containers
- Run Docker commands
- Escape the container

---

## 6. Deploy Flow (Revised)

### Deployer Experience
1. **Select Host** — Browse marketplace, filter by location/specs/price/GPU
2. **Configure Agent** — Name, select LLM provider (OpenAI / Anthropic / Google), enter API key
3. **Pay** — Stripe checkout (existing)
4. **Provisioning Screen** — New full-screen loading UI with stages:
   - ⏳ Payment confirmed...
   - ⏳ Preparing container...
   - ⏳ Pulling OpenClaw image...
   - ⏳ Starting agent...
   - ⏳ Running health check...
   - ✅ Agent ready!
5. **Chat Interface** — Full-screen chat with their agent, replaces agent detail page as primary view

### Deploy Progress Tracking
The daemon reports deploy progress via command acks with stage info:

```typescript
interface CommandAck {
  id: string;
  status: "acked" | "in_progress" | "error";
  stage?: "pulling" | "creating" | "starting" | "health_check" | "ready";
  progress?: number;  // 0-100 for image pull
  error?: string;
  containerId?: string;
}
```

Platform stores current deploy stage in `agents` table. UI polls agent status to update provisioning screen.

---

## 7. LLM Provider Configuration

### Supported Providers
| Provider | Auth Method | Notes |
|----------|------------|-------|
| Anthropic | API Key (`sk-ant-...`) | No OAuth available for API access |
| OpenAI | API Key (`sk-...`) | No OAuth for API access |
| Google (Gemini) | API Key (`AI...`) | Vertex AI would need service account; API key simpler for MVP |

### Deploy Wizard UI (Step 2 — revised)
```
┌─────────────────────────────────────────────────────────┐
│ Step 2 of 3: Configure Your Agent                       │
│                                                         │
│ Agent Name *                                            │
│ ┌─────────────────────────────────────────────────┐     │
│ │ my-assistant                                    │     │
│ └─────────────────────────────────────────────────┘     │
│                                                         │
│ LLM Provider *                                          │
│ ┌─────────┐ ┌─────────┐ ┌──────────┐                   │
│ │Anthropic│ │ OpenAI  │ │ Google   │                   │
│ │  ✓      │ │         │ │ Gemini   │                   │
│ └─────────┘ └─────────┘ └──────────┘                   │
│                                                         │
│ API Key *                                               │
│ ┌─────────────────────────────────────────────────┐     │
│ │ sk-ant-api03-xxxxxxxxxxxxx                      │     │
│ └─────────────────────────────────────────────────┘     │
│ 🔒 Encrypted at rest. Never shared with the host.      │
│                                                         │
│ [Don't have a key? Get one →]                           │
│                                                         │
│ Default Model                                           │
│ ┌─────────────────────────────────────────────────┐     │
│ │ Claude Sonnet 4 (recommended)                 ▼ │     │
│ └─────────────────────────────────────────────────┘     │
│                                                         │
│                               [← Back]  [Continue →]    │
└─────────────────────────────────────────────────────────┘
```

### Key Security
- API key encrypted with AES-256-GCM (existing `SPAREBOX_ENCRYPTION_KEY`)
- Decrypted only when writing to container config at deploy time
- Host daemon receives encrypted config URL, fetches config with daemon auth
- API key lives inside container env — host OS never sees plaintext
- On container deletion, key is gone (not persisted outside container)

---

## 8. Chat as Primary Interface

After deployment, the agent detail page becomes a full-screen chat interface:

```
┌─────────────────────────────────────────────────────────┐
│ ← Agents    my-assistant    🟢 Running    ⚙️ Settings  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   Welcome! I'm your OpenClaw agent running on           │
│   "Home Server" in San Francisco. I have full access    │
│   to my environment — ask me to install tools, create   │
│   files, run scripts, or anything else you need.        │
│                                                         │
│   Some things to try:                                   │
│   • "Install Python 3.12 and pandas"                    │
│   • "Set up a cron job to check my website every hour"  │
│   • "Install the weather skill"                         │
│   • "Create a startup script that runs on boot"         │
│                                                         │
│                                                         │
│ ┌─────────────────────────────────────────────────┐     │
│ │ Type a message...                          [↵]  │     │
│ └─────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────┘
```

### Existing chat architecture (daemon relay) works for this:
- Deployer sends message → API → daemon long-poll → container OpenClaw HTTP → response back
- 2-5s latency is acceptable for MVP
- Future: WebSocket upgrade for sub-second responses

### Agent capabilities inside container:
- `exec` tool — run any shell command (apt, pip, npm, etc.)
- `read`/`write`/`edit` — manage files
- Full OpenClaw skill system — install skills from ClawHub
- Cron jobs, memory, background tasks — full OpenClaw feature set

---

## 9. OpenClaw Docker Image

### Base Image Spec
```dockerfile
FROM node:22-bookworm

# Common tools
RUN apt-get update && apt-get install -y \
    curl wget git python3 python3-pip \
    build-essential ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install OpenClaw globally
RUN npm install -g openclaw

# Workspace and state directories
RUN mkdir -p /workspace /state

# Default environment
ENV OPENCLAW_WORKSPACE=/workspace
ENV OPENCLAW_STATE=/state

# OpenClaw gateway listens on 3000
EXPOSE 3000

# Entrypoint starts OpenClaw gateway
ENTRYPOINT ["openclaw", "gateway", "start", "--foreground"]
```

### Image Registry
- Published to `ghcr.io/openclaw/openclaw:latest` (or `ghcr.io/sparebox/agent:latest`)
- Tagged versions for pinning
- Daemon pulls on first deploy, caches locally

---

## 10. DB Schema Changes

### `hosts` table additions
```sql
ALTER TABLE hosts ADD COLUMN gpu_model TEXT;
ALTER TABLE hosts ADD COLUMN gpu_vram_gb REAL;
ALTER TABLE hosts ADD COLUMN docker_version TEXT;
ALTER TABLE hosts ADD COLUMN node_version TEXT;
ALTER TABLE hosts ADD COLUMN arch TEXT;  -- x64, arm64
ALTER TABLE hosts ADD COLUMN allocated_ram_mb INTEGER DEFAULT 0;
ALTER TABLE hosts ADD COLUMN allocated_cpu_cores REAL DEFAULT 0;
ALTER TABLE hosts ADD COLUMN allocated_disk_gb INTEGER DEFAULT 0;
ALTER TABLE hosts ADD COLUMN can_accept_agents BOOLEAN DEFAULT true;
```

### `agents` table additions
```sql
ALTER TABLE agents ADD COLUMN deploy_stage TEXT;  -- pulling, creating, starting, health_check, ready
ALTER TABLE agents ADD COLUMN deploy_progress INTEGER;  -- 0-100 for image pull
ALTER TABLE agents ADD COLUMN llm_provider TEXT;  -- anthropic, openai, google
ALTER TABLE agents ADD COLUMN llm_model TEXT;  -- claude-sonnet-4, gpt-4o, gemini-2.5-pro
```

---

## 11. Migration Path

### What changes in existing code:
1. **`daemon/src/docker.ts`** — Remove `--read-only` flag, add `--pids-limit`, `--storage-opt`
2. **`daemon/src/agent-manager.ts`** — Add deploy stage reporting in command acks
3. **`daemon/src/heartbeat.ts`** — Add `allocatedResources`, `remainingResources`, GPU fields
4. **`daemon/src/metrics.ts`** — Add GPU detection (`nvidia-smi --query-gpu=name,memory.total --format=csv,noheader`)
5. **Host browse page** — Add capacity/slots display, GPU filter
6. **Deploy wizard** — Replace tier selection with host selection + LLM provider picker
7. **Agent detail page** — Chat becomes primary view, not a tab
8. **Heartbeat API handler** — Store allocated resources, calculate `can_accept_agents`
9. **Install script** — Add Docker auto-install, remove manual spec entry

### What stays the same:
- Auth system
- Stripe integration
- Pricing tiers (Lite/Standard/Pro/Compute)
- Host approval workflow
- Daemon heartbeat loop + backoff
- Command queue system
- Chat relay architecture
- AES-256-GCM encryption for API keys

---

## 12. Task Summary

| # | Task | Priority | Category | Effort |
|---|------|----------|----------|--------|
| 1 | Host registration v2 — auto-detect specs, auto-install Docker, GPU detection | High | Infrastructure | Large |
| 2 | Resource capacity tracking — server-side calculation, auto-delist | High | Backend | Large |
| 3 | Container security rework — writable rootfs, pids-limit, disk quota | High | Infrastructure | Medium |
| 4 | Deploy progress UI — provisioning screen with stages | High | Frontend | Medium |
| 5 | LLM provider selector — provider picker + API key input | High | Frontend | Medium |
| 6 | OpenClaw Docker image — batteries-included base image | High | Infrastructure | Large |
| 7 | Heartbeat v2 schema — remaining capacity, GPU, deploy progress | Medium | Backend | Medium |
| 8 | Chat as primary agent screen — full-screen chat post-deploy | High | Frontend | Medium |
| 9 | Agent CLI unrestricted exec — writable container, full root | High | Infrastructure | Small |
| 10 | GPU detection in daemon — nvidia-smi/rocm-smi parsing | Medium | Infrastructure | Small |
