# Agent Deployment Specification

**Parent:** [MVP.md](./MVP.md)  
**Status:** Draft

---

## 1. Overview

Agent management allows users to:
1. Browse available hosts
2. Deploy new agents
3. Monitor agent status
4. Configure agents
5. Stop/start/delete agents
6. Manage subscriptions

---

## 2. Pages

### 2.1 My Agents List

**Route:** `/dashboard/agents`  
**Access:** User role

```
┌─────────────────────────────────────────────────────────────┐
│ My Agents                                [+ Deploy Agent]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ [Search agents...]        [Status: All ▼]             │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                             │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ ┌─────────────────────────────────────────────────┐   │  │
│ │ │ my-assistant                         🟢 Running │   │  │
│ │ │                                                 │   │  │
│ │ │ Hosted by: Sarah K. (San Francisco)             │   │  │
│ │ │ $12/mo • Running since Jan 20                   │   │  │
│ │ │                                                 │   │  │
│ │ │ [View] [Stop] [Configure]                       │   │  │
│ │ └─────────────────────────────────────────────────┘   │  │
│ │                                                       │  │
│ │ ┌─────────────────────────────────────────────────┐   │  │
│ │ │ dev-agent                            🟢 Running │   │  │
│ │ │                                                 │   │  │
│ │ │ Hosted by: Mike L. (Austin)                     │   │  │
│ │ │ $10/mo • Running since Jan 22                   │   │  │
│ │ │                                                 │   │  │
│ │ │ [View] [Stop] [Configure]                       │   │  │
│ │ └─────────────────────────────────────────────────┘   │  │
│ │                                                       │  │
│ │ ┌─────────────────────────────────────────────────┐   │  │
│ │ │ test-agent                           🔴 Stopped │   │  │
│ │ │                                                 │   │  │
│ │ │ No host assigned                                │   │  │
│ │ │ Subscription paused                             │   │  │
│ │ │                                                 │   │  │
│ │ │ [View] [Start] [Delete]                         │   │  │
│ │ └─────────────────────────────────────────────────┘   │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Browse Hosts

**Route:** `/dashboard/browse`  
**Access:** User role

```
┌─────────────────────────────────────────────────────────────┐
│ Browse Hosts                                                │
│ Find the perfect host for your AI agent                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ Filters                                               │  │
│ │ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────┐  │  │
│ │ │Region   │ │Min RAM  │ │Max Price│ │Sort By      │  │  │
│ │ │[Any   ▼]│ │[Any  ▼] │ │[Any  ▼] │ │[Price    ▼] │  │  │
│ │ └─────────┘ └─────────┘ └─────────┘ └─────────────┘  │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                             │
│ 12 hosts available                                          │
│                                                             │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ ┌─────────────────────────────────────────────────┐   │  │
│ │ │ Home Server                         $12/month   │   │  │
│ │ │ by Sarah K. • Member since Jan 2026             │   │  │
│ │ │                                                 │   │  │
│ │ │ 🖥️ 8 cores • 32GB RAM • San Francisco, CA       │   │  │
│ │ │ 📊 99.8% uptime • 15 agents hosted              │   │  │
│ │ │                                                 │   │  │
│ │ │ 3 slots available                               │   │  │
│ │ │                                      [Select]   │   │  │
│ │ └─────────────────────────────────────────────────┘   │  │
│ │                                                       │  │
│ │ ┌─────────────────────────────────────────────────┐   │  │
│ │ │ Cloud Box                           $10/month   │   │  │
│ │ │ by Mike L. • Member since Dec 2025              │   │  │
│ │ │                                                 │   │  │
│ │ │ 🖥️ 4 cores • 16GB RAM • Austin, TX              │   │  │
│ │ │ 📊 98.5% uptime • 8 agents hosted               │   │  │
│ │ │                                                 │   │  │
│ │ │ 2 slots available                               │   │  │
│ │ │                                      [Select]   │   │  │
│ │ └─────────────────────────────────────────────────┘   │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                             │
│ [Load More]                                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 Deploy Agent (Wizard)

