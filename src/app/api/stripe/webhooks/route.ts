import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { db } from "@/db";
import { agents, subscriptions, hosts, user } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature")!;

  let event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;

      if (session.mode === "subscription" && session.metadata) {
        const { userId, agentName, hostId, config } = session.metadata;

        if (!userId || !agentName || !hostId) break;

        // Get host for pricing
        const host = await db.query.hosts.findFirst({
          where: eq(hosts.id, hostId),
        });

        if (!host) break;

        // Create the agent
        const [agent] = await db
          .insert(agents)
          .values({
            name: agentName,
            userId: userId,
            hostId: hostId,
            config: config || null,
            status: "pending",
          })
          .returning();

        // Create the subscription
        const platformFee = Math.round(host.pricePerMonth * 0.4);
        const hostPayout = host.pricePerMonth - platformFee;

        await db.insert(subscriptions).values({
          userId: userId,
          agentId: agent.id,
          hostId: host.id,
          stripeSubscriptionId: session.subscription as string,
          pricePerMonth: host.pricePerMonth,
          hostPayoutPerMonth: hostPayout,
          platformFeePerMonth: platformFee,
          status: "active",
        });

        // Update user's stripeCustomerId if not set
        if (session.customer) {
          await db
            .update(user)
            .set({ stripeCustomerId: session.customer as string })
            .where(eq(user.id, userId));
        }
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      // Mark subscription as canceled
      await db
        .update(subscriptions)
        .set({ status: "canceled", canceledAt: new Date() })
        .where(eq(subscriptions.stripeSubscriptionId, subscription.id));
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object;
      // Update subscription status
      const newStatus =
        subscription.status === "active"
          ? "active"
          : subscription.status === "past_due"
            ? "past_due"
            : subscription.cancel_at_period_end
              ? "canceled"
              : "active";

      await db
        .update(subscriptions)
        .set({
          status: newStatus as "active" | "past_due" | "canceled" | "trialing",
          currentPeriodStart: new Date(
            (subscription as any).current_period_start * 1000
          ),
          currentPeriodEnd: new Date(
            (subscription as any).current_period_end * 1000
          ),
        })
        .where(eq(subscriptions.stripeSubscriptionId, subscription.id));
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as any;
      if (invoice.subscription) {
        await db
          .update(subscriptions)
          .set({ status: "past_due" })
          .where(
            eq(
              subscriptions.stripeSubscriptionId,
              invoice.subscription as string
            )
          );
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
