import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { db } from "@/db";
import { agents, hostApiKeys, agentSecrets, agentWorkspaceFiles, agentIntegrations } from "@/db/schema";
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

  // Parse workspace files from legacy jsonb column
  const legacyWorkspaceFiles = (agent.workspaceFiles as Record<string, string>) || {};

  // Read workspace files from dedicated table
  const dbWorkspaceFiles = await db.query.agentWorkspaceFiles.findMany({
    where: eq(agentWorkspaceFiles.agentId, agentId),
  });
  const tableWorkspaceFiles: Record<string, string> = {};
  for (const f of dbWorkspaceFiles) {
    tableWorkspaceFiles[f.filename] = f.content;
  }

  // Table files take precedence over legacy jsonb
  const workspaceFiles = { ...legacyWorkspaceFiles, ...tableWorkspaceFiles };

  // Parse agent config (OpenClaw config overrides)
  const agentConfig = (agent.config as Record<string, unknown>) || {};
  // Parse settings (dashboard configuration)
  const settings = (agent.settings as Record<string, unknown>) || {};

  // 4. Build environment variables for the agent
  //    This is the KEY fix: we must pass the API key and model as env vars
  //    so the running agent (docker or profile) can use them.
  const env: Record<string, string> = {};

  // Determine LLM provider: prefer explicit llmProvider field, fall back to config
  const effectiveProvider = agent.llmProvider
    || (agentConfig as Record<string, unknown>).provider as string | undefined
    || "anthropic";

  // Map provider to env vars
  const providerEnvKeyMap: Record<string, string> = {
    anthropic: "ANTHROPIC_API_KEY",
    openai: "OPENAI_API_KEY",
    google: "GOOGLE_API_KEY",
  };

  const providerDefaultModel: Record<string, string> = {
    anthropic: "anthropic/claude-sonnet-4-6",
    openai: "openai/gpt-5-mini",
    google: "google/gemini-3-flash",
  };

  if (apiKeyPlaintext) {
    const envKey = providerEnvKeyMap[effectiveProvider] || "ANTHROPIC_API_KEY";
    env[envKey] = apiKeyPlaintext;
    env.OPENCLAW_PROVIDER = effectiveProvider;
  }

  // Set model: explicit llmModel > config model > settings model > provider default
  // Ensure model always has provider prefix (OpenClaw requires "provider/model" format)
  const ensureProviderPrefix = (model: string, provider: string): string => {
    if (model.includes("/")) return model; // already prefixed
    return `${provider}/${model}`;
  };

  if (agent.llmModel) {
    env.OPENCLAW_MODEL = ensureProviderPrefix(agent.llmModel, effectiveProvider);
  } else if (agentConfig.model && typeof agentConfig.model === "string") {
    env.OPENCLAW_MODEL = ensureProviderPrefix(agentConfig.model, effectiveProvider);
  } else if (settings.model && typeof settings.model === "string") {
    env.OPENCLAW_MODEL = ensureProviderPrefix(settings.model, effectiveProvider);
  } else {
    env.OPENCLAW_MODEL = providerDefaultModel[effectiveProvider] || "anthropic/claude-sonnet-4-6";
  }

  // Set agent name
  env.OPENCLAW_AGENT_NAME = agent.name;

  // Note: OPENCLAW_GATEWAY_TOKEN is set below after gateway token is generated

  // Read agent secrets and inject as env vars
  const secrets = await db.query.agentSecrets.findMany({
    where: eq(agentSecrets.agentId, agentId),
  });
  for (const secret of secrets) {
    try {
      env[secret.key] = decrypt(secret.encryptedValue);
    } catch (err) {
      console.error(`[deploy-config] Failed to decrypt secret ${secret.key} for agent ${agentId}`);
    }
  }

  // Read agent integrations and inject enabled credentials as env vars
  const integrations = await db.query.agentIntegrations.findMany({
    where: eq(agentIntegrations.agentId, agentId),
  });
  for (const integration of integrations) {
    if (!integration.enabled) continue;
    try {
      const creds = JSON.parse(decrypt(integration.credentials)) as Record<string, string>;
      for (const [key, value] of Object.entries(creds)) {
        if (typeof value === "string" && value.length > 0) {
          env[key] = value;
        }
      }
    } catch (err) {
      console.error(`[deploy-config] Failed to decrypt integration ${integration.integrationId} for agent ${agentId}`);
    }
  }

  // Apply agent settings
  if (settings.timezone && typeof settings.timezone === "string") {
    env.TZ = settings.timezone;
  }

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

  // Set gateway token as env var so OpenClaw's internal tools (cron, etc.)
  // can authenticate to the gateway when bind=lan (non-loopback connections)
  env.OPENCLAW_GATEWAY_TOKEN = gatewayToken;

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
      mode: "local" as const,
      // Port 3000 matches Docker's internal port mapping ({hostPort}:3000)
      port: 3000,
      // Bind to 0.0.0.0 so Docker can forward traffic into the container
      // (default "loopback" only binds 127.0.0.1, unreachable from host)
      bind: "lan",
      // Disable Control UI — container agents use HTTP API only.
      // Without this, non-loopback bind requires allowedOrigins config
      // and the gateway refuses to start.
      controlUi: {
        enabled: false,
      },
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
    // Cron — webhook token for proactive delivery back to Sparebox
    cron: {
      webhookToken: gatewayToken,
    },
    // Web search — user's key takes priority over platform key
    ...((env.BRAVE_SEARCH_API_KEY || process.env.BRAVE_SEARCH_API_KEY) ? {
      tools: {
        web: {
          search: {
            apiKey: env.BRAVE_SEARCH_API_KEY || process.env.BRAVE_SEARCH_API_KEY,
          },
        },
      },
    } : {}),
    // Agent defaults
    agents: {
      defaults: {
        model: {
          primary: modelPrimary,
        },
        // Workspace is mounted at ~/.openclaw/workspace via Docker volume
        // No need to override — OpenClaw uses this path by default
      },
    },
  };

  // 8. Build default workspace files (merged with user-provided ones)
  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://www.sparebox.dev"}/api/agents/${agentId}/chat/webhook`;
  const defaultWorkspaceFiles: Record<string, string> = {
    "AGENTS.md": `# Agent Environment — Sparebox

You are running inside a Sparebox container. Some features work differently here.

## Tool Availability

### ✅ Works normally
- **Read/Write/Edit** — Files at ~/.openclaw/workspace (your workspace directory)
- **web_fetch** — Fetch and extract content from URLs
- **cron** — Schedule jobs (see Cron section below)
- **gateway** — Config management
- **exec** — Shell commands (limited, see below)

### ⚠️ Limited
- **exec/shell** — Full shell access. You CAN install packages (apt, pip, npm), write anywhere in the container, and run scripts. Resource limits (RAM, CPU, disk) are enforced by the container.
- **web_search** — Only available if the deployer's plan includes it.
- **image** — Vision/image analysis works if your LLM model supports it (GPT-5-mini and Claude Sonnet do).
- **sessions_spawn/subagents** — Works but shares the container's resource limits.

### ❌ Not available
- **browser** — No browser installed in the container. Cannot browse, screenshot, or automate web pages.
- **tts** — No text-to-speech service configured.
- **message** — No messaging channels (Telegram, Discord, etc.). Use the chat interface or webhook delivery instead.
- **nodes** — No paired devices.
- **canvas** — HTML canvas can be generated but there's no browser to view it.

## Cron Jobs / Scheduled Tasks

This environment has **no messaging channels** (no Telegram, Discord, etc.).
When creating cron jobs, you MUST use one of these approaches:

### Option 1: Webhook delivery (recommended for proactive notifications)
Use \`delivery.mode = "webhook"\` with the Sparebox webhook URL:
- Webhook URL: ${webhookUrl}
- Auth: Use the gateway token as Bearer token

Example cron job:
\`\`\`json
{
  "sessionTarget": "isolated",
  "payload": { "kind": "agentTurn", "message": "Generate daily summary" },
  "delivery": { "mode": "webhook", "to": "${webhookUrl}" }
}
\`\`\`

### Option 2: Main session system events (for reminders to yourself)
Use \`sessionTarget: "main"\` with \`payload.kind: "systemEvent"\`.
The user will see the result when they next send a chat message.

### What NOT to do
- Do NOT use \`delivery.mode: "announce"\` — there are no channels to announce to.
- Do NOT try to pair or connect messaging channels.

## File System
- **OpenClaw home:** /home/node/.openclaw (persistent, bind-mounted from host)
- **Workspace:** /home/node/.openclaw/workspace (persistent, read-write — synced bidirectionally with Sparebox dashboard)
- **Config:** /home/node/.openclaw/openclaw.json (managed by daemon)
- **Temp files:** /tmp (tmpfs, cleared on restart, 512MB limit)
- **Everything else:** Writable (you can apt/pip/npm install freely). Resource limits (RAM, CPU) are enforced by the container.

## Environment
- Agent ID: ${agentId}
- Agent Name: ${agent.name}
- Webhook URL: ${webhookUrl}
`,
  };

  // Merge: user files take precedence over defaults
  const mergedWorkspaceFiles = { ...defaultWorkspaceFiles, ...workspaceFiles };

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
    workspaceFiles: mergedWorkspaceFiles,
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
