import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { agents, agentMessages } from "@/db/schema";
import { eq } from "drizzle-orm";
import { decrypt } from "@/lib/encryption";

// =============================================================================
// POST /api/agents/[id]/chat/webhook
// Receives proactive messages from the agent (cron results, notifications).
// Auth: gateway token in Authorization header.
// =============================================================================

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: agentId } = await params;

  // 1. Auth — gateway token
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = authHeader.slice(7);

  // Look up agent and verify token
  const agent = await db.query.agents.findFirst({
    where: eq(agents.id, agentId),
    columns: { id: true, gatewayToken: true, status: true },
  });

  if (!agent || !agent.gatewayToken) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  let expectedToken: string;
  try {
    expectedToken = decrypt(agent.gatewayToken);
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  if (token !== expectedToken) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // 2. Parse body — accept flexible formats from OpenClaw cron webhook delivery
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Extract content from various possible payload shapes:
  // - { content: "..." } (simple)
  // - { summary: "..." } (cron webhook delivery)
  // - { result: { summary: "..." } } (nested cron result)
  // - { text: "..." } (fallback)
  const content =
    (typeof body.content === "string" && body.content) ||
    (typeof body.summary === "string" && body.summary) ||
    (typeof (body.result as Record<string, unknown>)?.summary === "string" &&
      (body.result as Record<string, unknown>).summary as string) ||
    (typeof body.text === "string" && body.text) ||
    (typeof body.message === "string" && body.message) ||
    null;

  if (!content || content.trim().length === 0) {
    // Accept but ignore empty payloads (some cron events are metadata-only)
    return NextResponse.json({ ok: true, ignored: true });
  }

  // 3. Store as agent message
  const [msg] = await db
    .insert(agentMessages)
    .values({
      agentId,
      role: "agent",
      content: content.trim(),
      status: "responded",
      respondedAt: new Date(),
    })
    .returning();

  // 4. Update agent lastActive
  await db
    .update(agents)
    .set({ lastActive: new Date(), updatedAt: new Date() })
    .where(eq(agents.id, agentId));

  return NextResponse.json({ ok: true, messageId: msg.id });
}
