/**
 * Agent Manager — processes commands from the platform heartbeat
 * and manages agent lifecycle (deploy, start, stop, restart, undeploy, update_config).
 *
 * Supports two isolation modes:
 *   - "docker" — containers with resource limits and security hardening
 *   - "profile" — openclaw --profile fallback for hosts without Docker
 *
 * Zero npm dependencies. Agent state is persisted to ~/.sparebox/agents.json.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import * as https from "node:https";
import * as http from "node:http";
import { URL } from "node:url";
import { log } from "./log.js";
import {
  detectRuntime,
  pullImage,
  createContainer,
  startContainer,
  stopContainer,
  removeContainer,
  getContainerStats,
  isContainerRunning,
  type ContainerStats,
} from "./docker.js";
import {
  findOpenclawBinary,
  startProfile,
  stopProfile,
  killProfile,
  getProfileStatus,
} from "./profile-fallback.js";
import type { DaemonConfig } from "./config.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type IsolationMode = "docker" | "profile" | "none";

export interface Command {
  id: string;
  type: "deploy" | "start" | "stop" | "restart" | "undeploy" | "update_config";
  agentId: string;
  payload: {
    profile?: string;
    configUrl?: string;
    tier?: string;
    image?: string;
    resources?: {
      ramMb?: number;
      cpuCores?: number;
      diskGb?: number;
    };
    env?: Record<string, string>;
  };
}

export interface CommandAck {
  id: string;
  status: "acked" | "error";
  containerId?: string;
  error?: string;
}

export interface AgentRecord {
  agentId: string;
  profile: string;
  containerId: string | null;
  pid: number | null;
  port: number;
  status: "running" | "stopped" | "deploying" | "error";
  isolation: IsolationMode;
  image: string;
  deployedAt: string;
  resources: {
    ramMb: number;
    cpuCores: number;
    diskGb: number;
  };
}

export interface AgentStatus {
  agentId: string;
  containerId: string | null;
  status: string;
  cpuPercent: number;
  ramUsageMb: number;
  ramLimitMb: number;
  port: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SPAREBOX_DIR = path.join(os.homedir(), ".sparebox");
const AGENTS_FILE = path.join(SPAREBOX_DIR, "agents.json");
const AGENTS_DIR = path.join(SPAREBOX_DIR, "agents");
const DEFAULT_IMAGE = "ghcr.io/openclaw/openclaw:latest";
const BASE_PORT = 19001;

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let agents: Map<string, AgentRecord> = new Map();
let isolationMode: IsolationMode = "none";
let daemonConfig: DaemonConfig | null = null;
let pendingAcks: CommandAck[] = [];

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

/**
 * Initialize the agent manager: detect runtime, load persisted state.
 */
export async function initAgentManager(config: DaemonConfig): Promise<IsolationMode> {
  daemonConfig = config;

  // Ensure directories exist
  ensureDir(SPAREBOX_DIR);
  ensureDir(AGENTS_DIR);

  // Load persisted agents
  loadAgents();

  // Detect isolation mode
  const runtime = await detectRuntime();
  if (runtime) {
    isolationMode = "docker";
    log("INFO", `Agent isolation: docker (${runtime})`);
  } else {
    const bin = await findOpenclawBinary();
    if (bin) {
      isolationMode = "profile";
      log("INFO", `Agent isolation: profile (openclaw at ${bin})`);
    } else {
      isolationMode = "none";
      log("WARN", "Agent isolation: none — no docker/podman or openclaw binary found");
    }
  }

  // Reconcile running containers with persisted state
  await reconcileAgents();

  return isolationMode;
}

/**
 * Get the current isolation mode.
 */
export function getIsolationMode(): IsolationMode {
  return isolationMode;
}

/**
 * Get count of tracked agents.
 */
export function getAgentCount(): number {
  return agents.size;
}

/**
 * Get agent records for message handling (reduced info for message-handler module).
 */
