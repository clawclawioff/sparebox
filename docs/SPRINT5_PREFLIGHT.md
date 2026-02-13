# Sprint 5 Pre-Flight Checklist

Everything that needs to be true before we write Sprint 5 code.

---

## 1. Host Machine Requirements & Install Script Dependencies

The install script (`/api/install`) currently only installs the Sparebox daemon. For Sprint 5, the host machine needs significantly more software. The install script must be updated to detect/install all of these.

### Required Software

| Software | Purpose | Install Method | Rootless? |
|----------|---------|----------------|-----------|
| **Node.js 20+** | Daemon runtime | Already checked ✅ | Yes |
| **curl** | Download daemon + configs | Already checked ✅ | Yes |
| **Docker** | Agent container isolation | `curl -fsSL https://get.docker.com/rootless \| sh` | Yes (rootless mode) |
| **git** | Future: git-based deploys, OpenClaw skill installs | Package manager | Usually needs sudo |
| **OpenClaw** | Agent runtime (inside containers) | Pre-baked in Docker image ✅ | N/A (container) |

### Required System Configuration

| Configuration | Purpose | How |
|---------------|---------|-----|
| **Disable auto-sleep/suspend** | Host must stay online 24/7 | `systemd-inhibit` or `sudo systemctl mask sleep.target suspend.target hibernate.target` |
| **Disable auto-updates reboot** | Prevent unattended reboots | Configure `unattended-upgrades` to not auto-reboot |
| **Enable lingering** | systemd user services survive logout | `loginctl enable-linger $USER` |
| **Open outbound internet** | Containers need API access | Usually default — just verify no firewall blocking |
| **Sufficient swap** | Prevent hard OOM on memory pressure | `fallocate -l 2G /swapfile && mkswap && swapon` (needs sudo) |
| **cgroups v2** | Docker rootless resource limits | Most modern distros default to v2 (Ubuntu 22.04+) |
| **`/etc/subuid` + `/etc/subgid`** | Docker rootless user namespaces | Need entries for the host user (usually auto-configured) |

### Nice-to-Have Software

| Software | Purpose | Notes |
|----------|---------|-------|
| **tmux / screen** | Keep daemon alive without systemd | Fallback for systems without systemd |
| **htop** | Manual monitoring | Not required, nice for debugging |
| **jq** | JSON processing in scripts | Useful for daemon config management |

### What the Install Script Should Do (Updated)

1. ✅ Check Node.js 20+
2. ✅ Check curl
3. **NEW:** Check Docker — if missing, attempt rootless install
4. **NEW:** If Docker rootless fails, try Podman
5. **NEW:** If neither available, warn about limited isolation
6. **NEW:** Pull OpenClaw Docker image (`ghcr.io/openclaw/openclaw:latest`)
7. **NEW:** Check for `loginctl enable-linger` (warn if not enabled)
8. **NEW:** Create Docker network for agent isolation
9. ✅ Download daemon bundle
10. ✅ Configure daemon (API key + host ID)
11. ✅ Set up systemd service
12. ✅ Start daemon

### What Requires `sudo` (Action Items for Isaac)

Some operations require root access that the install script can't do automatically. These should be documented as "pre-requisites" that the host owner does before running the install script:

- **Docker Engine (traditional)** — needs `sudo apt install docker-ce` if rootless doesn't work
- **Swap file creation** — needs `sudo` for `fallocate` + `mkswap` + `swapon`
- **Disable sleep/hibernate** — needs `sudo systemctl mask ...`
- **`/etc/subuid` + `/etc/subgid`** — needs `sudo` to edit if not auto-populated

**Recommendation:** Create a "Host Setup Guide" page on sparebox.dev that walks through prerequisites step-by-step, BEFORE they run the install script. The script itself should be zero-sudo (rootless Docker + user systemd).

---

## 2. Stripe Implementation Changes

### Current State

The current Stripe integration is a **flat price per host**:
- Host sets one `pricePerMonth` (integer, cents)
- Deployer pays that price for one agent on that host
- 60/40 split via Stripe Connect destination charges

### What Needs to Change for Tiers

