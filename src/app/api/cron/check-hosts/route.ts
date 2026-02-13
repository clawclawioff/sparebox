import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { db } from "@/db";
import { hosts } from "@/db/schema";
import { eq, and, lt, gte, isNotNull } from "drizzle-orm";
import {
  HEARTBEAT_STALE_THRESHOLD_MS,
  HEARTBEAT_REACTIVATE_THRESHOLD_MS,
} from "@/lib/constants";

// =============================================================================
// Helpers
// =============================================================================

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

// =============================================================================
// GET /api/cron/check-hosts
// Vercel Cron Job — runs every 5 minutes
// Marks hosts as inactive when heartbeats are stale
// =============================================================================

export async function GET(req: NextRequest) {
  // Verify Vercel cron secret (timing-safe comparison)
  const authHeader = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!authHeader || !safeCompare(authHeader, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // 1. Find active hosts with stale heartbeats (>5 min) and mark inactive
  const staleThreshold = new Date(now.getTime() - HEARTBEAT_STALE_THRESHOLD_MS);

  const staleHosts = await db
    .update(hosts)
    .set({ status: "inactive", updatedAt: now })
    .where(
      and(
        eq(hosts.status, "active"),
        isNotNull(hosts.lastHeartbeat),
        lt(hosts.lastHeartbeat, staleThreshold)
      )
    )
    .returning({ id: hosts.id, name: hosts.name });

  // 2. Find inactive hosts with fresh heartbeats (<2 min) and re-activate
  const freshThreshold = new Date(
    now.getTime() - HEARTBEAT_REACTIVATE_THRESHOLD_MS
  );

  const recoveredHosts = await db
    .update(hosts)
    .set({ status: "active", updatedAt: now })
    .where(
      and(
        eq(hosts.status, "inactive"),
        isNotNull(hosts.lastHeartbeat),
        gte(hosts.lastHeartbeat, freshThreshold)
      )
    )
    .returning({ id: hosts.id, name: hosts.name });

  // 3. Log results
  if (staleHosts.length > 0) {
    console.log(
      `[Cron] Marked ${staleHosts.length} host(s) as inactive:`,
      staleHosts.map((h) => h.name).join(", ")
    );
  }

  if (recoveredHosts.length > 0) {
    console.log(
      `[Cron] Re-activated ${recoveredHosts.length} host(s):`,
      recoveredHosts.map((h) => h.name).join(", ")
    );
  }

  return NextResponse.json({
    ok: true,
    checked: now.toISOString(),
    stale: staleHosts.length,
    recovered: recoveredHosts.length,
  });
}
