# Sprint 5: Agent Deployment & Execution — Design Document

**Goal:** Implement the core product loop: deployer pays → agent gets deployed on host hardware → agent runs → deployer can manage it → host earns money.

**This is the sprint that turns Sparebox from a demo into a real product.**

---

## Current State

What we have:
- ✅ Deployer can browse hosts, select one, pay via Stripe
- ✅ Stripe webhook creates a subscription + agent record in DB
- ✅ Host has a daemon running that sends heartbeats every 60s
- ✅ Heartbeat response has a stubbed `commands: []` array
- ✅ Dashboard shows agent details with start/stop buttons (non-functional)
- ✅ Daemon already reports agent statuses in heartbeat payload

What's missing:
- ❌ No mechanism to actually deploy/install OpenClaw on the host
- ❌ No way to send deploy commands to the host daemon
- ❌ No agent lifecycle management (start/stop/restart/logs)
- ❌ No config delivery (deployer's agent config → host machine)
- ❌ No resource isolation between agents on the same host
- ❌ No way for deployer to interact with their running agent

---

## Resource Tiers

Every agent on Sparebox runs in a standardized resource tier. This creates predictable pricing and prevents a single agent from starving others on shared hardware.

### Tier Definitions

| Tier | RAM | CPU | Disk | Best For | Typical Pricing |
|------|-----|-----|------|----------|-----------------|
| **Lite** | 1 GB | 0.5 cores | 5 GB | Simple chatbots, webhook-only agents, low-traffic automations. API-only workloads (Anthropic/OpenAI) with no browser or heavy tools. | $5–10/mo |
| **Standard** | 2 GB | 1 core | 10 GB | Most agents. Chat agents with channels (Telegram, Discord), tool use, memory, moderate traffic. The "default" tier. | $10–20/mo |
| **Pro** | 4 GB | 2 cores | 20 GB | Power agents. Browser automation, multi-channel setups, complex tool chains, coding agents (Claude Code-style). | $20–40/mo |
| **Compute** | 8 GB | 4 cores | 40 GB | Local model inference (Ollama 7B quantized), heavy automation, multiple sub-agents, persistent browser sessions. | $40–80/mo |

### Why These Numbers

**RAM is the constraint that matters.** OpenClaw's gateway process:
- **Bare minimum to boot:** ~512 MB (confirmed by Render OOM at 512 MB — issue #5966)
- **Stable idle:** ~600–800 MB
- **Active with tools/sessions:** 1–2 GB
- **With browser automation:** 2–4 GB (Chromium is hungry)
- **With local LLM (Ollama 7B q4):** 6–8 GB additional

CPU matters less because most agent work is I/O-bound (waiting on API responses). Disk matters for workspace files, session history, and model weights.

**Local model reality check:**
| Model Size | Quantization | RAM Required | Tier |
|-----------|-------------|-------------|------|
| 3B (Phi-3, Gemma 2) | Q4_K_M | ~3 GB | Pro |
| 7B (Llama 3, Mistral) | Q4_K_M | ~6 GB | Compute |
| 13B (Llama 3) | Q4_K_M | ~10 GB | Not supported (exceeds max tier) |
| 70B+ | Any | 48+ GB | Not supported |

Deployers wanting to run local models need the **Compute** tier minimum. Most deployers using API-based models (Anthropic, OpenAI) will be fine on **Standard** or **Pro**.

### Host Slot Calculation

The daemon calculates available slots per tier based on verified hardware:

```
System overhead reserve: 1 GB RAM + 0.5 CPU cores

Available = Total - Reserved
Lite slots   = floor(Available RAM / 1 GB)
Standard slots = floor(Available RAM / 2 GB)
Pro slots    = floor(Available RAM / 4 GB)
Compute slots  = floor(Available RAM / 8 GB)
```

Each slot is also constrained by CPU:
```
Max slots by CPU = floor(Available Cores / tier.cores)
Effective slots  = min(RAM-based slots, CPU-based slots)
```

**Example:** A host with 32 GB RAM and 8 cores:
- Reserved: 1 GB + 0.5 cores → 31 GB available, 7.5 cores available
- Lite: min(31, 15) = 15 slots
- Standard: min(15, 7) = 7 slots
- Pro: min(7, 3) = 3 slots
- Compute: min(3, 1) = 1 slot

Hosts choose which tiers to offer and set prices per tier. The platform shows available slots per tier on the browse page.

Hosts can also set a manual cap lower than the calculated maximum (e.g., "I only want to run 3 agents max on this machine even though I could fit 7").

---

## Architecture Decisions

### Decision 1: How does the agent config get to the host?

**→ API download via secure endpoint**

The deploy command arrives via heartbeat response. The daemon then hits a secure endpoint (`GET /api/agents/{id}/deploy-config`) authenticated with its API key to download the full agent configuration bundle.

The config bundle includes:
- OpenClaw `openclaw.json` configuration (model, channels, tools, sandbox settings)
- Workspace files (SOUL.md, AGENTS.md, USER.md, IDENTITY.md, custom files)
- Deployer's encrypted LLM API key (see Decision 5)
- Resource tier allocation (RAM, CPU, disk limits)

**Why not git?** Git adds complexity (auth, cloning, version management) that isn't needed for MVP. Most deployers will configure their agent through the Sparebox dashboard, not a repo. Git-based deployment can be a power-user feature later.

**Why not inline in heartbeat?** Config bundles can be large (workspace files, custom tools). Keeping them out of the heartbeat response keeps that path lightweight and fast.

---

### Decision 2: How does the daemon install/run OpenClaw?

**→ Docker containers per agent (official OpenClaw image)**

~~Profile-based isolation was the original plan, but after Isaac's feedback on multi-tenant security, we're going straight to Docker.~~

**Each deployed agent runs in its own Docker container** using the official OpenClaw image (`ghcr.io/openclaw/openclaw`). This provides:

- **Filesystem isolation:** Each container has its own filesystem. Agent A cannot read Agent B's workspace, memory, config, or API keys.
- **Network isolation:** Each container gets its own network namespace. Agents cannot sniff each other's traffic or access each other's ports.
- **Resource enforcement:** Docker's `--memory` and `--cpus` flags use kernel cgroups to hard-cap resources. An agent that tries to exceed its allocation gets OOM-killed, not slowed down.
- **Process isolation:** PID namespace prevents agents from seeing or signaling each other's processes.
- **Clean teardown:** `docker rm -f` guarantees complete cleanup with no leftover state.

#### Why Docker over `--profile` isolation

OpenClaw's `--profile` flag provides workspace and session isolation, but:
- All profiles share the same filesystem — a misconfigured agent could read `/etc/passwd`, other users' home directories, or other profiles' workspaces via absolute paths.
- No resource enforcement — a runaway agent consumes all available RAM/CPU.
- No network isolation — all profiles can access `localhost` services, including each other's gateway ports.
- Process trees are visible to each other.

For a multi-tenant platform where **strangers' agents run on the same machine**, `--profile` is not enough. Docker is the minimum viable isolation.

#### Docker installation strategy

**Problem:** Most hosts won't have Docker pre-installed, and our current install script doesn't set it up.

**Solution:** The daemon install script gains a Docker setup phase:

1. **Check for Docker/Podman** — if already installed, use it
2. **If not installed, attempt rootless Docker** — `curl -fsSL https://get.docker.com/rootless | sh` (works without root on most modern Linux distros with `newuidmap`/`newgidmap` and `/etc/subuid` configured)
3. **If rootless fails, try Podman** — available in default repos on most distros, supports rootless by default
4. **If neither works, fall back to `--profile` mode** — with a clear warning that isolation is limited

The daemon reports its isolation mode in the heartbeat: `"isolation": "docker" | "podman" | "profile"`. The platform shows this on the browse page so deployers can make informed decisions.

**Hosts with Docker get a "Verified Isolation" badge.** Deployers can filter for Docker-only hosts if they want guaranteed isolation.

#### Container lifecycle

```bash
# Deploy an agent
docker run -d \
  --name sparebox-agent-{shortId} \
  --memory {tierRamMb}m \
  --cpus {tierCpuCores} \
  --network none \
  --restart unless-stopped \
  -v {agentDir}/workspace:/home/node/.openclaw/workspace:rw \
  -v {agentDir}/state:/home/node/.openclaw:rw \
  -e ANTHROPIC_API_KEY={encryptedKey} \
  ghcr.io/openclaw/openclaw:latest

# Inside the container, onboard + start gateway
docker exec sparebox-agent-{shortId} openclaw onboard --non-interactive
docker exec sparebox-agent-{shortId} openclaw gateway start

# Stop
docker stop sparebox-agent-{shortId}

# Undeploy
docker rm -f sparebox-agent-{shortId}
docker volume rm sparebox-agent-{shortId}-workspace sparebox-agent-{shortId}-state
```

**Key Docker flags:**
- `--memory {limit}` — Hard RAM cap, OOM kills if exceeded
- `--cpus {limit}` — CPU quota (e.g., `--cpus 1.0` = 1 full core)
- `--network none` — No network access by default (secure)
- `--restart unless-stopped` — Auto-restart on crash

**Network access:** Most agents need outbound internet (API calls to Anthropic/OpenAI, web search, etc.). We use a custom Docker network with outbound-only rules:

```bash
# Create isolated network (once)
docker network create --driver bridge sparebox-agents

# Run with outbound internet but no inter-container communication
docker run -d \
  --name sparebox-agent-{shortId} \
  --network sparebox-agents \
  --memory {tierRamMb}m \
  --cpus {tierCpuCores} \
  -v ... \
  ghcr.io/openclaw/openclaw:latest
```

Each container can reach the internet but cannot access `localhost` on the host or communicate with other agent containers. Inter-container communication is disabled via `--icc=false` on the network.

#### Profile fallback mode

For hosts where Docker isn't available (Windows, macOS without Docker Desktop, systems without `newuidmap`):

```bash
openclaw --profile sparebox-agent-{shortId} setup
openclaw --profile sparebox-agent-{shortId} gateway start --port {assignedPort}
```

This provides workspace/session isolation but **no** resource enforcement or filesystem/network isolation. The platform clearly labels these hosts as "Limited Isolation" on the browse page.

---

### Decision 3: How does the deployer connect to their agent?

**→ API-mediated commands via heartbeat (MVP)**

For MVP, all agent management flows through the existing heartbeat cycle:

```
Deployer clicks "Stop" → Command queued in DB →
Next heartbeat (≤60s) → Daemon receives command →
Daemon stops container → Next heartbeat reports status →
Dashboard updates
```

The 60-second latency is fine for start/stop/configure operations. This isn't a real-time chat interface — it's infrastructure management.

**What the deployer can do via the dashboard:**
- Start / stop / restart agent
- View agent status (running, stopped, deploying, error)
- View resource usage (CPU%, RAM from container stats)
- Edit agent configuration (full OpenClaw config)
- View recent agent events (started, stopped, crashed, OOM killed)

**What's NOT in MVP:**
- Real-time chat with the agent (requires WebSocket proxy)
- Live log streaming (requires persistent connection)
- Direct Tailscale/SSH access to the agent container

**Future (Sprint 7+):** The daemon establishes a WebSocket connection to the platform for real-time command delivery and log streaming. Or: Tailscale for direct deployer→agent connectivity.

---

### Decision 4: How deployers configure their agents

**→ Full OpenClaw config access**

The deployer should be able to configure everything they'd configure on their own machine. We're not making a dumbed-down version of OpenClaw — we're making it easier to deploy.

**Configuration UI in the dashboard:**

1. **Quick Setup (default view):**
   - Agent name
   - System prompt (textarea → becomes SOUL.md)
   - Model selection (dropdown: Claude Sonnet, Opus, GPT-4o, etc.)
   - LLM API key (encrypted, stored securely)

2. **Workspace Files (tab):**
   - File tree editor for workspace files
   - Pre-populated templates: SOUL.md, AGENTS.md, USER.md, IDENTITY.md
   - Create/edit/delete custom files
   - Upload files (max 10 MB per file, 50 MB total)

3. **Advanced Config (tab):**
   - Raw JSON5 editor for `openclaw.json`
   - Channel configuration (Telegram bot token, Discord token, etc.)
   - Tool configuration (allow/deny lists)
   - Sandbox settings
   - Model fallbacks
   - Pre-validated against OpenClaw's config schema

4. **Channels (tab — future):**
   - Visual channel setup wizard
   - QR code pairing for WhatsApp
   - Bot token entry for Telegram/Discord

For MVP, we ship Quick Setup + Workspace Files + Advanced Config. The Channels tab comes later.

**Config storage:**
- Stored in DB as JSONB (`agents.config` column for openclaw.json, `agents.workspace_files` for file tree)
- Deployer edits config via dashboard → saves to DB → creates `update_config` command → next heartbeat picks it up → daemon updates container

---

### Decision 5: LLM API key security

**→ Deployers bring their own keys, encrypted at rest and in transit**

The deployer provides their LLM API key (Anthropic, OpenAI, etc.) when configuring their agent. This key:

1. **Encrypted at rest** in the database using AES-256-GCM with a platform encryption key (stored in env var, never in code)
2. **Transmitted to daemon** via the deploy-config endpoint over HTTPS
3. **Injected into the Docker container** as an environment variable at container creation time
4. **Never stored on disk** on the host machine — only in container memory
5. **Never visible to the host owner** — the daemon handles key injection without exposing the plaintext value

```
Deployer enters key → Platform encrypts → Stored in DB →
Deploy command → Daemon fetches config (HTTPS) →
Daemon decrypts with platform-provided session key →
Docker run -e ANTHROPIC_API_KEY=... → Container only
```

**Security model:** The daemon receives a one-time session key with each deploy command. It uses this to decrypt the API key, passes it to Docker as an env var, and discards the session key. The host owner can see that a container is running but cannot extract the API key from inside it (Docker env vars require `docker inspect`, which we can prevent by running containers under a separate user).

**Threat model considerations:**
- Host has root access → they CAN extract the key from container memory/env. This is an inherent limitation of running on someone else's hardware. We mitigate with: clear ToS, reputation system, and flagging hosts that have key leaks reported.
- Man-in-the-middle → mitigated by HTTPS for all daemon↔platform communication
- Database breach → mitigated by AES-256-GCM encryption of keys at rest

**Future:** Hardware attestation (TPM), encrypted enclaves (Intel SGX/AMD SEV), or key-per-request proxy (platform proxies all LLM API calls so keys never touch the host at all).

---

## Implementation Plan

### Phase 1: Command Queue + Heartbeat Integration (~3h)

**1.1 Database: `agent_commands` table**
```sql
CREATE TABLE agent_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  host_id UUID NOT NULL REFERENCES hosts(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- deploy, start, stop, restart, undeploy, update_config
  payload JSONB,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, acked, failed, expired
  created_at TIMESTAMP DEFAULT NOW(),
  sent_at TIMESTAMP,
  acked_at TIMESTAMP,
  error TEXT
);

CREATE INDEX idx_agent_commands_host_pending ON agent_commands(host_id, status)
  WHERE status = 'pending';
CREATE INDEX idx_agent_commands_agent ON agent_commands(agent_id);
```

**1.2 Database: agents table additions**
```sql
ALTER TABLE agents ADD COLUMN config JSONB DEFAULT '{}';
ALTER TABLE agents ADD COLUMN workspace_files JSONB DEFAULT '{}';
ALTER TABLE agents ADD COLUMN tier TEXT NOT NULL DEFAULT 'standard';
ALTER TABLE agents ADD COLUMN encrypted_api_key TEXT;
ALTER TABLE agents ADD COLUMN container_id TEXT;
ALTER TABLE agents ADD COLUMN isolation_mode TEXT DEFAULT 'docker';
```

**1.3 Deploy-config endpoint**
- `GET /api/agents/{id}/deploy-config` — authenticated with daemon API key
- Returns full config bundle (openclaw.json + workspace files + encrypted key)
- Only returns config for agents assigned to the requesting host

**1.4 Heartbeat endpoint changes**
- Query pending commands for this host (`WHERE host_id = ? AND status = 'pending'`)
- Include commands in response
- Mark as `sent` after including
- Accept command ack/nack in heartbeat payload: `{ commandAcks: [{ id, status, error? }] }`
- Expire commands older than 5 minutes without ack (mark `expired`)

**1.5 tRPC mutations for agent management**
- `agents.sendCommand(agentId, type, payload?)` — creates command in DB
- `agents.getCommands(agentId)` — list recent commands with status
- `agents.updateConfig(agentId, config, workspaceFiles)` — save config + create `update_config` command

### Phase 2: Daemon Agent Manager (~5h)

**2.1 Docker/Podman detection and setup**
- On daemon startup, check for `docker` or `podman` CLI
- Report isolation capability in heartbeat: `"isolation": "docker" | "podman" | "profile" | "none"`
- Auto-pull OpenClaw image on first deploy: `docker pull ghcr.io/openclaw/openclaw:latest`

**2.2 Command handler**
Process commands from heartbeat response:

- **`deploy`**: Download config → create host directories → decrypt API key → `docker run` with resource limits → wait for container health → ack
- **`start`**: `docker start {containerId}` → ack
- **`stop`**: `docker stop {containerId}` → ack
- **`restart`**: `docker restart {containerId}` → ack
- **`undeploy`**: `docker rm -f {containerId}` → clean up host directories → ack
- **`update_config`**: Download new config → `docker stop` → update mounted volumes → `docker start` → ack

Each command handler:
1. Executes the action
2. Catches errors
3. Adds ack/nack to next heartbeat payload

**2.3 Container monitoring**
- `docker stats --no-stream` per container → CPU%, RAM usage, RAM limit
- Report per-agent metrics in heartbeat `agentStatuses` array:
```json
{
  "agentStatuses": [
    {
      "agentId": "uuid",
      "status": "running",
      "containerId": "abc123",
      "cpuPercent": 12.5,
      "ramUsageMb": 850,
      "ramLimitMb": 2048,
      "uptimeSeconds": 3600,
      "restartCount": 0
    }
  ]
}
```

**2.4 Port management**
- Each agent container exposes its gateway port only to the host (not publicly)
- Port allocation: start at 19001, increment by 1 per agent
- Track in `~/.sparebox/containers.json`

**2.5 Profile fallback (non-Docker hosts)**
- If Docker unavailable, use `openclaw --profile sparebox-{shortId}`
- Resource monitoring via process tree (PID tracking + `ps`)
- Watchdog: kill agent process if RAM exceeds tier limit for >60 seconds

**2.6 OpenClaw image management**
- Pull `ghcr.io/openclaw/openclaw:latest` on first deploy
- Check for updates daily (or when daemon itself updates)
- Report OpenClaw version per container in heartbeat

### Phase 3: Dashboard Integration (~4h)

**3.1 Deploy flow update**
- After Stripe checkout webhook, set agent status to `pending_deploy`
- Create `deploy` command in `agent_commands`
- Dashboard shows progress: "Waiting for host..." → "Deploying..." → "Running"
- Error states: "Deploy failed: {error}" with retry button

**3.2 Agent management controls**
- Wire start/stop/restart buttons to `agents.sendCommand` mutation
- Real-time(ish) status polling (refetch every 15s while on agent detail page)
- Show container stats: CPU%, RAM usage vs limit, uptime, restart count

**3.3 Agent configuration UI**
- **Quick Setup tab**: Name, system prompt textarea, model dropdown, API key input (password field, "Update key" button)
- **Workspace Files tab**: File tree with create/edit/delete, Monaco editor (or CodeMirror) for file content, templates for SOUL.md/AGENTS.md/USER.md
- **Advanced Config tab**: JSON5 editor for openclaw.json with syntax highlighting and validation
- Save triggers `update_config` command

**3.4 Deploy wizard updates**
- Add tier selection step (Lite/Standard/Pro/Compute)
- Show tier descriptions with recommended use cases
- Price varies by tier (host sets per-tier pricing)
- Show host's available slots per tier

**3.5 Browse page updates**
- Show isolation mode badge: "Docker Isolated" (green) / "Limited Isolation" (yellow)
- Show available slots per tier
- Filter by isolation mode
- Filter by tier availability

### Phase 4: Security & Encryption (~3h)

**4.1 API key encryption**
- AES-256-GCM encryption using `SPAREBOX_ENCRYPTION_KEY` env var
- Encrypt on save: `agents.updateConfig` encrypts API key before DB write
- Decrypt on delivery: deploy-config endpoint decrypts for config bundle
- Key rotation: re-encrypt all keys when `SPAREBOX_ENCRYPTION_KEY` changes

**4.2 Deploy-config endpoint security**
- Authenticated with daemon API key (existing auth)
- Only returns config for agents on the requesting host
- Rate limited (10 requests/minute per host)
- Config bundle signed with HMAC to prevent tampering in transit

**4.3 Container security hardening**
- `--read-only` root filesystem (workspace volume is writable)
- `--security-opt=no-new-privileges` — prevent privilege escalation
- `--cap-drop=ALL` — drop all Linux capabilities
- No Docker socket mount (agents can't manage containers)
- User namespace isolation (`--userns=host` avoided)

**4.4 Host verification**
- Report isolation mode in heartbeat
- Platform verifies Docker isolation is active
- "Verified Isolation" badge on browse page
- Allow deployers to filter for Docker-only hosts

---

## MVP Scope

**In scope:**
- [ ] Command queue (DB table + heartbeat integration + acks)
- [ ] Deploy command flow (pending → deploying → running)
- [ ] Daemon agent manager with Docker containers
- [ ] Profile fallback for non-Docker hosts
- [ ] Resource tiers (Lite/Standard/Pro/Compute)
- [ ] Start/stop/restart from dashboard
- [ ] Agent status + container metrics via heartbeat
- [ ] Agent configuration UI (Quick Setup + Workspace Files + Advanced)
- [ ] Deployer API key encryption (AES-256-GCM)
- [ ] Container security hardening
- [ ] Isolation mode badges on browse page
- [ ] Port management on host

**Out of scope (future sprints):**
- Real-time chat with deployed agent (WebSocket proxy)
- Live log streaming
- Channel configuration wizard (visual QR/token setup)
- Agent-to-agent communication
- Auto-scaling / multiple hosts per agent
- Hardware attestation (TPM/SGX)
- API call proxying (platform proxies LLM calls)

---

## Estimated Effort

| Phase | Hours | Description |
|-------|-------|-------------|
| Phase 1 | ~3h | Command queue + DB schema + heartbeat changes |
| Phase 2 | ~5h | Daemon agent manager + Docker + monitoring |
| Phase 3 | ~4h | Dashboard UI (config editor, deploy flow, management) |
| Phase 4 | ~3h | Encryption + container security + verification |
| **Total** | **~15h** | |

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Docker not available on host | Agent runs without isolation (profile fallback) | Clear UI labeling, deployer choice, install script attempts rootless Docker |
| Host owner extracts deployer API key from container | Key compromise | ToS, reputation system, future: API proxying so keys never touch host |
| OpenClaw image too large (~500MB) | Slow first deploy | Pull image ahead of time (on daemon install, not first deploy) |
| Container OOM kills | Agent crashes, deployer frustrated | Clear tier descriptions, pre-deploy RAM estimate, auto-restart |
| Port conflicts on host | Container fails to start | Dynamic port allocation with conflict detection |
| Config delivery fails | Agent stuck in "deploying" state | Retry logic, command expiry (5 min), manual retry button |
| Host goes offline mid-deploy | Orphaned pending state | Heartbeat timeout → mark agent "host_offline", auto-retry on reconnect |
| Deployer provides invalid OpenClaw config | Container crashes on start | Pre-validate config against OpenClaw schema before saving |
| Docker rootless requires system prerequisites | Install script fails | Fallback to Podman, then profile mode, clear error messages |

---

## Answered Questions

1. **Model API keys:** Deployers bring their own keys. Encrypted at rest (AES-256-GCM), decrypted only at deploy time, injected as container env var. Host never sees plaintext.

2. **OpenClaw version:** Always latest (`ghcr.io/openclaw/openclaw:latest`). Daemon checks for image updates daily. Simple, no version management overhead. If a breaking change hits, we pin a specific tag at the platform level.

3. **Agent limits per host:** Dynamic based on hardware and tier. Formula: `(total - overhead) / tier_allocation`, capped by both RAM and CPU. Host can set a manual cap below the calculated max.

4. **What can the deployer configure?** Everything. Full OpenClaw config access via JSON5 editor + workspace file editor + quick setup wizard. Same power as running OpenClaw on your own machine, better UX.

5. **Pricing model:** Per-agent, per-tier. Host sets prices per tier. Multiple deployers share one host machine, each agent gets its standardized resource allocation enforced by Docker.
