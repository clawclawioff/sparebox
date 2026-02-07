# Sparebox Security & Code Audit Report

**Audit Date:** February 6, 2026  
**Auditor:** Claude (AI Assistant)  
**Application:** Sparebox - P2P AI Agent Hosting Marketplace  
**Stack:** Next.js 16 + better-auth + tRPC + Drizzle + Supabase Postgres + Stripe

---

## Executive Summary

The Sparebox codebase is well-structured with good separation of concerns. However, there are several security and business logic issues that need to be addressed before allowing real users, particularly around:
- Rate limiting on auth endpoints
- Missing duplicate agent/host prevention
- Incomplete subscription lifecycle handling
- Some authorization gaps

**Risk Rating:** MEDIUM-HIGH (several issues need fixing before beta)

---

## Table of Contents

1. [Critical Issues](#1-critical-issues)
2. [High Priority Issues](#2-high-priority-issues)
3. [Medium Priority Issues](#3-medium-priority-issues)
4. [Low Priority Issues](#4-low-priority-issues)
5. [Missing Features](#5-missing-features)
6. [Positive Findings](#6-positive-findings)

---

## 1. Critical Issues

### 1.1 ❌ No Rate Limiting on Authentication Endpoints
**Severity:** CRITICAL  
**File:** `src/app/api/auth/[...all]/route.ts`, `src/server/auth/index.ts`  
**Description:** There is no rate limiting on login, signup, password reset, or any auth endpoints. This allows brute-force attacks on user accounts and abuse of email sending (password reset spam).  

**Impact:**
- Brute-force password attacks
- Account enumeration via timing attacks
- Email service abuse (Resend quota exhaustion)
- Denial of service

**Suggested Fix:**
```typescript
// Add rate limiting middleware using Upstash Rate Limit or similar
// In src/server/auth/index.ts or middleware.ts

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "1 m"), // 10 requests per minute
});

// Apply to auth endpoints:
// - /api/auth/sign-in: 5/min
// - /api/auth/sign-up: 3/min  
// - /api/auth/request-password-reset: 3/hour
```

---

### 1.2 ❌ Hosts Can Be Created by Any Authenticated User
**Severity:** CRITICAL  
**File:** `src/server/api/routers/hosts.ts` (line 35)  
**Description:** The `hosts.create` mutation uses `protectedProcedure` instead of `hostProcedure`. This means ANY authenticated user (including those with "user" role) can create a host machine. This breaks the role-based access model.

**Current Code:**
```typescript
create: protectedProcedure
  .input(...)
  .mutation(async ({ ctx, input }) => {
```

**Suggested Fix:**
```typescript
create: hostProcedure
  .input(...)
  .mutation(async ({ ctx, input }) => {
```

**Note:** Also consider: should creating a host automatically set the user's role to "host" if they're currently "user"? Or reject the request?

---

### 1.3 ❌ Agents Can Be Created Without Payment
**Severity:** CRITICAL  
**File:** `src/server/api/routers/agents.ts` (create mutation)  
**Description:** The `agents.create` mutation creates an agent and subscription directly without going through Stripe checkout. This bypasses payment entirely. Users can deploy unlimited agents for free.

The correct flow (via `billing.createCheckoutSession`) exists but the direct `agents.create` is also exposed.

**Suggested Fix:**
Remove or restrict the `agents.create` mutation, or add payment verification:
```typescript
// Option 1: Remove agents.create entirely (force Stripe checkout flow)
// Option 2: Restrict to admin only
create: adminProcedure.input(...).mutation(...)
// Option 3: Add validation that a valid payment exists
```

---

### 1.4 ❌ Database Credentials Exposed in .env.local
**Severity:** CRITICAL  
**File:** `.env.local`  
**Description:** The `.env.local` file contains the raw DATABASE_URL with password: `postgresql://postgres.rizexinkhymmctaoqkgg:2qNVkORjhSEKeNWy@...`. While `.env.local` is gitignored, this is a production credential that was visible in the audit.

**Impact:** If this file is accidentally committed or exposed, full database access is compromised.

**Suggested Fix:**
1. Rotate the database password immediately
2. Use Vercel environment variables only (don't store in local files)
3. Add `.env*.local` to `.gitignore` if not already

---

## 2. High Priority Issues

### 2.1 ⚠️ No Idempotency on Agent Creation from Webhook
**Severity:** HIGH  
**File:** `src/app/api/stripe/webhooks/route.ts` (handleCheckoutCompleted)  
**Description:** While there IS an idempotency check for `stripeSubscriptionId`, the check happens AFTER we query the host. If two webhooks fire simultaneously (race condition), both could pass the check and create duplicate agents.

**Suggested Fix:**
Use a database transaction with a unique constraint:
```typescript
// Add unique constraint on subscriptions.stripeSubscriptionId
// Use a transaction with ON CONFLICT DO NOTHING
await db.transaction(async (tx) => {
  const existing = await tx.query.subscriptions.findFirst({...});
  if (existing) return; // Already processed
  // ... create agent and subscription
});
```

---

### 2.2 ⚠️ Role Change Logic Has Security Flaw
**Severity:** HIGH  
**File:** `src/server/api/routers/users.ts` (setRole mutation)  
**Description:** The `setRole` mutation allows users to change their role from "user" to "host", but:
1. Once a user has "host" role, they cannot switch back to "user" (intentional)
2. BUT: A host can access user features via admin bypass in role checks

However, the main flaw: the check `if (currentUser.role !== "user")` prevents changing roles, but a malicious user could potentially call this right after signup before the role is set to "host".

**Suggested Fix:**
```typescript
// Add rate limiting on setRole
// Add a "roleSetAt" timestamp to prevent multiple calls
// Consider removing setRole entirely and handling via Stripe Connect onboarding
```

---

### 2.3 ⚠️ Subscription Cancellation Doesn't Stop Agent
**Severity:** HIGH  
**File:** `src/app/api/stripe/webhooks/route.ts` (handleSubscriptionDeleted)  
**Description:** When a subscription is canceled, the code only updates the subscription status to "canceled". The agent continues running indefinitely.

**Current Code:**
```typescript
async function handleSubscriptionDeleted(subscription: any) {
  await db.update(subscriptions)
    .set({ status: "canceled", canceledAt: new Date() })
    .where(eq(subscriptions.stripeSubscriptionId, subscription.id));
  // Missing: Stop the actual agent
}
```

**Suggested Fix:**
```typescript
async function handleSubscriptionDeleted(subscription: any) {
  const [sub] = await db.update(subscriptions)
    .set({ status: "canceled", canceledAt: new Date() })
    .where(eq(subscriptions.stripeSubscriptionId, subscription.id))
    .returning();
  
  if (sub) {
    // Stop the agent
    await db.update(agents)
      .set({ status: "stopped", updatedAt: new Date() })
      .where(eq(agents.id, sub.agentId));
    // TODO: Send stop command to actual host
    // TODO: Notify host that agent is removed
  }
}
```

---

### 2.4 ⚠️ Missing Index on Frequently Queried Columns
**Severity:** HIGH  
**File:** `src/db/schema.ts`  
**Description:** Several columns that are frequently used in WHERE clauses lack indexes:
- `agents.userId` - used in `agents.list`
- `hosts.userId` - used in `hosts.list`
- `hosts.status` - used in `hosts.listAvailable`
- `subscriptions.stripeSubscriptionId` - used in webhook handlers
- `subscriptions.hostId` - used in earnings queries

**Suggested Fix:**
```typescript
// In schema.ts, add indexes:
export const agentsUserIdIdx = index("agents_user_id_idx").on(agents.userId);
export const hostsUserIdIdx = index("hosts_user_id_idx").on(hosts.userId);
export const hostsStatusIdx = index("hosts_status_idx").on(hosts.status);
export const subsStripeIdIdx = index("subs_stripe_id_idx").on(subscriptions.stripeSubscriptionId);
export const subsHostIdIdx = index("subs_host_id_idx").on(subscriptions.hostId);
```

---

### 2.5 ⚠️ No Duplicate Agent Name Prevention
**Severity:** HIGH  
**File:** `src/server/api/routers/agents.ts`, `src/app/api/stripe/webhooks/route.ts`  
**Description:** Users can create multiple agents with the same name. This causes confusion and could lead to errors when agents are referenced by name in the host agent software.

**Suggested Fix:**
Add a unique constraint on `(userId, name)`:
```typescript
// In schema.ts
export const agentNameIdx = uniqueIndex("agents_user_name_idx").on(agents.userId, agents.name);

// In agents.create, catch the unique violation error
```

---

## 3. Medium Priority Issues

### 3.1 🔶 TRPCError Doesn't Use Proper Codes Consistently
**Severity:** MEDIUM  
**File:** Multiple routers  
**Description:** Some routers throw generic `Error` instead of `TRPCError`, and some use inconsistent error codes.

**Examples:**
```typescript
// agents.ts - Uses generic Error
throw new Error("Agent not found");  // Should be TRPCError({ code: "NOT_FOUND" })

// billing.ts - Uses generic Error
throw new Error("Host not available"); // Should be TRPCError({ code: "BAD_REQUEST" })
```

**Suggested Fix:**
```typescript
import { TRPCError } from "@trpc/server";

throw new TRPCError({ code: "NOT_FOUND", message: "Agent not found" });
throw new TRPCError({ code: "BAD_REQUEST", message: "Host not available" });
```

---

### 3.2 🔶 Billing Page is Not Wired to Real Data
**Severity:** MEDIUM  
**File:** `src/app/dashboard/billing/page.tsx`  
**Description:** The billing page shows hardcoded "$0.00" and doesn't fetch actual subscription data. It should show:
- Active subscriptions from tRPC
- Payment methods from Stripe
- Billing history from Stripe

**Current Code:**
```typescript
<span className="text-3xl font-bold text-foreground">$0.00</span>
<span className="text-muted-foreground">0 active subscriptions</span>
```

**Suggested Fix:**
Create a new tRPC router for user billing:
```typescript
// billing.router.ts
getMySubscriptions: userProcedure.query(async ({ ctx }) => {
  return ctx.db.query.subscriptions.findMany({
    where: eq(subscriptions.userId, ctx.user.id),
    with: { agent: true, host: true }
  });
});
```

---

### 3.3 🔶 Host Deletion Doesn't Handle Active Agents
**Severity:** MEDIUM  
**File:** `src/server/api/routers/hosts.ts` (delete mutation)  
**Description:** A host can be deleted even if it has active agents running on it. This would leave agents orphaned.

**Current Code:**
```typescript
delete: protectedProcedure
  .input(z.object({ id: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    // Only checks ownership, not active agents
    await ctx.db.delete(hosts).where(eq(hosts.id, input.id));
  });
```

**Suggested Fix:**
```typescript
delete: hostProcedure
  .input(z.object({ id: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    // Check for active agents first
    const activeAgents = await ctx.db.query.agents.findMany({
      where: and(
        eq(agents.hostId, input.id),
        inArray(agents.status, ['running', 'deploying', 'pending'])
      )
    });
    
    if (activeAgents.length > 0) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Cannot delete host with active agents. Stop or migrate agents first."
      });
    }
    
    await ctx.db.delete(hosts).where(eq(hosts.id, input.id));
  });
```

---

### 3.4 🔶 No CSRF Protection on Password Change/Delete Account
**Severity:** MEDIUM  
**File:** `src/app/dashboard/settings/page.tsx`  
**Description:** Password change and account deletion are handled via direct fetch to `/api/auth/change-password` and `/api/auth/delete-user`. While better-auth likely has session cookie validation, the client-side code should include CSRF tokens for defense in depth.

**Suggested Fix:**
Use better-auth's built-in CSRF protection or add custom tokens:
```typescript
// Include CSRF token from session
const res = await fetch("/api/auth/change-password", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-CSRF-Token": csrfToken, // Get from session
  },
  body: JSON.stringify({...}),
});
```

---

### 3.5 🔶 No Security Headers in Next.js Config
**Severity:** MEDIUM  
**File:** `next.config.ts`  
**Description:** The Next.js config is empty. Missing security headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy`

**Suggested Fix:**
```typescript
// next.config.ts
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { 
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://api.stripe.com https://*.supabase.co;"
          },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        ],
      },
    ];
  },
};
```

---

### 3.6 🔶 JSON-LD Script Uses dangerouslySetInnerHTML
**Severity:** MEDIUM  
**File:** `src/app/blog/[slug]/page.tsx`  
**Description:** The JSON-LD structured data is rendered using `dangerouslySetInnerHTML`. While the data comes from frontmatter (trusted), if blog authors can input arbitrary content, this could be an XSS vector.

**Current Code:**
```tsx
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
/>
```

**Suggested Fix:**
Sanitize the frontmatter fields or use Next.js's built-in metadata generation:
```typescript
// In generateMetadata, use the other property for JSON-LD
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return {
    ...metadata,
    other: {
      "application/ld+json": JSON.stringify(jsonLd),
    },
  };
}
```

---

### 3.7 🔶 Agent Details Page Shows Fabricated Data
**Severity:** MEDIUM  
**File:** `src/app/dashboard/agents/[id]/page.tsx`  
**Description:** Several values are hardcoded rather than fetched from real data:
- Uptime: "99.9%" (hardcoded)
- Monthly cost: "$12.00" (hardcoded)
- Gateway URL: Uses hardcoded pattern that may not exist

**Suggested Fix:**
Calculate uptime from heartbeats, get cost from subscription, and use actual deployment URLs.

---

## 4. Low Priority Issues

### 4.1 📌 Unused Import in users.ts
**Severity:** LOW  
**File:** `src/server/api/routers/users.ts`  
**Description:** `publicProcedure` is imported but never used.

```typescript
import { router, protectedProcedure, publicProcedure } from "../trpc";
                                      ^^^^^^^^^^^^^^^^^ unused
```

---

### 4.2 📌 Console.log Statements in Production
**Severity:** LOW  
**File:** Multiple files (webhook handlers, signup page)  
**Description:** Several files use `console.log` and `console.error` for logging. In production, these should use a proper logging service.

**Examples:**
- `src/app/api/stripe/webhooks/route.ts`: 20+ console.log calls
- `src/app/(auth)/signup/page.tsx`: `console.error("Failed to set role:", roleError)`

---

### 4.3 📌 Magic Numbers in Code
**Severity:** LOW  
**File:** `src/server/api/routers/billing.ts`, webhook handlers  
**Description:** The 40% platform fee is hardcoded in multiple places:
- `billing.ts`: `const APPLICATION_FEE_PERCENT = 40;`
- `webhooks/route.ts`: `Math.round(host.pricePerMonth * 0.4)`
- `agents.ts`: `Math.round(host.pricePerMonth * 0.4)`

**Suggested Fix:**
Create a constants file:
```typescript
// src/lib/constants.ts
export const PLATFORM_FEE_PERCENT = 40;
export const HOST_PAYOUT_PERCENT = 60;
```

---

### 4.4 📌 Missing Error Boundaries
**Severity:** LOW  
**File:** `src/app/layout.tsx`, dashboard pages  
**Description:** No React error boundaries are implemented. If a component throws, the entire page crashes.

**Suggested Fix:**
Add error.tsx files in route groups:
```tsx
// src/app/dashboard/error.tsx
"use client";
export default function DashboardError({ error, reset }) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={() => reset()}>Try again</button>
    </div>
  );
}
```

---

### 4.5 📌 No Loading States for Route Transitions
**Severity:** LOW  
**File:** Dashboard pages  
**Description:** While individual components have loading skeletons, route transitions don't show loading indicators.

**Suggested Fix:**
Add `loading.tsx` files:
```tsx
// src/app/dashboard/loading.tsx
export default function DashboardLoading() {
  return <DashboardSkeleton />;
}
```

---

### 4.6 📌 Sitemap Missing Dashboard/Auth Routes
**Severity:** LOW  
**File:** `src/app/sitemap.ts`  
**Description:** The sitemap only includes landing page, pricing, and blog. This is correct (auth/dashboard shouldn't be indexed), but robots.ts allows all routes.

**Suggested Fix:**
Update robots.ts to explicitly disallow dashboard:
```typescript
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/dashboard", "/api"] },
    ],
    sitemap: "https://sparebox.dev/sitemap.xml",
  };
}
```

---

### 4.7 📌 Missing Terms of Service Page
**Severity:** LOW  
**File:** Referenced in `src/app/dashboard/agents/new/page.tsx`  
**Description:** The deploy agent page links to `/terms`, but this page doesn't exist.

**Current Code:**
```tsx
<Link href="/terms" className="text-primary hover:underline">
  Terms of Service
