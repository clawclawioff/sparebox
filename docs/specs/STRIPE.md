# Stripe Integration Spec

> Status: In Progress
> Last updated: 2026-02-06

## Overview

Stripe handles all payment processing for Sparebox:
- **Checkout Sessions** for agent deployment payments (subscription mode)
- **Webhooks** for async event processing (subscription lifecycle)
- **Connect** (future) for host payouts

## Environment Variables

| Variable | Mode | Description |
|----------|------|-------------|
| `STRIPE_SECRET_KEY` | `sk_test_*` (sandbox) / `sk_live_*` (production) | Server-side API key |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_*` / `pk_live_*` | Client-side key (unused currently) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_*` | Webhook signing secret — **must match the mode of the other keys** |
| `STRIPE_CONNECT_CLIENT_ID` | `ca_*` | Connect OAuth client ID (for host onboarding) |

### ⚠️ Critical: Key Mode Consistency
All Stripe keys MUST be from the same mode (all sandbox OR all production). Mixing modes will cause silent failures — events fire in one mode but the webhook secret is from the other.

### ⚠️ Critical: Redeploy After Key Changes
Vercel caches env vars at deploy time for serverless functions. After changing any Stripe keys, trigger a redeployment.

## Architecture

### Payment Flow (Agent Deployment)

```
User fills wizard → Step 3 "Deploy" click
    ↓
tRPC: billing.createCheckoutSession
    ↓
Server: Creates Stripe Checkout Session (subscription mode)
    - price_data from host.pricePerMonth
    - metadata: { userId, agentName, hostId, config }
    - success_url: /dashboard/agents?deployed=true
    - cancel_url: /dashboard/agents/new
    ↓
Redirect to Stripe Checkout (hosted)
    ↓
User pays → Stripe fires webhook events
    ↓
POST /api/stripe/webhooks
    ↓
checkout.session.completed → Create agent + subscription in DB
```

## Webhook Events

### Endpoint: `POST /api/stripe/webhooks`

| Event | Handler | Action |
|-------|---------|--------|
| `checkout.session.completed` | Create agent + subscription | Reads metadata, creates `agents` row + `subscriptions` row, sets `stripeCustomerId` on user |
| `customer.subscription.created` | Log/track | (Backup — checkout.session.completed is primary) |
| `customer.subscription.updated` | Update subscription | Updates `status`, `currentPeriodStart`, `currentPeriodEnd` |
| `customer.subscription.deleted` | Cancel subscription | Sets `status: canceled`, `canceledAt: now()` |
| `invoice.payment_failed` | Flag past due | Sets subscription `status: past_due` |
| `invoice.paid` | Confirm payment | (Future: trigger payout calculation) |

### Webhook Handler Requirements

1. **Signature verification** — `stripe.webhooks.constructEvent(rawBody, sig, secret)`
2. **Raw body** — Must use `req.text()` not `req.json()` (signature needs raw string)
3. **Idempotency** — Check if agent/subscription already exists before creating (prevents duplicates on webhook retry)
4. **Error handling** — Return 200 even on non-critical errors (prevents Stripe from disabling the endpoint)
5. **Logging** — Log all events for debugging, especially errors

### checkout.session.completed Handler Detail

```
1. Verify session.mode === "subscription"
2. Verify session.payment_status === "paid"
3. Extract metadata: userId, agentName, hostId, config
4. Look up host (verify exists)
5. Check idempotency: does agent with this name + userId already exist from this session?
6. Create agent (status: "pending")
7. Calculate fees: 60% host / 40% platform
8. Create subscription with stripeSubscriptionId
9. Update user.stripeCustomerId if not set
10. Return 200
```

## Revenue Split

- **Host**: 60% of `pricePerMonth`
- **Platform**: 40% of `pricePerMonth`
- Calculated in webhook handler: `hostPayout = pricePerMonth - Math.round(pricePerMonth * 0.4)`

## Database Fields (Stripe-related)

### `user` table
- `stripeCustomerId` — Stripe Customer ID (set on first checkout)
- `stripeConnectAccountId` — Stripe Connect account (future, for hosts)

### `subscriptions` table
- `stripeSubscriptionId` — Links to Stripe Subscription object
- `stripePriceId` — (unused currently, for fixed prices later)
- `pricePerMonth` — Amount in cents
- `hostPayoutPerMonth` — 60% in cents
- `platformFeePerMonth` — 40% in cents
- `status` — `active | past_due | canceled | trialing`
- `currentPeriodStart` / `currentPeriodEnd` — Billing period dates
- `canceledAt` — When subscription was canceled

## Files

| File | Purpose |
|------|---------|
| `src/lib/stripe.ts` | Stripe client (lazy init) |
| `src/server/api/routers/billing.ts` | `createCheckoutSession` mutation |
| `src/app/api/stripe/webhooks/route.ts` | Webhook handler |
| `src/app/dashboard/agents/new/page.tsx` | Deploy wizard (calls billing router) |

## Testing Checklist

- [ ] Checkout creates session and redirects to Stripe
- [ ] Successful payment triggers `checkout.session.completed` webhook
- [ ] Webhook creates agent + subscription in DB
- [ ] Agent appears in user's dashboard after redirect
- [ ] Subscription cancellation updates DB status
- [ ] Failed payment marks subscription as past_due
- [ ] Duplicate webhook delivery doesn't create duplicate agents

### Sandbox Test Cards
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Requires auth: `4000 0025 0000 3155`

## TODO
- [ ] Fix webhook (currently not processing — likely signing secret mismatch)
- [ ] Add idempotency checks
- [ ] Stripe Connect for host payouts
- [ ] Customer portal for subscription management
- [ ] Usage-based billing option
- [ ] Switch to production keys before launch
