# Sparebox MVP Specification

**Version:** 1.0  
**Date:** 2026-02-05  
**Status:** Draft

---

## 1. Executive Summary

Sparebox is a P2P marketplace connecting hardware owners (hosts) with users who want to run AI agents. The MVP must demonstrate the core value proposition: hosts can monetize idle hardware, users can deploy agents with minimal friction.

### MVP Success Criteria
- [ ] A host can register, add a machine, and receive their first payout
- [ ] A user can sign up, browse hosts, deploy an agent, and see it running
- [ ] Payments flow correctly through Stripe/Stripe Connect
- [ ] Basic monitoring shows agent and host status

### Out of Scope for MVP
- Automated agent migration/failover
- Advanced matching algorithms
- Mobile apps
- Multiple agents per subscription
- Custom domain support for agents
- Real-time WebSocket connections (polling is acceptable)

---

## 2. User Roles & Permissions

### 2.1 Guest (Unauthenticated)
- View landing page
- View pricing page
- Sign up / Log in

### 2.2 User (Agent Deployer)
- All Guest permissions
- Browse available hosts
- Deploy agents to hosts
- View own agents and their status
- Manage subscriptions (view, cancel)
- Update profile
- Add payment method

### 2.3 Host (Hardware Provider)
- All Guest permissions
- Register machines
- Set pricing for machines
- View hosted agents (limited info)
- View earnings
- Connect Stripe for payouts
- Update machine status (online/offline)

### 2.4 Admin (Future)
- All permissions
- User management
- Dispute resolution
- Platform analytics

---

## 3. Database Schema

### 3.1 Core Tables (better-auth managed)

```
user
├── id: text (PK)
├── email: text (unique)
├── email_verified: boolean
├── name: text
├── image: text
├── role: enum('host', 'user', 'admin')
├── stripe_customer_id: text
├── stripe_connect_account_id: text
├── created_at: timestamp
└── updated_at: timestamp

session
├── id: text (PK)
├── user_id: text (FK -> user.id)
├── token: text (unique)
├── expires_at: timestamp
├── ip_address: text
├── user_agent: text
├── created_at: timestamp
└── updated_at: timestamp

account
├── id: text (PK)
├── user_id: text (FK -> user.id)
├── account_id: text
├── provider_id: text
├── access_token: text
├── refresh_token: text
├── access_token_expires_at: timestamp
├── refresh_token_expires_at: timestamp
├── scope: text
├── password: text (hashed)
├── created_at: timestamp
└── updated_at: timestamp

verification
├── id: text (PK)
├── identifier: text
├── value: text
├── expires_at: timestamp
├── created_at: timestamp
└── updated_at: timestamp
```

### 3.2 Business Tables

```
hosts
├── id: uuid (PK)
├── user_id: text (FK -> user.id)
├── name: text
├── description: text
├── status: enum('pending', 'active', 'inactive', 'suspended')
├── cpu_cores: integer
├── ram_gb: integer
├── storage_gb: integer
├── os_info: text
├── region: text
├── country: text
├── city: text
├── price_per_month: integer (cents)
├── tailscale_ip: text
├── last_heartbeat: timestamp
├── uptime_percent: real
├── total_earnings: integer (cents)
├── created_at: timestamp
└── updated_at: timestamp

agents
├── id: uuid (PK)
├── user_id: text (FK -> user.id)
├── host_id: uuid (FK -> hosts.id, nullable)
├── name: text
├── status: enum('pending', 'deploying', 'running', 'stopped', 'failed')
├── config: text (JSON)
├── openclaw_version: text
├── last_active: timestamp
├── total_uptime: integer (seconds)
├── created_at: timestamp
└── updated_at: timestamp

subscriptions
├── id: uuid (PK)
├── user_id: text (FK -> user.id)
├── agent_id: uuid (FK -> agents.id)
├── host_id: uuid (FK -> hosts.id)
├── status: enum('active', 'past_due', 'canceled', 'trialing')
├── stripe_subscription_id: text
├── stripe_price_id: text
├── price_per_month: integer (cents)
├── host_payout_per_month: integer (cents)
├── platform_fee_per_month: integer (cents)
├── current_period_start: timestamp
├── current_period_end: timestamp
├── canceled_at: timestamp
├── created_at: timestamp
└── updated_at: timestamp

payouts
├── id: uuid (PK)
├── host_id: uuid (FK -> hosts.id)
├── amount: integer (cents)
├── stripe_transfer_id: text
├── status: enum('pending', 'processing', 'completed', 'failed')
├── period_start: timestamp
├── period_end: timestamp
├── created_at: timestamp
└── updated_at: timestamp

host_heartbeats (for monitoring)
├── id: uuid (PK)
├── host_id: uuid (FK -> hosts.id)
├── cpu_usage: real
├── ram_usage: real
├── disk_usage: real
├── agent_count: integer
├── created_at: timestamp
└── (auto-delete after 7 days)
```

