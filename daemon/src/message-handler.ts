/**
 * Message Handler — bridges chat messages from the Sparebox platform
 * to running OpenClaw agent instances.
 *
 * For docker-mode: uses `docker exec <containerId> openclaw sessions send ...`
 * For profile-mode: sends message via the running gateway's HTTP API
 *
 * Messages arrive via heartbeat response, are processed asynchronously,
 * and responses are queued for the next heartbeat.
 */

import { execFile } from "node:child_process";
import * as http from "node:http";
import { log } from "./log.js";
import { detectRuntime } from "./docker.js";

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
// HTTP helper for profile mode
// ---------------------------------------------------------------------------

function httpPost(
  url: string,
  body: string,
  timeoutMs = 120_000
): Promise<string> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
        timeout: timeoutMs,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          const responseBody = Buffer.concat(chunks).toString("utf-8");
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(responseBody);
          } else {
            reject(
              new Error(
                `HTTP ${res.statusCode}: ${responseBody.slice(0, 500)}`
              )
            );
          }
        });
      }
    );

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy(new Error("HTTP request timeout"));
    });

    req.write(body);
    req.end();
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
  agentRecords: Map<string, { containerId: string | null; pid: number | null; isolation: string; port: number }>
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
  agentRecords: Map<string, { containerId: string | null; pid: number | null; isolation: string; port: number }>
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
    await handleProfileMessage(msg, msg.agentId, agent.port);
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
 * Send message to a Docker-based agent via docker exec.
 *
 * Tries multiple approaches:
 * 1. `openclaw sessions send` (if the gateway is running inside the container)
 * 2. Falls back to raw `openclaw agent --message` if available
 */
async function handleDockerMessage(msg: IncomingMessage, containerId: string): Promise<void> {
  const runtime = await detectRuntime();
  if (!runtime) {
    throw new Error("No container runtime available");
  }

  log("INFO", `Sending message to Docker agent ${msg.agentId} (${containerId.slice(0, 12)})`);

  // Use a stable session ID per agent so conversation persists
  const sessionId = `sparebox-chat-${msg.agentId.slice(0, 12)}`;

  // Try approach 1: send via the sessions API within the container
  // OpenClaw gateway inside Docker listens on port 3000
  try {
    const body = JSON.stringify({
      sessionKey: "main",
      message: msg.content,
    });

    // The container maps port internally, so we use docker exec + curl
    // or we can hit localhost:<mapped-port> from the host
    const { stdout } = await run(runtime, [
      "exec", containerId,
      "node", "-e",
      `const http=require("http");const d=${JSON.stringify(body)};const r=http.request({hostname:"127.0.0.1",port:3000,path:"/api/sessions/send",method:"POST",headers:{"Content-Type":"application/json","Content-Length":Buffer.byteLength(d)},timeout:90000},(s)=>{let b="";s.on("data",(c)=>b+=c);s.on("end",()=>console.log(b))});r.on("error",(e)=>{console.error(e.message);process.exit(1)});r.write(d);r.end()`,
    ], 120_000);

    const response = parseAgentResponse(stdout);
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
 * Send message to a profile-based agent via its gateway HTTP API.
 *
 * Profile agents run as OpenClaw gateway instances on a specific port.
 * We send messages via HTTP POST to the sessions API.
 */
async function handleProfileMessage(msg: IncomingMessage, agentId: string, port: number): Promise<void> {
  log("INFO", `Sending message to profile agent ${agentId} on port ${port}`);

  const body = JSON.stringify({
    sessionKey: "main",
    message: msg.content,
  });

  try {
    const responseBody = await httpPost(
      `http://127.0.0.1:${port}/api/sessions/send`,
      body,
      120_000
    );

    const response = parseAgentResponse(responseBody);
    log("INFO", `Agent ${agentId} responded (${response.length} chars)`);

    pendingResponses.push({
      messageId: msg.id,
      agentId: agentId,
      content: response,
    });
  } catch (err) {
    throw new Error(`Profile agent HTTP failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Parse the response from the sessions API or agent CLI.
 * The sessions API may return JSON with a `reply`, `text`, or `content` field.
 */
function parseAgentResponse(stdout: string): string {
  const trimmed = stdout.trim();

  // Try JSON parse first
  try {
    const data = JSON.parse(trimmed);
    if (data.reply) return data.reply;
    if (data.text) return data.text;
    if (data.content) return data.content;
    if (data.message) return data.message;
    if (data.output) return data.output;
    if (data.response) return data.response;
    // If it's a string
    if (typeof data === "string") return data;
    // Fallback: stringify it
    return JSON.stringify(data, null, 2);
  } catch {
    // Not JSON — return raw stdout (might be plain text response)
    if (trimmed.length > 0) return trimmed;
    return "[Agent returned empty response]";
  }
}
