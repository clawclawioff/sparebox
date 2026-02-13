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

## Architecture Decisions

### Decision 1: How does the agent config get to the host?

**Options:**

| Option | Pros | Cons |
|--------|------|------|
| **A) API download** — Daemon polls platform for pending deploy commands, downloads config JSON | Simple, no git needed, works everywhere, config stays on platform | Requires secure config endpoint, limited to JSON config |
| **B) Git repo clone** — Deployer provides a git repo URL, daemon clones it | Familiar workflow, version controlled, supports complex setups | Requires git on host, auth for private repos, deployment latency |
| **C) Inline config in deploy command** — Full config embedded in heartbeat command response | Simplest, zero extra requests, atomic | Config size limited by response payload, no large files |

**Recommendation: Option A (API download)**

The deploy command comes through the heartbeat response. The daemon then hits a secure endpoint (`GET /api/agents/{id}/config`) with its API key to download the full agent configuration. This is the simplest approach that works everywhere.

The config is a JSON object containing:
- Agent name
- Model preference (or use host's default)
- System prompt / SOUL.md content
- Workspace files to create
- Channel config (if any)
- Resource limits (CPU%, RAM MB)

**Rationale:** Git adds complexity for MVP. Most deployers just want to configure an agent via the dashboard, not manage a repo. Git-based deployment can be added later as a "power user" feature.

---

### Decision 2: How does the daemon install/run OpenClaw?

**Options:**

| Option | Pros | Cons |
|--------|------|------|
| **A) Auto-install via npm** — Daemon runs `npm i -g openclaw` per agent | Always latest version, clean separation | Requires npm, slow on first deploy, global install conflicts |
| **B) Bundled with daemon** — Ship OpenClaw as part of the daemon bundle | Fast deploy, no internet needed after install | Large bundle, version updates require daemon update |
| **C) Profile-based isolation** — Single OpenClaw install, each agent uses `--profile` | Efficient, uses built-in OpenClaw isolation, lightweight | Requires OpenClaw pre-installed on host, single version |
| **D) Docker per agent** — Each agent runs in its own container | Strongest isolation, resource limits built-in | Requires Docker, heavier resource usage, complex |

**Recommendation: Option C (Profile-based isolation) for MVP, Option D (Docker) as future upgrade**

OpenClaw already supports `--profile <name>` which creates fully isolated state, config, sessions, and workspace per agent. This is exactly what we need:

```bash
# Each deployed agent gets its own profile
openclaw --profile agent-{agentId} setup
openclaw --profile agent-{agentId} gateway --port {assignedPort}
```

Each profile creates:
- `~/.openclaw-agent-{agentId}/` — isolated state directory
- `~/.openclaw-agent-{agentId}/workspace/` — isolated workspace
- `~/.openclaw-agent-{agentId}/openclaw.json` — agent-specific config
- Separate port (auto-assigned, spaced 20+ apart)

**Prerequisites:**
- OpenClaw must be installed on the host machine (`npm i -g openclaw`)
- The install script already ensures Node.js 20+ is present
- We add `npm i -g openclaw` to the daemon install script

**Rationale:** Profile isolation is built into OpenClaw and provides workspace/session/config separation without Docker overhead. Most hosts won't have Docker installed, and requiring it raises the barrier to entry. Docker isolation can be a "verified host" tier later.

---

### Decision 3: How does the deployer connect to their agent?

**Options:**

| Option | Pros | Cons |
|--------|------|------|
| **A) Platform relay** — Deployer interacts through Sparebox dashboard, platform proxies to agent | Simple UX, no direct connection needed, full control | Adds latency, platform is SPOF, complex proxy |
| **B) Direct Tailscale** — Agent exposed via Tailscale, deployer connects directly | Low latency, real-time, standard OpenClaw UX | Requires Tailscale on both sides, exposing ports |
| **C) WebSocket proxy** — Platform maintains WS connection to each agent, proxies commands | Real-time, deployer uses dashboard, no direct networking | Complex, requires persistent WS connections |
| **D) API-mediated commands** — Deployer sends commands via platform API, daemon executes and reports back | Simple, works with existing heartbeat flow, no persistent connections | Not real-time (up to 60s latency), limited interactivity |

**Recommendation: Option D (API-mediated) for MVP, Option A/C for post-MVP**

For MVP, the deployer doesn't need real-time chat with their agent. They need:
1. Start/stop the agent
2. View agent status and basic logs
3. Update agent configuration

All of these can be handled through the existing heartbeat command flow:

