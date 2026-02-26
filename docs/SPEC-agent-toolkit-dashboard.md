# Spec: Agent Toolkit & Configuration Dashboard

> **Goal:** Give Sparebox users full control over their deployed OpenClaw agents — tools, skills, API keys, and runtime configuration — through a comprehensive dashboard.

## Problem Statement

Deployed agents currently run with a minimal, hardcoded configuration. Users can't:
- Enable/disable specific tools
- Add API keys for tools that need them (web search, image generation, etc.)
- Install or manage skills (ClawHub or custom)
- Configure agent behavior (timezone, heartbeat, thinking level, etc.)
- View agent logs or debug issues

This limits the product to "deploy and chat" when OpenClaw supports much more.

---

## Phase 1: Tool API Key Management (Sprint 7)

**The quickest value unlock.** Many tools just need an API key to work.

### 1.1 New DB Schema: `agent_secrets`

```sql
CREATE TABLE agent_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  key TEXT NOT NULL,           -- e.g. "BRAVE_SEARCH_API_KEY", "GEMINI_API_KEY"
  encrypted_value TEXT NOT NULL,
  label TEXT,                  -- Human-readable: "Brave Search", "Gemini"
  category TEXT DEFAULT 'tool', -- "tool", "provider", "custom"
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(agent_id, key)
);
```

### 1.2 UI: Agent Settings → API Keys Tab

Location: `/dashboard/agents/[id]/settings` (new page, or tab on existing detail page)

```
┌─────────────────────────────────────────────────┐
│  Agent Settings > API Keys                       │
├─────────────────────────────────────────────────┤
│                                                  │
│  🔍 Web Search (Brave)                          │
│  ┌──────────────────────────────────┐  [Save]   │
│  │ BSA_xxxxxxxxxxxxxxxxx           │            │
│  └──────────────────────────────────┘            │
│  Status: ✅ Configured                           │
│                                                  │
│  🖼️ Image Generation (Gemini)                   │
│  ┌──────────────────────────────────┐  [Save]   │
│  │ ••••••••••••••••                 │            │
│  └──────────────────────────────────┘            │
│  Status: ⚠️ Not configured                      │
│                                                  │
│  🌐 Firecrawl (Web Scraping)                    │
│  ┌──────────────────────────────────┐  [Save]   │
│  │                                  │            │
│  └──────────────────────────────────┘            │
│  Status: ⚠️ Not configured                      │
│                                                  │
│  ➕ Add Custom API Key                           │
│  Key Name: [____________]                        │
│  Value:    [____________]  [Add]                 │
│                                                  │
└─────────────────────────────────────────────────┘
```

### 1.3 Known Tool API Keys (predefined list)

| Tool | Env Var | Category | Notes |
|------|---------|----------|-------|
| Web Search | `BRAVE_SEARCH_API_KEY` | Search | Brave Search API |
| Image Gen | `GEMINI_API_KEY` | AI | Gemini image generation |
| Firecrawl | `FIRECRAWL_API_KEY` | Web | Advanced web scraping |
| Perplexity | `PERPLEXITY_API_KEY` | Search | Perplexity search |
| ElevenLabs | `ELEVEN_API_KEY` | TTS | Text-to-speech |

Users can also add **custom** env vars for any skill that needs them.

### 1.4 Deploy Config Integration

`deploy-config/route.ts` reads `agent_secrets` and:
1. Injects env vars into the container environment
2. Maps known keys to OpenClaw config paths (e.g., `BRAVE_SEARCH_API_KEY` → `tools.web.search.apiKey`)
3. Passes custom env vars as-is

### 1.5 Hot Reload

When a user updates API keys:
1. Update `agent_secrets` in DB
2. Send `update_config` command via agent command queue
3. Daemon picks up command, fetches fresh deploy-config, updates container env
4. Container restarts with new env vars

**Estimated effort:** 2-3 days

---

## Phase 2: Agent Configuration Dashboard (Sprint 7-8)

### 2.1 Configuration Panels

Expand the agent detail page with tabbed navigation:

```
[Overview] [Chat] [Settings] [Skills] [Logs]
```

#### Settings Tab Sections:

**General**
- Agent name (editable)
- Timezone (dropdown, affects cron scheduling)
- Model override (dropdown: claude-sonnet-4-6, gpt-5-mini, etc.)
- Thinking level (off/low/medium/high)

**Resources**
- Current tier display (Lite/Standard/Pro/Compute)
- Upgrade/downgrade button → Stripe checkout
- Resource usage graphs (CPU, RAM, disk)

**API Keys** (from Phase 1)

**Advanced**
- Heartbeat interval
- Context window size
- Compaction mode
- Custom OpenClaw config JSON editor (power users)

### 2.2 Implementation

Each setting maps to either:
- An env var (passed to container)
- An OpenClaw config field (written to `/state/openclaw.json`)
- A DB field on the `agents` table

The deploy-config endpoint already handles all three — settings just need a UI and a tRPC mutation to update the DB.

**Estimated effort:** 3-4 days

---

## Phase 3: Skills Management (Sprint 8)

