import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { agents, agentSecrets } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { encrypt, decrypt } from "@/lib/encryption";

// Predefined tool API keys users can configure
const KNOWN_KEYS = [
  { key: "BRAVE_SEARCH_API_KEY", label: "Brave Search", category: "search", description: "Web search via Brave API" },
  { key: "GEMINI_API_KEY", label: "Google Gemini", category: "ai", description: "Image generation and vision" },
  { key: "FIRECRAWL_API_KEY", label: "Firecrawl", category: "web", description: "Advanced web scraping" },
  { key: "PERPLEXITY_API_KEY", label: "Perplexity", category: "search", description: "Perplexity search" },
  { key: "ELEVEN_API_KEY", label: "ElevenLabs", category: "tts", description: "Text-to-speech" },
  { key: "GITHUB_TOKEN", label: "GitHub", category: "dev", description: "GitHub API access" },
] as const;

export const secretsRouter = router({
  // List all secrets for an agent (returns masked values, NEVER plaintext)
  list: protectedProcedure
    .input(z.object({ agentId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Verify ownership
      const agent = await ctx.db.query.agents.findFirst({
        where: eq(agents.id, input.agentId),
        columns: { userId: true },
      });
      if (!agent || agent.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Agent not found" });
      }

      const secrets = await ctx.db.query.agentSecrets.findMany({
        where: eq(agentSecrets.agentId, input.agentId),
        orderBy: (s, { asc }) => [asc(s.key)],
      });

      // Return with masked values — NEVER expose plaintext
      return {
        configured: secrets.map(s => ({
          id: s.id,
          key: s.key,
          label: s.label,
          category: s.category,
          maskedValue: maskSecret(s.encryptedValue),
          updatedAt: s.updatedAt,
        })),
        available: KNOWN_KEYS.map(k => ({
          ...k,
          configured: secrets.some(s => s.key === k.key),
        })),
      };
    }),

  // Set (create or update) a secret
  set: protectedProcedure
    .input(z.object({
      agentId: z.string().uuid(),
      key: z.string().min(1).max(100).regex(/^[A-Z][A-Z0-9_]*$/, "Key must be uppercase with underscores"),
      value: z.string().min(1).max(10000),
      label: z.string().max(100).optional(),
      category: z.string().max(50).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const agent = await ctx.db.query.agents.findFirst({
        where: eq(agents.id, input.agentId),
        columns: { userId: true, hostId: true, status: true },
      });
      if (!agent || agent.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Agent not found" });
      }

      const encryptedValue = encrypt(input.value);
      const knownKey = KNOWN_KEYS.find(k => k.key === input.key);

      // Upsert
      const existing = await ctx.db.query.agentSecrets.findFirst({
        where: and(
          eq(agentSecrets.agentId, input.agentId),
          eq(agentSecrets.key, input.key),
        ),
      });

      if (existing) {
        await ctx.db.update(agentSecrets)
          .set({
            encryptedValue,
            label: input.label || knownKey?.label || existing.label,
            category: input.category || knownKey?.category || existing.category,
            updatedAt: new Date(),
          })
          .where(eq(agentSecrets.id, existing.id));
      } else {
        await ctx.db.insert(agentSecrets).values({
          agentId: input.agentId,
          key: input.key,
          encryptedValue,
          label: input.label || knownKey?.label || input.key,
          category: input.category || knownKey?.category || "custom",
        });
      }

      // If agent is running, trigger config update so new env vars take effect
      if (agent.hostId && agent.status === "running") {
        const { agentCommands } = await import("@/db/schema");
        await ctx.db.insert(agentCommands).values({
          agentId: input.agentId,
          hostId: agent.hostId,
          type: "update_config",
          payload: { reason: "secret_updated", key: input.key },
          status: "pending",
        });
      }

      return { success: true };
    }),

  // Delete a secret
  delete: protectedProcedure
    .input(z.object({
      agentId: z.string().uuid(),
      key: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const agent = await ctx.db.query.agents.findFirst({
        where: eq(agents.id, input.agentId),
        columns: { userId: true, hostId: true, status: true },
      });
      if (!agent || agent.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Agent not found" });
      }

      await ctx.db.delete(agentSecrets)
        .where(and(
          eq(agentSecrets.agentId, input.agentId),
          eq(agentSecrets.key, input.key),
        ));

      // Trigger config update if running
      if (agent.hostId && agent.status === "running") {
        const { agentCommands } = await import("@/db/schema");
        await ctx.db.insert(agentCommands).values({
          agentId: input.agentId,
          hostId: agent.hostId,
          type: "update_config",
          payload: { reason: "secret_deleted", key: input.key },
          status: "pending",
        });
      }

      return { success: true };
    }),
});

// Mask a secret for display: decrypt, show first 4 and last 4 chars
function maskSecret(encrypted: string): string {
  try {
    const plain = decrypt(encrypted);
    if (plain.length <= 8) return "••••••••";
    return plain.slice(0, 4) + "••••" + plain.slice(-4);
  } catch {
    return "••••••••";
  }
}
