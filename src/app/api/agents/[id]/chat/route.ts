import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { agents, agentMessages } from "@/db/schema";
import { eq } from "drizzle-orm";
import { decrypt } from "@/lib/encryption";

// =============================================================================
// POST /api/agents/[id]/chat
// Send a message to an agent via direct HTTP to the container's OpenClaw gateway.
// This replaces the slow heartbeat-polling message relay.
// =============================================================================

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: agentId } = await params;

  // 1. Auth — user session
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Fetch agent with host
  const agent = await db.query.agents.findFirst({
    where: eq(agents.id, agentId),
    with: { host: true },
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

  if (!agent.gatewayToken || !agent.containerPort) {
    return NextResponse.json(
      { error: "Agent not configured for direct chat. Try redeploying." },
      { status: 400 }
    );
  }

  // 3. Parse request
  let body: { content?: string; stream?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { content, stream = false } = body;
  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json({ error: "Missing or empty content" }, { status: 400 });
  }

  if (content.length > 50000) {
    return NextResponse.json({ error: "Message too long (max 50000 chars)" }, { status: 400 });
  }

  // 4. Store user message
  const [userMessage] = await db
    .insert(agentMessages)
    .values({
      agentId,
      role: "user",
      content: content.trim(),
      status: "pending",
    })
    .returning();

  // 5. Build container URL
  const host = agent.host as { tailscaleIp?: string; publicIp?: string } | null;
  const hostIp = host?.tailscaleIp || host?.publicIp || "127.0.0.1";
  const containerUrl = `http://${hostIp}:${agent.containerPort}/v1/chat/completions`;

  // 6. Decrypt gateway token
  let gatewayToken: string;
  try {
    gatewayToken = decrypt(agent.gatewayToken);
  } catch (err) {
    console.error(`[chat] Failed to decrypt gateway token for agent ${agentId}:`, err);
    await db
      .update(agentMessages)
      .set({ status: "failed" })
      .where(eq(agentMessages.id, userMessage.id));
    return NextResponse.json(
      { error: "Internal error: failed to decrypt gateway token" },
      { status: 500 }
    );
  }

  // 7. Make request to container's OpenClaw gateway
  try {
    console.log(`[chat] Sending message to agent ${agentId} at ${containerUrl}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120_000); // 2 min timeout

    const response = await fetch(containerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${gatewayToken}`,
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: content.trim() }],
        stream: false, // Start with non-streaming for simplicity
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      console.error(`[chat] Gateway error for agent ${agentId}: ${response.status} - ${errorText}`);
      
      await db
        .update(agentMessages)
        .set({ status: "failed" })
        .where(eq(agentMessages.id, userMessage.id));

      return NextResponse.json(
        { error: `Agent gateway error: ${response.status}` },
        { status: 502 }
      );
    }

    const data = await response.json();
    const assistantContent =
      data.choices?.[0]?.message?.content ||
      data.choices?.[0]?.delta?.content ||
      "[No response from agent]";

    console.log(`[chat] Agent ${agentId} responded (${assistantContent.length} chars)`);

    // 8. Mark user message as responded
    await db
      .update(agentMessages)
      .set({ status: "responded", respondedAt: new Date() })
      .where(eq(agentMessages.id, userMessage.id));

    // 9. Store agent response
    const [agentResponse] = await db
      .insert(agentMessages)
      .values({
        agentId,
        role: "agent",
        content: assistantContent,
        status: "responded",
        respondedAt: new Date(),
      })
      .returning();

    // 10. Update agent's lastActive timestamp
    await db
      .update(agents)
      .set({ lastActive: new Date(), updatedAt: new Date() })
      .where(eq(agents.id, agentId));

    return NextResponse.json({
      success: true,
      userMessage,
      agentResponse,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[chat] Error sending message to agent ${agentId}:`, message);

    // Mark message as failed
    await db
      .update(agentMessages)
      .set({ status: "failed" })
      .where(eq(agentMessages.id, userMessage.id));

    // Check for specific error types
    if (message.includes("abort") || message.includes("timeout")) {
      return NextResponse.json(
        { error: "Request to agent timed out (2 min)" },
        { status: 504 }
      );
    }

    if (message.includes("ECONNREFUSED") || message.includes("ENOTFOUND")) {
      return NextResponse.json(
        { error: "Could not connect to agent. It may be starting up or the host is unreachable." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: `Failed to communicate with agent: ${message}` },
      { status: 502 }
    );
  }
}
