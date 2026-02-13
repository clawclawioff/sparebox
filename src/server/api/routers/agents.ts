import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { agents, hosts, subscriptions } from "@/db";
import { eq, and } from "drizzle-orm";
import { PLATFORM_FEE_PERCENT } from "@/lib/constants";
import Stripe from "stripe";

export const agentsRouter = router({
  // List agents for the current user
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.agents.findMany({
      where: eq(agents.userId, ctx.user.id),
      with: {
        host: {
          columns: {
            id: true,
            name: true,
            status: true,
            region: true,
          },
        },
      },
      orderBy: (agents, { desc }) => [desc(agents.createdAt)],
    });
  }),

  // Get a single agent
  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const agent = await ctx.db.query.agents.findFirst({
        where: eq(agents.id, input.id),
        with: {
          host: true,
          subscriptions: true,
        },
      });

      if (!agent || agent.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Agent not found",
        });
      }

      return agent;
    }),

  // Create/deploy a new agent (admin only - normal flow is via Stripe checkout)
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        hostId: z.string().uuid(),
        config: z.string().optional(), // JSON config
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify host exists and is available
      const host = await ctx.db.query.hosts.findFirst({
        where: and(eq(hosts.id, input.hostId), eq(hosts.status, "active")),
      });

      if (!host) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Host not available",
        });
      }

      // Check for duplicate agent name per user
      const existingAgent = await ctx.db.query.agents.findFirst({
        where: and(eq(agents.userId, ctx.user.id), eq(agents.name, input.name)),
      });

      if (existingAgent) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "You already have an agent with this name. Please choose a different name.",
        });
      }

      // Create the agent
      const [agent] = await ctx.db
        .insert(agents)
        .values({
          name: input.name,
          userId: ctx.user.id,
          hostId: input.hostId,
          config: input.config,
          status: "pending",
        })
        .returning();

      // Create the subscription
      const platformFee = Math.round(host.pricePerMonth * (PLATFORM_FEE_PERCENT / 100));
      const hostPayout = host.pricePerMonth - platformFee;

      await ctx.db.insert(subscriptions).values({
        userId: ctx.user.id,
        agentId: agent.id,
        hostId: host.id,
        pricePerMonth: host.pricePerMonth,
        hostPayoutPerMonth: hostPayout,
        platformFeePerMonth: platformFee,
        status: "active",
      });

      // TODO: Trigger actual deployment to host

      return agent;
    }),

  // Update an agent
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(100).optional(),
        config: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const existing = await ctx.db.query.agents.findFirst({
        where: eq(agents.id, id),
      });

      if (!existing || existing.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Agent not found",
        });
      }

      const [updated] = await ctx.db
        .update(agents)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(agents.id, id))
        .returning();

      return updated;
    }),

  // Stop an agent
  stop: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.agents.findFirst({
        where: eq(agents.id, input.id),
      });

      if (!existing || existing.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Agent not found",
        });
      }

      // TODO: Send stop command to host

      const [updated] = await ctx.db
        .update(agents)
        .set({ status: "stopped", updatedAt: new Date() })
        .where(eq(agents.id, input.id))
        .returning();

      return updated;
    }),

  // Start an agent
  start: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.agents.findFirst({
        where: eq(agents.id, input.id),
      });

      if (!existing || existing.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Agent not found",
        });
      }

      if (!existing.hostId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Agent has no host assigned",
        });
      }

      // TODO: Send start command to host

      const [updated] = await ctx.db
        .update(agents)
        .set({ status: "deploying", updatedAt: new Date() })
        .where(eq(agents.id, input.id))
        .returning();

      return updated;
    }),

  // Delete an agent
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.agents.findFirst({
        where: eq(agents.id, input.id),
      });

      if (!existing || existing.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Agent not found",
        });
      }

      // TODO: Stop agent on host first

      // Cancel active Stripe subscriptions before deleting DB records
      const agentSubs = await ctx.db.query.subscriptions.findMany({
        where: and(
          eq(subscriptions.agentId, input.id),
          eq(subscriptions.status, "active")
        ),
      });

      if (agentSubs.length > 0) {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
        for (const sub of agentSubs) {
          if (sub.stripeSubscriptionId) {
            try {
              await stripe.subscriptions.cancel(sub.stripeSubscriptionId);
            } catch (e) {
              console.error(`Failed to cancel Stripe sub ${sub.stripeSubscriptionId}:`, e);
            }
          }
        }
      }

      // Delete subscriptions
      await ctx.db
        .delete(subscriptions)
        .where(eq(subscriptions.agentId, input.id));

      // Delete agent
      await ctx.db.delete(agents).where(eq(agents.id, input.id));

      return { success: true };
    }),
});