**Route:** `/dashboard/agents/new`  
**Access:** User role

```
┌─────────────────────────────────────────────────────────────┐
│ ← Back to Agents                                            │
│                                                             │
│ Deploy a New Agent                                          │
│ Get your AI agent running in minutes                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Step 1 of 3: Agent Details                                  │
│ ════════════════════════════════════════════════════════    │
│                                                             │
│ Agent Name *                                                │
│ ┌─────────────────────────────────────────────────────┐    │
│ │ my-assistant                                        │    │
│ └─────────────────────────────────────────────────────┘    │
│ A name to identify this agent                               │
│                                                             │
│ OpenClaw Version                                            │
│ ┌─────────────────────────────────────────────────────┐    │
│ │ Latest (v2.1.0)                                   ▼ │    │
│ └─────────────────────────────────────────────────────┘    │
│                                                             │
│                                             [Continue →]    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Step 2 of 3: Select Host                                    │
│ ════════════════════════════════════════════════════════    │
│                                                             │
│ Choose a host for your agent                                │
│                                                             │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ ◉ Home Server                         $12/month      │  │
│ │   8 cores • 32GB RAM • San Francisco • 99.8% uptime  │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                             │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ ○ Cloud Box                           $10/month      │  │
│ │   4 cores • 16GB RAM • Austin • 98.5% uptime         │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                             │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ ○ Power Station                       $15/month      │  │
│ │   16 cores • 64GB RAM • New York • 99.9% uptime      │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                             │
│ [Browse all hosts]                                          │
│                                                             │
│                                 [← Back]  [Continue →]      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Step 3 of 3: Review & Pay                                   │
│ ════════════════════════════════════════════════════════    │
│                                                             │
│ Order Summary                                               │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ Agent: my-assistant                                   │  │
│ │ Host: Home Server (Sarah K.)                          │  │
│ │ Location: San Francisco, CA                           │  │
│ │                                                       │  │
│ │ ─────────────────────────────────────────────────     │  │
│ │ Monthly subscription          $12.00/month            │  │
│ │                                                       │  │
│ │ Billed today: $12.00                                  │  │
│ │ Next billing: March 5, 2026                           │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                             │
│ Payment Method                                              │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ [Stripe Card Element]                                 │  │
│ │                                                       │  │
│ │ Card number: 4242 4242 4242 4242                      │  │
│ │ Expiry: 12/28  CVC: 123                               │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                             │
│ □ Save card for future purchases                            │
│                                                             │
│ By deploying, you agree to our Terms of Service             │
│                                                             │
│                         [← Back]  [Deploy Agent - $12.00]   │
└─────────────────────────────────────────────────────────────┘
```

### 2.4 Agent Details

**Route:** `/dashboard/agents/[id]`  
**Access:** Agent owner only

