import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../trpc";
import { agents, hosts, subscriptions } from "@/db";
import { eq, and } from "drizzle-orm";

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
        throw new Error("Agent not found");
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
        throw new Error("Host not available");
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
      const platformFee = Math.round(host.pricePerMonth * 0.4); // 40%
      const hostPayout = host.pricePerMonth - platformFee; // 60%

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
        throw new Error("Agent not found");
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
        throw new Error("Agent not found");
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
        throw new Error("Agent not found");
      }

      if (!existing.hostId) {
        throw new Error("Agent has no host assigned");
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
        throw new Error("Agent not found");
      }

      // TODO: Stop agent on host first

      // Delete subscriptions
      await ctx.db
        .delete(subscriptions)
        .where(eq(subscriptions.agentId, input.id));

      // Delete agent
      await ctx.db.delete(agents).where(eq(agents.id, input.id));

      return { success: true };
    }),
});
