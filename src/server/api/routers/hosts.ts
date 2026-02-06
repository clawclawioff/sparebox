import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { hosts, hostHeartbeats, agents, subscriptions } from "@/db";
import { eq, desc, and, gte, sql } from "drizzle-orm";

export const hostsRouter = router({
  // List hosts for the current user
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.hosts.findMany({
      where: eq(hosts.userId, ctx.user.id),
      orderBy: (hosts, { desc }) => [desc(hosts.createdAt)],
    });
  }),

  // Get a single host
  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const host = await ctx.db.query.hosts.findFirst({
        where: eq(hosts.id, input.id),
        with: {
          agents: true,
        },
      });

      if (!host || host.userId !== ctx.user.id) {
        throw new Error("Host not found");
      }

      return host;
    }),

  // Create a new host
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
        cpuCores: z.number().int().positive().optional(),
        ramGb: z.number().int().positive().optional(),
        storageGb: z.number().int().positive().optional(),
        osInfo: z.string().optional(),
        region: z.string().optional(),
        country: z.string().optional(),
        city: z.string().optional(),
        pricePerMonth: z.number().int().positive().default(1000), // cents
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [host] = await ctx.db
        .insert(hosts)
        .values({
          ...input,
          userId: ctx.user.id,
          status: "pending",
        })
        .returning();

      return host;
    }),

  // Update a host
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().max(500).optional(),
        pricePerMonth: z.number().int().positive().optional(),
        status: z.enum(["active", "inactive"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // Verify ownership
      const existing = await ctx.db.query.hosts.findFirst({
        where: eq(hosts.id, id),
      });

      if (!existing || existing.userId !== ctx.user.id) {
        throw new Error("Host not found");
      }

      const [updated] = await ctx.db
        .update(hosts)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(hosts.id, id))
        .returning();

      return updated;
    }),

  // Delete a host
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.hosts.findFirst({
        where: eq(hosts.id, input.id),
      });

      if (!existing || existing.userId !== ctx.user.id) {
        throw new Error("Host not found");
      }

      await ctx.db.delete(hosts).where(eq(hosts.id, input.id));

      return { success: true };
    }),

  // List all available hosts (for users looking to deploy)
  listAvailable: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.hosts.findMany({
      where: eq(hosts.status, "active"),
      orderBy: (hosts, { asc }) => [asc(hosts.pricePerMonth)],
      columns: {
        id: true,
        name: true,
        description: true,
        cpuCores: true,
        ramGb: true,
        storageGb: true,
        region: true,
        country: true,
        city: true,
        pricePerMonth: true,
        uptimePercent: true,
      },
    });
  }),

  // Get host stats (earnings, agent count, etc.)
  getStats: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Verify ownership
      const host = await ctx.db.query.hosts.findFirst({
        where: eq(hosts.id, input.id),
      });

      if (!host || host.userId !== ctx.user.id) {
        throw new Error("Host not found");
      }

      // Get hosted agent count
      const hostedAgents = await ctx.db.query.agents.findMany({
        where: eq(agents.hostId, input.id),
      });

      // Get current month earnings from subscriptions
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const activeSubscriptions = await ctx.db.query.subscriptions.findMany({
        where: and(
          eq(subscriptions.hostId, input.id),
          eq(subscriptions.status, "active")
        ),
      });

      // Calculate monthly earnings (host's 60% cut)
      const monthlyEarnings = activeSubscriptions.reduce(
        (sum, sub) => sum + (sub.hostPayoutPerMonth || 0),
        0
      );

      return {
        hostedAgentCount: hostedAgents.length,
        monthlyEarnings,
        totalEarnings: host.totalEarnings || 0,
        uptimePercent: host.uptimePercent || 100,
        agents: hostedAgents.map((a) => ({
          id: a.id,
          name: a.name,
          status: a.status,
          createdAt: a.createdAt,
        })),
      };
    }),

  // Get latest heartbeat metrics
  getMetrics: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Verify ownership
      const host = await ctx.db.query.hosts.findFirst({
        where: eq(hosts.id, input.id),
      });

      if (!host || host.userId !== ctx.user.id) {
        throw new Error("Host not found");
      }

      // Get latest heartbeat
      const latestHeartbeat = await ctx.db.query.hostHeartbeats.findFirst({
        where: eq(hostHeartbeats.hostId, input.id),
        orderBy: [desc(hostHeartbeats.createdAt)],
      });

      // Get last 24h of heartbeats for history
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentHeartbeats = await ctx.db.query.hostHeartbeats.findMany({
        where: and(
          eq(hostHeartbeats.hostId, input.id),
          gte(hostHeartbeats.createdAt, oneDayAgo)
        ),
        orderBy: [desc(hostHeartbeats.createdAt)],
        limit: 100,
      });

      return {
        latest: latestHeartbeat
          ? {
              cpuUsage: latestHeartbeat.cpuUsage,
              ramUsage: latestHeartbeat.ramUsage,
              diskUsage: latestHeartbeat.diskUsage,
              agentCount: latestHeartbeat.agentCount,
              timestamp: latestHeartbeat.createdAt,
            }
          : null,
        history: recentHeartbeats.map((h) => ({
          cpuUsage: h.cpuUsage,
          ramUsage: h.ramUsage,
          diskUsage: h.diskUsage,
          timestamp: h.createdAt,
        })),
      };
    }),
});
