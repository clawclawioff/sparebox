#!/usr/bin/env node
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// dist/index.js
var fs2 = __toESM(require("node:fs"), 1);
var path2 = __toESM(require("node:path"), 1);
var import_node_url2 = require("node:url");

// dist/config.js
var fs = __toESM(require("node:fs"), 1);
var path = __toESM(require("node:path"), 1);
var os = __toESM(require("node:os"), 1);
var DEFAULTS = {
  apiUrl: "https://www.sparebox.dev",
  heartbeatIntervalMs: 6e4
};
var CONFIG_DIR = path.join(os.homedir(), ".sparebox");
var CONFIG_PATH = path.join(CONFIG_DIR, "config.json");
function loadConfig() {
  let fileConfig = {};
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
      fileConfig = JSON.parse(raw);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[WARN] Failed to read config file at ${CONFIG_PATH}: ${msg}`);
  }
  const config = {
    apiKey: process.env["SPAREBOX_API_KEY"] ?? fileConfig.apiKey ?? "",
    hostId: process.env["SPAREBOX_HOST_ID"] ?? fileConfig.hostId ?? "",
    apiUrl: process.env["SPAREBOX_API_URL"] ?? fileConfig.apiUrl ?? DEFAULTS.apiUrl,
    heartbeatIntervalMs: fileConfig.heartbeatIntervalMs ?? DEFAULTS.heartbeatIntervalMs
  };
  return config;
}
function validateConfig(config) {
  const errors = [];
  if (!config.apiKey) {
    errors.push("Missing API key. Set SPAREBOX_API_KEY env var or apiKey in ~/.sparebox/config.json");
  } else if (!config.apiKey.startsWith("sbx_host_")) {
    errors.push(`Invalid API key format \u2014 expected "sbx_host_..." prefix, got "${config.apiKey.slice(0, 12)}..."`);
  }
  if (!config.hostId) {
    errors.push("Missing Host ID. Set SPAREBOX_HOST_ID env var or hostId in ~/.sparebox/config.json");
  }
  if (!config.apiUrl.startsWith("https://") && !config.apiUrl.startsWith("http://")) {
    errors.push(`Invalid API URL: "${config.apiUrl}" \u2014 must start with https:// or http://`);
  }
  if (config.heartbeatIntervalMs < 3e4) {
    errors.push(`Heartbeat interval too low: ${config.heartbeatIntervalMs}ms \u2014 minimum is 30000ms (30s)`);
  }
  return errors;
}

