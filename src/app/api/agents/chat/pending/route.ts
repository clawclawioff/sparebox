import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { db } from "@/db";
import { hostApiKeys, agents, agentMessages } from "@/db/schema";
import { eq, and, isNull, inArray } from "drizzle-orm";
import { decrypt } from "@/lib/encryption";
import { API_KEY_PREFIX } from "@/lib/constants";

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

// =============================================================================
// GET /api/agents/chat/pending
// Long-poll: daemon fetches pending messages for its host's agents.
// =============================================================================

export async function GET(req: NextRequest) {
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

  if (keyRecord.expiresAt && keyRecord.expiresAt < new Date()) {
    return NextResponse.json({ error: "API key expired" }, { status: 401 });
  }

  const hostId = keyRecord.hostId;

  // 2. Find all agents belonging to this host
  const hostAgents = await db.query.agents.findMany({
    where: eq(agents.hostId, hostId),
    columns: { id: true, gatewayToken: true, containerPort: true },
  });

  if (hostAgents.length === 0) {
    return NextResponse.json({ messages: [] });
  }

  const agentIds = hostAgents.map((a) => a.id);

  // 3. Long-poll: check for pending messages, retry up to 25s
  const deadline = Date.now() + 25_000;
  const pollInterval = 1000;

  while (Date.now() < deadline) {
    const pending = await db.query.agentMessages.findMany({
      where: and(
        inArray(agentMessages.agentId, agentIds),
        eq(agentMessages.status, "pending"),
        eq(agentMessages.role, "user")
      ),
      orderBy: (m, { asc }) => [asc(m.createdAt)],
      limit: 10,
    });

    if (pending.length > 0) {
      // Mark as processing
      const pendingIds = pending.map((m) => m.id);
      await db
        .update(agentMessages)
        .set({ status: "processing" })
        .where(inArray(agentMessages.id, pendingIds));

      // Build response with decrypted tokens
      const messages = pending.map((msg) => {
        const agent = hostAgents.find((a) => a.id === msg.agentId);
        let gatewayToken: string | null = null;
        try {
          if (agent?.gatewayToken) {
            gatewayToken = decrypt(agent.gatewayToken);
          }
        } catch {
          // Token decrypt failed — daemon will handle error
        }
        return {
          messageId: msg.id,
          agentId: msg.agentId,
          content: msg.content,
          containerPort: agent?.containerPort ?? null,
          gatewayToken,
        };
      });

      return NextResponse.json({ messages });
    }

    // Wait before next check
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  // 4. Timeout — return empty
  return NextResponse.json({ messages: [] });
}
