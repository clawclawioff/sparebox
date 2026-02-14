import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { z } from "zod";
import { db } from "@/db";
import { hostApiKeys, hostHeartbeats, hosts, agentCommands, agents, agentMessages } from "@/db/schema";
import { eq, and, isNull, inArray } from "drizzle-orm";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import {
  API_KEY_PREFIX,
  HEARTBEAT_INTERVAL_MS,
  HEARTBEAT_RATE_LIMIT_PER_SEC,
  COMMAND_EXPIRY_MS,
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
        agentId: z.string(),
        containerId: z.string().nullable().optional(),
        name: z.string().optional(), // backwards compat
        status: z.enum(["running", "stopped", "error", "deploying"]),
        uptimeSeconds: z.number().min(0).optional(),
        cpuPercent: z.number().min(0).max(100).optional(),
        ramMb: z.number().min(0).optional(),
        ramUsageMb: z.number().min(0).optional(),
        ramLimitMb: z.number().min(0).optional(),
        port: z.number().int().positive().optional(),
      })
    )
    .default([]),
  daemonVersion: z.string().min(1).max(50),
  osInfo: z.string().max(200).optional(),
  nodeVersion: z.string().max(50).optional(),
  uptime: z.number().min(0).optional(),
  publicIp: z.string().max(45).optional(), // IPv4 or IPv6
  tailscaleIp: z.string().max(45).optional(),
  // Hardware spec verification fields (reported by daemon)
  totalRamGb: z.number().min(0).optional(),
  totalDiskGb: z.number().min(0).optional(),
  cpuCores: z.number().int().min(1).optional(),
  cpuModel: z.string().max(200).optional(),
  // Docker/isolation info
  isolationMode: z.enum(["docker", "podman", "profile", "none"]).optional(),
  openclawVersion: z.string().max(50).optional(),
  // Command acknowledgments from previous heartbeat
  commandAcks: z
    .array(
      z.object({
        id: z.string().uuid(),
        status: z.enum(["acked", "failed"]),
        error: z.string().max(1000).optional(),
        containerId: z.string().max(100).optional(),
      })
    )
    .default([]),
  // Message responses from agent (chat replies)
  messageResponses: z
    .array(
      z.object({
        messageId: z.string().uuid(), // the user message being replied to
        agentId: z.string().uuid(),
        content: z.string().max(50000),
      })
    )
    .default([]),
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

  // 7. Update host record (always update telemetry, but don't override suspended status)
  await db
    .update(hosts)
    .set({
      lastHeartbeat: new Date(),
      daemonVersion: data.daemonVersion,
      nodeVersion: data.nodeVersion || null,
      publicIp: data.publicIp || null,
      isolationMode: data.isolationMode || null,
      openclawVersion: data.openclawVersion || null,
      updatedAt: new Date(),
    })
    .where(eq(hosts.id, keyRecord.hostId));

  // Only change status to active if currently inactive or pending (not suspended)
  await db
    .update(hosts)
    .set({ status: "active" })
    .where(
      and(
        eq(hosts.id, keyRecord.hostId),
        inArray(hosts.status, ["inactive", "pending"])
      )
    );

  // 7b. Spec verification — runs once per host on first heartbeat with hw data
  if (data.totalRamGb !== undefined && data.cpuCores !== undefined) {
    // Check if already verified
    const hostRecord = await db.query.hosts.findFirst({
      where: eq(hosts.id, keyRecord.hostId),
      columns: { specsVerified: true },
    });

    if (hostRecord && !hostRecord.specsVerified) {
      // Overwrite user-inputted specs with daemon-reported values
      const specUpdate: Record<string, unknown> = {
        // Overwrite main columns
        cpuCores: data.cpuCores,
        ramGb: Math.round(data.totalRamGb),
        osInfo: data.osInfo || null,
        // Keep verified_* as audit trail
        specsVerified: true,
        verifiedCpuCores: data.cpuCores,
        verifiedRamGb: Math.round(data.totalRamGb),
        verifiedOsInfo: data.osInfo || null,
        verifiedAt: new Date(),
      };

      // Overwrite storage if daemon reported it
      if (data.totalDiskGb !== undefined && data.totalDiskGb > 0) {
        specUpdate.storageGb = Math.round(data.totalDiskGb);
      }

      // Location verification via IP geolocation
      try {
        const forwarded = req.headers.get("x-forwarded-for");
        const clientIp = forwarded ? forwarded.split(",")[0]!.trim() : null;

        if (clientIp && clientIp !== "127.0.0.1" && clientIp !== "::1") {
          const geoRes = await fetch(`https://ipapi.co/${clientIp}/json/`, {
            signal: AbortSignal.timeout(5000),
          });

          if (geoRes.ok) {
            const geo = (await geoRes.json()) as {
              country_name?: string;
              region?: string;
              city?: string;
              error?: boolean;
            };

            if (!geo.error) {
              if (geo.country_name) specUpdate.country = geo.country_name;
              if (geo.region) specUpdate.region = geo.region;
              if (geo.city) specUpdate.city = geo.city;
            }
          }
        }
      } catch {
        // Geolocation failure is non-critical — keep existing values
      }

      await db
        .update(hosts)
        .set(specUpdate)
        .where(eq(hosts.id, keyRecord.hostId));
    }
  }

  // 8. Process command acknowledgments from daemon
  if (data.commandAcks.length > 0) {
    for (const ack of data.commandAcks) {
      try {
        await db
          .update(agentCommands)
          .set({
            status: ack.status,
            ackedAt: new Date(),
            error: ack.error || null,
          })
          .where(
            and(
              eq(agentCommands.id, ack.id),
              eq(agentCommands.hostId, keyRecord.hostId)
            )
          );

        // If ack was successful, update agent status based on command type
        const cmd = await db.query.agentCommands.findFirst({
          where: eq(agentCommands.id, ack.id),
          columns: { agentId: true, type: true },
        });

        if (cmd && ack.status === "acked") {
          if (cmd.type === "deploy" || cmd.type === "start") {
            await db
              .update(agents)
              .set({
                status: "running",
                containerId: ack.containerId || null,
                updatedAt: new Date(),
              })
              .where(eq(agents.id, cmd.agentId));
          } else if (cmd.type === "stop") {
            await db
              .update(agents)
              .set({ status: "stopped", updatedAt: new Date() })
              .where(eq(agents.id, cmd.agentId));
          } else if (cmd.type === "undeploy") {
            await db
              .update(agents)
              .set({
                status: "stopped",
                containerId: null,
                updatedAt: new Date(),
              })
              .where(eq(agents.id, cmd.agentId));
          }
        }

        // If command failed, mark agent as failed (for deploy)
        if (cmd && ack.status === "failed" && cmd.type === "deploy") {
          await db
            .update(agents)
            .set({ status: "failed", updatedAt: new Date() })
            .where(eq(agents.id, cmd.agentId));
        }
      } catch (err) {
        console.error(`[Heartbeat] Failed to process ack ${ack.id}:`, err);
      }
    }
  }

  // 9. Expire old pending commands (>5 min)
  try {
    const expiryDate = new Date(Date.now() - COMMAND_EXPIRY_MS);
    await db
      .update(agentCommands)
      .set({ status: "expired" })
      .where(
        and(
          eq(agentCommands.hostId, keyRecord.hostId),
          eq(agentCommands.status, "sent"),
          // Commands sent before expiry threshold
        )
      );
  } catch {
    // Non-critical — don't fail the heartbeat
  }

  // 9b. Process message responses from daemon (agent chat replies)
  if (data.messageResponses.length > 0) {
    for (const resp of data.messageResponses) {
      try {
        // Verify the agent belongs to this host
        const agent = await db.query.agents.findFirst({
          where: and(eq(agents.id, resp.agentId), eq(agents.hostId, keyRecord.hostId)),
          columns: { id: true },
        });

        if (!agent) {
          console.error(`[Heartbeat] Message response for unknown agent ${resp.agentId}`);
          continue;
        }

        // Mark the original user message as responded
        await db
          .update(agentMessages)
          .set({ status: "responded", respondedAt: new Date() })
          .where(eq(agentMessages.id, resp.messageId));

        // Insert the agent's reply
        await db.insert(agentMessages).values({
          agentId: resp.agentId,
          role: "agent",
          content: resp.content,
          status: "responded",
          respondedAt: new Date(),
        });
      } catch (err) {
        console.error(`[Heartbeat] Failed to process message response:`, err);
      }
    }
  }

  // 10. Fetch pending commands for this host
  let pendingCommands: Array<{
    id: string;
    type: string;
    agentId: string;
    payload: unknown;
  }> = [];

  try {
    const pending = await db.query.agentCommands.findMany({
      where: and(
        eq(agentCommands.hostId, keyRecord.hostId),
        eq(agentCommands.status, "pending")
      ),
      orderBy: (cmd, { asc }) => [asc(cmd.createdAt)],
      limit: 10,
    });

    if (pending.length > 0) {
      pendingCommands = pending.map((cmd) => ({
        id: cmd.id,
        type: cmd.type,
        agentId: cmd.agentId,
        payload: cmd.payload,
      }));

      // Mark as sent
      const commandIds = pending.map((c) => c.id);
      await db
        .update(agentCommands)
        .set({ status: "sent", sentAt: new Date() })
        .where(inArray(agentCommands.id, commandIds));
    }
  } catch (err) {
    console.error("[Heartbeat] Failed to fetch pending commands:", err);
  }

  // 10b. Fetch pending messages for agents on this host
  let pendingMessages: Array<{
    id: string;
    agentId: string;
    content: string;
  }> = [];

  try {
    // Get all agent IDs on this host
    const hostAgents = await db.query.agents.findMany({
      where: and(
        eq(agents.hostId, keyRecord.hostId),
        inArray(agents.status, ["running", "deploying"])
      ),
      columns: { id: true },
    });

    if (hostAgents.length > 0) {
      const agentIds = hostAgents.map((a) => a.id);

      const msgs = await db.query.agentMessages.findMany({
        where: and(
          inArray(agentMessages.agentId, agentIds),
          eq(agentMessages.role, "user"),
          eq(agentMessages.status, "pending")
        ),
        orderBy: (m, { asc }) => [asc(m.createdAt)],
        limit: 20,
      });

      if (msgs.length > 0) {
        pendingMessages = msgs.map((m) => ({
          id: m.id,
          agentId: m.agentId,
          content: m.content,
        }));

        // Mark as delivered
        const msgIds = msgs.map((m) => m.id);
        await db
          .update(agentMessages)
          .set({ status: "delivered", deliveredAt: new Date() })
          .where(inArray(agentMessages.id, msgIds));
      }
    }
  } catch (err) {
    console.error("[Heartbeat] Failed to fetch pending messages:", err);
  }

  // 11. Update key last_used_at
  await db
    .update(hostApiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(hostApiKeys.id, keyRecord.id));

  // 12. Return response
  return NextResponse.json({
    ok: true,
    ts: Date.now(),
    commands: pendingCommands,
    messages: pendingMessages,
    nextHeartbeatMs: HEARTBEAT_INTERVAL_MS,
  });
}