### 3.1 Architecture

Skills in Sparebox containers live at `/workspace/skills/` (the workspace volume mount). The skill system needs:

1. **Skill browser** — Browse ClawHub registry from the Sparebox UI
2. **Skill installer** — Download skill files into the agent's workspace volume
3. **Skill config** — Enable/disable skills, pass required env vars
4. **Custom skills** — Upload custom SKILL.md + scripts

### 3.2 UI: Skills Tab

```
┌─────────────────────────────────────────────────────┐
│  Agent Settings > Skills                             │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Installed Skills (3)                                │
│  ┌─────────────────────────────────────────────────┐│
│  │ 🌤️ weather         v1.2.0  ✅ Active           ││
│  │   Get weather and forecasts                     ││
│  │   [Configure] [Disable] [Remove]                ││
│  ├─────────────────────────────────────────────────┤│
│  │ 🐙 github          v2.0.1  ⚠️ Needs GH Token  ││
│  │   GitHub operations via gh CLI                  ││
│  │   [Add Token] [Disable] [Remove]               ││
│  ├─────────────────────────────────────────────────┤│
│  │ 📝 skill-creator   v1.0.0  ✅ Active           ││
│  │   Create or update AgentSkills                  ││
│  │   [Configure] [Disable] [Remove]               ││
│  └─────────────────────────────────────────────────┘│
│                                                      │
│  Browse ClawHub                                      │
│  ┌──────────────────┐                                │
│  │ 🔍 Search skills │                                │
│  └──────────────────┘                                │
│  Popular: weather, github, coding-agent, mcporter    │
│                                                      │
│  ➕ Upload Custom Skill                              │
│  [Choose files or drag & drop]                       │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### 3.3 Skill Installation Flow

1. User browses/searches ClawHub from Sparebox UI
2. Clicks "Install" → Sparebox API fetches skill from ClawHub registry
3. Skill files stored in `agent_skills` table (or S3/R2 for larger files)
4. Daemon picks up `install_skill` command via command queue
5. Daemon writes skill files to the agent's workspace volume at `/workspace/skills/{skill-name}/`
6. Agent restart picks up new skill automatically (OpenClaw loads `<workspace>/skills/` on boot)

### 3.4 Skill Dependencies

Some skills need binaries (e.g., `gh` CLI for github skill). Options:
- **Pre-baked images:** Create Sparebox Docker images with common binaries (gh, uv, etc.)
- **Tier-based images:** Lite = minimal, Pro = full toolkit
- **Runtime install:** Use Docker `setupCommand` to install on first boot (slower but flexible)

For MVP: document which skills work out-of-the-box in containers and which need binaries. Add binary availability as a skill compatibility flag.

### 3.5 New DB Schema: `agent_skills`

```sql
CREATE TABLE agent_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  skill_version TEXT,
  source TEXT DEFAULT 'clawhub',  -- 'clawhub', 'custom', 'builtin'
  files JSONB NOT NULL,           -- { "SKILL.md": "...", "scripts/run.sh": "..." }
  config JSONB DEFAULT '{}',      -- skill-specific config/env overrides
  enabled BOOLEAN DEFAULT true,
  installed_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(agent_id, skill_name)
);
```

**Estimated effort:** 5-7 days

---

## Phase 4: Browser Support (Sprint 9)

### The Problem
No browser is installed in the base OpenClaw Docker image. The `browser` tool is one of OpenClaw's most powerful features.

### Options

| Approach | Pros | Cons |
|----------|------|------|
| **A: Custom Docker image with Chromium** | Full browser support | +400MB image size, higher resource usage |
| **B: Sidecar container** | Isolated, doesn't bloat main image | Complex networking, more resource usage |
| **C: Remote browser service** | Shared across agents, efficient | Single point of failure, latency |
| **D: Browserless.io / similar SaaS** | Zero maintenance | Cost per agent, external dependency |

### Recommended: Option A (Custom Image) with Tier Gating

- Create `sparebox/openclaw-browser` Docker image = base OpenClaw + Chromium + common CLIs
- Only available on **Standard tier and above** (needs 2GB+ RAM for Chrome)
- Lite tier: no browser (document in AGENTS.md)
- Add `SPAREBOX_BROWSER_ENABLED=true` env var → deploy-config sets `browser.enabled: true` in OpenClaw config

### Implementation

1. Create Dockerfile extending the OpenClaw base image
2. Install Chromium, gh CLI, common tools
3. Push to container registry (GitHub Container Registry or Docker Hub)
4. Daemon selects image based on tier
5. Deploy config sets browser config when image supports it

**Estimated effort:** 2-3 days

---

## Phase 5: Agent Logs (Sprint 8-9)

### 5.1 Log Streaming

Currently the biggest missing MVP feature. Users need to see what their agent is doing.

### Architecture

```
Container → stdout/stderr → Docker logs → Daemon tails logs → 
  POST /api/agents/{id}/logs → Stored in DB → UI polls/streams