// dist/metrics.js
var os2 = __toESM(require("node:os"), 1);
var import_node_child_process = require("node:child_process");
function snapshotCpu() {
  const cpus2 = os2.cpus();
  let idle = 0;
  let total = 0;
  for (const cpu of cpus2) {
    const t = cpu.times;
    idle += t.idle;
    total += t.user + t.nice + t.sys + t.idle + t.irq;
  }
  return { idle, total };
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
async function getCpuUsage() {
  const a = snapshotCpu();
  await sleep(1e3);
  const b = snapshotCpu();
  const idleDelta = b.idle - a.idle;
  const totalDelta = b.total - a.total;
  if (totalDelta === 0)
    return 0;
  const usage = (totalDelta - idleDelta) / totalDelta * 100;
  return Math.round(Math.max(0, Math.min(100, usage)));
}
function getRamUsage() {
  const total = os2.totalmem();
  const free = os2.freemem();
  if (total === 0)
    return 0;
  return Math.round((total - free) / total * 100);
}
function execPromise(cmd) {
  return new Promise((resolve, reject) => {
    (0, import_node_child_process.exec)(cmd, { timeout: 5e3 }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(`${cmd} failed: ${err.message} \u2014 ${stderr}`));
      } else {
        resolve(stdout);
      }
    });
  });
}
async function getDiskUsage() {
  try {
    if (process.platform === "win32") {
      return await getDiskUsageWindows();
    }
    return await getDiskUsageUnix();
  } catch {
    return -1;
  }
}
async function getDiskUsageUnix() {
  const output = await execPromise("df -P /");
  const lines = output.trim().split("\n");
  if (lines.length < 2)
    return -1;
  const parts = lines[1].trim().split(/\s+/);
  const capacityStr = parts[4];
  if (!capacityStr)
    return -1;
  const pct = parseInt(capacityStr.replace("%", ""), 10);
  return isNaN(pct) ? -1 : pct;
}
async function getDiskUsageWindows() {
  const output = await execPromise(`wmic logicaldisk where "DeviceID='C:'" get Size,FreeSpace /format:csv`);
  const lines = output.trim().split("\n").filter((l) => l.trim().length > 0);
  if (lines.length < 2)
    return -1;
  const parts = lines[lines.length - 1].trim().split(",");
  const freeSpace = parseInt(parts[1] ?? "", 10);
  const totalSize = parseInt(parts[2] ?? "", 10);
  if (isNaN(freeSpace) || isNaN(totalSize) || totalSize === 0)
    return -1;
  return Math.round((totalSize - freeSpace) / totalSize * 100);
}
async function getTotalDiskGb() {
  try {
    if (process.platform === "win32") {
      return await getTotalDiskGbWindows();
    }
    return await getTotalDiskGbUnix();
  } catch {
    return -1;
  }
}
async function getTotalDiskGbUnix() {
  const output = await execPromise("df -k /");
  const lines = output.trim().split("\n");
  if (lines.length < 2)
    return -1;
  const parts = lines[1].trim().split(/\s+/);
  const totalKb = parseInt(parts[1] ?? "", 10);
  if (isNaN(totalKb) || totalKb === 0)
    return -1;
  return Math.round(totalKb / (1024 * 1024));
}
async function getTotalDiskGbWindows() {
  const output = await execPromise(`wmic logicaldisk where "DeviceID='C:'" get Size /format:csv`);
  const lines = output.trim().split("\n").filter((l) => l.trim().length > 0);
  if (lines.length < 2)
    return -1;
  const parts = lines[lines.length - 1].trim().split(",");
  const totalBytes = parseInt(parts[parts.length - 1] ?? "", 10);
  if (isNaN(totalBytes) || totalBytes === 0)
    return -1;
  return Math.round(totalBytes / 1024 ** 3);
}
function getTotalRamGb() {
  return Math.round(os2.totalmem() / 1024 ** 3 * 10) / 10;
}
function getCpuCores() {
  return os2.cpus().length;
}
function getCpuModel() {
  const cpus2 = os2.cpus();
  return cpus2.length > 0 ? cpus2[0].model : "Unknown";
}
function getOsInfo() {
  return `${os2.type()} ${os2.release()}`;
}

// dist/heartbeat.js
var https = __toESM(require("node:https"), 1);
var http = __toESM(require("node:http"), 1);
var import_node_url = require("node:url");

// dist/log.js
function pad(n) {
  return n.toString().padStart(2, "0");
}
function timestamp() {
  const d = /* @__PURE__ */ new Date();
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  return `${date} ${time}`;
}
function log(level, message) {
  const prefix = `[${timestamp()}] ${level.padEnd(5)}`;
  if (level === "ERROR") {
    console.error(`${prefix} ${message}`);
  } else {
    console.log(`${prefix} ${message}`);
  }
}