```
┌─────────────────────────────────────────────────────────────┐
│ ← Back to Agents                                            │
│                                                             │
│ my-assistant                    [Stop] [Configure] [Delete] │
│ 🟢 Running • Last active 30 seconds ago                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│ │ Uptime      │  │ Total       │  │ Monthly     │          │
│ │             │  │ Runtime     │  │ Cost        │          │
│ │ 99.9%       │  │ 384 hours   │  │ $12.00      │          │
│ └─────────────┘  └─────────────┘  └─────────────┘          │
│                                                             │
│ Tabs: [Overview] [Logs] [Config] [Subscription]             │
│                                                             │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ Overview                                              │  │
│ ├───────────────────────────────────────────────────────┤  │
│ │ Host:         Home Server (Sarah K.)                  │  │
│ │ Location:     San Francisco, CA                       │  │
│ │ Started:      January 20, 2026 at 2:30 PM             │  │
│ │ Version:      OpenClaw v2.1.0                         │  │
│ │                                                       │  │
│ │ Connection                                            │  │
│ │ ┌─────────────────────────────────────────────────┐  │  │
│ │ │ Gateway URL: wss://xxx.sparebox.dev             │  │  │
│ │ │ Dashboard: https://xxx.sparebox.dev/dashboard   │  │  │
│ │ │                                                 │  │  │
│ │ │ [Copy Gateway URL] [Open Dashboard]             │  │  │
│ │ └─────────────────────────────────────────────────┘  │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────┐
│ Logs (Last 100 lines)                    [Download Full]  │
├───────────────────────────────────────────────────────────┤
│ 2026-02-05 17:00:01 [INFO] Heartbeat sent                 │
│ 2026-02-05 17:00:00 [INFO] Processing message from user   │
│ 2026-02-05 16:59:58 [INFO] Connected to Telegram          │
│ 2026-02-05 16:59:55 [INFO] Gateway started on :18789      │
│ 2026-02-05 16:59:50 [INFO] Loading config from YAML       │
│ ...                                                       │
└───────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────┐
│ Configuration                                   [Edit]    │
├───────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────┐  │
│ │ # openclaw.yaml                                     │  │
│ │ auth:                                               │  │
│ │   provider: anthropic                               │  │
│ │   apiKey: $ANTHROPIC_API_KEY                        │  │
│ │ channels:                                           │  │
│ │   telegram:                                         │  │
│ │     enabled: true                                   │  │
│ │     botToken: $TELEGRAM_BOT_TOKEN                   │  │
│ │ ...                                                 │  │
│ └─────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────┐
│ Subscription                                              │
├───────────────────────────────────────────────────────────┤
│ Status:       Active                                      │
│ Plan:         Monthly ($12/month)                         │
│ Next billing: March 5, 2026                               │
│ Payment:      Visa ending in 4242                         │
│                                                           │
│ [Update Payment Method] [Cancel Subscription]             │
└───────────────────────────────────────────────────────────┘
```

---

## 3. Data Models

### 3.1 Agent (Full)

```typescript
interface Agent {
  id: string;
  userId: string;
  hostId: string | null;
  name: string;
  status: 'pending' | 'deploying' | 'running' | 'stopped' | 'failed';
  config: string | null; // JSON/YAML config
  openclawVersion: string;
  lastActive: Date | null;
  totalUptime: number; // seconds
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  host?: PublicHost | null;
  subscription?: Subscription | null;
  
  // Computed
  gatewayUrl?: string;
  dashboardUrl?: string;
}
```

### 3.2 Agent Status Flow

```
                    ┌─────────┐
         Create     │ pending │
            │       └────┬────┘
            ▼            │
    ┌───────────┐        │ Payment confirmed
    │ deploying │◄───────┘
    └─────┬─────┘
          │
          │ Deploy success
          ▼
    ┌─────────┐     Stop
    │ running │────────────────┐
    └────┬────┘                │
         │                     ▼
         │ Deploy fail    ┌─────────┐
         │                │ stopped │
         ▼                └────┬────┘
    ┌────────┐                 │
    │ failed │                 │ Start
    └────────┘                 ▼
                          ┌───────────┐
                          │ deploying │
                          └───────────┘
```

---

## 4. tRPC Procedures

