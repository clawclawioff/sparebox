import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { db } from "@/db";
import { agents, hostApiKeys } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { decrypt, encrypt } from "@/lib/encryption";
import { API_KEY_PREFIX, TIERS, type TierKey } from "@/lib/constants";

// =============================================================================
// GET /api/agents/[id]/deploy-config
// Returns the full OpenClaw configuration bundle for a deployed agent.
// Auth: daemon API key (same as heartbeat)
// =============================================================================

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: agentId } = await params;

  // 1. Auth — daemon API key
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith(`Bearer ${API_KEY_PREFIX}`)) {
    return NextResponse.json(
      { error: "Missing or invalid Authorization header" },
      { status: 401 }
    );
  }

  const apiKey = authHeader.slice(7);
  const keyHash = createHash("sha256").update(apiKey).digest("hex");

  const keyRecord = await db.query.hostApiKeys.findFirst({
    where: and(
      eq(hostApiKeys.keyHash, keyHash),
      isNull(hostApiKeys.revokedAt)
    ),
  });

  if (!keyRecord) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  // 2. Fetch agent and verify it belongs to this host
  const agent = await db.query.agents.findFirst({
    where: eq(agents.id, agentId),
  });

  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  if (agent.hostId !== keyRecord.hostId) {
    return NextResponse.json(
      { error: "Agent not assigned to this host" },
      { status: 403 }
    );
  }

  // 3. Build the config bundle
  const tier = TIERS[(agent.tier as TierKey) || "standard"] || TIERS.standard;

  // Decrypt API key if present
  let apiKeyPlaintext: string | null = null;
  if (agent.encryptedApiKey) {
    try {
      apiKeyPlaintext = decrypt(agent.encryptedApiKey);
    } catch (err) {
      console.error(`[deploy-config] Failed to decrypt API key for agent ${agentId}:`, err);
    }
  }

  // Parse workspace files
  const workspaceFiles = (agent.workspaceFiles as Record<string, string>) || {};

  // Parse agent config (OpenClaw config overrides)
  const agentConfig = (agent.config as Record<string, unknown>) || {};

  // 4. Build environment variables for the agent
  //    This is the KEY fix: we must pass the API key and model as env vars
  //    so the running agent (docker or profile) can use them.
  const env: Record<string, string> = {};

  if (apiKeyPlaintext) {
    const configProvider = (agentConfig as Record<string, unknown>).provider as string | undefined;

    if (configProvider === "openai" || apiKeyPlaintext.startsWith("sk-") && !apiKeyPlaintext.startsWith("sk-ant-")) {
      env.OPENAI_API_KEY = apiKeyPlaintext;
      env.OPENCLAW_PROVIDER = "openai";
    } else {
      env.ANTHROPIC_API_KEY = apiKeyPlaintext;
      env.OPENCLAW_PROVIDER = "anthropic";
    }
  }

  // Set model from config if provided, or default based on provider
  if (agentConfig.model && typeof agentConfig.model === "string") {
    env.OPENCLAW_MODEL = agentConfig.model;
  } else if (env.OPENCLAW_PROVIDER === "openai") {
    env.OPENCLAW_MODEL = "openai/gpt-5-mini";
  } else if (env.OPENCLAW_PROVIDER === "anthropic") {
    env.OPENCLAW_MODEL = "anthropic/claude-sonnet-4-6";
  }

  // Set agent name
  env.OPENCLAW_AGENT_NAME = agent.name;

  // 5. Generate gateway token for direct HTTP chat (Chat V2)
  //    If agent doesn't have one, generate and store it
  let gatewayToken: string;
  if (agent.gatewayToken) {
    try {
      gatewayToken = decrypt(agent.gatewayToken);
    } catch (err) {
      console.error(`[deploy-config] Failed to decrypt gateway token for agent ${agentId}, generating new one:`, err);
      gatewayToken = randomBytes(32).toString("hex");
      await db.update(agents).set({ gatewayToken: encrypt(gatewayToken) }).where(eq(agents.id, agentId));
    }
  } else {
    // Generate new gateway token
    gatewayToken = randomBytes(32).toString("hex");
    await db.update(agents).set({ gatewayToken: encrypt(gatewayToken) }).where(eq(agents.id, agentId));
    console.log(`[deploy-config] Generated gateway token for agent ${agentId}`);
  }

  // 6. Determine model for OpenClaw config
  const modelPrimary = env.OPENCLAW_MODEL || 
    (env.OPENCLAW_PROVIDER === "openai" ? "openai/gpt-5-mini" : "anthropic/claude-sonnet-4-6");

  // 7. Build OpenClaw config with HTTP API enabled
  //    This config will be written to /state/openclaw.json in the container
  //    IMPORTANT: Only include valid OpenClaw config keys.
  //    agentConfig contains Sparebox-internal fields (provider, model, etc.)
  //    that are NOT valid OpenClaw config keys — do NOT spread them here.
  const openclawConfig = {
    // Gateway config with HTTP API enabled
    gateway: {
      // Port 3000 matches Docker's internal port mapping ({hostPort}:3000)
      port: 3000,
      // Bind to 0.0.0.0 so Docker can forward traffic into the container
      // (default "loopback" only binds 127.0.0.1, unreachable from host)
      bind: "lan",
      auth: {
        mode: "token" as const,
        token: gatewayToken,
      },
      http: {
        endpoints: {
          chatCompletions: {
            enabled: true,
          },
        },
      },
    },
    // Agent defaults
    agents: {
      defaults: {
        model: {
          primary: modelPrimary,
        },
      },
    },
  };

  const configBundle = {
    agentId: agent.id,
    agentName: agent.name,
    tier: agent.tier,
    resources: {
      ramMb: tier.ramMb,
      cpuCores: tier.cpuCores,
      diskGb: tier.diskGb,
    },
    // Environment variables — daemon MUST pass these to the container/profile
    env,
    // OpenClaw configuration (daemon writes to /state/openclaw.json)
    openclawConfig,
    // Gateway token (also in openclawConfig, but explicit for daemon)
    gatewayToken,
    // Workspace files to create in the agent's workspace
    workspaceFiles,
    // LLM API key (kept for backwards compat, but `env` is authoritative)
    apiKey: apiKeyPlaintext,
    // Metadata
    createdAt: agent.createdAt,
  };

  return NextResponse.json(configBundle, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
