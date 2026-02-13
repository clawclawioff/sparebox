# Sprint 4: Pre-Beta Polish

**Goal:** Take Sparebox from "works" to "feels polished and reliable." Fix remaining audit issues, add subscription management, error handling, and email notifications.

**Estimated effort:** ~8-10 hours across 4 phases

---

## Phase 1: Quick Audit Fixes (~1.5h)

These are medium-priority items from the Feb 13 audit that are quick wins:

### 1.1 Fix `hosts.update` to use `hostProcedure`
- File: `src/server/api/routers/hosts.ts`
- Change `protectedProcedure` → `hostProcedure`

### 1.2 Fix generic `Error` → `TRPCError` (4 locations)
- File: `src/server/api/routers/hosts.ts`
- `hosts.get`, `hosts.update`, `hosts.getStats`, `hosts.getMetrics`
- Use `TRPCError({ code: "NOT_FOUND" })` instead of `new Error()`

### 1.3 Content-Security-Policy header
- File: `next.config.ts`
- Add CSP header allowing self, Stripe, Supabase, inline styles

### 1.4 Webhook error handling
- File: `src/app/api/stripe/webhooks/route.ts`
- Return 500 on handler failures instead of 200
- Stripe will retry on 5xx

### 1.5 Avatar upload content validation
- File: `src/app/api/avatar/route.ts`
- Check magic bytes (JPEG: FF D8 FF, PNG: 89 50 4E 47, WebP: 52 49 46 46, GIF: 47 49 46 38)
- Reject files that don't match their claimed MIME type

### 1.6 JSON-LD sanitization
- File: `src/app/blog/[slug]/page.tsx`
- Escape `</script>` in JSON.stringify output

### 1.7 Fix lazy staleness error handling
- File: `src/server/api/routers/hosts.ts`
- Add `.catch(err => console.error(...))` instead of swallowing errors

---

## Phase 2: Error Boundaries + Loading States (~1.5h)

Add proper error and loading UI to every route group:

### 2.1 Dashboard error boundary
- `src/app/dashboard/error.tsx` — Generic error with retry button
- `src/app/dashboard/loading.tsx` — Skeleton loading UI

### 2.2 Auth error boundary
- `src/app/(auth)/error.tsx`
- `src/app/(auth)/loading.tsx`

### 2.3 Blog error boundary
- `src/app/blog/error.tsx`
- `src/app/blog/loading.tsx`

### 2.4 Root error boundary
- `src/app/error.tsx` — Catch-all
- `src/app/not-found.tsx` — Custom 404

---

## Phase 3: Subscription Management UI (~2.5h)

### 3.1 Billing page overhaul
- File: `src/app/dashboard/billing/page.tsx`
- Show active subscriptions with: agent name, host name, price, status, next billing date
- Cancel subscription button (with confirmation dialog)
- View invoice history (from Stripe)
- Payment method display + update link (Stripe Customer Portal)

### 3.2 tRPC billing router additions
- `billing.getMySubscriptions` — Return full subscription details with agent/host names
- `billing.cancelSubscription` — Cancel in Stripe + update DB
- `billing.getInvoices` — Fetch from Stripe API
- `billing.createPortalSession` — Create Stripe Customer Portal session

### 3.3 Stripe Customer Portal configuration
- Enable in Stripe Dashboard (or via API)
- Allow customers to update payment method, view invoices

---

## Phase 4: Email Notifications (~2.5h)

### 4.1 Deploy success email
- Trigger: After successful agent deployment (checkout.session.completed webhook)
- Template: Agent name, host name, dashboard link
- Use Resend + React Email

### 4.2 Host offline notification
- Trigger: When lazy staleness check marks a host inactive
- Send to host owner
- Template: Machine name, last seen time, troubleshooting link
- Debounce: Don't send more than once per hour per host

### 4.3 Payment failure email
- Trigger: invoice.payment_failed webhook
- Send to subscriber
- Template: Agent name, retry date, update payment link
- Grace period: 3 days before agent is stopped

### 4.4 Welcome email
- Trigger: After email verification
- Template: Welcome message, next steps based on role (host vs deployer)

---

## Phase 5: Cleanup (~1h)

### 5.1 Remove console.log statements
- 53 instances across the codebase
- Replace with structured logging or remove

### 5.2 Fix broken Terms link in footer

### 5.3 Heartbeat data retention
- Add a cleanup query: delete heartbeats older than 30 days
- Run in the daily cron job

---

## Success Criteria
- [ ] All medium audit issues resolved
- [ ] Error boundaries on every route group
- [ ] Subscription cancel flow works end-to-end
- [ ] 4 email templates deployed and tested
- [ ] Console.log cleanup
- [ ] Blog post #3 published