export function getAgentRecordsForMessaging(): Map<string, { containerId: string | null; pid: number | null; isolation: string; port: number; profile: string }> {
  const result = new Map<string, { containerId: string | null; pid: number | null; isolation: string; port: number; profile: string }>();
  for (const [id, agent] of agents) {
    if (agent.status === "running") {
      result.set(id, {
        containerId: agent.containerId,
        pid: agent.pid,
        isolation: agent.isolation,
        port: agent.port,
        profile: agent.profile,
      });
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Command processing
// ---------------------------------------------------------------------------

/**
 * Process commands from heartbeat response. Returns ack array.
 */
export async function processCommands(commands: Command[]): Promise<CommandAck[]> {
  const acks: CommandAck[] = [];

  for (const cmd of commands) {
    try {
      log("INFO", `Processing command: ${cmd.type} for agent ${cmd.agentId} (cmd: ${cmd.id})`);
      const ack = await processCommand(cmd);
      acks.push(ack);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log("ERROR", `Command ${cmd.id} (${cmd.type}) failed: ${msg}`);
      acks.push({ id: cmd.id, status: "error", error: msg });
    }
  }

  return acks;
}

async function processCommand(cmd: Command): Promise<CommandAck> {
  switch (cmd.type) {
    case "deploy":
      return handleDeploy(cmd);
    case "start":
      return handleStart(cmd);
    case "stop":
      return handleStop(cmd);
    case "restart":
      return handleRestart(cmd);
    case "undeploy":
      return handleUndeploy(cmd);
    case "update_config":
      return handleUpdateConfig(cmd);
    default:
      return { id: cmd.id, status: "error", error: `Unknown command type: ${(cmd as Command).type}` };
  }
}

// ---------------------------------------------------------------------------
// Command handlers
// ---------------------------------------------------------------------------

async function handleDeploy(cmd: Command): Promise<CommandAck> {
  const { agentId, payload, id } = cmd;
  const profile = payload.profile ?? `sparebox-agent-${agentId.slice(0, 8)}`;
  const image = payload.image ?? DEFAULT_IMAGE;
  const resources = {
    ramMb: payload.resources?.ramMb ?? 2048,
    cpuCores: payload.resources?.cpuCores ?? 1,
    diskGb: payload.resources?.diskGb ?? 10,
  };

  // Check if already deployed
  if (agents.has(agentId)) {
    const existing = agents.get(agentId)!;
    log("WARN", `Agent ${agentId} already deployed as ${existing.containerId ?? existing.pid}`);
    return { id, status: "acked", containerId: existing.containerId ?? `pid:${existing.pid}` };
  }

  // Allocate port
  const port = allocatePort();

  // Create agent directories
  const workspaceDir = path.join(AGENTS_DIR, agentId, "workspace");
  const stateDir = path.join(AGENTS_DIR, agentId, "state");
  ensureDir(workspaceDir);
  ensureDir(stateDir);

  // Fetch deploy config if configUrl provided
  let agentEnv: Record<string, string> = { ...(payload.env ?? {}) };
  if (payload.configUrl && daemonConfig) {
    try {
      const configData = await fetchConfig(payload.configUrl, daemonConfig);

      // 1. Merge environment variables (API keys, model, etc.)
      if (configData.env) {
        agentEnv = { ...agentEnv, ...configData.env };
      }

      // 2. Write workspace files to agent workspace directory
      if (configData.workspaceFiles && typeof configData.workspaceFiles === "object") {
        for (const [filename, content] of Object.entries(configData.workspaceFiles)) {
          if (typeof content === "string") {
            const filePath = path.join(workspaceDir, filename);
            // Ensure subdirectories exist
            ensureDir(path.dirname(filePath));
            fs.writeFileSync(filePath, content, "utf-8");
            log("INFO", `Wrote workspace file: ${filename} (${content.length} bytes)`);
          }
        }
      }

      // 3. Write OpenClaw config to state directory
      if (configData.openclawConfig && typeof configData.openclawConfig === "object") {
        fs.writeFileSync(
          path.join(stateDir, "openclaw-config.json"),
          JSON.stringify(configData.openclawConfig, null, 2),
          "utf-8"
        );
      }

      // 4. Write full deploy config for reference
      fs.writeFileSync(
        path.join(stateDir, "deploy-config.json"),
        JSON.stringify(configData, null, 2),
        "utf-8"
      );

      log("INFO", `Deploy config applied for ${agentId}: ${Object.keys(agentEnv).join(", ") || "no env vars"}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log("WARN", `Failed to fetch deploy config for ${agentId}: ${msg}`);
    }
  }

  // Deploy based on isolation mode
  let containerId: string | null = null;
  let pid: number | null = null;

  if (isolationMode === "docker") {
    // Pull image first
    await pullImage(image);

    containerId = await createContainer({
      name: profile,
      image,
      ramMb: resources.ramMb,
      cpuCores: resources.cpuCores,
      port,
      workspaceDir,
      stateDir,
      env: agentEnv,
    });

    // Wait for container to be running
    let healthy = false;
    for (let i = 0; i < 10; i++) {
      await sleep(1000);
      if (await isContainerRunning(containerId)) {
        healthy = true;
        break;
      }
    }

    if (!healthy) {
      log("WARN", `Container ${containerId} did not become healthy in 10s`);
    }
  } else if (isolationMode === "profile") {
    // Write API key to the profile's auth store before starting
    if (agentEnv.ANTHROPIC_API_KEY || agentEnv.OPENAI_API_KEY) {
      try {
        const { homedir } = await import("node:os");
        const profileDir = path.join(homedir(), `.openclaw-${profile}`);
        const agentAuthDir = path.join(profileDir, "agents", "main", "agent");
        ensureDir(agentAuthDir);

        const authProfiles: Record<string, unknown> = {
          version: 1,
          profiles: {} as Record<string, unknown>,
          lastGood: {} as Record<string, string>,
        };

        if (agentEnv.ANTHROPIC_API_KEY) {
          (authProfiles.profiles as Record<string, unknown>)["anthropic:sparebox"] = {
            type: "token",
            provider: "anthropic",
            token: agentEnv.ANTHROPIC_API_KEY,
          };
          (authProfiles.lastGood as Record<string, string>)["anthropic"] = "anthropic:sparebox";
        }

        if (agentEnv.OPENAI_API_KEY) {
          (authProfiles.profiles as Record<string, unknown>)["openai:sparebox"] = {
            type: "token",
            provider: "openai",
            token: agentEnv.OPENAI_API_KEY,
          };
          (authProfiles.lastGood as Record<string, string>)["openai"] = "openai:sparebox";
        }

        fs.writeFileSync(
          path.join(agentAuthDir, "auth-profiles.json"),
          JSON.stringify(authProfiles, null, 2),
          "utf-8"
        );
        // Also write openclaw.json for the profile with correct model config
        const isOpenAI = !!agentEnv.OPENAI_API_KEY && !agentEnv.ANTHROPIC_API_KEY;
        const openclawConfig: Record<string, unknown> = {
          auth: {
            profiles: isOpenAI
              ? { "openai:sparebox": { provider: "openai", mode: "token" } }
              : { "anthropic:sparebox": { provider: "anthropic", mode: "token" } },
          },
          agents: {
            defaults: {
              model: {
                primary: isOpenAI ? "openai/gpt-4o" : "anthropic/claude-sonnet-4-20250514",
              },
            },
          },
        };

        fs.writeFileSync(
          path.join(profileDir, "openclaw.json"),
          JSON.stringify(openclawConfig, null, 2),
          "utf-8"
        );

        log("INFO", `Wrote auth profiles and config for ${profile}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log("WARN", `Failed to write auth profiles for ${profile}: ${msg}`);
      }
    }

    pid = await startProfile(profile, port, agentEnv);
  } else {
    return { id, status: "error", error: "No isolation runtime available" };
  }

  // Record the agent
  const record: AgentRecord = {
    agentId,
    profile,
    containerId,
    pid,
    port,
    status: "running",
    isolation: isolationMode,
    image,
    deployedAt: new Date().toISOString(),
    resources,
  };

  agents.set(agentId, record);
  saveAgents();

  log("INFO", `Agent ${agentId} deployed: ${containerId ?? `pid:${pid}`} on port ${port}`);
  return { id, status: "acked", containerId: containerId ?? `pid:${pid}` };
}

async function handleStart(cmd: Command): Promise<CommandAck> {
  const agent = agents.get(cmd.agentId);
  if (!agent) {
    return { id: cmd.id, status: "error", error: `Agent ${cmd.agentId} not found` };
  }

  try {
    if (agent.isolation === "docker" && agent.containerId) {
      await startContainer(agent.containerId);
    } else if (agent.isolation === "profile") {
      const pid = await startProfile(agent.profile, agent.port, {});
      agent.pid = pid;
    }

    agent.status = "running";
    saveAgents();

    return { id: cmd.id, status: "acked", containerId: agent.containerId ?? `pid:${agent.pid}` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    agent.status = "error";
    saveAgents();
    return { id: cmd.id, status: "error", error: msg };
  }
}

async function handleStop(cmd: Command): Promise<CommandAck> {
  const agent = agents.get(cmd.agentId);
  if (!agent) {
    return { id: cmd.id, status: "error", error: `Agent ${cmd.agentId} not found` };
  }

  try {
    if (agent.isolation === "docker" && agent.containerId) {
      await stopContainer(agent.containerId);
    } else if (agent.isolation === "profile") {
      await stopProfile(agent.profile);
    }

    agent.status = "stopped";
    saveAgents();

    return { id: cmd.id, status: "acked", containerId: agent.containerId ?? `pid:${agent.pid}` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { id: cmd.id, status: "error", error: msg };
  }
}

async function handleRestart(cmd: Command): Promise<CommandAck> {
  const agent = agents.get(cmd.agentId);
  if (!agent) {
    return { id: cmd.id, status: "error", error: `Agent ${cmd.agentId} not found` };
  }

  try {
    if (agent.isolation === "docker" && agent.containerId) {
      await stopContainer(agent.containerId);
      await startContainer(agent.containerId);
    } else if (agent.isolation === "profile") {
      await stopProfile(agent.profile);
      await sleep(1000);
      const pid = await startProfile(agent.profile, agent.port, {});
      agent.pid = pid;
    }

    agent.status = "running";
    saveAgents();

    return { id: cmd.id, status: "acked", containerId: agent.containerId ?? `pid:${agent.pid}` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    agent.status = "error";
    saveAgents();
    return { id: cmd.id, status: "error", error: msg };
  }
}

async function handleUndeploy(cmd: Command): Promise<CommandAck> {
  const agent = agents.get(cmd.agentId);
  if (!agent) {
    return { id: cmd.id, status: "acked" }; // Already gone
  }

  try {
    if (agent.isolation === "docker" && agent.containerId) {
      await removeContainer(agent.containerId);
    } else if (agent.isolation === "profile") {
      await stopProfile(agent.profile);
      if (agent.pid) {
        await killProfile(agent.pid);
      }
    }

    // Cleanup agent directories
    const agentDir = path.join(AGENTS_DIR, cmd.agentId);
    try {
      fs.rmSync(agentDir, { recursive: true, force: true });
    } catch {
      log("WARN", `Failed to clean up agent dir: ${agentDir}`);
    }

    agents.delete(cmd.agentId);
    saveAgents();

    log("INFO", `Agent ${cmd.agentId} undeployed`);
    return { id: cmd.id, status: "acked" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { id: cmd.id, status: "error", error: msg };
  }
}

async function handleUpdateConfig(cmd: Command): Promise<CommandAck> {
  const agent = agents.get(cmd.agentId);
  if (!agent) {
    return { id: cmd.id, status: "error", error: `Agent ${cmd.agentId} not found` };
  }

  try {
    // Fetch new config
    let newEnv: Record<string, string> = {};
    if (cmd.payload.configUrl && daemonConfig) {
      const configData = await fetchConfig(cmd.payload.configUrl, daemonConfig);
      const stateDir = path.join(AGENTS_DIR, cmd.agentId, "state");
      const workspaceDir = path.join(AGENTS_DIR, cmd.agentId, "workspace");
      ensureDir(stateDir);
      ensureDir(workspaceDir);

      // Extract env vars
      if (configData.env) {
        newEnv = { ...configData.env };
      }

      // Update workspace files
      if (configData.workspaceFiles && typeof configData.workspaceFiles === "object") {
        for (const [filename, content] of Object.entries(configData.workspaceFiles)) {
          if (typeof content === "string") {
            const filePath = path.join(workspaceDir, filename);
            ensureDir(path.dirname(filePath));
            fs.writeFileSync(filePath, content, "utf-8");
          }
        }
      }

      // Update openclaw config
      if (configData.openclawConfig && typeof configData.openclawConfig === "object") {
        fs.writeFileSync(
          path.join(stateDir, "openclaw-config.json"),
          JSON.stringify(configData.openclawConfig, null, 2),
          "utf-8"
        );
      }

      fs.writeFileSync(
        path.join(stateDir, "deploy-config.json"),
        JSON.stringify(configData, null, 2),
        "utf-8"
      );
    }

    // Restart the agent to pick up new config
    if (agent.isolation === "docker" && agent.containerId) {
      await stopContainer(agent.containerId);
      await startContainer(agent.containerId);
    } else if (agent.isolation === "profile") {
      await stopProfile(agent.profile);
      await sleep(1000);
      const pid = await startProfile(agent.profile, agent.port, newEnv);
      agent.pid = pid;
    }

    agent.status = "running";
    saveAgents();

    log("INFO", `Agent ${cmd.agentId} config updated and restarted`);
    return { id: cmd.id, status: "acked", containerId: agent.containerId ?? `pid:${agent.pid}` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    agent.status = "error";
    saveAgents();
    return { id: cmd.id, status: "error", error: msg };
  }
}

// ---------------------------------------------------------------------------
// Agent status collection
// ---------------------------------------------------------------------------

/**
 * Collect real-time status for all tracked agents.
 */
export async function getAgentStatuses(): Promise<AgentStatus[]> {
  const statuses: AgentStatus[] = [];

  for (const [agentId, agent] of agents) {
    let stats: ContainerStats = { cpuPercent: 0, ramUsageMb: 0, ramLimitMb: 0 };
    let status = agent.status;

    try {
      if (agent.isolation === "docker" && agent.containerId) {
        const running = await isContainerRunning(agent.containerId);
        status = running ? "running" : "stopped";
        if (running) {
          stats = await getContainerStats(agent.containerId);
        }
      } else if (agent.isolation === "profile") {
        const profileStatus = await getProfileStatus(agent.profile, agent.pid);
        status = profileStatus === "running" ? "running" : profileStatus === "stopped" ? "stopped" : agent.status;
      }
    } catch {
      // Stats collection failure — use defaults
    }

    statuses.push({
      agentId,
      containerId: agent.containerId,
      status,
      cpuPercent: stats.cpuPercent,
      ramUsageMb: stats.ramUsageMb,
      ramLimitMb: stats.ramLimitMb,
      port: agent.port,
    });
  }

  return statuses;
}

// ---------------------------------------------------------------------------
// Pending acks
// ---------------------------------------------------------------------------

/**
 * Drain and return pending command acks.
 */
export function drainAcks(): CommandAck[] {
  const acks = [...pendingAcks];
  pendingAcks = [];
  return acks;
}

/**
 * Queue acks from command processing.
 */
export function queueAcks(acks: CommandAck[]): void {
  pendingAcks.push(...acks);
}

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

/**
 * Stop all running agents (used during daemon shutdown).
 */
export async function shutdownAllAgents(): Promise<void> {
  log("INFO", `Shutting down ${agents.size} agent(s)...`);

  const stopPromises: Promise<void>[] = [];

  for (const [agentId, agent] of agents) {
    if (agent.status !== "running") continue;

    log("INFO", `Stopping agent ${agentId}...`);

    if (agent.isolation === "docker" && agent.containerId) {
      stopPromises.push(
        stopContainer(agent.containerId).catch((err) => {
          const msg = err instanceof Error ? err.message : String(err);
          log("WARN", `Failed to stop agent ${agentId}: ${msg}`);
        })
      );
    } else if (agent.isolation === "profile") {
      stopPromises.push(
        stopProfile(agent.profile).catch((err) => {
          const msg = err instanceof Error ? err.message : String(err);
          log("WARN", `Failed to stop profile agent ${agentId}: ${msg}`);
        })
      );
    }
  }

  // Wait for all stops with a timeout
  await Promise.race([
    Promise.all(stopPromises),
    sleep(15_000), // 15s max shutdown time
  ]);

  log("INFO", "All agents stopped");
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

function loadAgents(): void {
  try {
    if (fs.existsSync(AGENTS_FILE)) {
      const raw = fs.readFileSync(AGENTS_FILE, "utf-8");
      const records: AgentRecord[] = JSON.parse(raw);
      agents = new Map(records.map((r) => [r.agentId, r]));
      log("INFO", `Loaded ${agents.size} agent(s) from state file`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("WARN", `Failed to load agents state: ${msg}`);
    agents = new Map();
  }
}

function saveAgents(): void {
  try {
    const records = Array.from(agents.values());
    fs.writeFileSync(AGENTS_FILE, JSON.stringify(records, null, 2), "utf-8");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("ERROR", `Failed to save agents state: ${msg}`);
  }
}

// ---------------------------------------------------------------------------
// Reconciliation — sync persisted state with actual container state
// ---------------------------------------------------------------------------

async function reconcileAgents(): Promise<void> {
  if (agents.size === 0) return;

  log("INFO", `Reconciling ${agents.size} persisted agent(s) with runtime...`);

  for (const [agentId, agent] of agents) {
    try {
      if (agent.isolation === "docker" && agent.containerId) {
        const running = await isContainerRunning(agent.containerId);
        const newStatus = running ? "running" : "stopped";
        if (agent.status !== newStatus) {
          log("INFO", `Agent ${agentId}: ${agent.status} → ${newStatus} (reconciled)`);
          agent.status = newStatus;
        }
      } else if (agent.isolation === "profile") {
        const status = await getProfileStatus(agent.profile, agent.pid);
        if (status !== agent.status && status !== "unknown") {
          log("INFO", `Agent ${agentId}: ${agent.status} → ${status} (reconciled)`);
          agent.status = status as AgentRecord["status"];
        }
      }
    } catch {
      // Can't check this agent — leave state as-is
    }
  }

  saveAgents();
}

// ---------------------------------------------------------------------------
// Port allocation
// ---------------------------------------------------------------------------

function allocatePort(): number {
  const usedPorts = new Set<number>();
  for (const agent of agents.values()) {
    usedPorts.add(agent.port);
  }

  let port = BASE_PORT;
  while (usedPorts.has(port)) {
    port++;
  }
  return port;
}

// ---------------------------------------------------------------------------
// Config fetching
// ---------------------------------------------------------------------------

interface DeployConfig {
  agentId?: string;
  agentName?: string;
  tier?: string;
  env?: Record<string, string>;
  openclawConfig?: Record<string, unknown>;
  workspaceFiles?: Record<string, string>;
  apiKey?: string | null;
  resources?: {
    ramMb?: number;
    cpuCores?: number;
    diskGb?: number;
  };
  [key: string]: unknown;
}

function fetchConfig(configUrl: string, config: DaemonConfig): Promise<DeployConfig> {
  // configUrl is relative — prepend apiUrl
  const fullUrl = configUrl.startsWith("http") ? configUrl : `${config.apiUrl}${configUrl}`;

  return new Promise((resolve, reject) => {
    const parsed = new URL(fullUrl);
    const transport = parsed.protocol === "https:" ? https : http;

    const req = transport.get(
      fullUrl,
      {
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          Accept: "application/json",
        },
        timeout: 30_000,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf-8");
          if (res.statusCode === 200) {
            try {
              resolve(JSON.parse(body) as DeployConfig);
            } catch {
              reject(new Error(`Invalid JSON in deploy config: ${body.slice(0, 200)}`));
            }
          } else {
            reject(new Error(`Deploy config fetch failed: ${res.statusCode} — ${body.slice(0, 200)}`));
          }
        });
      }
    );

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy(new Error("Config fetch timeout (30s)"));
    });
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ensureDir(dir: string): void {
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch {
    // may already exist
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
