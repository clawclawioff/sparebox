import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { agents, agentCommands } from "@/db/schema";
import { eq } from "drizzle-orm";

function parseHeartbeatInterval(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.floor(value);
  }
  if (typeof value !== "string") {
    return null;
  }

  const raw = value.trim().toLowerCase();
  if (!raw) return null;

  if (/^\d+$/.test(raw)) {
    return Number.parseInt(raw, 10);
  }

  const withUnit = raw.match(/^(\d+)\s*([smh])$/);
  if (!withUnit) return null;

  const amount = Number.parseInt(withUnit[1] || "0", 10);
  const unit = withUnit[2];
  if (unit === "s") return amount;
  if (unit === "m") return amount * 60;
  if (unit === "h") return amount * 60 * 60;
  return null;
}

export const agentSettingsRouter = router({
  // Get agent settings
  get: protectedProcedure
    .input(z.object({ agentId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const agent = await ctx.db.query.agents.findFirst({
        where: eq(agents.id, input.agentId),
        columns: {
          userId: true,
          settings: true,
          tier: true,
          name: true,
          config: true,
          llmProvider: true,
          llmModel: true,
        },
      });
      if (!agent || agent.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Agent not found" });
      }

      const settings = {
        ...((agent.settings || {}) as Record<string, unknown>),
      };

      // Keep legacy rows compatible with the new settings UI.
      if (typeof settings.model !== "string" && agent.llmModel) {
        settings.model = agent.llmModel.includes("/")
          ? agent.llmModel
          : `${agent.llmProvider || "anthropic"}/${agent.llmModel}`;
      } else if (typeof settings.model !== "string") {
        const config = (agent.config || {}) as Record<string, unknown>;
        if (typeof config.model === "string" && config.model.length > 0) {
          settings.model = config.model;
        }
      }

      const parsedCurrentHeartbeat = parseHeartbeatInterval(settings.heartbeatInterval);
      if (parsedCurrentHeartbeat !== null) {
        settings.heartbeatInterval = parsedCurrentHeartbeat;
      }

      return {
        name: agent.name,
        tier: agent.tier,
        settings,
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
        heartbeatInterval: z.union([z.number().int().min(60).max(86400), z.string().max(10)]).optional(),
        contextTokens: z.number().min(10000).max(1000000).optional(),
        compactionMode: z.enum(["safeguard", "aggressive", "off"]).optional(),
        model: z.string().min(1).max(200).optional(),
        temperature: z.number().min(0).max(1).optional(),
        execPolicy: z.enum(["deny", "allowlist", "full"]).optional(),
        elevated: z.boolean().optional(),
        httpApi: z.boolean().optional(),
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
        const nextSettings: Record<string, unknown> = { ...current, ...input.settings };

        const parsedHeartbeat = parseHeartbeatInterval(nextSettings.heartbeatInterval);
        if (parsedHeartbeat !== null) {
          nextSettings.heartbeatInterval = parsedHeartbeat;
        }

        // Model selection drives deploy-config's LLM fields.
        if (typeof input.settings.model === "string" && input.settings.model.trim().length > 0) {
          const normalizedModel = input.settings.model.trim();
          const [provider] = normalizedModel.split("/");
          updateData.llmModel = normalizedModel;
          if (provider === "anthropic" || provider === "openai" || provider === "google") {
            updateData.llmProvider = provider;
          }
          nextSettings.model = normalizedModel;
        }

        updateData.settings = nextSettings;
      }

      const [updated] = await ctx.db
        .update(agents)
        .set(updateData)
        .where(eq(agents.id, input.agentId))
        .returning();

      // Trigger config update if running
      if (agent.hostId && (agent.status === "running" || agent.status === "deploying")) {
        await ctx.db.insert(agentCommands).values({
          agentId: input.agentId,
          hostId: agent.hostId,
          type: "update_config",
          payload: {
            reason: "settings_updated",
            configUrl: `/api/agents/${input.agentId}/deploy-config`,
          },
          status: "pending",
        });
      }

      return updated;
    }),
});
