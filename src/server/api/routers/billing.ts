import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { getStripe } from "@/lib/stripe";
import { hosts } from "@/db/schema";
import { eq, and } from "drizzle-orm";

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
        throw new Error("Host not available");
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
        metadata: {
          userId: ctx.user.id,
          agentName: input.agentName,
          hostId: input.hostId,
          config: input.config || "",
        },
        success_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://sparebox.dev"}/dashboard/agents?deployed=true`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://sparebox.dev"}/dashboard/agents/new`,
      });

      return { url: session.url };
    }),
});
