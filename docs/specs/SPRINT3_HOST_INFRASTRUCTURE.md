# Sprint 3: Host Infrastructure — Design Document

**Author:** Claw Clawioff  
**Date:** 2026-02-07  
**Status:** Draft  
**Sprint Goal:** Enable hosts to register machines, send heartbeats, and let the platform track uptime — the critical path to a working marketplace.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Host API Key System](#3-host-api-key-system)
4. [Heartbeat System](#4-heartbeat-system)
5. [Uptime Monitoring](#5-uptime-monitoring)
6. [Host Daemon](#6-host-daemon)
7. [Install Script & Page](#7-install-script--page)
8. [Database Changes](#8-database-changes)
9. [API Endpoints](#9-api-endpoints)
10. [Dashboard Updates](#10-dashboard-updates)
11. [Security Considerations](#11-security-considerations)
12. [Testing Strategy](#12-testing-strategy)
13. [Implementation Plan](#13-implementation-plan)
14. [Open Questions](#14-open-questions)

---

## 1. Overview

### Problem
Right now, Sparebox hosts can register machines in the dashboard, but there's no way for the platform to verify a machine is actually online, track its health, or communicate with it. The `hosts` and `hostHeartbeats` tables exist but nothing writes to them. The agent `start`/`stop` mutations are stubs with `// TODO: Send command to host`.

### Goal
Build the infrastructure layer that connects physical host machines to the Sparebox platform:

1. **Host API Keys** — Secure machine-to-platform authentication
2. **Heartbeat API** — Hosts report health metrics every 60 seconds
3. **Uptime Monitor** — Platform detects offline hosts and updates status
4. **Host Daemon** — Lightweight process running on host machines
5. **Install Flow** — `curl | bash` one-liner to set up a new host

### Non-Goals (deferred)
- Agent deployment/lifecycle commands (start/stop/deploy) — Sprint 4
- OpenClaw Gateway relay for agent management — Sprint 5
- Container isolation (Docker) — Sprint 5
- Automated agent migration on host failure — Post-MVP

---

## 2. Architecture

### System Overview

```
┌─────────────────────────────────────────────┐
│           Sparebox Platform (Vercel)         │
│                                             │
│  ┌──────────┐  ┌───────────┐  ┌──────────┐ │
│  │  tRPC    │  │ Heartbeat │  │  Uptime  │ │
│  │ Routers  │  │  API      │  │  Cron    │ │
│  └────┬─────┘  └─────┬─────┘  └────┬─────┘ │
│       │               │             │       │
│       └───────────────┼─────────────┘       │
│                       │                     │
│              ┌────────┴────────┐            │
│              │  Supabase PG   │            │
│              │  (hosts, hb,   │            │
│              │   api_keys)    │            │
│              └────────────────┘            │
└─────────────────────────────────────────────┘
              ▲           ▲
              │ HTTPS     │ HTTPS
              │ (tRPC)    │ (REST)
              │           │
    ┌─────────┴───┐  ┌───┴──────────┐
    │  Dashboard  │  │ Host Daemon  │
    │  (Browser)  │  │ (on machine) │
    └─────────────┘  └──────────────┘
```

### Communication Model

**Push heartbeats** (daemon → platform):
- Host daemon sends heartbeat POST every 60 seconds
- Contains CPU, RAM, disk usage + agent count + daemon version
- Authenticated via API key in `Authorization: Bearer <key>` header
- Platform stores in `host_heartbeats`, updates `hosts.last_heartbeat`

**Pull monitoring** (platform internal):
- Vercel Cron Job runs every 5 minutes
- Checks all active hosts for stale heartbeats (>5 min gap)
- Marks stale hosts as `inactive`
- Re-activates hosts when fresh heartbeats resume

### Why Push (not Pull)?
- Hosts are behind NAT/firewalls — platform can't reach them
- No open ports required on host side
- Works with any network topology
- Simpler for host operators (no port forwarding)
- Future: Tailscale mesh for bidirectional comms (Sprint 5)

---

## 3. Host API Key System

### Design
Each registered host machine gets a unique API key for daemon authentication. Keys are generated when a host creates a machine in the dashboard and are shown once (like Stripe secret keys).

### Key Format
```
sbx_host_<random-32-hex-chars>
```
Example: `sbx_host_a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6`

**Why this format:**
- `sbx_` prefix identifies it as a Sparebox key
- `host_` identifies the key type (future: `sbx_admin_`, `sbx_deploy_`)
- 32 hex chars = 128 bits of entropy (sufficient for API auth)

### Storage
- **Database:** Store a SHA-256 hash of the key (never the raw key)
- **Display:** Show the full key exactly once at creation, then only the last 4 chars
- **Column:** `host_api_keys` table (see [Database Changes](#8-database-changes))

### Key Lifecycle
1. **Creation:** User clicks "Generate API Key" on host details page → key generated, hash stored, raw key shown once
2. **Usage:** Daemon includes key in every heartbeat request
3. **Rotation:** User can regenerate key → old key immediately invalidated, new key shown
4. **Revocation:** User can revoke key → host daemon stops authenticating
5. **Deletion:** Key deleted when host is deleted (cascade)

### Rate Limiting
- 2 requests/second per API key (heartbeat + buffer)
- Uses existing Upstash Redis ratelimiter
- Returns `429 Too Many Requests` when exceeded

---

## 4. Heartbeat System

### Heartbeat Payload
```typescript
interface HeartbeatPayload {
  // System metrics
  cpuUsage: number;      // 0-100 percentage
  ramUsage: number;      // 0-100 percentage
  diskUsage: number;     // 0-100 percentage
  
  // Agent info
  agentCount: number;    // Number of running agents
  agentStatuses: Array<{
    id: string;          // Agent ID (if known)
    name: string;        // Agent name
    status: 'running' | 'stopped' | 'error';
    uptimeSeconds: number;
    cpuPercent: number;
    ramMb: number;
  }>;
  
  // Daemon info
  daemonVersion: string; // e.g., "0.1.0"
  osInfo: string;        // e.g., "Ubuntu 22.04" or "Windows 11"
  nodeVersion: string;   // Node.js version
  uptime: number;        // Daemon uptime in seconds
  
  // Network (optional, future use)
  publicIp?: string;
  tailscaleIp?: string;
}
```

### Heartbeat Flow
```
1. Daemon collects system metrics (os.cpus, os.totalmem, etc.)
2. Daemon sends POST /api/hosts/heartbeat
   - Header: Authorization: Bearer sbx_host_<key>
   - Body: HeartbeatPayload (JSON)
3. Platform validates API key
4. Platform inserts into host_heartbeats table
5. Platform updates hosts.last_heartbeat timestamp
6. Platform updates hosts.status to "active" if currently "inactive"
7. Platform returns { ok: true, commands: [] }
   - commands: future use for sending instructions to daemon
```

### Response Format
```typescript
interface HeartbeatResponse {
  ok: boolean;
  ts: number;             // Server timestamp (for clock sync)
  commands: Command[];    // Future: commands to execute
  nextHeartbeatMs: number; // Suggested interval (default 60000)
}

// Future command types
type Command = 
  | { type: 'deploy'; agentId: string; config: object }
  | { type: 'stop'; agentId: string }
  | { type: 'update'; version: string }
  | { type: 'restart' };
```

### Heartbeat Interval
- **Default:** 60 seconds
- **Minimum:** 30 seconds (daemon-enforced)
- **Maximum:** 300 seconds (server can suggest via `nextHeartbeatMs`)
- **Jitter:** ±5 seconds random offset to prevent thundering herd

### Heartbeat Retention
- Raw heartbeats older than 7 days are pruned (future cron job)
- Aggregated hourly stats kept for 90 days (future)
- For now: keep all heartbeats, add cleanup later

---

## 5. Uptime Monitoring

### Vercel Cron Job
A Vercel Cron Job runs every 5 minutes to check host health.

**Path:** `src/app/api/cron/check-hosts/route.ts`

**Logic:**
```
1. Query all hosts with status = 'active'
2. For each host, check if last_heartbeat > 5 minutes ago
3. If stale:
   a. Update host status to 'inactive'
   b. Log event
   c. (Future: send email notification to host owner)
   d. (Future: trigger agent migration)
4. Also check hosts with status = 'inactive':
   a. If last_heartbeat < 2 minutes ago, re-activate
```

**Cron config** (`vercel.json`):
```json
{
  "crons": [
    {
      "path": "/api/cron/check-hosts",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

**Authentication:** Vercel Cron requests include `Authorization: Bearer <CRON_SECRET>` header. Verify with `process.env.CRON_SECRET`.

### Uptime Calculation
```
uptime_percent = (total_expected_heartbeats - missed_heartbeats) / total_expected_heartbeats * 100
```

- Calculated over a rolling 30-day window
- Updated every time the cron job runs
- Stored on `hosts.uptime_percent`

### Status Transitions
```
pending ──(first heartbeat)──► active
active  ──(5 min no heartbeat)──► inactive
inactive ──(new heartbeat)──► active
active  ──(manual/admin)──► suspended
suspended ──(admin only)──► active
```

---

## 6. Host Daemon

### Overview
The Sparebox Host Daemon (`sparebox-daemon`) is a lightweight Node.js process that runs on host machines. It:

1. Authenticates with the Sparebox platform via API key
2. Sends heartbeat metrics every 60 seconds
3. Reports system resource usage (CPU, RAM, disk)
4. Reports agent statuses (future)
5. Executes platform commands (future: deploy, stop, restart agents)

### Tech Stack
- **Runtime:** Node.js (LTS — same as OpenClaw requirement)
- **Language:** TypeScript, compiled to single JS bundle
- **Dependencies:** Minimal — only `node:os`, `node:https`, `node:child_process`
- **No external npm packages** for the daemon itself (security + simplicity)
- **Process manager:** systemd (Linux) / Task Scheduler (Windows) / launchd (macOS)

### File Structure
```
sparebox-daemon/
├── src/
│   ├── index.ts          # Entry point
│   ├── config.ts         # Config loading (env + file)
│   ├── heartbeat.ts      # Heartbeat sender
│   ├── metrics.ts        # System metrics collector
│   ├── agents.ts         # Agent status reporter (future)
│   └── commands.ts       # Command handler (future)
├── dist/
│   └── daemon.js         # Single compiled bundle
├── install.sh            # Linux/macOS installer
├── install.ps1           # Windows installer
├── package.json
└── tsconfig.json
```

### Configuration
The daemon reads config from environment variables or a config file:

```bash
# Environment variables (preferred)
SPAREBOX_API_KEY=sbx_host_a1b2c3...
SPAREBOX_HOST_ID=uuid-of-host
SPAREBOX_API_URL=https://www.sparebox.dev  # optional, defaults to production

# Config file (alternative): ~/.sparebox/config.json
{
  "apiKey": "sbx_host_a1b2c3...",
  "hostId": "uuid-of-host",
  "apiUrl": "https://www.sparebox.dev",
  "heartbeatIntervalMs": 60000
}
```

### Metrics Collection

```typescript
// CPU Usage — average across all cores over 1-second sample
function getCpuUsage(): Promise<number> {
  const cpus1 = os.cpus();
  await sleep(1000);
  const cpus2 = os.cpus();
  // Calculate delta idle vs total across all cores
  // Return 0-100 percentage
}

// RAM Usage
function getRamUsage(): number {
  const total = os.totalmem();
  const free = os.freemem();
  return Math.round(((total - free) / total) * 100);
}

// Disk Usage — check root partition
function getDiskUsage(): Promise<number> {
  // Linux: parse `df -P /` output
  // Windows: parse `wmic logicaldisk` output
  // Return 0-100 percentage
}
```

### Daemon Lifecycle

```
1. Start → Load config
2. Validate API key format
3. Send initial heartbeat (verify connectivity)
4. If OK: enter heartbeat loop (every 60s ± jitter)
5. If error: retry with exponential backoff (max 5 min)
6. On SIGTERM/SIGINT: send final "shutdown" heartbeat, exit gracefully
```

### Error Handling
- **Network failure:** Retry with exponential backoff (1s, 2s, 4s, 8s... max 5 min)
- **Auth failure (401/403):** Log error, stop sending heartbeats, wait for config update
- **Rate limited (429):** Back off to `Retry-After` header value
- **Server error (5xx):** Retry with backoff
- **Invalid config:** Exit with clear error message

### Logging
```
[2026-02-07 21:45:00] INFO  Sparebox Daemon v0.1.0 starting
[2026-02-07 21:45:00] INFO  Host ID: abc123-def456
[2026-02-07 21:45:01] INFO  Heartbeat sent (CPU: 23%, RAM: 45%, Disk: 62%)
[2026-02-07 21:46:01] INFO  Heartbeat sent (CPU: 18%, RAM: 44%, Disk: 62%)
[2026-02-07 21:47:02] WARN  Heartbeat failed: ECONNREFUSED, retrying in 2s
[2026-02-07 21:47:04] INFO  Heartbeat sent (retry succeeded)
```

---

## 7. Install Script & Page

### Install Page (`/install`)
A public page at `sparebox.dev/install` that provides:

1. Pre-requisites checklist (Node.js 20+, network access)
2. One-liner install command
3. Post-install verification steps
4. Link to Host Setup Checklist
5. Troubleshooting FAQ

### Install Command
```bash
curl -fsSL https://www.sparebox.dev/api/install | bash
```

### Install Script Flow (`install.sh`)
```bash
#!/usr/bin/env bash
set -euo pipefail

# 1. Check prerequisites
#    - Node.js >= 20 installed
#    - curl available
#    - Not running as root (warn)

# 2. Create directory
#    mkdir -p ~/.sparebox

# 3. Download daemon binary/bundle
#    curl -fsSL https://www.sparebox.dev/api/install/daemon -o ~/.sparebox/daemon.js

# 4. Prompt for API key and Host ID
#    (or accept as env vars: SPAREBOX_API_KEY, SPAREBOX_HOST_ID)

# 5. Write config file
#    Write ~/.sparebox/config.json

# 6. Verify connectivity
#    node ~/.sparebox/daemon.js --verify

# 7. Install as systemd service (if available)
#    Or provide instructions for manual setup

# 8. Start the service

# 9. Print success message with dashboard link
```

### Windows Support
Provide a separate PowerShell script:
```powershell
irm https://www.sparebox.dev/api/install/windows | iex
```

The PowerShell script:
1. Downloads daemon.js to `$HOME\.sparebox\`
2. Creates config file
3. Creates a Windows Task Scheduler entry to run on startup
4. Starts the daemon

### API Routes for Install
```
GET  /api/install          → Linux/macOS install script (bash)
GET  /api/install/windows  → Windows install script (PowerShell)
GET  /api/install/daemon   → Download compiled daemon.js bundle
GET  /api/install/version  → Current daemon version info
```

---

## 8. Database Changes

### New Table: `host_api_keys`

```sql
CREATE TABLE host_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES hosts(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL,           -- SHA-256 hash of the API key
  key_prefix TEXT NOT NULL,         -- First 8 chars for identification
  key_suffix TEXT NOT NULL,         -- Last 4 chars for display
  name TEXT DEFAULT 'default',     -- Optional key name
  last_used_at TIMESTAMPTZ,        -- Last successful auth
  expires_at TIMESTAMPTZ,          -- Optional expiry
  revoked_at TIMESTAMPTZ,          -- When revoked (null = active)
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  CONSTRAINT one_active_key_per_host UNIQUE (host_id) 
    WHERE revoked_at IS NULL       -- Only one active key per host
);

CREATE INDEX idx_host_api_keys_hash ON host_api_keys(key_hash);
CREATE INDEX idx_host_api_keys_host ON host_api_keys(host_id);
```

### Schema Updates to `hosts`

```sql
-- Add daemon version tracking
ALTER TABLE hosts ADD COLUMN daemon_version TEXT;

-- Add node_version for host's Node.js version
ALTER TABLE hosts ADD COLUMN node_version TEXT;

-- Add public_ip for display purposes
ALTER TABLE hosts ADD COLUMN public_ip TEXT;
```

### Drizzle Schema Additions

```typescript
// New table: host_api_keys
export const hostApiKeys = pgTable("host_api_keys", {
  id: uuid("id").defaultRandom().primaryKey(),
  hostId: uuid("host_id")
    .notNull()
    .references(() => hosts.id, { onDelete: "cascade" }),
  keyHash: text("key_hash").notNull(),
  keyPrefix: text("key_prefix").notNull(),
  keySuffix: text("key_suffix").notNull(),
  name: text("name").default("default"),
  lastUsedAt: timestamp("last_used_at"),
  expiresAt: timestamp("expires_at"),
  revokedAt: timestamp("revoked_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Add to hosts table
// daemon_version: text("daemon_version")
// node_version: text("node_version")
// public_ip: text("public_ip")
```

### Migration: `0007_host_infrastructure.sql`

```sql
-- Host API Keys table
CREATE TABLE IF NOT EXISTS host_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES hosts(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_suffix TEXT NOT NULL,
  name TEXT DEFAULT 'default',
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_host_api_keys_hash ON host_api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_host_api_keys_host ON host_api_keys(host_id);

-- Add columns to hosts
ALTER TABLE hosts ADD COLUMN IF NOT EXISTS daemon_version TEXT;
ALTER TABLE hosts ADD COLUMN IF NOT EXISTS node_version TEXT;
ALTER TABLE hosts ADD COLUMN IF NOT EXISTS public_ip TEXT;
```

---

## 9. API Endpoints

### Heartbeat Endpoint (REST — not tRPC)

**Why REST instead of tRPC?**
- The daemon is a standalone process, not a Next.js client
- No benefit from tRPC type inference for a simple POST endpoint
- REST is simpler for the daemon to implement (no dependencies)
- Consistent with webhook patterns we already use (Stripe)

**Route:** `POST /api/hosts/heartbeat`

```typescript
// src/app/api/hosts/heartbeat/route.ts

export async function POST(req: NextRequest) {
  // 1. Extract API key from Authorization header
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer sbx_host_")) {
    return NextResponse.json({ error: "Invalid auth" }, { status: 401 });
  }
  const apiKey = authHeader.slice(7); // Remove "Bearer "

  // 2. Hash the key and look up in database
  const keyHash = sha256(apiKey);
  const keyRecord = await db.query.hostApiKeys.findFirst({
    where: and(
      eq(hostApiKeys.keyHash, keyHash),
      isNull(hostApiKeys.revokedAt)
    ),
  });

  if (!keyRecord) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  // 3. Check expiry
  if (keyRecord.expiresAt && keyRecord.expiresAt < new Date()) {
    return NextResponse.json({ error: "Key expired" }, { status: 401 });
  }

  // 4. Rate limit
  const { success } = await ratelimit.limit(`hb:${keyRecord.hostId}`);
  if (!success) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  // 5. Parse and validate body
  const body = await req.json();
  const parsed = heartbeatSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // 6. Insert heartbeat record
  await db.insert(hostHeartbeats).values({
    hostId: keyRecord.hostId,
    cpuUsage: parsed.data.cpuUsage,
    ramUsage: parsed.data.ramUsage,
    diskUsage: parsed.data.diskUsage,
    agentCount: parsed.data.agentCount,
  });

  // 7. Update host record
  await db.update(hosts)
    .set({
      lastHeartbeat: new Date(),
      status: "active", // Re-activate if was inactive
      daemonVersion: parsed.data.daemonVersion,
      nodeVersion: parsed.data.nodeVersion,
      publicIp: parsed.data.publicIp || null,
      updatedAt: new Date(),
    })
    .where(eq(hosts.id, keyRecord.hostId));

  // 8. Update key last_used_at
  await db.update(hostApiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(hostApiKeys.id, keyRecord.id));

  // 9. Return response with any pending commands
  return NextResponse.json({
    ok: true,
    ts: Date.now(),
    commands: [], // Future: queue commands for the daemon
    nextHeartbeatMs: 60000,
  });
}
```

### tRPC Additions to `hostsRouter`

```typescript
// Generate API key for a host
generateApiKey: hostProcedure
  .input(z.object({ hostId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    // Verify ownership
    // Generate random key: sbx_host_<32 hex chars>
    // Hash it with SHA-256
    // Revoke any existing active keys for this host
    // Store hash in host_api_keys
    // Return the raw key (shown once)
  }),

// Revoke API key
revokeApiKey: hostProcedure
  .input(z.object({ hostId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    // Verify ownership
    // Set revoked_at = now on active key
  }),

// Get API key info (not the key itself — just metadata)
getApiKeyInfo: hostProcedure
  .input(z.object({ hostId: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    // Return: keyPrefix, keySuffix, createdAt, lastUsedAt, expiresAt
    // Never return the key hash or raw key
  }),
```

### Cron Endpoint

```typescript
// src/app/api/cron/check-hosts/route.ts

export async function GET(req: NextRequest) {
  // 1. Verify Vercel cron secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Find active hosts with stale heartbeats (>5 min)
  const staleThreshold = new Date(Date.now() - 5 * 60 * 1000);
  
  const staleHosts = await db.update(hosts)
    .set({ status: "inactive", updatedAt: new Date() })
    .where(and(
      eq(hosts.status, "active"),
      lt(hosts.lastHeartbeat, staleThreshold)
    ))
    .returning({ id: hosts.id, name: hosts.name });

  // 3. Find inactive hosts with fresh heartbeats (re-activate)
  const freshThreshold = new Date(Date.now() - 2 * 60 * 1000);
  
  const recoveredHosts = await db.update(hosts)
    .set({ status: "active", updatedAt: new Date() })
    .where(and(
      eq(hosts.status, "inactive"),
      gte(hosts.lastHeartbeat, freshThreshold)
    ))
    .returning({ id: hosts.id, name: hosts.name });

  // 4. Calculate uptime for all active hosts
  // (deferred — implement in a follow-up)

  return NextResponse.json({
    ok: true,
    checked: Date.now(),
    stale: staleHosts.length,
    recovered: recoveredHosts.length,
  });
}
```

---

## 10. Dashboard Updates

### Host Details Page Enhancements

**API Key Section:**
- Show key status (active / not generated / revoked)
- "Generate API Key" button → modal showing key once + copy button
- Last used timestamp
- "Regenerate" and "Revoke" buttons with confirmation dialogs

**Live Status Indicator:**
- Green dot = active (heartbeat < 2 min ago)
- Yellow dot = stale (heartbeat 2-5 min ago)
- Red dot = offline (heartbeat > 5 min ago or never)
- Gray dot = pending (never connected)

**Metrics Display Enhancement:**
- Show daemon version and Node.js version
- Show last heartbeat timestamp with relative time ("2 minutes ago")
- CPU/RAM/Disk gauges from latest heartbeat

### Add Machine Flow Update
After step 3 (install script), add step 4:
- Show the install command with embedded host ID
- Show "Generate API Key" button
- Show connection status (waiting for first heartbeat → connected)

### Browse Page Enhancement
- Only show hosts with `status: "active"` (already done)
- Add "Last seen" badge showing relative time
- Add uptime percentage badge

---

## 11. Security Considerations

### API Key Security
- **Hashed storage:** Keys stored as SHA-256 hashes only — even a database leak won't expose raw keys
- **One active key per host:** Limits attack surface
- **Shown once:** Raw key displayed only at generation time
- **Prefix check:** `sbx_host_` prefix prevents accidental use of other tokens
- **Rate limiting:** 2 req/s per key via Upstash Redis

### Heartbeat Endpoint Security
- **No session auth:** Uses API key, not browser cookies — daemon is headless
- **Input validation:** Strict Zod schema on request body
- **IP logging:** Record source IP for auditing (stored on host record, not in heartbeats)
- **Payload size limit:** Max 10KB request body
- **No sensitive data in heartbeats:** Only metrics, never secrets

### Install Script Security
- **HTTPS only:** `curl -fsSL https://...` — TLS verified
- **Checksum verification:** Daemon bundle includes SHA-256 hash for verification
- **No secrets in script:** API key entered after download, not embedded in script
- **Minimal permissions:** Daemon runs as current user, not root

### Cron Endpoint Security
- **Vercel CRON_SECRET:** Only Vercel can trigger the cron endpoint
- **Idempotent:** Safe to run multiple times

---

## 12. Testing Strategy

### Manual Testing (pre-deployment)
1. **API Key generation:** Create host → generate key → verify hash stored correctly
2. **Heartbeat flow:** Send manual curl request with valid key → verify DB records
3. **Auth failures:** Send with wrong key → expect 401; send without key → expect 401
4. **Rate limiting:** Send rapid requests → expect 429 after threshold
5. **Cron job:** Manually trigger `/api/cron/check-hosts` → verify status transitions

### Curl Test Commands
```bash
# Test heartbeat (replace with real values)
curl -X POST https://www.sparebox.dev/api/hosts/heartbeat \
  -H "Authorization: Bearer sbx_host_abc123..." \
  -H "Content-Type: application/json" \
  -d '{
    "cpuUsage": 25,
    "ramUsage": 60,
    "diskUsage": 45,
    "agentCount": 0,
    "agentStatuses": [],
    "daemonVersion": "0.1.0",
    "osInfo": "Ubuntu 22.04",
    "nodeVersion": "v20.11.0",
    "uptime": 3600
  }'

# Test auth failure
curl -X POST https://www.sparebox.dev/api/hosts/heartbeat \
  -H "Authorization: Bearer sbx_host_invalid" \
  -H "Content-Type: application/json" \
  -d '{"cpuUsage": 25}'
```

### Future: Automated Tests
- Unit tests for metrics collection (mock `os` module)
- Integration tests for heartbeat endpoint (mock DB)
- E2E test for full flow (generate key → start daemon → verify heartbeats)

---

## 13. Implementation Plan

### Phase 1: Database + API (Day 1)
**Files to create/modify:**
1. `src/db/schema.ts` — Add `hostApiKeys` table, new `hosts` columns
2. `drizzle/0007_host_infrastructure.sql` — Migration
3. `src/app/api/hosts/heartbeat/route.ts` — Heartbeat REST endpoint
4. `src/server/api/routers/hosts.ts` — Add API key mutations
5. `src/lib/constants.ts` — Add heartbeat constants

**Estimated:** ~3 hours

### Phase 2: Cron + Monitoring (Day 1)
**Files to create/modify:**
1. `src/app/api/cron/check-hosts/route.ts` — Uptime monitor cron
2. `vercel.json` — Add cron config
3. `src/server/api/routers/hosts.ts` — Update getMetrics to use new data

**Estimated:** ~1.5 hours

### Phase 3: Dashboard Updates (Day 1-2)
**Files to modify:**
1. `src/app/(dashboard)/hosts/[hostId]/page.tsx` — API key section, live status
2. `src/app/(dashboard)/hosts/new/page.tsx` — Post-creation install flow
3. `src/app/(dashboard)/browse/page.tsx` — Last seen badge

**Estimated:** ~2 hours

### Phase 4: Host Daemon (Day 2)
**Files to create:**
1. `daemon/src/index.ts` — Entry point
2. `daemon/src/config.ts` — Config loading
3. `daemon/src/heartbeat.ts` — Heartbeat sender
4. `daemon/src/metrics.ts` — System metrics
5. `daemon/package.json` — Minimal package
6. `daemon/tsconfig.json` — Build config

**Estimated:** ~3 hours

### Phase 5: Install Script + Page (Day 2)
**Files to create:**
1. `src/app/api/install/route.ts` — Bash install script endpoint
2. `src/app/api/install/windows/route.ts` — PowerShell install script
3. `src/app/api/install/daemon/route.ts` — Daemon bundle download
4. `src/app/install/page.tsx` — Public install instructions page

**Estimated:** ~2 hours

### Total Estimated Time: ~11.5 hours of development

### Deployment Order
1. Deploy database migration first
2. Deploy API endpoints + cron
3. Build and test daemon locally
4. Deploy install scripts
5. Test end-to-end on Isaac's machine

---

## 14. Open Questions

### Resolved
- **Q: REST vs tRPC for heartbeat?** → REST. Daemon is a standalone process, not a Next.js client.
- **Q: Where to host daemon code?** → Same repo under `daemon/` directory. Monorepo keeps it simple.
- **Q: API key vs JWT for daemon auth?** → API key. Simpler, no token refresh needed, long-lived.

### Open (need Isaac's input)
1. **Daemon distribution:** Compile to single JS file and serve from our API, or publish to npm as `sparebox-daemon`?
   - *Recommendation:* Start with API-served bundle. npm later when we have more features.

2. **Multi-key support:** Allow multiple API keys per host (e.g., for different environments)?
   - *Recommendation:* Start with one active key per host. Add multi-key later if needed.

3. **Agent lifecycle in heartbeat response:** Should the heartbeat response include deploy/stop commands, or should that be a separate WebSocket channel?
   - *Recommendation:* Include commands in heartbeat response for MVP. Upgrade to WebSocket/Tailscale for real-time control in Sprint 5.

4. **Daemon auto-update:** Should the daemon check for updates automatically?
   - *Recommendation:* Yes — compare `daemonVersion` in heartbeat response. If server returns newer version, daemon downloads and restarts. Implement in Phase 4 as optional behavior.

5. **Should the daemon be in the same repo or a separate `sparebox-daemon` repo?**
   - *Recommendation:* Same repo (`daemon/` directory) for now. Easier to keep in sync with API types. Split later if needed.

---

## Appendix: File Manifest

### New Files
```
src/app/api/hosts/heartbeat/route.ts      # Heartbeat REST endpoint
src/app/api/cron/check-hosts/route.ts     # Uptime monitor cron
src/app/api/install/route.ts              # Bash install script
src/app/api/install/windows/route.ts      # PowerShell install script
src/app/api/install/daemon/route.ts       # Daemon bundle download
src/app/api/install/version/route.ts      # Daemon version info
src/app/install/page.tsx                  # Install instructions page
daemon/src/index.ts                       # Daemon entry point
daemon/src/config.ts                      # Config loading
daemon/src/heartbeat.ts                   # Heartbeat sender
daemon/src/metrics.ts                     # System metrics
daemon/package.json                       # Daemon package
daemon/tsconfig.json                      # Daemon build config
drizzle/0007_host_infrastructure.sql      # DB migration
vercel.json                               # Cron job config
```

### Modified Files
```
src/db/schema.ts                          # Add hostApiKeys, new host columns
src/server/api/routers/hosts.ts           # Add API key mutations
src/server/api/root.ts                    # (no change needed — hosts router exists)
src/lib/constants.ts                      # Add heartbeat constants
src/app/(dashboard)/hosts/[hostId]/page.tsx  # API key UI, live status
src/app/(dashboard)/hosts/new/page.tsx       # Post-creation install flow
src/app/(dashboard)/browse/page.tsx          # Last seen badge
```

---

*This document is a living spec. Update as implementation progresses.*
