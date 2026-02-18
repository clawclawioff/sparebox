/**
 * Message Handler — bridges chat messages from the Sparebox platform
 * to running OpenClaw agent instances.
 *
 * For docker-mode: uses `docker exec <containerId> openclaw agent --message ...`
 * For profile-mode: uses `openclaw --profile <name> agent --message ...`
 *
 * Messages arrive via heartbeat response, are processed asynchronously,
 * and responses are queued for the next heartbeat.
 */

import { execFile } from "node:child_process";
import { log } from "./log.js";
import { detectRuntime } from "./docker.js";
import { findOpenclawBinary } from "./profile-fallback.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IncomingMessage {
  id: string;      // message ID from platform
  agentId: string;
  content: string;
}

export interface MessageResponse {
  messageId: string;
  agentId: string;
  content: string;
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let pendingResponses: MessageResponse[] = [];

/**
 * Drain and return pending message responses (called by heartbeat).
 */
export function drainMessageResponses(): MessageResponse[] {
  const responses = [...pendingResponses];
  pendingResponses = [];
  return responses;
}

/**
 * Queue message responses (for re-queue on heartbeat failure).
 */
export function queueMessageResponses(responses: MessageResponse[]): void {
  pendingResponses.push(...responses);
}

// ---------------------------------------------------------------------------
// exec helper
// ---------------------------------------------------------------------------

function run(
  cmd: string,
  args: string[],
  timeoutMs = 120_000, // 2 minutes for agent responses
  env?: Record<string, string>
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, {
      timeout: timeoutMs,
      maxBuffer: 5 * 1024 * 1024, // 5MB for long responses
      env: env ? { ...process.env, ...env } : { ...process.env },
    }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(`${cmd} failed: ${err.message}\nstderr: ${stderr}`));
      } else {
        resolve({ stdout: stdout ?? "", stderr: stderr ?? "" });
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Message processing
// ---------------------------------------------------------------------------

/**
 * Process incoming messages from heartbeat. Runs asynchronously —
 * responses are queued for the next heartbeat.
 */
export async function processMessages(
  messages: IncomingMessage[],
  agentRecords: Map<string, { containerId: string | null; pid: number | null; isolation: string; port: number; profile: string }>
): Promise<void> {
  for (const msg of messages) {
    // Don't await — process in parallel, queue responses individually
    handleMessage(msg, agentRecords).catch((err) => {
      const errMsg = err instanceof Error ? err.message : String(err);
      log("ERROR", `Message ${msg.id} for agent ${msg.agentId} failed: ${errMsg}`);
      // Queue an error response so the deployer sees something
      pendingResponses.push({
        messageId: msg.id,
        agentId: msg.agentId,
        content: `[System] Failed to deliver message to agent: ${errMsg}`,
      });
    });
  }
}

async function handleMessage(
  msg: IncomingMessage,
  agentRecords: Map<string, { containerId: string | null; pid: number | null; isolation: string; port: number; profile: string }>
): Promise<void> {
  const agent = agentRecords.get(msg.agentId);

  if (!agent) {
    log("WARN", `Message for unknown agent ${msg.agentId} — skipping`);
    pendingResponses.push({
      messageId: msg.id,
      agentId: msg.agentId,
      content: "[System] Agent not found on this host.",
    });
    return;
  }

  if (agent.isolation === "docker" && agent.containerId) {
    await handleDockerMessage(msg, agent.containerId);
  } else if (agent.isolation === "profile") {
    await handleProfileMessage(msg, msg.agentId, agent.profile, agent.port);
  } else {
    log("WARN", `Agent ${msg.agentId} has unsupported isolation: ${agent.isolation}`);
    pendingResponses.push({
      messageId: msg.id,
      agentId: msg.agentId,
      content: "[System] Agent isolation mode does not support messaging.",
    });
  }
}

/**
 * Send message to a Docker-based agent via `docker exec` + openclaw CLI.
 *
 * The OpenClaw gateway inside the container doesn't have a REST API —
 * it uses WebSocket. The CLI (`openclaw agent`) connects via WS internally.
 */
async function handleDockerMessage(msg: IncomingMessage, containerId: string): Promise<void> {
  const runtime = await detectRuntime();
  if (!runtime) {
    throw new Error("No container runtime available");
  }

  log("INFO", `Sending message to Docker agent ${msg.agentId} (${containerId.slice(0, 12)})`);

  // Use a stable session ID per agent so conversation persists
  const sessionId = `sparebox-chat-${msg.agentId.slice(0, 12)}`;

  try {
    const { stdout, stderr } = await run(runtime, [
      "exec", containerId,
      "openclaw", "agent",
      "--session-id", sessionId,
      "--message", msg.content,
      "--json",
      "--timeout", "90",
    ], 120_000);

    const response = parseAgentResponse(stdout, stderr);
    log("INFO", `Agent ${msg.agentId} responded (${response.length} chars)`);

    pendingResponses.push({
      messageId: msg.id,
      agentId: msg.agentId,
      content: response,
    });
  } catch (err) {
    throw new Error(`Docker message delivery failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Send message to a profile-based agent via the openclaw CLI.
 *
 * Profile agents run as OpenClaw gateway instances on a specific port.
 * We use `openclaw --profile <name> agent --message ...` to send messages
 * through the running gateway via its WebSocket connection.
 */
async function handleProfileMessage(
  msg: IncomingMessage,
  agentId: string,
  profileName: string,
  port: number
): Promise<void> {
  const bin = await findOpenclawBinary();
  if (!bin) {
    throw new Error("openclaw binary not found — cannot send message to profile agent");
  }

  log("INFO", `Sending message to profile agent ${agentId} (${profileName}) on port ${port}`);

  // Use a stable session ID per agent so conversation persists
  const sessionId = `sparebox-chat-${agentId.slice(0, 12)}`;

  try {
    // Use the openclaw CLI to send via the profile's gateway
    // The --profile flag tells the CLI which gateway to connect to
    const { stdout, stderr } = await run(bin, [
      "--profile", profileName,
      "agent",
      "--session-id", sessionId,
      "--message", msg.content,
      "--json",
      "--timeout", "90",
    ], 120_000);

    const response = parseAgentResponse(stdout, stderr);
    log("INFO", `Agent ${agentId} responded (${response.length} chars)`);

    pendingResponses.push({
      messageId: msg.id,
      agentId: agentId,
      content: response,
    });
  } catch (err) {
    throw new Error(`Profile agent CLI failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Parse the response from the openclaw CLI (JSON output).
 *
 * The CLI with --json returns:
 * {
 *   "runId": "...",
 *   "status": "ok",
 *   "result": {
 *     "payloads": [{ "text": "response text" }]
 *   }
 * }
 */
function parseAgentResponse(stdout: string, stderr?: string): string {
  const trimmed = stdout.trim();

  // Try JSON parse first (expected from --json flag)
  try {
    const data = JSON.parse(trimmed);

    // Standard openclaw agent --json response format
    if (data.result?.payloads) {
      const texts = data.result.payloads
        .map((p: { text?: string }) => p.text)
        .filter(Boolean);
      if (texts.length > 0) return texts.join("\n\n");
    }

    // Fallback: try common fields
    if (data.reply) return data.reply;
    if (data.text) return data.text;
    if (data.content) return data.content;
    if (data.message) return data.message;
    if (data.output) return data.output;
    if (data.response) return data.response;
    if (typeof data === "string") return data;

    // If status is error, report it
    if (data.status === "error" || data.error) {
      const errMsg = data.error || data.message || data.summary || "Unknown error";
      return `[System] Agent error: ${errMsg}`;
    }

    return JSON.stringify(data, null, 2);
  } catch {
    // Not JSON — return raw stdout
    if (trimmed.length > 0) return trimmed;
    if (stderr?.trim()) return `[System] Agent error: ${stderr.trim()}`;
    return "[Agent returned empty response]";
  }
}