---

## 4. Page Specifications

See individual spec files:
- [AUTH.md](./AUTH.md) - Authentication pages
- [DASHBOARD.md](./DASHBOARD.md) - Dashboard overview
- [HOSTS.md](./HOSTS.md) - Host management pages
- [AGENTS.md](./AGENTS.md) - Agent deployment pages
- [BILLING.md](./BILLING.md) - Billing & subscription pages
- [SETTINGS.md](./SETTINGS.md) - User settings

---

## 5. API Specification

### 5.1 tRPC Routers

```
appRouter
├── auth (handled by better-auth, not tRPC)
├── users
│   ├── me.query() -> User
│   ├── update.mutation({ name?, image? }) -> User
│   └── delete.mutation() -> void
├── hosts
│   ├── list.query() -> Host[] (own hosts)
│   ├── listAvailable.query({ region?, minRam?, maxPrice? }) -> PublicHost[]
│   ├── get.query({ id }) -> Host
│   ├── create.mutation({ name, specs, price }) -> Host
│   ├── update.mutation({ id, name?, price?, status? }) -> Host
│   ├── delete.mutation({ id }) -> void
│   └── heartbeat.mutation({ id, metrics }) -> void
├── agents
│   ├── list.query() -> Agent[] (own agents)
│   ├── get.query({ id }) -> Agent
│   ├── create.mutation({ name, hostId, config }) -> Agent
│   ├── update.mutation({ id, name?, config? }) -> Agent
│   ├── start.mutation({ id }) -> Agent
│   ├── stop.mutation({ id }) -> Agent
│   └── delete.mutation({ id }) -> void
├── subscriptions
│   ├── list.query() -> Subscription[]
│   ├── get.query({ id }) -> Subscription
│   ├── create.mutation({ agentId, hostId }) -> { clientSecret }
│   └── cancel.mutation({ id }) -> Subscription
├── billing
│   ├── getPaymentMethods.query() -> PaymentMethod[]
│   ├── createSetupIntent.mutation() -> { clientSecret }
│   ├── setDefaultPaymentMethod.mutation({ id }) -> void
│   └── getInvoices.query() -> Invoice[]
└── payouts (hosts only)
    ├── list.query() -> Payout[]
    ├── getEarnings.query({ period }) -> EarningsSummary
    └── connectStripe.mutation() -> { url }
```

### 5.2 Stripe Integration Points

**Checkout Flow (User subscribes):**
1. User selects host and clicks "Deploy"
2. Frontend calls `subscriptions.create({ agentId, hostId })`
3. Backend creates Stripe Subscription with `payment_behavior: 'default_incomplete'`
4. Backend returns `clientSecret` for Stripe Elements
5. Frontend confirms payment with Stripe.js
6. Webhook `invoice.paid` triggers agent deployment

**Payout Flow (Host gets paid):**
1. Cron job runs on 1st of month
2. Calculate each host's earnings for previous month
3. Create Stripe Transfer to host's Connect account
4. Record payout in database
5. Email host with payout confirmation

---

## 6. Stripe Configuration

### 6.1 Products & Prices

**Product:** "Agent Hosting"
- Dynamic pricing based on host
- Price created per-host at host registration time
- Metered billing NOT used (fixed monthly)

### 6.2 Webhooks Required

| Event | Handler |
|-------|---------|
| `customer.subscription.created` | Update subscription record |
| `customer.subscription.updated` | Sync status changes |
| `customer.subscription.deleted` | Mark subscription canceled |
| `invoice.paid` | Trigger agent deployment if first payment |
| `invoice.payment_failed` | Mark subscription past_due |
| `account.updated` | Update host's Connect status |
| `transfer.created` | Record payout |
| `transfer.failed` | Mark payout failed, notify host |

