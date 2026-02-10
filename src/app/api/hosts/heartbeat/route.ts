import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { z } from "zod";
import { db } from "@/db";
import { hostApiKeys, hostHeartbeats, hosts } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import {
  API_KEY_PREFIX,
  HEARTBEAT_INTERVAL_MS,
  HEARTBEAT_RATE_LIMIT_PER_SEC,
} from "@/lib/constants";

// =============================================================================
// Rate Limiter
// =============================================================================

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(HEARTBEAT_RATE_LIMIT_PER_SEC, "1 s"),
  analytics: false,
  prefix: "hb",
});

// =============================================================================
// Validation Schema
// =============================================================================

const heartbeatSchema = z.object({
  cpuUsage: z.number().min(0).max(100),
  ramUsage: z.number().min(0).max(100),
  diskUsage: z.number().min(-1).max(100), // -1 = unknown
  agentCount: z.number().int().min(0).default(0),
  agentStatuses: z
    .array(
      z.object({
        id: z.string().optional(),
        name: z.string(),
        status: z.enum(["running", "stopped", "error"]),
        uptimeSeconds: z.number().min(0).optional(),
        cpuPercent: z.number().min(0).max(100).optional(),
        ramMb: z.number().min(0).optional(),
      })
    )
    .default([]),
  daemonVersion: z.string().min(1).max(50),
  osInfo: z.string().max(200).optional(),
  nodeVersion: z.string().max(50).optional(),
  uptime: z.number().min(0).optional(),
  publicIp: z.string().max(45).optional(), // IPv4 or IPv6
  tailscaleIp: z.string().max(45).optional(),
});

// =============================================================================
// Helpers
// =============================================================================

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

// =============================================================================
// POST /api/hosts/heartbeat
// =============================================================================

export async function POST(req: NextRequest) {
  // 1. Extract API key from Authorization header
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith(`Bearer ${API_KEY_PREFIX}`)) {
    return NextResponse.json(
      { ok: false, error: "Missing or invalid Authorization header" },
      { status: 401 }
    );
  }

  const apiKey = authHeader.slice(7); // Remove "Bearer "

  // 2. Hash the key and look up in database
  const keyHash = sha256(apiKey);
  const keyRecord = await db.query.hostApiKeys.findFirst({
    where: and(
      eq(hostApiKeys.keyHash, keyHash),
      isNull(hostApiKeys.revokedAt)
    ),
  });

  if (!keyRecord) {
    return NextResponse.json(
      { ok: false, error: "Invalid API key" },
      { status: 401 }
    );
  }

  // 3. Check expiry
  if (keyRecord.expiresAt && keyRecord.expiresAt < new Date()) {
    return NextResponse.json(
      { ok: false, error: "API key expired" },
      { status: 401 }
    );
  }

  // 4. Rate limit per host
  const { success } = await ratelimit.limit(keyRecord.hostId);
  if (!success) {
    return NextResponse.json(
      { ok: false, error: "Rate limited" },
      { status: 429, headers: { "Retry-After": "1" } }
    );
  }

  // 5. Parse and validate body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const parsed = heartbeatSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid payload",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // 6. Insert heartbeat record
  await db.insert(hostHeartbeats).values({
    hostId: keyRecord.hostId,
    cpuUsage: data.cpuUsage,
    ramUsage: data.ramUsage,
    diskUsage: data.diskUsage >= 0 ? data.diskUsage : null,
    agentCount: data.agentCount,
  });

  // 7. Update host record (re-activate if inactive)
  await db
    .update(hosts)
    .set({
      lastHeartbeat: new Date(),
      status: "active",
      daemonVersion: data.daemonVersion,
      nodeVersion: data.nodeVersion || null,
      publicIp: data.publicIp || null,
      updatedAt: new Date(),
    })
    .where(eq(hosts.id, keyRecord.hostId));

  // 8. Update key last_used_at
  await db
    .update(hostApiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(hostApiKeys.id, keyRecord.id));

  // 9. Return response
  return NextResponse.json({
    ok: true,
    ts: Date.now(),
    commands: [], // Future: deploy/stop/update commands
    nextHeartbeatMs: HEARTBEAT_INTERVAL_MS,
  });
}