</Link>
```

---

## 5. Missing Features

### 5.1 Host Notifications
When a new agent is deployed to a host, the host owner should be notified via email. Currently, no notification is sent.

### 5.2 Payment Failure Handling
When a payment fails (`invoice.payment_failed`), the subscription is marked `past_due` but:
- Agent continues running
- User is not notified
- No grace period is defined
- No automatic retry with user notification

### 5.3 Host Offline Detection
No system to detect when a host goes offline:
- Heartbeats are stored but not analyzed
- No alerting when `lastHeartbeat` is stale
- No automatic agent migration

### 5.4 Email Verification Enforcement
While email verification is configured, it's not enforced:
- Users can access dashboard without verified email
- Should restrict certain actions (deploying, hosting) until verified

### 5.5 Two-Factor Authentication
No 2FA support. For a financial platform handling payouts, this should be available.

### 5.6 Audit Log
No audit trail for:
- User actions (login, logout, role changes)
- Agent lifecycle events
- Billing events
- Admin actions

### 5.7 Agent Config Validation
The `config` field on agents is just a text blob. No validation that it's valid YAML/JSON or contains required fields.

### 5.8 Host Approval Workflow
Hosts are created in "pending" status but there's no approval workflow for admins to verify the host before it goes active.

### 5.9 Subscription Management UI
Users cannot:
- Cancel a subscription from the UI
- Upgrade/downgrade (migrate to different host)
- View invoices

---

## 6. Positive Findings

### ✅ Good Security Practices
- Stripe webhook signature verification is properly implemented
- tRPC with Zod provides strong input validation
- Role-based access control is well-structured
- Session management uses secure cookies
- Password reset doesn't reveal if email exists (prevents enumeration)

### ✅ Good Code Quality
- Consistent file organization
- TypeScript is well-used with minimal `as any`
- Components are properly separated
- tRPC context properly narrows types

### ✅ Good UX Patterns
- Loading skeletons throughout
- Empty states are helpful
- Error messages are user-friendly
- Mobile responsive sidebar

### ✅ Good Infrastructure
- Vercel deployment with edge functions
- Proper environment variable separation
- Sitemap and robots.txt configured
- SEO metadata on all pages

---

## Priority Remediation Order

1. **Immediate (before any real users):**
   - Add rate limiting to auth endpoints
   - Fix `hosts.create` to use `hostProcedure`
   - Remove or restrict `agents.create` mutation
   - Rotate database credentials

2. **Before beta:**
   - Add subscription cancellation → agent stop logic
   - Add database indexes
   - Wire billing page to real data
   - Add security headers
   - Fix duplicate agent names

3. **Before launch:**
   - Add 2FA option
   - Implement host offline detection
   - Add audit logging
   - Add email notifications
   - Create Terms of Service page

4. **Post-launch improvements:**
   - Loading.tsx files
   - Error boundaries
   - Subscription management UI
   - Host approval workflow

---

*Report generated by comprehensive file-by-file audit. All 29 source files in src/ were reviewed.*
