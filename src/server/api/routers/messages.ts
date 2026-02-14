import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { agentMessages, agents } from "@/db/schema";
import { eq, and, desc, gt, lt, asc, sql, inArray } from "drizzle-orm";

/** Messages older than 5 minutes in "delivered" status are marked failed */
const MESSAGE_TIMEOUT_MS = 5 * 60 * 1000;

export const messagesRouter = router({
  // =========================================================================
  // Send a message to an agent (deployer → agent)
  // =========================================================================
  send: protectedProcedure
    .input(
      z.object({
        agentId: z.string().uuid(),
        content: z.string().min(1).max(10000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify agent ownership
      const agent = await ctx.db.query.agents.findFirst({
        where: eq(agents.id, input.agentId),
        columns: { userId: true, status: true },
      });

      if (!agent || agent.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Agent not found" });
      }

      if (agent.status !== "running" && agent.status !== "deploying") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Agent is not running. Start it first.",
        });
      }

      const [message] = await ctx.db
        .insert(agentMessages)
        .values({
          agentId: input.agentId,
          role: "user",
          content: input.content,
          status: "pending",
        })
        .returning();

      return message;
    }),

  // =========================================================================
  // Get message history with cursor-based pagination
  // =========================================================================
  list: protectedProcedure
    .input(
      z.object({
        agentId: z.string().uuid(),
        limit: z.number().int().min(1).max(100).default(50),
        cursor: z.string().uuid().optional(), // message ID to load before
      })
    )
    .query(async ({ ctx, input }) => {
      // Verify agent ownership
      const agent = await ctx.db.query.agents.findFirst({
        where: eq(agents.id, input.agentId),
        columns: { userId: true },
      });

      if (!agent || agent.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Agent not found" });
      }

      const conditions = [eq(agentMessages.agentId, input.agentId)];

      // If cursor provided, get messages OLDER than cursor
      if (input.cursor) {
        const cursorMsg = await ctx.db.query.agentMessages.findFirst({
          where: eq(agentMessages.id, input.cursor),
          columns: { createdAt: true },
        });
        if (cursorMsg) {
          conditions.push(lt(agentMessages.createdAt, cursorMsg.createdAt));
        }
      }

      // Fetch limit + 1 to check if there are more
      const messages = await ctx.db.query.agentMessages.findMany({
        where: and(...conditions),
        orderBy: [desc(agentMessages.createdAt)],
        limit: input.limit + 1,
      });

      const hasMore = messages.length > input.limit;
      if (hasMore) messages.pop();

      // Return in chronological order
      return {
        messages: messages.reverse(),
        hasMore,
        nextCursor: hasMore ? messages[0]?.id : undefined,
      };
    }),

  // =========================================================================
  // Poll for new messages (real-time polling)
  // =========================================================================
  poll: protectedProcedure
    .input(
      z.object({
        agentId: z.string().uuid(),
        since: z.string().datetime().optional(), // ISO timestamp
      })
    )
    .query(async ({ ctx, input }) => {
      // Verify agent ownership
      const agent = await ctx.db.query.agents.findFirst({
        where: eq(agents.id, input.agentId),
        columns: { userId: true },
      });

      if (!agent || agent.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Agent not found" });
      }

      // Expire stuck messages (fire-and-forget, best-effort)
      void expireStuckMessages(ctx.db, input.agentId).catch(() => {});

      const conditions = [eq(agentMessages.agentId, input.agentId)];

      if (input.since) {
        conditions.push(gt(agentMessages.createdAt, new Date(input.since)));
      }

      const messages = await ctx.db.query.agentMessages.findMany({
        where: and(...conditions),
        orderBy: [asc(agentMessages.createdAt)],
        limit: 50,
      });

      return messages;
    }),

  // =========================================================================
  // Clear chat history
  // =========================================================================
  clear: protectedProcedure
    .input(z.object({ agentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Verify agent ownership
      const agent = await ctx.db.query.agents.findFirst({
        where: eq(agents.id, input.agentId),
        columns: { userId: true },
      });

      if (!agent || agent.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Agent not found" });
      }

      await ctx.db
        .delete(agentMessages)
        .where(eq(agentMessages.agentId, input.agentId));

      return { success: true };
    }),
});

// =============================================================================
// Helpers
// =============================================================================

/**
 * Expire messages stuck in "delivered" status for longer than MESSAGE_TIMEOUT_MS.
 * Called during poll to self-heal without needing a separate cron.
 */
async function expireStuckMessages(db: any, agentId: string) {
  const expiryDate = new Date(Date.now() - MESSAGE_TIMEOUT_MS);

  await db
    .update(agentMessages)
    .set({ status: "failed" })
    .where(
      and(
        eq(agentMessages.agentId, agentId),
        eq(agentMessages.role, "user"),
        eq(agentMessages.status, "delivered"),
        lt(agentMessages.deliveredAt, expiryDate)
      )
    );
}
