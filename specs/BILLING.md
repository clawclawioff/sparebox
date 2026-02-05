# Billing Specification

**Parent:** [MVP.md](./MVP.md)  
**Status:** Draft

---

## 1. Overview

Billing covers two distinct flows:

1. **Users (Agent Deployers):** Pay for agent hosting subscriptions
2. **Hosts (Hardware Providers):** Receive payouts for hosting agents

---

## 2. User Billing Pages

### 2.1 Billing Overview

**Route:** `/dashboard/billing`  
**Access:** User role

```
┌─────────────────────────────────────────────────────────────┐
│ Billing                                                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─────────────────────────────────────────────────────┐    │
│ │ Current Month                                       │    │
│ │                                                     │    │
│ │ Total: $34.00                                       │    │
│ │ 3 active subscriptions                              │    │
│ └─────────────────────────────────────────────────────┘    │
│                                                             │
│ Payment Methods                           [+ Add New]       │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ 💳 Visa ending in 4242          Default    [Remove]   │  │
│ │    Expires 12/2028                                    │  │
│ │                                                       │  │
│ │ 💳 Mastercard ending in 5555              [Make Default] │
│ │    Expires 06/2027                        [Remove]    │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                             │
│ Active Subscriptions                                        │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ Agent         │ Host          │ Price    │ Next Bill │  │
│ ├───────────────────────────────────────────────────────┤  │
│ │ my-assistant  │ Home Server   │ $12/mo   │ Mar 5     │  │
│ │ dev-agent     │ Cloud Box     │ $10/mo   │ Mar 8     │  │
│ │ test-agent    │ Power Station │ $12/mo   │ Mar 10    │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                             │
│ Billing History                           [Download All]    │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ Date        │ Description      │ Amount  │ Status    │  │
│ ├───────────────────────────────────────────────────────┤  │
│ │ Feb 5, 2026 │ my-assistant     │ $12.00  │ ✓ Paid    │  │
│ │ Feb 8, 2026 │ dev-agent        │ $10.00  │ ✓ Paid    │  │
│ │ Jan 5, 2026 │ my-assistant     │ $12.00  │ ✓ Paid    │  │
│ │ Jan 8, 2026 │ dev-agent        │ $10.00  │ ✓ Paid    │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Add Payment Method Modal

```
┌─────────────────────────────────────────────────────────────┐
│ Add Payment Method                                     [X]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Card Information                                            │
│ ┌─────────────────────────────────────────────────────┐    │
│ │ [Stripe Card Element]                               │    │
│ │                                                     │    │
│ │ Card number                                         │    │
│ │ ┌─────────────────────────────────────────────┐    │    │
│ │ │ 4242 4242 4242 4242                         │    │    │
│ │ └─────────────────────────────────────────────┘    │    │
│ │                                                     │    │
│ │ Expiration      CVC                                 │    │
│ │ ┌───────────┐   ┌───────────┐                      │    │
│ │ │ 12 / 28   │   │ 123       │                      │    │
│ │ └───────────┘   └───────────┘                      │    │
│ └─────────────────────────────────────────────────────┘    │
│                                                             │
│ □ Set as default payment method                             │
│                                                             │
│                              [Cancel]  [Add Card]           │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Host Earnings Pages

### 3.1 Earnings Overview

**Route:** `/dashboard/earnings`  
**Access:** Host role

