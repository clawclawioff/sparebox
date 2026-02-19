import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { getStripe } from "@/lib/stripe";
import { hosts, user, subscriptions, agents } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { PLATFORM_FEE_PERCENT, TIERS, type TierKey } from "@/lib/constants";
import { encrypt } from "@/lib/encryption";

export const billingRouter = router({
  createCheckoutSession: protectedProcedure
    .input(
      z.object({
        agentName: z.string().min(1).max(100),
        hostId: z.string().uuid(),
        tier: z.enum(["lite", "standard", "pro", "compute"]).default("standard"),
        config: z.string().optional(),
        apiKey: z.string().optional(),
        provider: z.enum(["anthropic", "openai"]).default("anthropic"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify host exists and is active
      const host = await ctx.db.query.hosts.findFirst({
        where: and(eq(hosts.id, input.hostId), eq(hosts.status, "active")),
      });

      if (!host) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Host not available",
        });
      }

      // Resolve tier price
      const tierPriceMap: Record<string, number | null> = {
        lite: host.priceLite,
        standard: host.priceStandard,
        pro: host.pricePro,
        compute: host.priceCompute,
      };

      const tierPrice = tierPriceMap[input.tier];

      // Fall back to pricePerMonth for backward compat (existing hosts without tier pricing)
      const price = tierPrice ?? host.pricePerMonth;

      if (!price || price <= 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Host does not offer the ${input.tier} tier`,
        });
      }

      const tierInfo = TIERS[input.tier as TierKey];

      // Look up the host's user to get their Connect account
      const hostUser = await ctx.db.query.user.findFirst({
        where: eq(user.id, host.userId),
      });

      // Build subscription_data — route funds to host if they have a Connect account
      const subscriptionData: Record<string, unknown> = {};
      if (hostUser?.stripeConnectAccountId) {
        subscriptionData.application_fee_percent = PLATFORM_FEE_PERCENT;
        subscriptionData.transfer_data = {
          destination: hostUser.stripeConnectAccountId,
        };
      }

      // Create Stripe Checkout session
      const session = await getStripe().checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        customer_email: ctx.user.email,
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `AI Agent: ${input.agentName}`,
                description: `${tierInfo.name} Tier (${tierInfo.ramMb / 1024}GB RAM, ${tierInfo.cpuCores} CPU) on ${host.name}`,
              },
              unit_amount: price,
              recurring: {
                interval: "month",
              },
            },
            quantity: 1,
          },
        ],
        ...(Object.keys(subscriptionData).length > 0
          ? { subscription_data: subscriptionData }
          : {}),
        metadata: {
          userId: ctx.user.id,
          agentName: input.agentName,
          hostId: input.hostId,
          tier: input.tier,
          config: input.config || "",
          apiKey: input.apiKey || "",
          provider: input.provider,
        },
        success_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://www.sparebox.dev"}/dashboard/agents?deployed=true`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://www.sparebox.dev"}/dashboard/agents/new`,
      });

      return { url: session.url };
    }),

  getMySubscriptions: protectedProcedure.query(async ({ ctx }) => {
    const subs = await ctx.db.query.subscriptions.findMany({
      where: eq(subscriptions.userId, ctx.user.id),
      with: {
        agent: { columns: { id: true, name: true, status: true, tier: true } },
        host: { columns: { id: true, name: true, region: true } },
      },
      orderBy: (s, { desc }) => [desc(s.createdAt)],
    });

    return subs;
  }),

  cancelSubscription: protectedProcedure
    .input(z.object({ subscriptionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Find the subscription and verify ownership
      const sub = await ctx.db.query.subscriptions.findFirst({
        where: and(
          eq(subscriptions.id, input.subscriptionId),
          eq(subscriptions.userId, ctx.user.id)
        ),
      });

      if (!sub) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Subscription not found",
        });
      }

      if (sub.status === "canceled") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Subscription is already canceled",
        });
      }

      // Cancel in Stripe
      if (sub.stripeSubscriptionId) {
        try {
          await getStripe().subscriptions.cancel(sub.stripeSubscriptionId);
        } catch (err) {
          console.error("Stripe cancel error:", err);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to cancel subscription with Stripe",
          });
        }
      }

      const now = new Date();

      // Update subscription status in DB
      await ctx.db
        .update(subscriptions)
        .set({
          status: "canceled",
          canceledAt: now,
          updatedAt: now,
        })
        .where(eq(subscriptions.id, sub.id));

      // Stop the agent
      await ctx.db
        .update(agents)
        .set({
          status: "stopped",
          updatedAt: now,
        })
        .where(eq(agents.id, sub.agentId));

      return { success: true };
    }),

  getInvoices: protectedProcedure.query(async ({ ctx }) => {
    const stripeCustomerId = ctx.user.stripeCustomerId;

    if (!stripeCustomerId) {
      return [];
    }

    try {
      const invoiceList = await getStripe().invoices.list({
        customer: stripeCustomerId,
        limit: 20,
      });

      return invoiceList.data.map((inv) => ({
        id: inv.id,
        amountDue: inv.amount_due,
        amountPaid: inv.amount_paid,
        status: inv.status,
        created: inv.created,
        invoicePdf: inv.invoice_pdf,
        hostedInvoiceUrl: inv.hosted_invoice_url,
        description: inv.description || inv.lines?.data?.[0]?.description || null,
      }));
    } catch (err) {
      console.error("Stripe invoices list error:", err);
      return [];
    }
  }),

  createPortalSession: protectedProcedure.mutation(async ({ ctx }) => {
    const stripeCustomerId = ctx.user.stripeCustomerId;

    if (!stripeCustomerId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No billing account found. Subscribe to an agent first.",
      });
    }

    try {
      const portalSession = await getStripe().billingPortal.sessions.create({
        customer: stripeCustomerId,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://www.sparebox.dev"}/dashboard/billing`,
      });

      return { url: portalSession.url };
    } catch (err) {
      console.error("Stripe portal session error:", err);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create billing portal session",
      });
    }
  }),
});