// dist/heartbeat.js
var MIN_BACKOFF_MS = 1e3;
var MAX_BACKOFF_MS = 3e5;
var backoffMs = MIN_BACKOFF_MS;
var consecutiveFailures = 0;
function resetBackoff() {
  backoffMs = MIN_BACKOFF_MS;
  consecutiveFailures = 0;
}
function nextBackoff() {
  const current = backoffMs;
  backoffMs = Math.min(backoffMs * 2, MAX_BACKOFF_MS);
  consecutiveFailures++;
  return current;
}
function request(url, options, body) {
  return new Promise((resolve, reject) => {
    const parsed = new import_node_url.URL(url);
    const transport = parsed.protocol === "https:" ? https : http;
    const req = transport.request(url, {
      ...options,
      method: "POST",
      headers: {
        ...options.headers,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body)
      }
    }, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        resolve({
          statusCode: res.statusCode ?? 0,
          headers: res.headers,
          body: Buffer.concat(chunks).toString("utf-8")
        });
      });
    });
    req.on("error", reject);
    req.setTimeout(3e4, () => {
      req.destroy(new Error("Request timeout (30s)"));
    });
    req.write(body);
    req.end();
  });
}
var startTime = Date.now();
async function sendHeartbeat(config, daemonVersion) {
  const [cpuUsage, diskUsage, totalDiskGb] = await Promise.all([getCpuUsage(), getDiskUsage(), getTotalDiskGb()]);
  const ramUsage = getRamUsage();
  const payload = {
    cpuUsage,
    ramUsage,
    diskUsage,
    agentCount: 0,
    agentStatuses: [],
    daemonVersion,
    osInfo: getOsInfo(),
    nodeVersion: process.version,
    uptime: Math.round((Date.now() - startTime) / 1e3),
    totalRamGb: getTotalRamGb(),
    totalDiskGb: totalDiskGb >= 0 ? totalDiskGb : 0,
    cpuCores: getCpuCores(),
    cpuModel: getCpuModel()
  };
  const url = `${config.apiUrl}/api/hosts/heartbeat`;
  const body = JSON.stringify(payload);
  try {
    const res = await request(url, {
      headers: {
        Authorization: `Bearer ${config.apiKey}`
      }
    }, body);
    if (res.statusCode === 200 || res.statusCode === 201) {
      resetBackoff();
      const data = JSON.parse(res.body);
      log("INFO", `Heartbeat sent (CPU: ${cpuUsage}%, RAM: ${ramUsage}%, Disk: ${diskUsage === -1 ? "N/A" : diskUsage + "%"})`);
      return data;
    }
    if (res.statusCode === 401 || res.statusCode === 403) {
      log("ERROR", `Authentication failed (${res.statusCode}). Check your API key.`);
      log("ERROR", "Heartbeats stopped \u2014 fix your API key and restart the daemon.");
      return null;
    }
    if (res.statusCode === 429) {
      const retryAfter = res.headers["retry-after"];
      const waitMs = retryAfter ? parseInt(retryAfter, 10) * 1e3 : nextBackoff();
      log("WARN", `Rate limited (429). Retrying in ${Math.round(waitMs / 1e3)}s`);
      await sleep2(waitMs);
      return { ok: false, ts: Date.now(), commands: [], nextHeartbeatMs: waitMs };
    }
    if (res.statusCode >= 500) {
      const wait2 = nextBackoff();
      log("WARN", `Server error (${res.statusCode}). Retrying in ${Math.round(wait2 / 1e3)}s`);
      await sleep2(wait2);
      return { ok: false, ts: Date.now(), commands: [], nextHeartbeatMs: wait2 };
    }
    log("WARN", `Unexpected response: ${res.statusCode} \u2014 ${res.body.slice(0, 200)}`);
    const wait = nextBackoff();
    await sleep2(wait);
    return { ok: false, ts: Date.now(), commands: [], nextHeartbeatMs: wait };
  } catch (err) {
    const wait = nextBackoff();
    const msg = err instanceof Error ? err.message : String(err);
    log("WARN", `Heartbeat failed: ${msg} \u2014 retrying in ${Math.round(wait / 1e3)}s (attempt ${consecutiveFailures})`);
    await sleep2(wait);
    return { ok: false, ts: Date.now(), commands: [], nextHeartbeatMs: wait };
  }
}
var running = false;
var loopTimer = null;
function startHeartbeatLoop(config, daemonVersion) {
  running = true;
  function jitter() {
    return Math.floor(Math.random() * 1e4) - 5e3;
  }
  async function tick() {
    if (!running)
      return;
    const result = await sendHeartbeat(config, daemonVersion);
    if (result === null) {
      running = false;
      return;
    }
    if (!running)
      return;
    const interval = result.nextHeartbeatMs > 0 ? Math.max(result.nextHeartbeatMs, 3e4) : config.heartbeatIntervalMs;
    const nextMs = interval + jitter();
    loopTimer = setTimeout(() => void tick(), Math.max(nextMs, 5e3));
  }
  void tick();
}
function stopHeartbeatLoop() {
  running = false;
  if (loopTimer) {
    clearTimeout(loopTimer);
    loopTimer = null;
  }
}
function sleep2(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// dist/index.js
var import_meta = {};
function getDaemonVersion() {
  try {
    const thisFile = (0, import_node_url2.fileURLToPath)(import_meta.url);
    const distDir = path2.dirname(thisFile);
    const pkgPath = path2.join(distDir, "..", "package.json");
    const pkg = JSON.parse(fs2.readFileSync(pkgPath, "utf-8"));
    return pkg.version;
  } catch {
    return "0.0.0";
  }
}
var VERSION = getDaemonVersion();
var args = process.argv.slice(2);
function printHelp() {
  console.log(`
Sparebox Host Daemon v${VERSION}

USAGE
  node daemon.js [OPTIONS]

OPTIONS
  --help       Show this help message and exit
  --verify     Dry run: load config, collect metrics, print results, then exit
  --version    Print version and exit

CONFIGURATION
  The daemon reads configuration from (in priority order):
    1. Environment variables:
       SPAREBOX_API_KEY     Your host API key (sbx_host_...)
       SPAREBOX_HOST_ID     Your host UUID
       SPAREBOX_API_URL     API base URL (default: https://www.sparebox.dev)

    2. Config file: ${CONFIG_PATH}
       {
         "apiKey": "sbx_host_...",
         "hostId": "uuid",
         "apiUrl": "https://www.sparebox.dev",
         "heartbeatIntervalMs": 60000
       }

SIGNALS
  SIGTERM, SIGINT   Graceful shutdown (stops heartbeat loop)
`);
}
if (args.includes("--help") || args.includes("-h")) {
  printHelp();
  process.exit(0);
}
if (args.includes("--version") || args.includes("-v")) {
  console.log(VERSION);
  process.exit(0);
}
async function runVerify() {
  console.log(`
Sparebox Daemon v${VERSION} \u2014 Verify Mode
`);
  console.log("\u2500\u2500 Configuration \u2500\u2500");
  const config = loadConfig();
  const errors = validateConfig(config);
  console.log(`  API Key:    ${config.apiKey ? config.apiKey.slice(0, 12) + "..." + config.apiKey.slice(-4) : "(not set)"}`);
  console.log(`  Host ID:    ${config.hostId || "(not set)"}`);
  console.log(`  API URL:    ${config.apiUrl}`);
  console.log(`  Interval:   ${config.heartbeatIntervalMs}ms`);
  if (errors.length > 0) {
    console.log("\n\u2500\u2500 Config Errors \u2500\u2500");
    for (const e of errors) {
      console.log(`  \u2717 ${e}`);
    }
  } else {
    console.log("\n  \u2713 Config valid");
  }
  console.log("\n\u2500\u2500 System Metrics \u2500\u2500");
  console.log("  Collecting CPU usage (1s sample)...");
  const [cpu, disk] = await Promise.all([getCpuUsage(), getDiskUsage()]);
  const ram = getRamUsage();
  console.log(`  CPU:        ${cpu}%`);
  console.log(`  RAM:        ${ram}%`);
  console.log(`  Disk:       ${disk === -1 ? "N/A (could not determine)" : disk + "%"}`);
  console.log(`  OS:         ${getOsInfo()}`);
  console.log(`  Node.js:    ${process.version}`);
  console.log("\n\u2500\u2500 Ready \u2500\u2500");
  if (errors.length > 0) {
    console.log("  \u2717 Fix config errors above before starting the daemon.");
    process.exit(1);
  } else {
    console.log("  \u2713 All checks passed. Run without --verify to start the daemon.");
    process.exit(0);
  }
}
if (args.includes("--verify")) {
  void runVerify();
} else {
  void startDaemon();
}
async function startDaemon() {
  log("INFO", `Sparebox Daemon v${VERSION} starting`);
  const config = loadConfig();
  const errors = validateConfig(config);
  if (errors.length > 0) {
    for (const e of errors) {
      log("ERROR", e);
    }
    log("ERROR", "Cannot start \u2014 fix configuration and try again.");
    process.exit(1);
  }
  log("INFO", `Host ID: ${config.hostId}`);
  log("INFO", `API URL: ${config.apiUrl}`);
  log("INFO", `Heartbeat interval: ${config.heartbeatIntervalMs / 1e3}s`);
  let shuttingDown = false;
  function shutdown(signal) {
    if (shuttingDown)
      return;
    shuttingDown = true;
    log("INFO", `Received ${signal} \u2014 shutting down gracefully`);
    stopHeartbeatLoop();
    setTimeout(() => {
      log("INFO", "Daemon stopped");
      process.exit(0);
    }, 2e3);
  }
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
  log("INFO", "Starting heartbeat loop...");
  startHeartbeatLoop(config, VERSION);
}
