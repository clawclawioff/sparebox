# Host Management Specification

**Parent:** [MVP.md](./MVP.md)  
**Status:** Draft

---

## 1. Overview

Host management allows hardware owners to:
1. Register new machines
2. View and manage existing machines
3. Monitor hosted agents
4. Track earnings per machine
5. Connect Stripe for payouts

---

## 2. Pages

### 2.1 My Machines List

**Route:** `/dashboard/hosts`  
**Access:** Host role only

```
┌─────────────────────────────────────────────────────────────┐
│ My Machines                            [+ Add Machine]      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ [Search machines...]        [Filter: All ▼]           │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                             │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ ┌─────────────────────────────────────────────────┐   │  │
│ │ │ 🟢 Home Server                                  │   │  │
│ │ │                                                 │   │  │
│ │ │ 8 cores • 32GB RAM • San Francisco, CA          │   │  │
│ │ │ $12/mo • 3 agents hosted • 99.8% uptime         │   │  │
│ │ │                                                 │   │  │
│ │ │ Last heartbeat: 2 minutes ago                   │   │  │
│ │ │                                        [Manage] │   │  │
│ │ └─────────────────────────────────────────────────┘   │  │
│ │                                                       │  │
│ │ ┌─────────────────────────────────────────────────┐   │  │
│ │ │ 🟢 Office Laptop                                │   │  │
│ │ │                                                 │   │  │
│ │ │ 4 cores • 16GB RAM • Austin, TX                 │   │  │
│ │ │ $10/mo • 2 agents hosted • 98.5% uptime         │   │  │
│ │ │                                                 │   │  │
│ │ │ Last heartbeat: 5 minutes ago                   │   │  │
│ │ │                                        [Manage] │   │  │
│ │ └─────────────────────────────────────────────────┘   │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Add Machine

**Route:** `/dashboard/hosts/new`  
**Access:** Host role only

```
┌─────────────────────────────────────────────────────────────┐
│ ← Back to Machines                                          │
│                                                             │
│ Add a New Machine                                           │
│ Register your hardware to start hosting AI agents           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Step 1 of 3: Machine Details                                │
│ ════════════════════════════════════════════════════════    │
│                                                             │
│ Machine Name *                                              │
│ ┌─────────────────────────────────────────────────────┐    │
│ │ Home Server                                         │    │
│ └─────────────────────────────────────────────────────┘    │
│ A friendly name to identify this machine                    │
│                                                             │
│ Description                                                 │
│ ┌─────────────────────────────────────────────────────┐    │
│ │ My home server running Ubuntu 22.04                 │    │
│ │                                                     │    │
│ └─────────────────────────────────────────────────────┘    │
│                                                             │
│ Hardware Specifications                                     │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────┐    │
│ │ CPU Cores       │ │ RAM (GB)        │ │ Storage(GB) │    │
│ │ [8        ▼]    │ │ [32       ▼]    │ │ [256    ▼]  │    │
│ └─────────────────┘ └─────────────────┘ └─────────────┘    │
│                                                             │
│ Operating System                                            │
│ ┌─────────────────────────────────────────────────────┐    │
│ │ Ubuntu 22.04 LTS                                    │    │
│ └─────────────────────────────────────────────────────┘    │
│                                                             │
│                                             [Continue →]    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Step 2 of 3: Location & Pricing                             │
│ ════════════════════════════════════════════════════════    │
│                                                             │
│ Location                                                    │
│ This helps users find nearby hosts for lower latency        │
│                                                             │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────┐    │
│ │ Country         │ │ Region/State    │ │ City        │    │
│ │ [United Sta ▼]  │ │ [California ▼]  │ │ [San Fran]  │    │
│ └─────────────────┘ └─────────────────┘ └─────────────┘    │
│                                                             │
│ Monthly Price *                                             │
│ ┌─────────────────────────────────────────────────────┐    │
│ │ $  12.00                                            │    │
│ └─────────────────────────────────────────────────────┘    │
│ You'll receive 60% ($7.20) per subscription                 │
│                                                             │
│ Suggested pricing based on specs: $10 - $15/month           │
│                                                             │
│                                 [← Back]  [Continue →]      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Step 3 of 3: Install Host Agent                             │
│ ════════════════════════════════════════════════════════    │
│                                                             │
│ Install our lightweight agent software on your machine      │
│ to start accepting AI agent deployments.                    │
│                                                             │
│ Run this command on your machine:                           │
│ ┌─────────────────────────────────────────────────────┐    │
│ │ curl -fsSL https://sparebox.dev/install | sh        │ 📋 │
│ └─────────────────────────────────────────────────────┘    │
│                                                             │
│ After installation, enter the registration token:           │
│ ┌─────────────────────────────────────────────────────┐    │
│ │ sbx_reg_xxxxxxxxxxxxxxxxxxxxx                       │ 📋 │
│ └─────────────────────────────────────────────────────┘    │
│                                                             │
│ ⏳ Waiting for connection...                                │
│                                                             │
│ ┌─────────────────────────────────────────────────────┐    │
│ │ ℹ️  The agent will:                                  │    │
│ │ • Run in a Docker container                         │    │
│ │ • Use Tailscale for secure networking               │    │
│ │ • Auto-update to latest version                     │    │
│ │ • Report health metrics every 60 seconds            │    │
│ └─────────────────────────────────────────────────────┘    │
│                                                             │
│                                 [← Back]  [Skip for Now]    │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 Machine Details

