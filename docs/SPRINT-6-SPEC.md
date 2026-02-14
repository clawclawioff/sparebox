# Sprint 6: Beta Launch Prep — Design Spec

## Status at Sprint Start
- Agent Chat feature deployed (commit `b5456a1`)
- DB migration 0012 (agent_messages) applied
- 20 total bugs fixed across 2 rounds
- Daemon bundle rebuilt with messaging support (47.4KB)
- All Stripe keys still in SANDBOX mode
- No admin dashboard, no host approval workflow

## Immediate Actions (Start of Sprint)

### 1. Verify Deployment
The Vercel deploy of `b5456a1` (Agent Chat) may not have completed. First action:
```bash
cd projects/sparebox
VERCEL_TOKEN="fvKK31vMnGLhrmwpWcGxMGku" npx vercel --prod --token "fvKK31vMnGLhrmwpWcGxMGku" --yes
```

### 2. Update Daemon on Isaac's Mac
The daemon on Isaac's Mac (`~/.sparebox/sparebox-daemon.cjs`) needs the new bundle with messaging support. Isaac needs to re-run the install script or manually copy the new `daemon/bundle.cjs`.

### 3. End-to-End Test
Test the full flow with the updated daemon:
1. Start Docker Desktop on Mac
2. Re-run install script: `curl -fsSL https://www.sparebox.dev/api/install | bash`
3. Start daemon: `node ~/.sparebox/sparebox-daemon.cjs`
4. Log in as deployer (`ifoster41901@gmail.com` / `IsaacTest`)
5. Go to agent detail page → Chat tab
6. Send a message and verify it reaches the agent and response comes back

## Sprint 6 Tasks

### Phase 1: Production Readiness (Critical)

#### 1.1 Switch Stripe to Production Keys
**Priority: URGENT**
- Replace 4 sandbox keys in Vercel env vars:
  - `STRIPE_SECRET_KEY` → production secret
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` → production publishable
  - `STRIPE_WEBHOOK_SECRET` → re-create webhook in live mode
  - `STRIPE_CONNECT_WEBHOOK_SECRET` → re-create connect webhook
- Update webhook endpoints in Stripe dashboard (live mode)
- Test a real checkout flow end-to-end
- **Risk:** Must verify all webhook handlers work with live events

#### 1.2 Fix Heartbeat Suspended Override
**Priority: HIGH**
The heartbeat endpoint currently transitions hosts from `inactive`/`pending` to `active`, but also from `suspended`. A suspended host should STAY suspended regardless of heartbeat.

**Current code (heartbeat/route.ts):**
```typescript
await db.update(hosts)
  .set({ status: "active" })
  .where(and(
    eq(hosts.id, keyRecord.hostId),
    inArray(hosts.status, ["inactive", "pending"])
  ));
```
This is correct — `suspended` is NOT in the array. **Verify this is actually correct** (the Notion ticket says it's a bug, but the code looks fine). If correct, close the ticket.

### Phase 2: Admin & Approval

#### 2.1 Admin Dashboard
**Priority: HIGH**
Route: `/dashboard/admin` (admin role only)

Features:
- User list (search, filter by role, view details)
- Host list (all hosts, approve/suspend/delete)
- Agent list (all agents, view status, force stop)
- System stats (total users, hosts, agents, revenue)
- Recent activity log

**Backend:**
- New `admin.ts` tRPC router with `adminProcedure` (already exists in trpc.ts)
- Queries: listUsers, listHosts, listAgents, getSystemStats
- Mutations: approveHost, suspendHost, suspendUser, forceStopAgent

#### 2.2 Host Approval Workflow
**Priority: HIGH**
Currently: Any host goes active on first heartbeat.
Target: New hosts stay `pending` until admin approves.

Changes:
- Heartbeat: Don't auto-transition `pending` → `active` (only `inactive` → `active`)
- Admin dashboard: "Pending Hosts" section with approve/reject buttons
- Email notification to admin when new host registers
- Email notification to host when approved/rejected

### Phase 3: Chat Reliability & UX

#### 3.1 Message Retry & Timeout
- Messages stuck in "delivered" for >5min should be retried or marked failed
- Add a cron job or heartbeat check to expire old messages
- Show "Message delivery failed" in chat UI

#### 3.2 Message Pagination
- Current: loads last 50 messages
- Add: infinite scroll / "Load older messages" button
- Cursor-based pagination already stubbed in `messages.list`

#### 3.3 Chat History Persistence
- Messages persist across sessions (already in DB)
- Show date separators between messages from different days
- Add "Clear chat" button

### Phase 4: Polish

#### 4.1 Real-Time Logs
- Extend heartbeat to include last N log lines from agent container
- `docker logs --tail 100` or profile log file
- Display in the Logs tab on agent detail page

#### 4.2 Webhook Error Handling
- Currently returns 200 even on handler failures
- Should return 500 so Stripe retries
- Already noted in code: `handlePaymentFailed`, `handleCheckoutCompleted`

#### 4.3 Error Boundaries
- Add `error.tsx` for all dashboard routes
- Add `loading.tsx` for route transitions

## Architecture Notes

### Agent Chat Data Flow
```
Deployer Browser                 Sparebox API                  Daemon              OpenClaw Agent
      │                              │                          │                       │
      │ POST messages.send ────────► │                          │                       │
      │                              │ Insert agent_messages    │                       │
      │                              │ (status: pending)        │                       │
      │                              │                          │                       │
      │                              │ ◄── Heartbeat POST ──── │                       │
      │                              │ Response includes        │                       │
      │                              │ pending messages ──────► │                       │
      │                              │                          │ openclaw agent        │
      │                              │                          │ --message "..." ────► │
      │                              │                          │                       │
      │                              │                          │ ◄── JSON response ── │
      │                              │                          │                       │
      │                              │ ◄── Next Heartbeat ──── │                       │
      │                              │ messageResponses[]       │                       │
      │                              │ Insert agent reply       │                       │
      │                              │ Update original status   │                       │
      │                              │                          │                       │
      │ GET messages.poll ──────────►│                          │                       │
      │ ◄── New messages ────────── │                          │                       │
```

### File Map (Agent Chat)
```
src/
  server/api/routers/messages.ts    # tRPC router: send, list, poll
  db/schema.ts                       # agentMessages table + relations
  app/api/hosts/heartbeat/route.ts   # Message delivery + response processing
  app/dashboard/agents/[id]/page.tsx # Chat tab UI (AgentChat component)

daemon/
  src/message-handler.ts             # Bridges messages to agent CLI
  src/heartbeat.ts                   # Sends/receives message payloads
  src/agent-manager.ts               # getAgentRecordsForMessaging()
  bundle.cjs                         # Rebuilt 47.4KB bundle

drizzle/
  0012_agent_messages.sql            # Migration (APPLIED)
```

### Remaining Backlog (25 items)
See Notion Task Board. Key items by priority:
- 🔴 Urgent: Stripe production keys
- 🟠 High: Admin dashboard, host approval, heartbeat suspended fix, codebase audit completion
- 🟡 Medium: 2FA, CSRF, payment grace period, audit logging, signup race condition, webhook 200-on-error, email notifications
- 🟢 Low: Error boundaries, loading.tsx, Resend upgrade, Discord, Product Hunt, demo video, blog posts

## Success Criteria
Sprint 6 is done when:
1. ✅ Stripe in production mode with working live payments
2. ✅ Admin can approve/reject host registrations
3. ✅ Admin dashboard shows system overview
4. ✅ Agent chat tested end-to-end (deployer → agent → response)
5. ✅ Daemon updated on test host