| Change | Current | Sprint 5 |
|--------|---------|----------|
| **Pricing model** | Single `pricePerMonth` per host | Per-tier pricing: `priceLite`, `priceStandard`, `pricePro`, `priceCompute` |
| **Checkout session** | Uses `host.pricePerMonth` | Uses `host.price{Tier}` based on selected tier |
| **Product description** | `"AI Agent: {name}"` | `"AI Agent: {name} (Standard Tier — 2GB RAM, 1 CPU)"` |
| **Metadata** | `{ userId, agentName, hostId, config }` | + `{ tier }` |
| **Agent record** | No tier field | `tier TEXT NOT NULL DEFAULT 'standard'` |
| **Subscription record** | No tier field | `tier TEXT` for audit trail |
| **Browse page** | One price shown | Price per tier, slot availability |
| **Deploy wizard** | No tier step | Tier selection step before host selection |

### Stripe Implementation Changes (Detailed)

1. **`hosts` table:** Add columns: `price_lite`, `price_standard`, `price_pro`, `price_compute` (all integer cents, nullable — null = tier not offered)
2. **`agents` table:** Add column: `tier TEXT NOT NULL DEFAULT 'standard'`
3. **`subscriptions` table:** Add column: `tier TEXT`
4. **`billing.createCheckoutSession`:** Accept `tier` param, look up `host.price{Tier}`, include tier in product description and metadata
5. **`checkout.session.completed` webhook:** Read `tier` from metadata, store on agent record
6. **`hosts.create` mutation:** Accept per-tier pricing
7. **Add machine wizard:** Per-tier price inputs (optional — leave blank to not offer that tier)
8. **Browse page:** Show per-tier pricing and slot availability

### Stripe Keys Status

⚠️ **All Stripe keys are currently SANDBOX mode.** This is correct for Sprint 5 development. Production switch happens in Sprint 6.

- `STRIPE_SECRET_KEY` — Sandbox ✅
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — Sandbox ✅
- `STRIPE_WEBHOOK_SECRET` — Sandbox ✅
- `STRIPE_CONNECT_WEBHOOK_SECRET` — Sandbox ✅
- `STRIPE_CONNECT_CLIENT_ID` — Sandbox ✅

**No action needed on Stripe for Sprint 5.**

---

## 3. Database Schema Changes Needed

### New Table: `agent_commands`

```sql
CREATE TABLE agent_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  host_id UUID NOT NULL REFERENCES hosts(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  payload JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  sent_at TIMESTAMP,
  acked_at TIMESTAMP,
  error TEXT
);

CREATE INDEX idx_agent_commands_host_pending
  ON agent_commands(host_id, status) WHERE status = 'pending';
CREATE INDEX idx_agent_commands_agent
  ON agent_commands(agent_id);
```

### Altered Tables

**`hosts`** — add tier pricing columns:
```sql
ALTER TABLE hosts ADD COLUMN price_lite INTEGER;
ALTER TABLE hosts ADD COLUMN price_standard INTEGER;
ALTER TABLE hosts ADD COLUMN price_pro INTEGER;
ALTER TABLE hosts ADD COLUMN price_compute INTEGER;
ALTER TABLE hosts ADD COLUMN max_agents INTEGER;
ALTER TABLE hosts ADD COLUMN isolation_mode TEXT DEFAULT 'unknown';
ALTER TABLE hosts ADD COLUMN openclaw_version TEXT;
```

**`agents`** — add tier, config, container tracking:
```sql
ALTER TABLE agents ADD COLUMN tier TEXT NOT NULL DEFAULT 'standard';
ALTER TABLE agents ADD COLUMN workspace_files JSONB DEFAULT '{}';
ALTER TABLE agents ADD COLUMN encrypted_api_key TEXT;
ALTER TABLE agents ADD COLUMN container_id TEXT;
ALTER TABLE agents ADD COLUMN isolation_mode TEXT DEFAULT 'docker';
ALTER TABLE agents ALTER COLUMN config TYPE JSONB USING config::jsonb;
```

Note: `agents.config` is currently `TEXT` — needs to change to `JSONB`.

**`subscriptions`** — add tier:
```sql
ALTER TABLE subscriptions ADD COLUMN tier TEXT;
```

### New Enum Values Needed

The `agent_status` enum currently has: `pending, deploying, running, stopped, failed`

May need: `pending_deploy` (distinct from `pending` which means "awaiting payment"). Actually, current `pending` is set by the webhook after payment, so it effectively means "pending deploy." This is fine as-is.

---

## 4. New Environment Variable Needed

| Variable | Purpose | Where |
|----------|---------|-------|
| `SPAREBOX_ENCRYPTION_KEY` | AES-256-GCM key for encrypting deployer API keys | Vercel env vars |

