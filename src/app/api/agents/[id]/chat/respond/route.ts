import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { db } from "@/db";
import { hostApiKeys, agents, agentMessages } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { API_KEY_PREFIX } from "@/lib/constants";

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

// =============================================================================
// POST /api/agents/[id]/chat/respond
// Daemon posts the agent's response back.
// =============================================================================

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: agentId } = await params;

  // 1. Auth — daemon API key
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith(`Bearer ${API_KEY_PREFIX}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = authHeader.slice(7);
  const keyHash = sha256(apiKey);
  const keyRecord = await db.query.hostApiKeys.findFirst({
    where: and(
      eq(hostApiKeys.keyHash, keyHash),
      isNull(hostApiKeys.revokedAt)
    ),
  });

  if (!keyRecord) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  // Verify agent belongs to this host
  const agent = await db.query.agents.findFirst({
    where: and(eq(agents.id, agentId), eq(agents.hostId, keyRecord.hostId)),
  });

  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  // 2. Parse body
  let body: { messageId?: string; content?: string; status?: string; error?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { messageId, content, status, error: errorMsg } = body;
  if (!messageId || !status) {
    return NextResponse.json({ error: "Missing messageId or status" }, { status: 400 });
  }

  if (status === "responded") {
    if (!content) {
      return NextResponse.json({ error: "Missing content for responded status" }, { status: 400 });
    }

    // Update user message status
    await db
      .update(agentMessages)
      .set({ status: "responded", respondedAt: new Date() })
      .where(eq(agentMessages.id, messageId));

    // Store assistant message
    await db.insert(agentMessages).values({
      agentId,
      role: "agent",
      content,
      status: "responded",
      respondedAt: new Date(),
    });

    // Update agent lastActive
    await db
      .update(agents)
      .set({ lastActive: new Date(), updatedAt: new Date() })
      .where(eq(agents.id, agentId));

    return NextResponse.json({ ok: true });
  }

  if (status === "failed") {
    await db
      .update(agentMessages)
      .set({ status: "failed" })
      .where(eq(agentMessages.id, messageId));

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid status" }, { status: 400 });
}