```
Deployer clicks "Stop" → Platform sets command in DB → 
Next heartbeat (≤60s) → Daemon receives command → 
Daemon stops agent → Next heartbeat reports status → 
Dashboard updates
```

This is simpler than building a WebSocket proxy and works with our existing architecture. The 60-second latency is acceptable for start/stop/configure operations.

**Future:** For real-time interaction (chat with your agent, live logs), we'd add a WebSocket connection from the daemon to the platform, or use Tailscale for direct connectivity. This is Sprint 7+ territory.

---

### Decision 4: Resource isolation — How do we prevent one agent from consuming all host resources?

**Options:**

| Option | Pros | Cons |
|--------|------|------|
| **A) Process limits (ulimit)** — Set per-process resource limits | Simple, no Docker needed, works everywhere | Coarse-grained, limited to single process tree |
| **B) cgroups (Linux only)** — Create cgroup per agent | Fine-grained CPU/memory/IO limits | Linux-only, requires root or cgroup v2 delegation |
| **C) Docker resource flags** — `--memory`, `--cpus` per container | Standard, well-supported, cross-platform-ish | Requires Docker |
| **D) Configuration-based soft limits** — Tell agent to use less, monitor compliance | No system-level changes, works everywhere | Not enforced, agent could exceed limits |
| **E) Monitoring + kill** — Monitor resource usage, kill agents that exceed limits | Simple, works everywhere, reactive | Agent runs unconstrained until killed, bad UX |

**Recommendation: Option D + E (Soft limits with monitoring) for MVP**

For MVP, we:
1. Configure each OpenClaw agent with resource-aware settings (model selection affects resource usage)
2. The daemon monitors per-agent CPU/RAM via process tree tracking
3. If an agent exceeds its allocated resources for >60 seconds, the daemon stops it and reports the violation
4. The platform notifies the deployer

This avoids requiring Docker, root access, or Linux-specific features. It works on macOS, Linux, and Windows.

**Implementation:**
- Daemon tracks child PIDs per agent profile
- Each heartbeat reports per-agent CPU% and RAM MB
- Platform compares against host's advertised specs and per-agent limits
- Daemon has a local watchdog that kills runaway agents

**Future:** Docker-based isolation for "premium" or "verified" hosts. Stronger enforcement via cgroups on Linux hosts that opt in.

---

## Implementation Plan

### Phase 1: Deploy Command Flow (~3h)

**1.1 Agent config endpoint**
- `GET /api/agents/{id}/deploy-config` — Returns the full OpenClaw config for an agent
- Auth: daemon API key (same as heartbeat)
- Returns: JSON with agent settings, SOUL.md content, workspace files, model, resource limits

**1.2 Deploy command in heartbeat response**
- When an agent is in "pending" status and subscription is active, include a deploy command:
```json
{
  "commands": [
    {
      "type": "deploy",
      "agentId": "uuid",
      "configUrl": "/api/agents/{id}/deploy-config",
      "profile": "agent-{shortId}",
      "port": 19001
    }
  ]
}
```

**1.3 Stop/start/restart commands**
```json
{ "type": "stop", "agentId": "uuid", "profile": "agent-{shortId}" }
{ "type": "start", "agentId": "uuid", "profile": "agent-{shortId}" }
{ "type": "restart", "agentId": "uuid", "profile": "agent-{shortId}" }
{ "type": "undeploy", "agentId": "uuid", "profile": "agent-{shortId}" }
```

**1.4 Command queue in database**
New table: `agent_commands`
```sql
CREATE TABLE agent_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  host_id UUID NOT NULL REFERENCES hosts(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- deploy, start, stop, restart, undeploy, update_config
  payload JSONB,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, acked, failed
  created_at TIMESTAMP DEFAULT NOW(),
  sent_at TIMESTAMP,
  acked_at TIMESTAMP,
  error TEXT
);
```

**1.5 Heartbeat endpoint changes**
- Query pending commands for this host
- Include in response
- Mark as "sent" after including in response
- Accept command acknowledgments in heartbeat payload

### Phase 2: Daemon Agent Manager (~4h)

**2.1 OpenClaw installation check**
- On daemon startup, check if `openclaw` CLI is available
- If not, auto-install: `npm i -g openclaw`
- Report OpenClaw version in heartbeat

**2.2 Command handler**
- Process commands from heartbeat response
- Deploy: download config → create profile → write config → start gateway
- Start: `openclaw --profile {profile} gateway start`
- Stop: `openclaw --profile {profile} gateway stop`
- Undeploy: stop + remove profile directory
- Update config: stop → update config → start