**Route:** `/dashboard/hosts/[id]`  
**Access:** Machine owner only

```
┌─────────────────────────────────────────────────────────────┐
│ ← Back to Machines                                          │
│                                                             │
│ Home Server                              [Edit] [Delete]    │
│ 🟢 Online • Last heartbeat 2 min ago                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│ │ Hosted      │  │ Earnings    │  │ Uptime      │          │
│ │ Agents      │  │ (This Month)│  │             │          │
│ │ 3           │  │ $21.60      │  │ 99.8%       │          │
│ └─────────────┘  └─────────────┘  └─────────────┘          │
│                                                             │
│ ┌─────────────────────────────────────────────────────┐    │
│ │ Machine Info                                        │    │
│ ├─────────────────────────────────────────────────────┤    │
│ │ Specs:    8 cores • 32GB RAM • 256GB Storage        │    │
│ │ OS:       Ubuntu 22.04 LTS                          │    │
│ │ Location: San Francisco, CA                         │    │
│ │ Price:    $12.00/month (you receive $7.20)          │    │
│ │ Added:    January 15, 2026                          │    │
│ └─────────────────────────────────────────────────────┘    │
│                                                             │
│ ┌─────────────────────────────────────────────────────┐    │
│ │ System Metrics                        (Last 24h)    │    │
│ ├─────────────────────────────────────────────────────┤    │
│ │ CPU Usage:    ████████░░ 78%                        │    │
│ │ RAM Usage:    ██████░░░░ 62%                        │    │
│ │ Disk Usage:   ████░░░░░░ 45%                        │    │
│ └─────────────────────────────────────────────────────┘    │
│                                                             │
│ ┌─────────────────────────────────────────────────────┐    │
│ │ Hosted Agents                                       │    │
│ ├─────────────────────────────────────────────────────┤    │
│ │ Agent ID      │ Status   │ Started    │ Earnings   │    │
│ ├─────────────────────────────────────────────────────┤    │
│ │ agent_xxx...  │ 🟢 Running│ Jan 20     │ $7.20/mo   │    │
│ │ agent_yyy...  │ 🟢 Running│ Jan 22     │ $7.20/mo   │    │
│ │ agent_zzz...  │ 🟢 Running│ Feb 1      │ $7.20/mo   │    │
│ └─────────────────────────────────────────────────────┘    │
│ Note: Agent details are private to their owners             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Data Models

### 3.1 Host (Full - for owner)

```typescript
interface Host {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  status: 'pending' | 'active' | 'inactive' | 'suspended';
  
  // Hardware
  cpuCores: number;
  ramGb: number;
  storageGb: number;
  osInfo: string | null;
  
  // Location
  region: string | null;
  country: string | null;
  city: string | null;
  
  // Business
  pricePerMonth: number; // cents
  
  // Networking
  tailscaleIp: string | null;
  lastHeartbeat: Date | null;
  
