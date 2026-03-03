import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { agents, agentWorkspaceFiles, agentCommands } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";

const DEFAULT_FILES: Record<string, string> = {
  "SOUL.md": `# SOUL.md — Who You Are

You are a helpful AI assistant deployed on Sparebox.

## Personality
- Friendly and professional
- Concise but thorough
- Proactive when appropriate

## Guidelines
- Be honest about what you can and cannot do
- Ask clarifying questions when needed
- Respect the user's time
`,
  "USER.md": `# USER.md — About Your User

Add information about yourself here so your agent can better assist you.

## Preferences
- Communication style: (e.g., casual, formal, technical)
- Timezone: 
- Languages: 

## Context
- What you do:
- What you need help with:
`,
  "AGENTS.md": `# AGENTS.md — Agent Workspace Guide

This file configures how your agent operates in its workspace.

## Session Startup
1. Read SOUL.md — your identity
2. Read USER.md — your user's context
3. Check for any pending tasks

## Memory
Use the workspace to persist notes, logs, and context between sessions.
`,
  "IDENTITY.md": `# IDENTITY.md — Structured Identity

## Agent Profile
- Name: (set in dashboard)
- Role: General assistant
- Created: (auto)

## Accounts & Services
Add any accounts or service configurations here.
`,
  "HEARTBEAT.md": `# HEARTBEAT.md — Periodic Check-in Tasks

When receiving a heartbeat, check these items:

- [ ] Nothing configured yet

If nothing needs attention, reply HEARTBEAT_OK.
`,
};

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

async function queueConfigUpdate(ctx: { db: typeof db }, agentId: string, hostId: string | null, status: string | null, reason: string) {
  if (hostId && status === "running") {
    await ctx.db.insert(agentCommands).values({
      agentId,
      hostId,
      type: "update_config",
      payload: { reason, configUrl: `/api/agents/${agentId}/deploy-config` },
      status: "pending",
    });
  }
}

export const agentWorkspaceRouter = router({
  getFiles: protectedProcedure
    .input(z.object({ agentId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await verifyOwnership(ctx, input.agentId);
      const files = await ctx.db.query.agentWorkspaceFiles.findMany({
        where: eq(agentWorkspaceFiles.agentId, input.agentId),
        orderBy: (f, { asc }) => [asc(f.filename)],
      });
      return files.map(f => ({ id: f.id, filename: f.filename, content: f.content, updatedAt: f.updatedAt, createdAt: f.createdAt }));
    }),

  getFile: protectedProcedure
    .input(z.object({ agentId: z.string().uuid(), path: z.string().min(1).max(255) }))
    .query(async ({ ctx, input }) => {
      await verifyOwnership(ctx, input.agentId);
      const file = await ctx.db.query.agentWorkspaceFiles.findFirst({
        where: and(eq(agentWorkspaceFiles.agentId, input.agentId), eq(agentWorkspaceFiles.filename, input.path)),
      });
      if (!file) throw new TRPCError({ code: "NOT_FOUND", message: "File not found" });
      return { id: file.id, filename: file.filename, content: file.content, updatedAt: file.updatedAt, createdAt: file.createdAt };
    }),

  upsertFile: protectedProcedure
    .input(z.object({ agentId: z.string().uuid(), path: z.string().min(1).max(255), content: z.string().max(500000) }))
    .mutation(async ({ ctx, input }) => {
      const agent = await verifyOwnership(ctx, input.agentId);
      const existing = await ctx.db.query.agentWorkspaceFiles.findFirst({
        where: and(eq(agentWorkspaceFiles.agentId, input.agentId), eq(agentWorkspaceFiles.filename, input.path)),
      });
      if (existing) {
        await ctx.db.update(agentWorkspaceFiles).set({ content: input.content, updatedAt: new Date() }).where(eq(agentWorkspaceFiles.id, existing.id));
      } else {
        await ctx.db.insert(agentWorkspaceFiles).values({ agentId: input.agentId, filename: input.path, content: input.content });
      }
      await queueConfigUpdate(ctx, input.agentId, agent.hostId, agent.status, "workspace_file_updated");
      return { success: true };
    }),

  deleteFile: protectedProcedure
    .input(z.object({ agentId: z.string().uuid(), path: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const agent = await verifyOwnership(ctx, input.agentId);
      await ctx.db.delete(agentWorkspaceFiles).where(
        and(eq(agentWorkspaceFiles.agentId, input.agentId), eq(agentWorkspaceFiles.filename, input.path))
      );
      await queueConfigUpdate(ctx, input.agentId, agent.hostId, agent.status, "workspace_file_deleted");
      return { success: true };
    }),

  initDefaults: protectedProcedure
    .input(z.object({ agentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const agent = await verifyOwnership(ctx, input.agentId);
      for (const [filename, content] of Object.entries(DEFAULT_FILES)) {
        const existing = await ctx.db.query.agentWorkspaceFiles.findFirst({
          where: and(eq(agentWorkspaceFiles.agentId, input.agentId), eq(agentWorkspaceFiles.filename, filename)),
        });
        if (!existing) {
          await ctx.db.insert(agentWorkspaceFiles).values({ agentId: input.agentId, filename, content });
        }
      }
      await queueConfigUpdate(ctx, input.agentId, agent.hostId, agent.status, "workspace_defaults_initialized");
      return { success: true };
    }),
});