---

## 7. Security Considerations

### 7.1 Authentication
- Email/password via better-auth
- Session stored in secure HTTP-only cookie
- CSRF protection via better-auth
- Rate limiting on auth endpoints

### 7.2 Authorization
- All tRPC procedures verify session
- Resource ownership verified before mutations
- Hosts cannot see user agent configs
- Users cannot see host internal data

### 7.3 Data Protection
- Passwords hashed by better-auth (Argon2)
- Sensitive config encrypted at rest (future)
- Stripe handles all payment data (PCI compliant)
- No PII in logs

---

## 8. Third-Party Integrations

| Service | Purpose | Required Env Vars |
|---------|---------|-------------------|
| Supabase | PostgreSQL database | `DATABASE_URL` |
| Stripe | Payments & payouts | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| Stripe Connect | Host payouts | `STRIPE_CONNECT_CLIENT_ID` |
| Tailscale | Secure networking | (host-side only) |
| Vercel | Hosting | (automatic) |

---

## 9. MVP Timeline Estimate

*Timeline assumes AI-driven development with continuous implementation.*

| Phase | Tasks | Estimate |
|-------|-------|----------|
| **Phase 1: Foundation** | Auth pages, dashboard layout, tRPC setup, DB schema | 2-3 hours |
| **Phase 2: Host Flow** | Machine registration, heartbeat API, Stripe Connect | 3-4 hours |
| **Phase 3: Agent Flow** | Browse hosts, deploy wizard, Stripe checkout | 3-4 hours |
| **Phase 4: Dashboard** | Overview pages, status monitoring, role-based views | 2-3 hours |
| **Phase 5: Billing** | Payment methods, invoices, earnings, payout logic | 2-3 hours |
| **Phase 6: Settings** | Profile, security, notifications, account deletion | 1-2 hours |
| **Phase 7: Integration** | Webhooks, error handling, edge cases | 2-3 hours |
| **Phase 8: Polish** | UI refinements, loading states, empty states | 1-2 hours |

**Total:** ~16-24 hours of focused AI development

*Note: Actual calendar time depends on review cycles, testing with real Stripe, and deployment verification. With minimal interruptions, MVP could be production-ready within 1-2 days.*

---

## 10. File Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx (sidebar, auth guard)
│   │   ├── page.tsx (overview)
│   │   ├── hosts/
│   │   │   ├── page.tsx (list)
│   │   │   ├── new/page.tsx (add machine)
│   │   │   └── [id]/page.tsx (details)
│   │   ├── agents/
│   │   │   ├── page.tsx (list)
│   │   │   ├── new/page.tsx (deploy wizard)
│   │   │   └── [id]/page.tsx (details)
│   │   ├── billing/page.tsx
│   │   ├── earnings/page.tsx (hosts only)
│   │   └── settings/page.tsx
│   ├── api/
│   │   ├── auth/[...all]/route.ts
│   │   ├── trpc/[trpc]/route.ts
│   │   └── stripe/webhooks/route.ts
│   ├── page.tsx (landing)
│   ├── pricing/page.tsx
│   └── layout.tsx
├── server/
│   ├── api/
│   │   ├── root.ts
│   │   ├── trpc.ts
│   │   └── routers/
│   │       ├── users.ts
│   │       ├── hosts.ts
│   │       ├── agents.ts
│   │       ├── subscriptions.ts
│   │       ├── billing.ts
│   │       └── payouts.ts
│   ├── auth/index.ts
│   └── stripe/
│       ├── client.ts
│       └── webhooks.ts
├── db/
│   ├── index.ts
│   └── schema.ts
├── lib/
│   ├── auth-client.ts
│   ├── trpc.ts
│   └── utils.ts
└── components/
    ├── ui/ (reusable primitives)
    ├── dashboard/ (dashboard-specific)
    └── forms/ (form components)
```

---

## Next Steps

1. Review and finalize these specs
2. Write detailed page specs (AUTH, DASHBOARD, etc.)
3. Begin implementation phase by phase
