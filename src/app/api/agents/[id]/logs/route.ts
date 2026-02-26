import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { db } from "@/db";
import { hostApiKeys, agents, agentLogs } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { API_KEY_PREFIX } from "@/lib/constants";

export const maxDuration = 10;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: agentId } = await params;

  // Auth — daemon API key
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith(`Bearer ${API_KEY_PREFIX}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = authHeader.slice(7);
  const keyHash = createHash("sha256").update(apiKey).digest("hex");
  const keyRecord = await db.query.hostApiKeys.findFirst({
    where: and(eq(hostApiKeys.keyHash, keyHash), isNull(hostApiKeys.revokedAt)),
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

  // Parse log entries
  let body: { logs?: Array<{ timestamp?: string; level?: string; message: string; source?: string }> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const entries = body.logs || [];
  if (entries.length === 0) {
    return NextResponse.json({ ok: true, count: 0 });
  }

  // Limit batch size
  if (entries.length > 500) {
    return NextResponse.json({ error: "Too many log entries (max 500)" }, { status: 400 });
  }

  // Insert logs
  const values = entries.map(e => ({
    agentId,
    timestamp: e.timestamp ? new Date(e.timestamp) : new Date(),
    level: e.level || "info",
    message: typeof e.message === "string" ? e.message.slice(0, 10000) : String(e.message),
    source: e.source || "container",
  }));

  await db.insert(agentLogs).values(values);

  return NextResponse.json({ ok: true, count: values.length });
}