**Generation:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**⚠️ ACTION REQUIRED (Isaac):** Generate this key and add to Vercel environment variables before Sprint 5 goes to production.

---

## 5. Current Code That Needs Modification

| File | Change | Why |
|------|--------|-----|
| `src/db/schema.ts` | Add columns, new table | Tier pricing, agent commands, config |
| `src/app/api/hosts/heartbeat/route.ts` | Return pending commands, accept acks | Command delivery |
| `src/app/api/stripe/webhooks/route.ts` | Read tier from metadata | Tier-aware agent creation |
| `src/server/api/routers/billing.ts` | Accept tier, use per-tier pricing | Tier-aware checkout |
| `src/server/api/routers/agents.ts` | Add `sendCommand`, `updateConfig` mutations | Agent management |
| `src/server/api/routers/hosts.ts` | Accept per-tier pricing on create/update | Host management |
| `src/app/dashboard/agents/new/page.tsx` | Add tier selection step | Deploy wizard |
| `src/app/dashboard/browse/page.tsx` | Show per-tier pricing + slots | Browse page |
| `src/app/dashboard/hosts/new/page.tsx` | Per-tier price inputs | Add machine wizard |
| `src/app/api/install/route.ts` | Docker setup, image pull | Updated install script |
| `daemon/src/heartbeat.ts` | Report isolation mode, process commands, report acks | Agent manager |
| `daemon/src/index.ts` | Agent manager module, Docker interface | Core daemon changes |
| `src/lib/constants.ts` | Add tier definitions | Shared tier config |

---

## 6. Action Items for Isaac

### Before Sprint 5 starts:

- [ ] **Generate encryption key** — Run `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` and add as `SPAREBOX_ENCRYPTION_KEY` in Vercel env vars
- [ ] **Verify Stripe sandbox mode** — Confirm all 5 Stripe env vars in Vercel are sandbox keys (they should be)
- [ ] **Review tier pricing** — Confirm the 4 tiers (Lite $5-10, Standard $10-20, Pro $20-40, Compute $40-80) make sense for the market
- [ ] **Review design doc** — Final sign-off on `docs/specs/SPRINT5_AGENT_DEPLOYMENT.md`

### Before testing on real hardware:

- [ ] **Test machine available** — Do we have a test host machine (not WSL2) to test the Docker-based daemon? WSL2 has Docker limitations.
- [ ] **Stripe Connect test account** — Ensure the test host user has completed Stripe Connect onboarding (needed for payout testing)

---

## 7. Risks & Open Questions

| Item | Status | Notes |
|------|--------|-------|
| WSL2 Docker support | ⚠️ Risk | WSL2 supports Docker but with quirks. Testing should ideally happen on a real Linux machine or VPS. |
| Docker rootless on older distros | ⚠️ Risk | Ubuntu 20.04 may not have cgroups v2 by default. We document Ubuntu 22.04+ as requirement. |
| OpenClaw Docker image size | ℹ️ Info | ~500 MB. First deploy will be slow. Pre-pulling on install mitigates this. |
| `agents.config` TEXT→JSONB migration | ℹ️ Info | Existing data (if any) needs `USING config::jsonb` cast. Empty/null values are fine. |
| Tier pricing migration | ℹ️ Info | Existing hosts have `pricePerMonth` but no per-tier prices. Migration sets `price_standard = price_per_month` as default. |
| Host `pricePerMonth` column | ℹ️ Info | Keep for backward compat + display. Eventually deprecate in favor of per-tier columns. |

---

## 8. Sprint 5 Definition of Done

- [ ] Deployer can select a resource tier during agent deployment
- [ ] Payment creates agent record with correct tier
- [ ] Daemon receives deploy command via heartbeat
- [ ] Daemon creates Docker container with correct resource limits
- [ ] Agent OpenClaw instance boots and runs inside container
- [ ] Deployer can start/stop/restart from dashboard
- [ ] Dashboard shows agent status from daemon heartbeat
- [ ] Deployer can configure agent (quick setup + workspace files + advanced config)
- [ ] Deployer's API key is encrypted at rest and injected into container
- [ ] Non-Docker hosts fall back to profile mode with clear labeling
- [ ] Browse page shows isolation mode and per-tier pricing
- [ ] Install script sets up Docker rootless + pulls OpenClaw image
