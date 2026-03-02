import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { agents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

// =============================================================================
// GET /api/agents/[id]/deploy-status
// Returns deploy progress for polling during deployment.
// Auth: session cookie (deployer)
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
    columns: {
      id: true,
      userId: true,
      status: true,
      deployStage: true,
      deployProgress: true,
    },
  });

  if (!agent || agent.userId !== session.user.id) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  // Estimate remaining time based on stage
  const stageTimeEstimates: Record<string, number> = {
    pulling: 60,
    creating: 15,
    starting: 10,
    health_check: 5,
    ready: 0,
  };

  const estimatedTimeRemaining = agent.deployStage
    ? stageTimeEstimates[agent.deployStage] ?? null
    : null;

  return NextResponse.json({
    stage: agent.deployStage,
    progress: agent.deployProgress,
    error: agent.status === "failed" ? "Deployment failed" : null,
    estimatedTimeRemaining,
  });
}