```typescript
agents: router({
  // List own agents
  list: protectedProcedure
    .input(z.object({
      status: z.enum(['all', 'running', 'stopped', 'failed']).optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.db.query.agents.findMany({
        where: and(
          eq(agents.userId, ctx.user.id),
          input?.status && input.status !== 'all'
            ? eq(agents.status, input.status)
            : undefined
        ),
        with: {
          host: true,
          subscription: true,
        },
        orderBy: [desc(agents.createdAt)],
      });
    }),

  // Get single agent
  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const agent = await ctx.db.query.agents.findFirst({
        where: eq(agents.id, input.id),
        with: {
          host: true,
          subscription: true,
        },
      });
      
      if (!agent || agent.userId !== ctx.user.id) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }
      
      return agent;
    }),

  // Create agent (initiates deployment)
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
      hostId: z.string().uuid(),
      openclawVersion: z.string().optional(),
      config: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify host exists and is available
      const host = await ctx.db.query.hosts.findFirst({
        where: and(
          eq(hosts.id, input.hostId),
          eq(hosts.status, 'active')
        ),
      });
      
      if (!host) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Host not available' });
      }
      
      // Check user doesn't already have max agents
      const existingCount = await ctx.db
        .select({ count: count() })
        .from(agents)
        .where(eq(agents.userId, ctx.user.id));
      
      if (existingCount[0].count >= 10) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Maximum 10 agents allowed' });
      }
      
      // Create agent with pending status
      const [agent] = await ctx.db.insert(agents).values({
        userId: ctx.user.id,
        hostId: input.hostId,
        name: input.name,
        status: 'pending',
        openclawVersion: input.openclawVersion || 'latest',
        config: input.config,
      }).returning();
      
      // Create Stripe subscription
      const subscription = await createSubscription(ctx.user, agent, host);
      
      return {
        agent,
        clientSecret: subscription.latest_invoice.payment_intent.client_secret,
      };
    }),

  // Update agent config
  update: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      name: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/).optional(),
      config: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const agent = await ctx.db.query.agents.findFirst({
        where: eq(agents.id, input.id),
      });
      
      if (!agent || agent.userId !== ctx.user.id) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }
      
      // Update agent
      const [updated] = await ctx.db.update(agents)
        .set({
          name: input.name,
          config: input.config,
          updatedAt: new Date(),
        })
        .where(eq(agents.id, input.id))
        .returning();
      
      // If running, trigger hot reload on host
      if (agent.status === 'running' && input.config) {
        await notifyHostConfigUpdate(agent);
      }
      
      return updated;
    }),

  // Start agent
  start: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const agent = await ctx.db.query.agents.findFirst({
        where: eq(agents.id, input.id),
        with: { subscription: true },
      });
      
      if (!agent || agent.userId !== ctx.user.id) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }
      
      if (agent.status === 'running') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Agent already running' });
      }
      
      if (!agent.subscription || agent.subscription.status !== 'active') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Active subscription required' });
      }
      
      // Set to deploying
      await ctx.db.update(agents)
        .set({ status: 'deploying', updatedAt: new Date() })
        .where(eq(agents.id, input.id));
      
      // Notify host to start agent
      await notifyHostStartAgent(agent);
      
      return { success: true };
    }),

  // Stop agent
  stop: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const agent = await ctx.db.query.agents.findFirst({
        where: eq(agents.id, input.id),
      });
      
      if (!agent || agent.userId !== ctx.user.id) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }
      
      if (agent.status !== 'running') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Agent not running' });
      }
      
      // Notify host to stop agent
      await notifyHostStopAgent(agent);
      
      // Update status
      await ctx.db.update(agents)
        .set({ status: 'stopped', updatedAt: new Date() })
        .where(eq(agents.id, input.id));
      
      return { success: true };
    }),

  // Delete agent
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const agent = await ctx.db.query.agents.findFirst({
        where: eq(agents.id, input.id),
        with: { subscription: true },
      });
      
      if (!agent || agent.userId !== ctx.user.id) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }
      
      // Stop if running
      if (agent.status === 'running') {
        await notifyHostStopAgent(agent);
      }
      
      // Cancel subscription
      if (agent.subscription?.stripeSubscriptionId) {
        await stripe.subscriptions.cancel(agent.subscription.stripeSubscriptionId);
      }
      
      // Delete subscription record
      await ctx.db.delete(subscriptions).where(eq(subscriptions.agentId, input.id));
      
      // Delete agent
      await ctx.db.delete(agents).where(eq(agents.id, input.id));
      
      return { success: true };
    }),

  // Get agent logs (placeholder for MVP)
  getLogs: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      lines: z.number().int().min(1).max(1000).default(100),
    }))
    .query(async ({ ctx, input }) => {
      const agent = await ctx.db.query.agents.findFirst({
        where: eq(agents.id, input.id),
      });
      
      if (!agent || agent.userId !== ctx.user.id) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }
      
      // MVP: Return placeholder or fetch from host
      // Future: Stream logs from host via WebSocket
      return {
        logs: [
          { timestamp: new Date(), level: 'info', message: 'Agent started' },
          // ...
        ],
      };
    }),
})
```