```
┌─────────────────────────────────────────────────────────────┐
│ Earnings                                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│ │ This Month   │  │ Total        │  │ Next Payout  │       │
│ │              │  │ Earnings     │  │              │       │
│ │ $48.00       │  │ $156.00      │  │ $48.00       │       │
│ │ 5 agents     │  │ Since Jan    │  │ Feb 15       │       │
│ └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                             │
│ Payout Account                                              │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ ✓ Stripe Connected                                    │  │
│ │ Bank account: ****4567                                │  │
│ │ Payouts enabled                    [Manage Account]   │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                             │
│ OR (if not connected):                                      │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ ⚠️ Payout account not set up                          │  │
│ │                                                       │  │
│ │ Connect your bank account to receive earnings.        │  │
│ │                                                       │  │
│ │                          [Set Up Payouts]             │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                             │
│ Earnings by Machine                                         │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ Machine       │ Agents │ This Month │ Total          │  │
│ ├───────────────────────────────────────────────────────┤  │
│ │ Home Server   │ 3      │ $21.60     │ $86.40         │  │
│ │ Office Laptop │ 2      │ $26.40     │ $69.60         │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                             │
│ Earnings History                        [6 months ▼]        │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ [Bar chart showing monthly earnings]                  │  │
│ │                                                       │  │
│ │  $50 │       ▓▓▓▓                                     │  │
│ │      │ ▓▓▓▓  ▓▓▓▓  ▓▓▓▓                              │  │
│ │  $25 │ ▓▓▓▓  ▓▓▓▓  ▓▓▓▓  ▓▓▓▓                        │  │
│ │      │ ▓▓▓▓  ▓▓▓▓  ▓▓▓▓  ▓▓▓▓  ▓▓▓▓                  │  │
│ │   $0 └──────────────────────────────────              │  │
│ │       Sep   Oct   Nov   Dec   Jan   Feb               │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                             │
│ Payout History                                              │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ Date        │ Amount  │ Status     │ Bank            │  │
│ ├───────────────────────────────────────────────────────┤  │
│ │ Jan 15      │ $42.00  │ ✓ Paid     │ ****4567        │  │
│ │ Dec 15      │ $38.00  │ ✓ Paid     │ ****4567        │  │
│ │ Nov 15      │ $28.00  │ ✓ Paid     │ ****4567        │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. tRPC Procedures

```typescript
billing: router({
  // Get payment methods
  getPaymentMethods: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user.stripeCustomerId) {
      return [];
    }
    
    const methods = await stripe.paymentMethods.list({
      customer: ctx.user.stripeCustomerId,
      type: 'card',
    });
    
    const customer = await stripe.customers.retrieve(ctx.user.stripeCustomerId);
    const defaultMethodId = customer.invoice_settings?.default_payment_method;
    
    return methods.data.map(m => ({
      id: m.id,
      brand: m.card?.brand,
      last4: m.card?.last4,
      expMonth: m.card?.exp_month,
      expYear: m.card?.exp_year,
      isDefault: m.id === defaultMethodId,
    }));
  }),

  // Create setup intent for adding card
  createSetupIntent: protectedProcedure.mutation(async ({ ctx }) => {
    // Create or get customer
    let customerId = ctx.user.stripeCustomerId;
    
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: ctx.user.email,
        name: ctx.user.name,
        metadata: { userId: ctx.user.id },
      });
      
      await ctx.db.update(user)
        .set({ stripeCustomerId: customer.id })
        .where(eq(user.id, ctx.user.id));
      
      customerId = customer.id;
    }
    
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
    });
    
    return { clientSecret: setupIntent.client_secret };
  }),

  // Set default payment method
  setDefaultPaymentMethod: protectedProcedure
    .input(z.object({ paymentMethodId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user.stripeCustomerId) {
        throw new TRPCError({ code: 'BAD_REQUEST' });
      }
      
      await stripe.customers.update(ctx.user.stripeCustomerId, {
        invoice_settings: {
          default_payment_method: input.paymentMethodId,
        },
      });
      
      return { success: true };
    }),

  // Remove payment method
  removePaymentMethod: protectedProcedure
    .input(z.object({ paymentMethodId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify it belongs to this user
      const method = await stripe.paymentMethods.retrieve(input.paymentMethodId);
      
      if (method.customer !== ctx.user.stripeCustomerId) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }
      
      // Check if it's the only method with active subscriptions
      const subs = await stripe.subscriptions.list({
        customer: ctx.user.stripeCustomerId,
        status: 'active',
      });
      
      if (subs.data.length > 0) {
        const methods = await stripe.paymentMethods.list({
          customer: ctx.user.stripeCustomerId,
          type: 'card',
        });
        
        if (methods.data.length === 1) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Cannot remove the only payment method while subscriptions are active',
          });
        }
      }
      
      await stripe.paymentMethods.detach(input.paymentMethodId);
      
      return { success: true };
    }),

  // Get invoices
  getInvoices: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).default(10) }).optional())
    .query(async ({ ctx, input }) => {
      if (!ctx.user.stripeCustomerId) {
        return [];
      }
      
      const invoices = await stripe.invoices.list({
        customer: ctx.user.stripeCustomerId,
        limit: input?.limit || 10,
      });
      
      return invoices.data.map(inv => ({
        id: inv.id,
        number: inv.number,
        date: new Date(inv.created * 1000),
        amount: inv.amount_paid,
        status: inv.status,
        pdfUrl: inv.invoice_pdf,
        description: inv.lines.data[0]?.description || 'Agent hosting',
      }));
    }),

  // Get subscriptions
  getSubscriptions: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.subscriptions.findMany({
      where: eq(subscriptions.userId, ctx.user.id),
      with: {
        agent: true,
        host: {
          columns: { id: true, name: true },
        },
      },
      orderBy: [desc(subscriptions.createdAt)],
    });
  }),
}),

