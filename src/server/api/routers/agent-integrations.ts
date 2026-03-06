import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { agents, agentIntegrations, agentCommands } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { encrypt, decrypt } from "@/lib/encryption";
import { INTEGRATIONS_REGISTRY } from "@/lib/integrations-registry";
import { db } from "@/db";

async function verifyOwnership(ctx: { db: typeof db; user: { id: string } }, agentId: string) {
  const agent = await ctx.db.query.agents.findFirst({
    where: eq(agents.id, agentId),
    columns: { id: true, userId: true, hostId: true, status: true },
  });
  if (!agent || agent.userId !== ctx.user.id) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Agent not found" });
  }
  return agent;
}

function maskCredentials(encryptedJson: string): Record<string, string> {
  try {
    const parsed = JSON.parse(decrypt(encryptedJson)) as Record<string, string>;
    const masked: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string" && value.length > 4) {
        masked[key] = "••••" + value.slice(-4);
      } else {
        masked[key] = "••••••••";
      }
    }
    return masked;
  } catch {
    return {};
  }
}

export const agentIntegrationsRouter = router({
  getRegistry: publicProcedure.query(() => INTEGRATIONS_REGISTRY),

  list: protectedProcedure
    .input(z.object({ agentId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await verifyOwnership(ctx, input.agentId);
      const integrations = await ctx.db.query.agentIntegrations.findMany({
        where: eq(agentIntegrations.agentId, input.agentId),
        orderBy: (i, { asc }) => [asc(i.integrationId)],
      });
      return integrations.map(i => ({
        id: i.id,
        integrationId: i.integrationId,
        enabled: i.enabled,
        credentials: maskCredentials(i.credentials),
        updatedAt: i.updatedAt,
        createdAt: i.createdAt,
      }));
    }),

  get: protectedProcedure
    .input(z.object({ agentId: z.string().uuid(), integrationId: z.string() }))
    .query(async ({ ctx, input }) => {
      await verifyOwnership(ctx, input.agentId);
      const integration = await ctx.db.query.agentIntegrations.findFirst({
        where: and(eq(agentIntegrations.agentId, input.agentId), eq(agentIntegrations.integrationId, input.integrationId)),
      });
      if (!integration) throw new TRPCError({ code: "NOT_FOUND", message: "Integration not found" });
      return {
        id: integration.id,
        integrationId: integration.integrationId,
        enabled: integration.enabled,
        credentials: maskCredentials(integration.credentials),
        updatedAt: integration.updatedAt,
        createdAt: integration.createdAt,
      };
    }),

  upsert: protectedProcedure
    .input(z.object({
      agentId: z.string().uuid(),
      integrationId: z.string().min(1),
      credentials: z.record(z.string(), z.string()),
      enabled: z.boolean().optional().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const agent = await verifyOwnership(ctx, input.agentId);
      const encryptedCredentials = encrypt(JSON.stringify(input.credentials));

      const existing = await ctx.db.query.agentIntegrations.findFirst({
        where: and(eq(agentIntegrations.agentId, input.agentId), eq(agentIntegrations.integrationId, input.integrationId)),
      });

      if (existing) {
        await ctx.db.update(agentIntegrations).set({
          credentials: encryptedCredentials,
          enabled: input.enabled,
          updatedAt: new Date(),
        }).where(eq(agentIntegrations.id, existing.id));
      } else {
        await ctx.db.insert(agentIntegrations).values({
          agentId: input.agentId,
          integrationId: input.integrationId,
          credentials: encryptedCredentials,
          enabled: input.enabled,
        });
      }

      if (agent.hostId && (agent.status === "running" || agent.status === "deploying")) {
        await ctx.db.insert(agentCommands).values({
          agentId: input.agentId,
          hostId: agent.hostId,
          type: "update_config",
          payload: { reason: "integration_updated", integrationId: input.integrationId, configUrl: `/api/agents/${input.agentId}/deploy-config` },
          status: "pending",
        });
      }
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ agentId: z.string().uuid(), integrationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const agent = await verifyOwnership(ctx, input.agentId);
      await ctx.db.delete(agentIntegrations).where(
        and(eq(agentIntegrations.agentId, input.agentId), eq(agentIntegrations.integrationId, input.integrationId))
      );
      if (agent.hostId && (agent.status === "running" || agent.status === "deploying")) {
        await ctx.db.insert(agentCommands).values({
          agentId: input.agentId,
          hostId: agent.hostId,
          type: "update_config",
          payload: { reason: "integration_deleted", integrationId: input.integrationId, configUrl: `/api/agents/${input.agentId}/deploy-config` },
          status: "pending",
        });
      }
      return { success: true };
    }),
});
