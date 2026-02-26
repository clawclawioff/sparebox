import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { agents, agentCommands } from "@/db/schema";
import { eq } from "drizzle-orm";

export const agentSettingsRouter = router({
  // Get agent settings
  get: protectedProcedure
    .input(z.object({ agentId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const agent = await ctx.db.query.agents.findFirst({
        where: eq(agents.id, input.agentId),
        columns: { userId: true, settings: true, tier: true, name: true },
      });
      if (!agent || agent.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Agent not found" });
      }
      return {
        name: agent.name,
        tier: agent.tier,
        settings: (agent.settings || {}) as Record<string, unknown>,
      };
    }),

  // Update agent settings
  update: protectedProcedure
    .input(z.object({
      agentId: z.string().uuid(),
      name: z.string().min(1).max(100).optional(),
      settings: z.object({
        timezone: z.string().max(100).optional(),
        thinkingLevel: z.enum(["off", "low", "medium", "high"]).optional(),
        heartbeatInterval: z.string().max(10).optional(), // e.g. "30m", "1h"
        contextTokens: z.number().min(10000).max(1000000).optional(),
        compactionMode: z.enum(["safeguard", "aggressive", "off"]).optional(),
      }).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const agent = await ctx.db.query.agents.findFirst({
        where: eq(agents.id, input.agentId),
        columns: { userId: true, hostId: true, status: true, settings: true },
      });
      if (!agent || agent.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Agent not found" });
      }

      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      if (input.name) updateData.name = input.name;
      if (input.settings) {
        // Merge with existing settings
        const current = (agent.settings || {}) as Record<string, unknown>;
        updateData.settings = { ...current, ...input.settings };
      }

      const [updated] = await ctx.db
        .update(agents)
        .set(updateData)
        .where(eq(agents.id, input.agentId))
        .returning();

      // Trigger config update if running
      if (agent.hostId && agent.status === "running") {
        await ctx.db.insert(agentCommands).values({
          agentId: input.agentId,
          hostId: agent.hostId,
          type: "update_config",
          payload: { reason: "settings_updated" },
          status: "pending",
        });
      }

      return updated;
    }),
});
