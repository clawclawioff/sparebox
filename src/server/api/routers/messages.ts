import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { agentMessages, agents } from "@/db";
import { eq, and, desc, gt } from "drizzle-orm";

export const messagesRouter = router({
  // Send a message to an agent (deployer → agent)
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

  // Get message history for an agent
  list: protectedProcedure
    .input(
      z.object({
        agentId: z.string().uuid(),
        limit: z.number().int().min(1).max(100).default(50),
        after: z.string().uuid().optional(), // cursor for pagination
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

      // If cursor provided, get messages after that one
      if (input.after) {
        const cursorMsg = await ctx.db.query.agentMessages.findFirst({
          where: eq(agentMessages.id, input.after),
          columns: { createdAt: true },
        });
        if (cursorMsg) {
          conditions.push(gt(agentMessages.createdAt, cursorMsg.createdAt));
        }
      }

      const messages = await ctx.db.query.agentMessages.findMany({
        where: and(...conditions),
        orderBy: [desc(agentMessages.createdAt)],
        limit: input.limit,
      });

      // Return in chronological order
      return messages.reverse();
    }),

  // Poll for new messages (used by deployer UI for "real-time" feel)
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

      const conditions = [eq(agentMessages.agentId, input.agentId)];

      if (input.since) {
        conditions.push(gt(agentMessages.createdAt, new Date(input.since)));
      }

      const messages = await ctx.db.query.agentMessages.findMany({
        where: and(...conditions),
        orderBy: [desc(agentMessages.createdAt)],
        limit: 50,
      });

      return messages.reverse();
    }),
});
