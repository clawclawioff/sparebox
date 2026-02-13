import { z } from "zod";
import { randomBytes, createHash } from "crypto";
import { router, protectedProcedure, hostProcedure } from "../trpc";
import { hosts, hostHeartbeats, hostApiKeys, agents, subscriptions } from "@/db";
import { eq, desc, and, gte, sql, not, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { API_KEY_PREFIX, API_KEY_ENTROPY_BYTES, HEARTBEAT_STALE_THRESHOLD_MS } from "@/lib/constants";

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

      // Lazy staleness check
      if (
        host.status === "active" &&
        host.lastHeartbeat &&
        Date.now() - new Date(host.lastHeartbeat).getTime() > HEARTBEAT_STALE_THRESHOLD_MS
      ) {
        ctx.db.update(hosts)
          .set({ status: "inactive", updatedAt: new Date() })
          .where(eq(hosts.id, host.id))
          .then(() => {})
          .catch(() => {});
        host.status = "inactive";
      }

      return host;
    }),

  // Create a new host
  create: hostProcedure
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
  delete: hostProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.hosts.findFirst({
        where: eq(hosts.id, input.id),
      });

      if (!existing || existing.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Host not found" });
      }

      // Check for active agents
      const activeAgents = await ctx.db.query.agents.findMany({
        where: and(
          eq(agents.hostId, input.id),
          not(eq(agents.status, "stopped"))
        ),
      });

      if (activeAgents.length > 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Cannot delete host with ${activeAgents.length} active agent(s). Stop or migrate them first.`,
        });
      }

      await ctx.db.delete(hosts).where(eq(hosts.id, input.id));

      return { success: true };
    }),

  // List all available hosts (for users looking to deploy)
  listAvailable: protectedProcedure
    .input(
      z.object({
        region: z.string().optional(),
        minRam: z.number().int().positive().optional(),
        maxPrice: z.number().int().positive().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const filters = input || {};
      const conditions = [eq(hosts.status, "active")];

      if (filters.region) {
        conditions.push(eq(hosts.region, filters.region));
      }
      if (filters.minRam) {
        conditions.push(gte(hosts.ramGb, filters.minRam));
      }
      if (filters.maxPrice) {
        conditions.push(sql`${hosts.pricePerMonth} <= ${filters.maxPrice}`);
      }

      const results = await ctx.db.query.hosts.findMany({
        where: and(...conditions),
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
          status: true,
          lastHeartbeat: true,
        },
      });

      // Lazy staleness check
      const now = Date.now();
      for (const host of results) {
        if (
          host.status === "active" &&
          host.lastHeartbeat &&
          now - new Date(host.lastHeartbeat).getTime() > HEARTBEAT_STALE_THRESHOLD_MS
        ) {
          // Fire-and-forget: mark as inactive
          ctx.db.update(hosts)
            .set({ status: "inactive", updatedAt: new Date() })
            .where(eq(hosts.id, host.id))
            .then(() => {})
            .catch(() => {});
          // Update the in-memory result too
          host.status = "inactive";
        }
      }

      // Filter out any hosts that became inactive
      return results.filter(h => h.status === "active");
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

  // =========================================================================
  // API Key Management
  // =========================================================================

  // Generate API key for a host
  generateApiKey: hostProcedure
    .input(z.object({ hostId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const host = await ctx.db.query.hosts.findFirst({
        where: eq(hosts.id, input.hostId),
      });

      if (!host || host.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Host not found" });
      }

      // Generate random API key
      const rawKey = `${API_KEY_PREFIX}${randomBytes(API_KEY_ENTROPY_BYTES).toString("hex")}`;
      const keyHash = createHash("sha256").update(rawKey).digest("hex");
      const keyPrefix = rawKey.slice(0, 12); // "sbx_host_xxx"
      const keySuffix = rawKey.slice(-4);

      // Revoke any existing active keys for this host
      await ctx.db
        .update(hostApiKeys)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(hostApiKeys.hostId, input.hostId),
            isNull(hostApiKeys.revokedAt)
          )
        );

      // Store new key hash
      await ctx.db.insert(hostApiKeys).values({
        hostId: input.hostId,
        keyHash,
        keyPrefix,
        keySuffix,
        name: "default",
      });

      // Return the raw key — shown once only
      return {
        apiKey: rawKey,
        prefix: keyPrefix,
        suffix: keySuffix,
        message: "Save this key — it won't be shown again.",
      };
    }),

  // Revoke API key for a host
  revokeApiKey: hostProcedure
    .input(z.object({ hostId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const host = await ctx.db.query.hosts.findFirst({
        where: eq(hosts.id, input.hostId),
      });

      if (!host || host.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Host not found" });
      }

      const result = await ctx.db
        .update(hostApiKeys)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(hostApiKeys.hostId, input.hostId),
            isNull(hostApiKeys.revokedAt)
          )
        )
        .returning({ id: hostApiKeys.id });

      if (result.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No active API key found for this host",
        });
      }

      return { success: true };
    }),

  // Get API key info (metadata only — never the raw key)
  getApiKeyInfo: hostProcedure
    .input(z.object({ hostId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Verify ownership
      const host = await ctx.db.query.hosts.findFirst({
        where: eq(hosts.id, input.hostId),
      });

      if (!host || host.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Host not found" });
      }

      const activeKey = await ctx.db.query.hostApiKeys.findFirst({
        where: and(
          eq(hostApiKeys.hostId, input.hostId),
          isNull(hostApiKeys.revokedAt)
        ),
        columns: {
          id: true,
          keyPrefix: true,
          keySuffix: true,
          name: true,
          lastUsedAt: true,
          expiresAt: true,
          createdAt: true,
        },
      });

      return activeKey || null;
    }),
});
