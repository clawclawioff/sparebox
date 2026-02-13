import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { db } from "@/db";
import { agents, subscriptions, hosts, user } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import type Stripe from "stripe";
import { PLATFORM_FEE_PERCENT } from "@/lib/constants";

export async function POST(req: NextRequest) {
  let body: string;
  let signature: string | null;

  try {
    body = await req.text();
    signature = req.headers.get("stripe-signature");
  } catch (err) {
    console.error("[Stripe Webhook] Failed to read request body:", err);
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  if (!signature) {
    console.error("[Stripe Webhook] Missing stripe-signature header");
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("[Stripe Webhook] STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Stripe Webhook] Signature verification failed:", message);
    return NextResponse.json(
      { error: `Invalid signature: ${message}` },
      { status: 400 }
    );
  }

  console.log(`[Stripe Webhook] Received event: ${event.type} (${event.id})`);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        await handleCheckoutCompleted(event.data.object);
        break;
      }

      case "customer.subscription.created": {
        // Backup handler — checkout.session.completed is primary
        console.log(
          `[Stripe Webhook] Subscription created: ${(event.data.object as any).id}`
        );
        break;
      }

      case "customer.subscription.deleted": {
        await handleSubscriptionDeleted(event.data.object);
        break;
      }

      case "customer.subscription.updated": {
        await handleSubscriptionUpdated(event.data.object);
        break;
      }

      case "invoice.payment_failed": {
        await handlePaymentFailed(event.data.object);
        break;
      }

      case "invoice.paid": {
        console.log(
          `[Stripe Webhook] Invoice paid: ${(event.data.object as any).id}`
        );
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(
      `[Stripe Webhook] Error handling ${event.type}:`,
      message,
      err instanceof Error ? err.stack : ""
    );
    // Return 200 to prevent Stripe from retrying and potentially disabling the endpoint
    // The error is logged for debugging
    return NextResponse.json({ received: true, error: message }, { status: 200 });
  }

  return NextResponse.json({ received: true });
}

// =============================================================================
// Event Handlers
// =============================================================================

async function handleCheckoutCompleted(session: any) {
  console.log(`[Stripe Webhook] Checkout completed: ${session.id}`);
  console.log(`[Stripe Webhook]   Mode: ${session.mode}`);
  console.log(`[Stripe Webhook]   Payment status: ${session.payment_status}`);
  console.log(`[Stripe Webhook]   Metadata:`, JSON.stringify(session.metadata));

  // Only handle subscription checkouts
  if (session.mode !== "subscription") {
    console.log("[Stripe Webhook] Skipping non-subscription checkout");
    return;
  }

  // Verify payment was successful
  if (session.payment_status !== "paid") {
    console.log(
      `[Stripe Webhook] Payment not complete (status: ${session.payment_status}), skipping`
    );
    return;
  }

  const metadata = session.metadata;
  if (!metadata?.userId || !metadata?.agentName || !metadata?.hostId) {
    console.error("[Stripe Webhook] Missing required metadata:", metadata);
    return;
  }

  const { userId, agentName, hostId, config } = metadata;

  // Idempotency: check if we already created an agent for this checkout session
  const stripeSubscriptionId = typeof session.subscription === "string"
    ? session.subscription
    : session.subscription?.id ?? null;

  if (stripeSubscriptionId) {
    const existingSub = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId),
    });
    if (existingSub) {
      console.log(
        `[Stripe Webhook] Subscription ${stripeSubscriptionId} already exists, skipping (idempotent)`
      );
      return;
    }
  }

  // Get host for pricing
  const host = await db.query.hosts.findFirst({
    where: eq(hosts.id, hostId),
  });

  if (!host) {
    console.error(`[Stripe Webhook] Host not found: ${hostId}`);
    return;
  }

  console.log(
    `[Stripe Webhook] Creating agent "${agentName}" for user ${userId} on host ${host.name}`
  );

  // Wrap agent + subscription creation in a transaction
  await db.transaction(async (tx) => {
    // Double-check idempotency inside transaction (race condition guard)
    if (stripeSubscriptionId) {
      const existingSub = await tx.query.subscriptions.findFirst({
        where: eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId),
      });
      if (existingSub) {
        console.log(`[Stripe Webhook] Subscription ${stripeSubscriptionId} already exists (race condition caught)`);
        return;
      }
    }

    // Check for duplicate agent name per user (unique index: idx_agents_user_name)
    const existingAgent = await tx.query.agents.findFirst({
      where: and(eq(agents.userId, userId), eq(agents.name, agentName)),
    });
    if (existingAgent) {
      console.error(
        `[Stripe Webhook] Duplicate agent name "${agentName}" for user ${userId}. Appending subscription ID.`
      );
    }

    const finalAgentName = existingAgent
      ? `${agentName}-${stripeSubscriptionId?.slice(-6) || Date.now()}`
      : agentName;

    const [agent] = await tx
      .insert(agents)
      .values({
        name: finalAgentName,
        userId: userId,
        hostId: hostId,
        config: config || null,
        status: "pending",
      })
      .returning();

    const platformFee = Math.round(host.pricePerMonth * (PLATFORM_FEE_PERCENT / 100));
    const hostPayout = host.pricePerMonth - platformFee;

    await tx.insert(subscriptions).values({
      userId: userId,
      agentId: agent.id,
      hostId: host.id,
      stripeSubscriptionId: stripeSubscriptionId,
      pricePerMonth: host.pricePerMonth,
      hostPayoutPerMonth: hostPayout,
      platformFeePerMonth: platformFee,
      status: "active",
    });

    console.log(`[Stripe Webhook] Agent ${agent.id} + subscription created in transaction`);
  });

  // Update user's stripeCustomerId if not set
  const stripeCustomerId = typeof session.customer === "string"
    ? session.customer
    : session.customer?.id ?? null;

  if (stripeCustomerId) {
    await db
      .update(user)
      .set({ stripeCustomerId })
      .where(eq(user.id, userId));
    console.log(
      `[Stripe Webhook] Updated user ${userId} with customer ${stripeCustomerId}`
    );
  }
}