  // Stats
  uptimePercent: number;
  totalEarnings: number; // cents
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  
  // Computed
  hostedAgentCount?: number;
  currentMonthEarnings?: number;
}
```

### 3.2 PublicHost (for browsing)

```typescript
interface PublicHost {
  id: string;
  name: string;
  description: string | null;
  
  // Hardware (public)
  cpuCores: number;
  ramGb: number;
  storageGb: number;
  
  // Location (public)
  region: string | null;
  country: string | null;
  city: string | null;
  
  // Business (public)
  pricePerMonth: number;
  
  // Stats (public)
  uptimePercent: number;
  
  // Availability
  availableSlots: number; // derived from capacity
  
  // Owner info (limited)
  owner: {
    name: string;
    joinedAt: Date;
    totalHostedAgents: number; // historical trust indicator
  };
}
```

---

## 4. tRPC Procedures

```typescript
hosts: router({
  // List own hosts (host role)
  list: protectedProcedure
    .use(requireRole('host'))
    .query(async ({ ctx }) => {
      return ctx.db.query.hosts.findMany({
        where: eq(hosts.userId, ctx.user.id),
        orderBy: [desc(hosts.createdAt)],
      });
    }),

  // List available hosts for deployment (user role)
  listAvailable: protectedProcedure
    .input(z.object({
      region: z.string().optional(),
      minRam: z.number().optional(),
      maxPrice: z.number().optional(),
      sortBy: z.enum(['price', 'uptime', 'ram']).default('price'),
    }).optional())
    .query(async ({ ctx, input }) => {
      // Only return active hosts with capacity
      // Hide sensitive fields
      // Apply filters
    }),

  // Get single host (owner only sees full details)
  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const host = await ctx.db.query.hosts.findFirst({
        where: eq(hosts.id, input.id),
      });
      
      if (!host) throw new TRPCError({ code: 'NOT_FOUND' });
      
      // If owner, return full host
      // If not owner but active, return PublicHost
      // If not owner and inactive, NOT_FOUND
    }),

  // Create new host
  create: protectedProcedure
    .use(requireRole('host'))
    .input(z.object({
      name: z.string().min(1).max(100),
      description: z.string().max(500).optional(),
      cpuCores: z.number().int().min(1).max(128),
      ramGb: z.number().int().min(4).max(1024),
      storageGb: z.number().int().min(10).max(10000),
      osInfo: z.string().max(100).optional(),
      country: z.string().length(2).optional(), // ISO code
      region: z.string().max(100).optional(),
      city: z.string().max(100).optional(),
      pricePerMonth: z.number().int().min(500).max(10000), // $5-$100
    }))
    .mutation(async ({ ctx, input }) => {
      // Create host with status 'pending'
      // Generate registration token
      // Return host + token
    }),

  // Update host
  update: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      name: z.string().min(1).max(100).optional(),
      description: z.string().max(500).optional(),
      pricePerMonth: z.number().int().min(500).max(10000).optional(),
      status: z.enum(['active', 'inactive']).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      // Update allowed fields only
      // Cannot change specs after creation (would need re-verification)
    }),

  // Delete host
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      // Check no active agents
      // Soft delete or hard delete?
    }),

  // Heartbeat from host agent software
  heartbeat: protectedProcedure
    .input(z.object({
      hostId: z.string().uuid(),
      metrics: z.object({
        cpuUsage: z.number().min(0).max(100),
        ramUsage: z.number().min(0).max(100),
        diskUsage: z.number().min(0).max(100),
        agentCount: z.number().int().min(0),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      // Update lastHeartbeat
      // Store metrics in heartbeat table
      // If first heartbeat, set status to 'active'
    }),

  // Get registration token (for adding new machine)
  getRegistrationToken: protectedProcedure
    .input(z.object({ hostId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Verify ownership
      // Generate or retrieve token
      // Token expires in 24h
    }),
})
```

---

## 5. Host Agent Software

### 5.1 Installation

The host agent is a lightweight daemon that:
- Runs in Docker
- Connects to Sparebox via Tailscale
- Reports health metrics
- Manages agent container lifecycle

**MVP: Manual installation with install script**
**Future: One-click installers for Windows/Mac/Linux**

### 5.2 Registration Flow

```
1. Host creates machine in dashboard
2. Dashboard shows registration token
3. Host runs install script on machine
4. Script prompts for token
5. Agent registers with Sparebox API
6. Dashboard shows "connected" status
7. Host can now receive agent deployments
```

### 5.3 Heartbeat Protocol

```typescript
// Every 60 seconds, host agent sends:
POST /api/hosts/heartbeat
{
  "hostId": "xxx",
  "metrics": {
    "cpuUsage": 45.2,
    "ramUsage": 62.1,
    "diskUsage": 34.5,
    "agentCount": 3
  }
}

// Response:
{
  "ok": true,
  "commands": [] // Future: remote commands
}
```

### 5.4 Offline Detection

- Host marked "offline" if no heartbeat for 5 minutes
- Dashboard shows warning if no heartbeat for 2 minutes
- Email host if offline for 30+ minutes (future)

---

## 6. Stripe Connect Setup

### 6.1 Onboarding Flow

```
1. Host clicks "Set up payouts" in Earnings page
2. Backend creates Stripe Connect Express account
3. Redirect to Stripe hosted onboarding
4. Stripe redirects back with account status
5. Store account ID in user record
6. Host can now receive payouts
```

### 6.2 tRPC Procedure

```typescript
payouts: router({
  // Initiate Stripe Connect onboarding
  connectStripe: protectedProcedure
    .use(requireRole('host'))
    .mutation(async ({ ctx }) => {
      // Check if already connected
      if (ctx.user.stripeConnectAccountId) {
        // Return account link for updating
      }
      
      // Create Express account
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US', // or from user profile
        email: ctx.user.email,
        capabilities: {
          transfers: { requested: true },
        },
      });
      
      // Save account ID
      await ctx.db.update(user)
        .set({ stripeConnectAccountId: account.id })
        .where(eq(user.id, ctx.user.id));
      
      // Create account link
      const link = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: `${BASE_URL}/dashboard/earnings?refresh=true`,
        return_url: `${BASE_URL}/dashboard/earnings?success=true`,
        type: 'account_onboarding',
      });
      
      return { url: link.url };
    }),
    
  // Check Connect account status
  getConnectStatus: protectedProcedure
    .use(requireRole('host'))
    .query(async ({ ctx }) => {
      if (!ctx.user.stripeConnectAccountId) {
        return { connected: false };
      }
      
      const account = await stripe.accounts.retrieve(
        ctx.user.stripeConnectAccountId
      );
      
      return {
        connected: true,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
      };
    }),
})
```

---

## 7. Validation Rules

### 7.1 Machine Creation

| Field | Rules |
|-------|-------|
| name | Required, 1-100 chars, unique per user |
| description | Optional, max 500 chars |
| cpuCores | Required, 1-128 |
| ramGb | Required, 4-1024 |
| storageGb | Required, 10-10000 |
| osInfo | Optional, max 100 chars |
| country | Optional, ISO 3166-1 alpha-2 |
| region | Optional, max 100 chars |
| city | Optional, max 100 chars |
| pricePerMonth | Required, $5-$100 |

### 7.2 Business Rules

- Host can have max 10 machines (MVP limit)
- Machine cannot be deleted if hosting active agents
- Price cannot be changed if machine has active subscriptions (or requires notification)
- Machine must have valid heartbeat within 24h to be listed as "available"

---

## 8. Error Handling

| Error | User Message | Action |
|-------|-------------|--------|
| Duplicate machine name | "You already have a machine with this name" | Highlight field |
| Price too low | "Minimum price is $5/month" | Highlight field |
| Delete with active agents | "This machine has active agents. Please wait for them to be migrated." | Show which agents |
| Stripe Connect failed | "Payment setup failed. Please try again." | Retry button |
| Heartbeat timeout | "Machine appears offline" | Show last seen, troubleshooting tips |

---

## 9. Testing Scenarios

| Scenario | Expected |
|----------|----------|
| Create first machine | Success, redirect to install step |
| Create machine without required fields | Validation errors shown |
| Create 11th machine | Error: limit reached |
| View machine as non-owner | 404 or public view only |
| Delete machine with agents | Error with agent list |
| Heartbeat after 5 min gap | Status changes to online |
| No heartbeat for 6 min | Status changes to offline |
| Complete Stripe Connect | Payouts enabled shown |
| Cancel Stripe Connect mid-flow | Return to earnings page, retry available |
