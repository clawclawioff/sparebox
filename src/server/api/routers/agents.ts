import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { agents, hosts, subscriptions, agentCommands } from "@/db";
import { eq, and, desc, not } from "drizzle-orm";
import { PLATFORM_FEE_PERCENT, TIERS, type TierKey } from "@/lib/constants";
import { encrypt } from "@/lib/encryption";
import Stripe from "stripe";

export const agentsRouter = router({
  // List agents for the current user (excludes soft-deleted)
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.agents.findMany({
      where: and(
        eq(agents.userId, ctx.user.id),
        not(eq(agents.status, "deleted"))
      ),
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

  // Stop an agent (via command queue)
  stop: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.agents.findFirst({
        where: eq(agents.id, input.id),
      });

      if (!existing || existing.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Agent not found" });
      }

      // Queue stop command if agent is on a host
      if (existing.hostId) {
        await ctx.db.insert(agentCommands).values({
          agentId: existing.id,
          hostId: existing.hostId,
          type: "stop",
          payload: { profile: `sparebox-agent-${existing.id.slice(0, 8)}` },
          status: "pending",
        });
      }

      const [updated] = await ctx.db
        .update(agents)
        .set({ status: "stopped", updatedAt: new Date() })
        .where(eq(agents.id, input.id))
        .returning();

      return updated;
    }),

  // Start an agent (via command queue)
  start: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.agents.findFirst({
        where: eq(agents.id, input.id),
      });

      if (!existing || existing.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Agent not found" });
      }

      if (!existing.hostId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Agent has no host assigned" });
      }

      const tier = TIERS[(existing.tier as TierKey) || "standard"] || TIERS.standard;

      await ctx.db.insert(agentCommands).values({
        agentId: existing.id,
        hostId: existing.hostId,
        type: "start",
        payload: {
          profile: `sparebox-agent-${existing.id.slice(0, 8)}`,
          configUrl: `/api/agents/${existing.id}/deploy-config`,
          resources: {
            ramMb: tier.ramMb,
            cpuCores: tier.cpuCores,
            diskGb: tier.diskGb,
          },
        },
        status: "pending",
      });

      const [updated] = await ctx.db
        .update(agents)
        .set({ status: "deploying", updatedAt: new Date() })
        .where(eq(agents.id, input.id))
        .returning();

      return updated;
    }),

  // Send a command to the host daemon for an agent
  sendCommand: protectedProcedure
    .input(
      z.object({
        agentId: z.string().uuid(),
        type: z.enum(["deploy", "start", "stop", "restart", "undeploy", "update_config"]),
        payload: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const agent = await ctx.db.query.agents.findFirst({
        where: eq(agents.id, input.agentId),
      });

      if (!agent || agent.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Agent not found" });
      }

      if (!agent.hostId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Agent has no host assigned" });
      }

      // Build command payload
      const tier = TIERS[(agent.tier as TierKey) || "standard"] || TIERS.standard;
      const commandPayload = {
        ...input.payload,
        profile: `sparebox-agent-${agent.id.slice(0, 8)}`,
        tier: agent.tier,
        resources: {
          ramMb: tier.ramMb,
          cpuCores: tier.cpuCores,
          diskGb: tier.diskGb,
        },
        configUrl: `/api/agents/${agent.id}/deploy-config`,
      };

      const [command] = await ctx.db
        .insert(agentCommands)
        .values({
          agentId: agent.id,
          hostId: agent.hostId,
          type: input.type,
          payload: commandPayload,
          status: "pending",
        })
        .returning();

      // Update agent status based on command type
      const statusMap: Record<string, string> = {
        deploy: "deploying",
        start: "deploying",
        stop: "stopped",
        restart: "deploying",
        undeploy: "stopped",
      };

      const newStatus = statusMap[input.type];
      if (newStatus) {
        await ctx.db
          .update(agents)
          .set({ status: newStatus as any, updatedAt: new Date() })
          .where(eq(agents.id, agent.id));
      }

      return { commandId: command.id, status: command.status };
    }),

  // Update agent configuration (and trigger re-deploy)
  updateConfig: protectedProcedure
    .input(
      z.object({
        agentId: z.string().uuid(),
        config: z.record(z.string(), z.unknown()).optional(),
        workspaceFiles: z.record(z.string(), z.string()).optional(),
        apiKey: z.string().optional(), // Plaintext — will be encrypted
        tier: z.enum(["lite", "standard", "pro", "compute"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const agent = await ctx.db.query.agents.findFirst({
        where: eq(agents.id, input.agentId),
      });

      if (!agent || agent.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Agent not found" });
      }

      // Build update set
      const updateData: Record<string, unknown> = { updatedAt: new Date() };

      if (input.config !== undefined) {
        updateData.config = input.config;
      }
      if (input.workspaceFiles !== undefined) {
        updateData.workspaceFiles = input.workspaceFiles;
      }
      if (input.apiKey !== undefined) {
        updateData.encryptedApiKey = encrypt(input.apiKey);
      }
      if (input.tier !== undefined) {
        updateData.tier = input.tier;
      }

      const [updated] = await ctx.db
        .update(agents)
        .set(updateData)
        .where(eq(agents.id, input.agentId))
        .returning();

      // If agent is deployed and running, send update_config command
      if (agent.hostId && (agent.status === "running" || agent.status === "deploying")) {
        const tier = TIERS[((input.tier || agent.tier) as TierKey) || "standard"] || TIERS.standard;
        await ctx.db.insert(agentCommands).values({
          agentId: agent.id,
          hostId: agent.hostId,
          type: "update_config",
          payload: {
            profile: `sparebox-agent-${agent.id.slice(0, 8)}`,
            configUrl: `/api/agents/${agent.id}/deploy-config`,
            resources: {
              ramMb: tier.ramMb,
              cpuCores: tier.cpuCores,
              diskGb: tier.diskGb,
            },
          },
          status: "pending",
        });
      }

      return updated;
    }),

  // Get recent commands for an agent
  getCommands: protectedProcedure
    .input(z.object({ agentId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const agent = await ctx.db.query.agents.findFirst({
        where: eq(agents.id, input.agentId),
        columns: { userId: true },
      });

      if (!agent || agent.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Agent not found" });
      }

      return ctx.db.query.agentCommands.findMany({
        where: eq(agentCommands.agentId, input.agentId),
        orderBy: [desc(agentCommands.createdAt)],
        limit: 20,
      });
    }),

  // Delete an agent (soft delete — preserves subscription/earnings history)
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

      if (existing.status === "deleted") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Agent is already deleted",
        });
      }

      // Send undeploy command to host
      if (existing.hostId) {
        await ctx.db.insert(agentCommands).values({
          agentId: existing.id,
          hostId: existing.hostId,
          type: "undeploy",
          payload: { profile: `sparebox-agent-${existing.id.slice(0, 8)}` },
          status: "pending",
        });
      }

      // Cancel active Stripe subscriptions
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

      // Soft delete: mark subscriptions as canceled, keep rows for history
      await ctx.db
        .update(subscriptions)
        .set({ status: "canceled", updatedAt: new Date() })
        .where(eq(subscriptions.agentId, input.id));

      // Soft delete agent: mark as "deleted", keep row for billing/earnings history
      await ctx.db
        .update(agents)
        .set({
          status: "deleted",
          containerId: null,
          updatedAt: new Date(),
        })
        .where(eq(agents.id, input.id));

      return { success: true };
    }),
});
