import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { getStripe } from "@/lib/stripe";
import { hosts, user, subscriptions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { PLATFORM_FEE_PERCENT } from "@/lib/constants";

export const billingRouter = router({
  createCheckoutSession: protectedProcedure
    .input(
      z.object({
        agentName: z.string().min(1).max(100),
        hostId: z.string().uuid(),
        config: z.string().optional(),
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
                description: `Hosted on ${host.name} (${host.cpuCores} cores, ${host.ramGb}GB RAM)`,
              },
              unit_amount: host.pricePerMonth, // already in cents
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
          config: input.config || "",
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
        agent: { columns: { id: true, name: true, status: true } },
        host: { columns: { id: true, name: true, region: true } },
      },
      orderBy: (s, { desc }) => [desc(s.createdAt)],
    });

    return subs;
  }),
});