---

## 5. Deployment Flow

### 5.1 Happy Path

```
1. User fills agent details (name, version)
2. User selects host
3. User reviews order
4. User enters payment info
5. Frontend calls agents.create()
6. Backend creates agent (status: pending)
7. Backend creates Stripe subscription (incomplete)
8. Backend returns clientSecret
9. Frontend confirms payment with Stripe.js
10. Stripe webhook: invoice.paid
11. Backend updates subscription status
12. Backend sends deploy command to host
13. Host downloads and starts OpenClaw
14. Host reports agent running
15. Backend updates agent status
16. User sees agent running in dashboard
```

### 5.2 Error Scenarios

| Error | Handling |
|-------|----------|
| Host becomes unavailable during checkout | Show error, suggest alternative hosts |
| Payment fails | Agent stays pending, subscription marked past_due |
| Host fails to deploy | Agent marked failed, notify user, offer refund |
| Config validation fails | Show errors, don't charge user |

---

## 6. Subscription Management

### 6.1 Stripe Subscription Model

```typescript
// Per-agent subscription
const subscription = await stripe.subscriptions.create({
  customer: user.stripeCustomerId,
  items: [{
    price_data: {
      currency: 'usd',
      product: AGENT_HOSTING_PRODUCT_ID,
      unit_amount: host.pricePerMonth,
      recurring: { interval: 'month' },
    },
  }],
  payment_behavior: 'default_incomplete',
  payment_settings: {
    save_default_payment_method: 'on_subscription',
  },
  metadata: {
    agentId: agent.id,
    hostId: host.id,
    userId: user.id,
  },
  expand: ['latest_invoice.payment_intent'],
});
```

### 6.2 Webhook Events

| Event | Action |
|-------|--------|
| `invoice.paid` | Deploy agent if first payment, or continue service |
| `invoice.payment_failed` | Mark subscription past_due, email user |
| `customer.subscription.updated` | Sync status to DB |
| `customer.subscription.deleted` | Stop agent, mark subscription canceled |

---

## 7. Validation Rules

### 7.1 Agent Creation

| Field | Rules |
|-------|-------|
| name | Required, 1-50 chars, lowercase alphanumeric + hyphens, unique per user |
| hostId | Required, must be active host with capacity |
| config | Optional, valid YAML, no sensitive keys in plain text |

### 7.2 Business Rules

- User can have max 10 agents
- Agent name must be unique per user
- Cannot delete running agent (must stop first)
- Cannot change host after creation (would need new subscription)

---

## 8. Security Considerations

### 8.1 Config Handling

- Configs stored encrypted at rest (future)
- Sensitive values (API keys) should use env vars
- Config visible only to agent owner
- Host cannot read agent configs

### 8.2 Access Control

- Users can only see/manage their own agents
- Hosts see only agent IDs and resource usage
- No cross-user agent access

---

## 9. Testing Scenarios

| Scenario | Expected |
|----------|----------|
| Create agent successfully | Agent created, payment processed, deployed |
| Create agent with invalid name | Validation error |
| Create agent when host is full | Error: host at capacity |
| Payment fails during creation | Agent pending, subscription past_due |
| Stop running agent | Agent stopped, subscription continues |
| Start stopped agent | Agent redeployed |
| Delete agent with active subscription | Subscription canceled, agent deleted |
| View agent as non-owner | 404 |
| Update config while running | Hot reload triggered |