payouts: router({
  // Get Connect account status
  getConnectStatus: protectedProcedure
    .use(requireRole('host'))
    .query(async ({ ctx }) => {
      if (!ctx.user.stripeConnectAccountId) {
        return { connected: false };
      }
      
      const account = await stripe.accounts.retrieve(ctx.user.stripeConnectAccountId);
      
      return {
        connected: true,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
        externalAccounts: account.external_accounts?.data.map(a => ({
          last4: a.last4,
          bankName: a.bank_name,
        })),
      };
    }),

  // Initiate Stripe Connect onboarding
  connectStripe: protectedProcedure
    .use(requireRole('host'))
    .mutation(async ({ ctx }) => {
      let accountId = ctx.user.stripeConnectAccountId;
      
      if (!accountId) {
        const account = await stripe.accounts.create({
          type: 'express',
          email: ctx.user.email,
          capabilities: {
            transfers: { requested: true },
          },
          business_type: 'individual',
        });
        
        accountId = account.id;
        
        await ctx.db.update(user)
          .set({ stripeConnectAccountId: accountId })
          .where(eq(user.id, ctx.user.id));
      }
      
      const link = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${BASE_URL}/dashboard/earnings?refresh=true`,
        return_url: `${BASE_URL}/dashboard/earnings?success=true`,
        type: 'account_onboarding',
      });
      
      return { url: link.url };
    }),

  // Get payout history
  getPayouts: protectedProcedure
    .use(requireRole('host'))
    .query(async ({ ctx }) => {
      return ctx.db.query.payouts.findMany({
        where: exists(
          ctx.db.select()
            .from(hosts)
            .where(and(
              eq(hosts.id, payouts.hostId),
              eq(hosts.userId, ctx.user.id)
            ))
        ),
        orderBy: [desc(payouts.createdAt)],
        limit: 50,
      });
    }),

  // Get earnings summary
  getEarnings: protectedProcedure
    .use(requireRole('host'))
    .input(z.object({
      period: z.enum(['month', '3months', '6months', 'year', 'all']).default('month'),
    }).optional())
    .query(async ({ ctx, input }) => {
      // Calculate date range
      const now = new Date();
      let startDate: Date;
      
      switch (input?.period) {
        case '3months': startDate = subMonths(now, 3); break;
        case '6months': startDate = subMonths(now, 6); break;
        case 'year': startDate = subYears(now, 1); break;
        case 'all': startDate = new Date(0); break;
        default: startDate = startOfMonth(now);
      }
      
      // Get user's hosts
      const userHosts = await ctx.db.query.hosts.findMany({
        where: eq(hosts.userId, ctx.user.id),
      });
      
      const hostIds = userHosts.map(h => h.id);
      
      // Get active subscriptions for these hosts
      const activeSubs = await ctx.db.query.subscriptions.findMany({
        where: and(
          inArray(subscriptions.hostId, hostIds),
          eq(subscriptions.status, 'active')
        ),
      });
      
      // Calculate earnings
      const currentMonthEarnings = activeSubs.reduce(
        (sum, s) => sum + s.hostPayoutPerMonth, 0
      );
      
      const totalEarnings = userHosts.reduce(
        (sum, h) => sum + h.totalEarnings, 0
      );
      
      // Get next payout date (15th of next month)
      const nextPayoutDate = new Date(now.getFullYear(), now.getMonth() + 1, 15);
      
      return {
        currentMonth: currentMonthEarnings,
        total: totalEarnings,
        activeAgents: activeSubs.length,
        nextPayout: {
          amount: currentMonthEarnings,
          date: nextPayoutDate,
        },
        byMachine: userHosts.map(h => ({
          id: h.id,
          name: h.name,
          agentCount: activeSubs.filter(s => s.hostId === h.id).length,
          currentMonth: activeSubs
            .filter(s => s.hostId === h.id)
            .reduce((sum, s) => sum + s.hostPayoutPerMonth, 0),
          total: h.totalEarnings,
        })),
      };
    }),
}),
```

---

## 5. Stripe Webhook Handlers

```typescript
// src/server/stripe/webhooks.ts

export async function handleStripeWebhook(event: Stripe.Event) {
  switch (event.type) {
    case 'invoice.paid':
      await handleInvoicePaid(event.data.object as Stripe.Invoice);
      break;
      
    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
      break;
      
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;
      
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;
      
    case 'account.updated':
      await handleConnectAccountUpdated(event.data.object as Stripe.Account);
      break;
      
    case 'transfer.created':
      await handleTransferCreated(event.data.object as Stripe.Transfer);
      break;
  }
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const subscription = invoice.subscription as string;
  
  // Get our subscription record
  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.stripeSubscriptionId, subscription),
  });
  
  if (!sub) return;
  
  // If first payment, trigger deployment
  if (invoice.billing_reason === 'subscription_create') {
    const agent = await db.query.agents.findFirst({
      where: eq(agents.id, sub.agentId),
    });
    
    if (agent?.status === 'pending') {
      // Trigger deployment
      await triggerAgentDeployment(agent);
    }
  }
  
  // Update subscription dates
  const stripeSubscription = await stripe.subscriptions.retrieve(subscription);
  
  await db.update(subscriptions)
    .set({
      currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      status: 'active',
    })
    .where(eq(subscriptions.id, sub.id));
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const subscription = invoice.subscription as string;
  
  await db.update(subscriptions)
    .set({ status: 'past_due' })
    .where(eq(subscriptions.stripeSubscriptionId, subscription));
  
  // TODO: Email user about failed payment
}

async function handleSubscriptionDeleted(stripeSubscription: Stripe.Subscription) {
  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.stripeSubscriptionId, stripeSubscription.id),
  });
  
  if (!sub) return;
  
  // Stop the agent
  const agent = await db.query.agents.findFirst({
    where: eq(agents.id, sub.agentId),
  });
  
  if (agent?.status === 'running') {
    await stopAgent(agent);
  }
  
  // Update records
  await db.update(subscriptions)
    .set({ status: 'canceled', canceledAt: new Date() })
    .where(eq(subscriptions.id, sub.id));
  
  await db.update(agents)
    .set({ status: 'stopped' })
    .where(eq(agents.id, sub.agentId));
}
```

---

## 6. Payout Cron Job

```typescript
// Runs on 1st of each month via Vercel Cron or similar

export async function processMonthlyPayouts() {
  const previousMonth = subMonths(new Date(), 1);
  const periodStart = startOfMonth(previousMonth);
  const periodEnd = endOfMonth(previousMonth);
  
  // Get all hosts with Connect accounts
  const hostsWithConnect = await db.query.user.findMany({
    where: and(
      isNotNull(user.stripeConnectAccountId),
      eq(user.role, 'host')
    ),
  });
  
  for (const hostUser of hostsWithConnect) {
    // Calculate earnings for the month
    const hostMachines = await db.query.hosts.findMany({
      where: eq(hosts.userId, hostUser.id),
    });
    
    const machineIds = hostMachines.map(h => h.id);
    
    const earnings = await db.query.subscriptions.findMany({
      where: and(
        inArray(subscriptions.hostId, machineIds),
        eq(subscriptions.status, 'active'),
        // Only count subscriptions active during this period
        lte(subscriptions.createdAt, periodEnd)
      ),
    });
    
    const totalEarnings = earnings.reduce(
      (sum, s) => sum + s.hostPayoutPerMonth, 0
    );
    
    if (totalEarnings < 500) {
      // Minimum $5 payout
      continue;
    }
    
    // Create Stripe transfer
    try {
      const transfer = await stripe.transfers.create({
        amount: totalEarnings,
        currency: 'usd',
        destination: hostUser.stripeConnectAccountId,
        description: `Sparebox payout for ${format(previousMonth, 'MMMM yyyy')}`,
      });
      
      // Record payout for each machine
      for (const machine of hostMachines) {
        const machineEarnings = earnings
          .filter(s => s.hostId === machine.id)
          .reduce((sum, s) => sum + s.hostPayoutPerMonth, 0);
        
        if (machineEarnings > 0) {
          await db.insert(payouts).values({
            hostId: machine.id,
            amount: machineEarnings,
            stripeTransferId: transfer.id,
            status: 'completed',
            periodStart,
            periodEnd,
          });
          
          // Update machine total earnings
          await db.update(hosts)
            .set({ totalEarnings: sql`total_earnings + ${machineEarnings}` })
            .where(eq(hosts.id, machine.id));
        }
      }
    } catch (error) {
      // Log error, record failed payout
      console.error(`Payout failed for user ${hostUser.id}:`, error);
      
      await db.insert(payouts).values({
        hostId: hostMachines[0].id, // Just use first machine for the record
        amount: totalEarnings,
        status: 'failed',
        periodStart,
        periodEnd,
      });
    }
  }
}
```

---

## 7. Validation & Business Rules

### 7.1 Payment Methods
- User must have at least one payment method to create subscriptions
- Cannot remove last payment method if active subscriptions exist
- Default payment method used for all new subscriptions

### 7.2 Payouts
- Minimum payout: $5
- Payout schedule: 15th of each month for previous month
- Host must complete Stripe Connect onboarding
- Payouts require `payouts_enabled` status

### 7.3 Revenue Split
- User pays: 100% of host price
- Host receives: 60% of subscription
- Platform keeps: 40% of subscription

---

## 8. Error Handling

| Error | User Message |
|-------|-------------|
| Card declined | "Your card was declined. Please try another payment method." |
| Connect onboarding incomplete | "Please complete your payout setup to receive earnings." |
| Payout failed | "We couldn't process your payout. We'll retry automatically." |
| Invalid card details | "Please check your card details and try again." |

---

## 9. Testing Scenarios

| Scenario | Expected |
|----------|----------|
| Add first payment method | Card saved, set as default |
| Add second payment method | Card saved, not default |
| Remove non-default card | Card removed |
| Remove only card with active sub | Error: cannot remove |
| Complete Stripe Connect | payoutsEnabled becomes true |
| Monthly payout < $5 | Payout skipped, rolls over |
| Monthly payout ≥ $5 | Transfer created, payout recorded |
| Subscription payment fails | Status becomes past_due |
