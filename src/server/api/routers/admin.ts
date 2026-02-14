import { z } from "zod";
import { router, adminProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { db } from "@/db";
import {
  user,
  hosts,
  agents,
  subscriptions,
  agentMessages,
  hostHeartbeats,
} from "@/db/schema";
import { eq, and, desc, count, sum, sql } from "drizzle-orm";
import { sendHostApprovedEmail, sendHostRejectedEmail } from "@/lib/email/notifications";

export const adminRouter = router({
  // =========================================================================
  // System Stats
  // =========================================================================
  getSystemStats: adminProcedure.query(async ({ ctx }) => {
    const [userCount] = await ctx.db
      .select({ value: count() })
      .from(user);

    const [hostCount] = await ctx.db
      .select({ value: count() })
      .from(hosts);

    const [activeHostCount] = await ctx.db
      .select({ value: count() })
      .from(hosts)
      .where(eq(hosts.status, "active"));

    const [pendingHostCount] = await ctx.db
      .select({ value: count() })
      .from(hosts)
      .where(eq(hosts.status, "pending"));

    const [agentCount] = await ctx.db
      .select({ value: count() })
      .from(agents)
      .where(sql`${agents.status} != 'deleted'`);

    const [runningAgentCount] = await ctx.db
      .select({ value: count() })
      .from(agents)
      .where(eq(agents.status, "running"));

    const [activeSubCount] = await ctx.db
      .select({ value: count() })
      .from(subscriptions)
      .where(eq(subscriptions.status, "active"));

    const [revenueResult] = await ctx.db
      .select({
        total: sum(subscriptions.platformFeePerMonth),
      })
      .from(subscriptions)
      .where(eq(subscriptions.status, "active"));

    const [messageCount] = await ctx.db
      .select({ value: count() })
      .from(agentMessages);

    return {
      users: userCount?.value ?? 0,
      hosts: hostCount?.value ?? 0,
      activeHosts: activeHostCount?.value ?? 0,
      pendingHosts: pendingHostCount?.value ?? 0,
      agents: agentCount?.value ?? 0,
      runningAgents: runningAgentCount?.value ?? 0,
      activeSubscriptions: activeSubCount?.value ?? 0,
      monthlyRevenue: Number(revenueResult?.total ?? 0), // cents
      totalMessages: messageCount?.value ?? 0,
    };
  }),

  // =========================================================================
  // Users
  // =========================================================================
  listUsers: adminProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).default(50),
        offset: z.number().int().min(0).default(0),
        role: z
          .enum(["default", "deployer", "host", "admin"])
          .optional(),
        search: z.string().max(100).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [];
      if (input.role) {
        conditions.push(eq(user.role, input.role));
      }
      if (input.search) {
        conditions.push(
          sql`(${user.name} ILIKE ${`%${input.search}%`} OR ${user.email} ILIKE ${`%${input.search}%`})`
        );
      }

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      const [users, [totalResult]] = await Promise.all([
        ctx.db
          .select({
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            emailVerified: user.emailVerified,
            image: user.image,
            createdAt: user.createdAt,
          })
          .from(user)
          .where(whereClause)
          .orderBy(desc(user.createdAt))
          .limit(input.limit)
          .offset(input.offset),
        ctx.db.select({ value: count() }).from(user).where(whereClause),
      ]);

      return {
        users,
        total: totalResult?.value ?? 0,
      };
    }),

  updateUserRole: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        role: z.enum(["default", "deployer", "host", "admin"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Don't let admin demote themselves
      if (input.userId === ctx.user.id && input.role !== "admin") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot change your own role",
        });
      }

      const [updated] = await ctx.db
        .update(user)
        .set({ role: input.role, updatedAt: new Date() })
        .where(eq(user.id, input.userId))
        .returning({ id: user.id, role: user.role });

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      return updated;
    }),

  suspendUser: adminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot suspend yourself",
        });
      }

      // Set role to default (effectively locks them out of features)
      const [updated] = await ctx.db
        .update(user)
        .set({ role: "default", updatedAt: new Date() })
        .where(eq(user.id, input.userId))
        .returning({ id: user.id });

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      return { success: true };
    }),

  // =========================================================================
  // Hosts
  // =========================================================================
  listHosts: adminProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).default(50),
        offset: z.number().int().min(0).default(0),
        status: z
          .enum(["pending", "active", "inactive", "suspended"])
          .optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [];
      if (input.status) {
        conditions.push(eq(hosts.status, input.status));
      }

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      const [hostList, [totalResult]] = await Promise.all([
        ctx.db.query.hosts.findMany({
          where: whereClause,
          with: {
            user: { columns: { email: true, name: true } },
            agents: {
              columns: { id: true, status: true },
              where: sql`${agents.status} != 'deleted'`,
            },
          },
          orderBy: [desc(hosts.createdAt)],
          limit: input.limit,
          offset: input.offset,
        }),
        ctx.db.select({ value: count() }).from(hosts).where(whereClause),
      ]);

      return {
        hosts: hostList.map((h) => ({
          id: h.id,
          name: h.name,
          status: h.status,
          region: h.region,
          country: h.country,
          city: h.city,
          cpuCores: h.cpuCores,
          ramGb: h.ramGb,
          isolationMode: h.isolationMode,
          lastHeartbeat: h.lastHeartbeat,
          specsVerified: h.specsVerified,
          createdAt: h.createdAt,
          owner: h.user,
          agentCount: h.agents.length,
          runningAgents: h.agents.filter((a) => a.status === "running").length,
        })),
        total: totalResult?.value ?? 0,
      };
    }),

  approveHost: adminProcedure
    .input(z.object({ hostId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const host = await ctx.db.query.hosts.findFirst({
        where: eq(hosts.id, input.hostId),
        columns: { id: true, status: true, name: true, userId: true },
      });

      if (!host) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Host not found" });
      }

      if (host.status !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Host is ${host.status}, not pending`,
        });
      }

      await ctx.db
        .update(hosts)
        .set({ status: "active", updatedAt: new Date() })
        .where(eq(hosts.id, input.hostId));

      // Send approval email (fire-and-forget)
      (async () => {
        try {
          const hostOwner = await ctx.db.query.user.findFirst({
            where: eq(user.id, host.userId),
            columns: { email: true },
          });
          if (hostOwner?.email) {
            await sendHostApprovedEmail(hostOwner.email, {
              hostName: host.name,
              hostId: host.id,
            });
          }
        } catch (err) {
          console.error("[email] Failed to send host approved email:", err);
        }
      })();

      return { success: true };
    }),

  rejectHost: adminProcedure
    .input(
      z.object({
        hostId: z.string().uuid(),
        reason: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const host = await ctx.db.query.hosts.findFirst({
        where: eq(hosts.id, input.hostId),
        columns: { id: true, status: true, name: true, userId: true },
      });

      if (!host) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Host not found" });
      }

      await ctx.db
        .update(hosts)
        .set({ status: "suspended", updatedAt: new Date() })
        .where(eq(hosts.id, input.hostId));

      // Send rejection email (fire-and-forget)
      (async () => {
        try {
          const hostOwner = await ctx.db.query.user.findFirst({
            where: eq(user.id, host.userId),
            columns: { email: true },
          });
          if (hostOwner?.email) {
            await sendHostRejectedEmail(hostOwner.email, {
              hostName: host.name,
              reason: input.reason,
            });
          }
        } catch (err) {
          console.error("[email] Failed to send host rejected email:", err);
        }
      })();

      return { success: true };
    }),

  suspendHost: adminProcedure
    .input(z.object({ hostId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(hosts)
        .set({ status: "suspended", updatedAt: new Date() })
        .where(eq(hosts.id, input.hostId))
        .returning({ id: hosts.id });

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Host not found" });
      }

      return { success: true };
    }),

  // =========================================================================
  // Agents
  // =========================================================================
  listAgents: adminProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).default(50),
        offset: z.number().int().min(0).default(0),
        status: z
          .enum(["pending", "deploying", "running", "stopped", "failed", "deleted"])
          .optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [];
      if (input.status) {
        conditions.push(eq(agents.status, input.status));
      } else {
        // Default: exclude deleted
        conditions.push(sql`${agents.status} != 'deleted'`);
      }

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      const [agentList, [totalResult]] = await Promise.all([
        ctx.db.query.agents.findMany({
          where: whereClause,
          with: {
            user: { columns: { email: true, name: true } },
            host: { columns: { name: true, id: true } },
          },
          orderBy: [desc(agents.createdAt)],
          limit: input.limit,
          offset: input.offset,
        }),
        ctx.db.select({ value: count() }).from(agents).where(whereClause),
      ]);

      return {
        agents: agentList.map((a) => ({
          id: a.id,
          name: a.name,
          status: a.status,
          tier: a.tier,
          isolationMode: a.isolationMode,
          lastActive: a.lastActive,
          createdAt: a.createdAt,
          owner: a.user,
          host: a.host,
        })),
        total: totalResult?.value ?? 0,
      };
    }),

  forceStopAgent: adminProcedure
    .input(z.object({ agentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const agent = await ctx.db.query.agents.findFirst({
        where: eq(agents.id, input.agentId),
        columns: { id: true, hostId: true, status: true },
      });

      if (!agent) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Agent not found" });
      }

      if (agent.status === "deleted") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Agent is already deleted",
        });
      }

      // Update agent status
      await ctx.db
        .update(agents)
        .set({ status: "stopped", updatedAt: new Date() })
        .where(eq(agents.id, input.agentId));

      // Queue stop command if agent has a host
      if (agent.hostId) {
        const { agentCommands } = await import("@/db/schema");
        await ctx.db.insert(agentCommands).values({
          agentId: input.agentId,
          hostId: agent.hostId,
          type: "stop",
          payload: {},
          status: "pending",
        });
      }

      return { success: true };
    }),

  // =========================================================================
  // Activity Feed (recent events)
  // =========================================================================
  getRecentActivity: adminProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      // Get recent users, hosts, agents
      const [recentUsers, recentHosts, recentAgents] = await Promise.all([
        ctx.db
          .select({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt,
          })
          .from(user)
          .orderBy(desc(user.createdAt))
          .limit(5),
        ctx.db
          .select({
            id: hosts.id,
            name: hosts.name,
            status: hosts.status,
            createdAt: hosts.createdAt,
          })
          .from(hosts)
          .orderBy(desc(hosts.createdAt))
          .limit(5),
        ctx.db
          .select({
            id: agents.id,
            name: agents.name,
            status: agents.status,
            tier: agents.tier,
            createdAt: agents.createdAt,
          })
          .from(agents)
          .where(sql`${agents.status} != 'deleted'`)
          .orderBy(desc(agents.createdAt))
          .limit(5),
      ]);

      type ActivityItem = {
        type: "user_signup" | "host_registered" | "agent_deployed";
        id: string;
        label: string;
        detail: string;
        timestamp: Date;
      };

      const activities: ActivityItem[] = [
        ...recentUsers.map((u) => ({
          type: "user_signup" as const,
          id: u.id,
          label: u.name || u.email,
          detail: `Signed up as ${u.role}`,
          timestamp: u.createdAt,
        })),
        ...recentHosts.map((h) => ({
          type: "host_registered" as const,
          id: h.id,
          label: h.name,
          detail: `Host ${h.status}`,
          timestamp: h.createdAt,
        })),
        ...recentAgents.map((a) => ({
          type: "agent_deployed" as const,
          id: a.id,
          label: a.name,
          detail: `${a.tier} tier — ${a.status}`,
          timestamp: a.createdAt,
        })),
      ];

      // Sort by timestamp desc
      activities.sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
      );

      return activities.slice(0, input.limit);
    }),
});