**2.3 Agent process management**
- Track running agent profiles and their PIDs
- Report agent status in heartbeat `agentStatuses` array
- Graceful shutdown: stop all agents when daemon stops

**2.4 Port management**
- Assign ports starting from base 19001, increment by 20 per agent
- Track used ports in `~/.sparebox/ports.json`
- Free port on undeploy

**2.5 Resource monitoring**
- Track CPU% and RAM MB per agent process tree
- Report in heartbeat
- Kill agent if exceeding limits for >60 seconds

### Phase 3: Dashboard Integration (~3h)

**3.1 Deploy agent flow update**
- After Stripe checkout completes, set agent status to "pending_deploy"
- Heartbeat picks up the deploy command
- Dashboard shows deployment progress: "Deploying..." → "Running" → error states

**3.2 Agent management controls**
- Wire start/stop/restart buttons to create commands in DB
- Show real-time(ish) status from heartbeat data
- Show basic logs (agent start/stop events, errors)

**3.3 Agent configuration UI**
- Model selection (from host's available models — or use API key from deployer)
- System prompt / personality editor
- Workspace file editor (simple text editor for SOUL.md, AGENTS.md, etc.)

**3.4 Deployer dashboard updates**
- Show agent health metrics (CPU, RAM from host heartbeat)
- Show agent uptime
- Connection status

### Phase 4: Configuration System (~2h)

**4.1 Agent config builder**
- tRPC mutation: `agents.updateConfig` — deployer sets agent personality, model, etc.
- Generate OpenClaw config JSON from platform settings
- Store in DB (agents table: new `config` JSONB column)

**4.2 Config delivery**
- Deploy-config endpoint reads from DB and returns OpenClaw-compatible JSON
- Includes: model, system prompt files, workspace files, channel config
- No API keys from deployer in MVP — deployers must bring their own model API keys (stored encrypted) or the host provides models

**4.3 API key management for models**
- Deployers can optionally provide their own LLM API key (Anthropic, OpenAI)
- Key is encrypted at rest, passed to agent config
- If no key provided, host must have models configured (local or their own API keys)
- **Security:** Deployer API keys are NEVER exposed to the host owner

---

## MVP Scope (What we build in Sprint 5)

**In scope:**
- [ ] Command queue (DB table + heartbeat integration)
- [ ] Deploy command flow (pending → deploying → running)
- [ ] Daemon agent manager (install OpenClaw, create profiles, start/stop)
- [ ] Start/stop/restart from dashboard
- [ ] Agent status reporting via heartbeat
- [ ] Basic agent config (name, system prompt, model)
- [ ] Port management on host
- [ ] Resource monitoring (report, not enforce)

**Out of scope (future sprints):**
- Real-time chat with deployed agent
- Live log streaming
- Docker-based isolation
- Git-based deployment
- Custom channel configuration (Telegram/Discord per agent)
- Agent-to-agent communication
- Auto-scaling / multiple hosts per agent
- Deployer-provided API key management

---

## Key Questions for Isaac

1. **Model API keys:** Should the MVP require hosts to have their own LLM API keys configured, or should deployers provide their own? (Hosting someone else's API key is a trust/security issue.)

2. **OpenClaw version:** Should we pin a specific OpenClaw version, or always use latest? (Latest is simpler but could introduce breaking changes.)

3. **Agent limits per host:** Should we enforce a maximum number of agents per host machine? (Prevents resource exhaustion.)

4. **What can the deployer configure?** For MVP, should they just set a system prompt + model, or do they need file editing (SOUL.md, custom tools, etc.)?

5. **Pricing model implication:** Right now pricing is per-host-subscription. Should it be per-agent? (Multiple deployers could share one host if we split resources.)

---

## Estimated Effort

| Phase | Hours | Description |
|-------|-------|-------------|
| Phase 1 | ~3h | Command queue + heartbeat integration |
| Phase 2 | ~4h | Daemon agent manager |
| Phase 3 | ~3h | Dashboard integration |
| Phase 4 | ~2h | Configuration system |
| **Total** | **~12h** | |

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| OpenClaw not installed on host | Auto-install in daemon, check in heartbeat |
| Port conflicts | Port allocation system with tracking file |
| Runaway agent consuming all resources | Monitoring + kill watchdog |
| Deployer's agent crashes host daemon | Process isolation (separate process tree) |
| Config delivery fails | Retry logic, error reporting in heartbeat |
| Host goes offline mid-deploy | Pending state persists, retries on reconnect |
| API key security (deployer keys on host) | Defer to post-MVP, hosts provide own models for now |
