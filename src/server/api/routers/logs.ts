import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { agents, agentLogs } from "@/db/schema";
import { eq, and, desc, gt, lt } from "drizzle-orm";

export const logsRouter = router({
  // Get logs for an agent (paginated, newest first)
  list: protectedProcedure
    .input(z.object({
      agentId: z.string().uuid(),
      limit: z.number().min(1).max(200).default(100),
      before: z.string().datetime().optional(), // cursor for pagination
      level: z.enum(["debug", "info", "warn", "error"]).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const agent = await ctx.db.query.agents.findFirst({
        where: eq(agents.id, input.agentId),
        columns: { userId: true },
      });
      if (!agent || agent.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Agent not found" });
      }

      const conditions = [eq(agentLogs.agentId, input.agentId)];
      if (input.before) {
        conditions.push(lt(agentLogs.timestamp, new Date(input.before)));
      }
      if (input.level) {
        conditions.push(eq(agentLogs.level, input.level));
      }

      const logs = await ctx.db.query.agentLogs.findMany({
        where: and(...conditions),
        orderBy: [desc(agentLogs.timestamp)],
        limit: input.limit + 1, // fetch one extra to check hasMore
      });

      const hasMore = logs.length > input.limit;
      if (hasMore) logs.pop();

      return { logs, hasMore };
    }),

  // Get logs newer than a timestamp (for polling / live tail)
  poll: protectedProcedure
    .input(z.object({
      agentId: z.string().uuid(),
      since: z.string().datetime(),
      limit: z.number().min(1).max(200).default(50),
    }))
    .query(async ({ ctx, input }) => {
      const agent = await ctx.db.query.agents.findFirst({
        where: eq(agents.id, input.agentId),
        columns: { userId: true },
      });
      if (!agent || agent.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Agent not found" });
      }

      return ctx.db.query.agentLogs.findMany({
        where: and(
          eq(agentLogs.agentId, input.agentId),
          gt(agentLogs.timestamp, new Date(input.since)),
        ),
        orderBy: (l, { asc }) => [asc(l.timestamp)],
        limit: input.limit,
      });
    }),
});