async function handleSubscriptionDeleted(subscription: any) {
  console.log(`[Stripe Webhook] Subscription deleted: ${subscription.id}`);

  const [sub] = await db
    .update(subscriptions)
    .set({ status: "canceled", canceledAt: new Date() })
    .where(eq(subscriptions.stripeSubscriptionId, subscription.id))
    .returning();

  if (sub) {
    // Stop the associated agent
    await db
      .update(agents)
      .set({ status: "stopped", updatedAt: new Date() })
      .where(eq(agents.id, sub.agentId));
    
    console.log(`[Stripe Webhook] Stopped agent ${sub.agentId} (subscription canceled)`);
  } else {
    console.log(`[Stripe Webhook] No matching subscription found for ${subscription.id}`);
  }
}

async function handleSubscriptionUpdated(subscription: any) {
  console.log(
    `[Stripe Webhook] Subscription updated: ${subscription.id} (status: ${subscription.status})`
  );

  const newStatus =
    subscription.status === "active"
      ? "active"
      : subscription.status === "past_due"
        ? "past_due"
        : subscription.status === "canceled"
          ? "canceled"
          : subscription.cancel_at_period_end
            ? "canceled"
            : "active";

  const updateData: Record<string, any> = {
    status: newStatus,
  };

  // Update period dates if available
  if (subscription.current_period_start) {
    updateData.currentPeriodStart = new Date(
      subscription.current_period_start * 1000
    );
  }
  if (subscription.current_period_end) {
    updateData.currentPeriodEnd = new Date(
      subscription.current_period_end * 1000
    );
  }

  const result = await db
    .update(subscriptions)
    .set(updateData)
    .where(eq(subscriptions.stripeSubscriptionId, subscription.id))
    .returning();

  if (result.length === 0) {
    console.log(
      `[Stripe Webhook] No matching subscription found for ${subscription.id}`
    );
  }
}

async function handlePaymentFailed(invoice: any) {
  console.log(`[Stripe Webhook] Payment failed for invoice: ${invoice.id}`);

  if (!invoice.subscription) {
    console.log("[Stripe Webhook] Invoice has no subscription, skipping");
    return;
  }

  const subId = typeof invoice.subscription === "string"
    ? invoice.subscription
    : invoice.subscription?.id;

  if (!subId) return;

  const [sub] = await db
    .update(subscriptions)
    .set({ status: "past_due" })
    .where(eq(subscriptions.stripeSubscriptionId, subId))
    .returning();

  if (sub) {
    console.log(
      `[Stripe Webhook] Marked subscription ${sub.id} as past_due (agent ${sub.agentId} still running - manual intervention may be required)`
    );
  }
}
