import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { db } from "@/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";
import type Stripe from "stripe";

export async function POST(req: NextRequest) {
  let body: string;
  let signature: string | null;

  try {
    body = await req.text();
    signature = req.headers.get("stripe-signature");
  } catch (err) {
    console.error("[Stripe Connect Webhook] Failed to read request body:", err);
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  if (!signature) {
    console.error("[Stripe Connect Webhook] Missing stripe-signature header");
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  if (!process.env.STRIPE_CONNECT_WEBHOOK_SECRET) {
    console.error(
      "[Stripe Connect Webhook] STRIPE_CONNECT_WEBHOOK_SECRET not configured"
    );
    return NextResponse.json(
      { error: "Connect webhook secret not configured" },
      { status: 500 }
    );
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_CONNECT_WEBHOOK_SECRET
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(
      "[Stripe Connect Webhook] Signature verification failed:",
      message
    );
    return NextResponse.json(
      { error: `Invalid signature: ${message}` },
      { status: 400 }
    );
  }

  console.log(
    `[Stripe Connect Webhook] Received event: ${event.type} (${event.id})` +
      (event.account ? ` for account ${event.account}` : "")
  );

  try {
    switch (event.type) {
      case "account.updated": {
        await handleAccountUpdated(event.data.object as any, event.account);
        break;
      }

      case "payout.paid": {
        const payout = event.data.object as any;
        console.log(
          `[Stripe Connect Webhook] Payout paid: ${payout.id} ($${(payout.amount / 100).toFixed(2)}) for account ${event.account}`
        );
        break;
      }

      case "payout.failed": {
        const payout = event.data.object as any;
        console.error(
          `[Stripe Connect Webhook] Payout failed: ${payout.id} for account ${event.account} — ${payout.failure_message}`
        );
        // TODO: Notify host that their payout failed
        break;
      }

      default:
        console.log(
          `[Stripe Connect Webhook] Unhandled event type: ${event.type}`
        );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(
      `[Stripe Connect Webhook] Error handling ${event.type}:`,
      message,
      err instanceof Error ? err.stack : ""
    );
    return NextResponse.json(
      { received: true, error: message },
      { status: 200 }
    );
  }

  return NextResponse.json({ received: true });
}

// =============================================================================
// Event Handlers
// =============================================================================

async function handleAccountUpdated(account: any, connectedAccountId?: string) {
  const accountId = connectedAccountId || account.id;
  console.log(
    `[Stripe Connect Webhook] Account updated: ${accountId}`
  );
  console.log(
    `[Stripe Connect Webhook]   charges_enabled: ${account.charges_enabled}`
  );
  console.log(
    `[Stripe Connect Webhook]   payouts_enabled: ${account.payouts_enabled}`
  );
  console.log(
    `[Stripe Connect Webhook]   details_submitted: ${account.details_submitted}`
  );

  // Find the user with this Connect account and log the status change
  const hostUser = await db.query.user.findFirst({
    where: eq(user.stripeConnectAccountId, accountId),
  });

  if (hostUser) {
    console.log(
      `[Stripe Connect Webhook] Account ${accountId} belongs to user ${hostUser.id} (${hostUser.email})`
    );

    // If onboarding just completed (payouts now enabled), log it
    if (account.payouts_enabled && account.charges_enabled) {
      console.log(
        `[Stripe Connect Webhook] Host ${hostUser.email} onboarding complete — payouts enabled!`
      );
      // TODO: Send congratulations email to host
    }
  } else {
    console.log(
      `[Stripe Connect Webhook] No user found for Connect account ${accountId}`
    );
  }
}
