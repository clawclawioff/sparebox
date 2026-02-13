import * as https from "node:https";
import * as http from "node:http";
import { URL } from "node:url";
import { log } from "./log.js";
import { getCpuUsage, getRamUsage, getDiskUsage, getOsInfo, getTotalRamGb, getCpuCores, getCpuModel } from "./metrics.js";
import type { DaemonConfig } from "./config.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HeartbeatPayload {
  cpuUsage: number;
  ramUsage: number;
  diskUsage: number;
  agentCount: number;
  agentStatuses: never[];
  daemonVersion: string;
  osInfo: string;
  nodeVersion: string;
  uptime: number;
  totalRamGb: number;
  cpuCores: number;
  cpuModel: string;
}

export interface HeartbeatResponse {
  ok: boolean;
  ts: number;
  commands: unknown[];
  nextHeartbeatMs: number;
}

// ---------------------------------------------------------------------------
// Backoff state
// ---------------------------------------------------------------------------

const MIN_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 300_000; // 5 minutes

let backoffMs = MIN_BACKOFF_MS;
let consecutiveFailures = 0;

function resetBackoff(): void {
  backoffMs = MIN_BACKOFF_MS;
  consecutiveFailures = 0;
}

function nextBackoff(): number {
  const current = backoffMs;
  backoffMs = Math.min(backoffMs * 2, MAX_BACKOFF_MS);
  consecutiveFailures++;
  return current;
}

// ---------------------------------------------------------------------------
// HTTP request helper (zero-dep)
// ---------------------------------------------------------------------------

function request(
  url: string,
  options: https.RequestOptions,
  body: string
): Promise<{ statusCode: number; headers: http.IncomingHttpHeaders; body: string }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const transport = parsed.protocol === "https:" ? https : http;

    const req = transport.request(
      url,
      {
        ...options,
        method: "POST",
        headers: {
          ...options.headers,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          resolve({
            statusCode: res.statusCode ?? 0,
            headers: res.headers,
            body: Buffer.concat(chunks).toString("utf-8"),
          });
        });
      }
    );

    req.on("error", reject);
    req.setTimeout(30_000, () => {
      req.destroy(new Error("Request timeout (30s)"));
    });
    req.write(body);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Send a single heartbeat
// ---------------------------------------------------------------------------

const startTime = Date.now();

export async function sendHeartbeat(
  config: DaemonConfig,
  daemonVersion: string
): Promise<HeartbeatResponse | null> {
  // Collect metrics (CPU sampling takes ~1s)
  const [cpuUsage, diskUsage] = await Promise.all([getCpuUsage(), getDiskUsage()]);
  const ramUsage = getRamUsage();

  const payload: HeartbeatPayload = {
    cpuUsage,
    ramUsage,
    diskUsage,
    agentCount: 0,
    agentStatuses: [],
    daemonVersion,
    osInfo: getOsInfo(),
    nodeVersion: process.version,
    uptime: Math.round((Date.now() - startTime) / 1000),
    totalRamGb: getTotalRamGb(),
    cpuCores: getCpuCores(),
    cpuModel: getCpuModel(),
  };

  const url = `${config.apiUrl}/api/hosts/heartbeat`;
  const body = JSON.stringify(payload);

  try {
    const res = await request(url, {
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
      },
    }, body);

    // --- Handle status codes ---

    if (res.statusCode === 200 || res.statusCode === 201) {
      resetBackoff();
      const data = JSON.parse(res.body) as HeartbeatResponse;
      log(
        "INFO",
        `Heartbeat sent (CPU: ${cpuUsage}%, RAM: ${ramUsage}%, Disk: ${diskUsage === -1 ? "N/A" : diskUsage + "%"})`
      );
      return data;
    }

    if (res.statusCode === 401 || res.statusCode === 403) {
      log("ERROR", `Authentication failed (${res.statusCode}). Check your API key.`);
      log("ERROR", "Heartbeats stopped — fix your API key and restart the daemon.");
      return null; // Signal caller to stop
    }

    if (res.statusCode === 429) {
      const retryAfter = res.headers["retry-after"];
      const waitMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : nextBackoff();
      log("WARN", `Rate limited (429). Retrying in ${Math.round(waitMs / 1000)}s`);
      await sleep(waitMs);
      return { ok: false, ts: Date.now(), commands: [], nextHeartbeatMs: waitMs };
    }

    if (res.statusCode >= 500) {
      const wait = nextBackoff();
      log("WARN", `Server error (${res.statusCode}). Retrying in ${Math.round(wait / 1000)}s`);
      await sleep(wait);
      return { ok: false, ts: Date.now(), commands: [], nextHeartbeatMs: wait };
    }

    // Unexpected status
    log("WARN", `Unexpected response: ${res.statusCode} — ${res.body.slice(0, 200)}`);
    const wait = nextBackoff();
    await sleep(wait);
    return { ok: false, ts: Date.now(), commands: [], nextHeartbeatMs: wait };
  } catch (err) {
    const wait = nextBackoff();
    const msg = err instanceof Error ? err.message : String(err);
    log("WARN", `Heartbeat failed: ${msg} — retrying in ${Math.round(wait / 1000)}s (attempt ${consecutiveFailures})`);
    await sleep(wait);
    return { ok: false, ts: Date.now(), commands: [], nextHeartbeatMs: wait };
  }
}

// ---------------------------------------------------------------------------
// Heartbeat loop
// ---------------------------------------------------------------------------

let running = false;
let loopTimer: ReturnType<typeof setTimeout> | null = null;

export function startHeartbeatLoop(config: DaemonConfig, daemonVersion: string): void {
  running = true;

  // Add ±5s jitter per spec to prevent thundering herd
  function jitter(): number {
    return Math.floor(Math.random() * 10_000) - 5_000; // -5s to +5s
  }

  async function tick(): Promise<void> {
    if (!running) return;

    const result = await sendHeartbeat(config, daemonVersion);

    if (result === null) {
      // Auth failure — stop loop
      running = false;
      return;
    }

    if (!running) return;

    // Use server-suggested interval if provided, else config default
    const interval = result.nextHeartbeatMs > 0
      ? Math.max(result.nextHeartbeatMs, 30_000) // enforce 30s min
      : config.heartbeatIntervalMs;

    const nextMs = interval + jitter();
    loopTimer = setTimeout(() => void tick(), Math.max(nextMs, 5_000));
  }

  void tick();
}

export function stopHeartbeatLoop(): void {
  running = false;
  if (loopTimer) {
    clearTimeout(loopTimer);
    loopTimer = null;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