```

### 5.2 Implementation

1. **Daemon:** Tail Docker container logs (`docker logs -f {containerId}`)
2. **API:** `POST /api/agents/{id}/logs` — daemon sends log batches
3. **API:** `GET /api/agents/{id}/logs?since={timestamp}` — UI fetches
4. **UI:** Logs tab on agent detail page with auto-scroll, search, severity filters
5. **Retention:** Keep last 1000 lines in DB, rotate older logs

### 5.3 Log Entry Schema

```sql
CREATE TABLE agent_logs (
  id BIGSERIAL PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL,
  level TEXT DEFAULT 'info',  -- debug, info, warn, error
  message TEXT NOT NULL,
  source TEXT DEFAULT 'container',  -- container, daemon, system
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_agent_logs_agent_ts ON agent_logs(agent_id, timestamp DESC);
```

**Estimated effort:** 3-4 days

---

## Phase 6: Workspace File Manager (Sprint 9-10)

### The Problem
Users need to manage files in their agent's workspace — AGENTS.md, SOUL.md, MEMORY.md, custom scripts, data files.

### UI: Files Tab

```
┌──────────────────────────────────────────────────┐
│  Agent Settings > Files                           │
├──────────────────────────────────────────────────┤
│  📁 /workspace                                    │
│  ├── 📄 AGENTS.md          2.1 KB  [Edit] [Del]  │
│  ├── 📄 MEMORY.md          0.3 KB  [Edit] [Del]  │
│  ├── 📄 SOUL.md            1.5 KB  [Edit] [Del]  │
│  ├── 📁 skills/                                   │
│  │   ├── 📁 weather/                              │
│  │   └── 📁 github/                               │
│  └── 📁 memory/                                   │
│      └── 📄 journal/2026-02-26.md                 │
│                                                    │
│  [📤 Upload File]  [📄 New File]                  │
│                                                    │
│  ── File Editor ──────────────────────────────────│
│  SOUL.md                                 [Save]   │
│  ┌────────────────────────────────────────────────┐│
│  │ # Soul                                        ││
│  │ You are a helpful AI assistant...             ││
│  │                                                ││
│  └────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────┘
```

### Implementation

1. **API:** `GET /api/agents/{id}/files` — list files (daemon reads from volume)
2. **API:** `GET /api/agents/{id}/files/{path}` — read file content
3. **API:** `PUT /api/agents/{id}/files/{path}` — write/create file
4. **API:** `DELETE /api/agents/{id}/files/{path}` — delete file
5. **Daemon:** File operations via Docker volume mount (daemon has direct access)
6. **UI:** Monaco editor for code/markdown, tree view for navigation

**Estimated effort:** 4-5 days

---

## Implementation Priority

| Phase | Feature | Effort | Impact | Priority |
|-------|---------|--------|--------|----------|
| 1 | API Key Management | 2-3 days | 🔴 High — unlocks web search, image gen, TTS | **P0** |
| 2 | Config Dashboard | 3-4 days | 🟠 High — timezone, model, thinking | **P0** |
| 5 | Agent Logs | 3-4 days | 🔴 High — biggest missing MVP feature | **P0** |
| 3 | Skills Management | 5-7 days | 🟠 High — key differentiator | **P1** |
| 6 | Workspace Files | 4-5 days | 🟡 Medium — power user feature | **P1** |
| 4 | Browser Support | 2-3 days | 🟡 Medium — needs custom Docker image | **P2** |

### Suggested Sprint Plan

**Sprint 7 (next):** Phase 1 (API Keys) + Phase 5 (Logs) + Phase 2 (Config Dashboard)
- 8-11 days total
- Covers the 3 most impactful gaps
- Users can configure tools AND see what their agent is doing

**Sprint 8:** Phase 3 (Skills) + begin Phase 6 (Files)
- 9-12 days total  
- Skills management is the big differentiator

**Sprint 9:** Phase 4 (Browser) + complete Phase 6 (Files)
- 6-8 days total
- Custom Docker images, full file management

---

## Technical Notes

### Container Config Hot Reload

For Phases 1-3, we need the ability to update a running agent's config without full redeployment:

1. User changes setting in UI → tRPC mutation updates DB
2. API sends `update_config` command to agent's command queue  
3. Daemon picks up command on next heartbeat
4. Daemon fetches fresh deploy-config, updates env vars / config file
5. Daemon restarts the container with new config

The command queue infrastructure already exists (used for deploy/start/stop/restart). We just need an `update_config` command type that triggers a config refresh + container restart.

### Security Considerations

- All API keys encrypted with AES-256-GCM (existing `encrypt()`/`decrypt()` functions)
- API keys never returned in plaintext to frontend (masked display)
- Skill files sandboxed within workspace volume
- File manager restricted to `/workspace` path (no path traversal)
- Custom Docker images scanned for vulnerabilities before deployment

### Daemon Changes Required

1. **File operations:** New endpoints for reading/writing workspace files
2. **Log tailing:** Background goroutine tailing Docker container logs
3. **Skill installation:** Download and extract skill files to workspace volume
4. **Config refresh:** Re-fetch deploy-config and restart container on `update_config` command
