import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { agents, agentMessages } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";

// =============================================================================
// GET /api/agents/[id]/chat/messages?after={messageId}
// Fetch chat messages for the UI. Supports polling via `after` param.
// =============================================================================

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: agentId } = await params;

  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const agent = await db.query.agents.findFirst({
    where: eq(agents.id, agentId),
    columns: { id: true, userId: true },
  });

  if (!agent || agent.userId !== session.user.id) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const afterId = req.nextUrl.searchParams.get("after");

  if (afterId) {
    // Get the createdAt of the reference message
    const refMsg = await db.query.agentMessages.findFirst({
      where: eq(agentMessages.id, afterId),
      columns: { createdAt: true },
    });

    if (!refMsg) {
      return NextResponse.json({ messages: [] });
    }

    const messages = await db.query.agentMessages.findMany({
      where: and(
        eq(agentMessages.agentId, agentId),
        gt(agentMessages.createdAt, refMsg.createdAt)
      ),
      orderBy: (m, { asc }) => [asc(m.createdAt)],
      limit: 50,
    });

    return NextResponse.json({ messages });
  }

  // No after param — return last 50 messages
  const messages = await db.query.agentMessages.findMany({
    where: eq(agentMessages.agentId, agentId),
    orderBy: (m, { desc: d }) => [d(m.createdAt)],
    limit: 50,
  });

  return NextResponse.json({ messages: messages.reverse() });
}
