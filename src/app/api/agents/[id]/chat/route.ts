import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { agents, agentMessages } from "@/db/schema";
import { eq } from "drizzle-orm";

// =============================================================================
// POST /api/agents/[id]/chat
// Store user message as pending — daemon will relay to container.
// =============================================================================

export async function POST(
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
  });

  if (!agent || agent.userId !== session.user.id) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  if (agent.status !== "running") {
    return NextResponse.json(
      { error: "Agent is not running. Start it first." },
      { status: 400 }
    );
  }

  let body: { content?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { content } = body;
  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json({ error: "Missing or empty content" }, { status: 400 });
  }

  if (content.length > 50000) {
    return NextResponse.json({ error: "Message too long (max 50000 chars)" }, { status: 400 });
  }

  const [userMessage] = await db
    .insert(agentMessages)
    .values({
      agentId,
      role: "user",
      content: content.trim(),
      status: "pending",
    })
    .returning();

  return NextResponse.json({
    messageId: userMessage.id,
    status: "pending",
  });
}
