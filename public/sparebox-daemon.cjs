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
var fs3 = __toESM(require("node:fs"), 1);
var path3 = __toESM(require("node:path"), 1);
var import_node_url3 = require("node:url");

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
var https2 = __toESM(require("node:https"), 1);
var http2 = __toESM(require("node:http"), 1);
var import_node_url2 = require("node:url");

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

// dist/agent-manager.js
var fs2 = __toESM(require("node:fs"), 1);
var path2 = __toESM(require("node:path"), 1);
var os3 = __toESM(require("node:os"), 1);
var https = __toESM(require("node:https"), 1);
var http = __toESM(require("node:http"), 1);
var import_node_url = require("node:url");

// dist/docker.js
var import_node_child_process2 = require("node:child_process");
function run(cmd, args2, timeoutMs = 6e4) {
  return new Promise((resolve, reject) => {
    (0, import_node_child_process2.execFile)(cmd, args2, { timeout: timeoutMs, maxBuffer: 4 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(`${cmd} ${args2.join(" ")} failed: ${err.message}${stderr ? " \u2014 " + stderr.trim() : ""}`));
      } else {
        resolve({ stdout: stdout ?? "", stderr: stderr ?? "" });
      }
    });
  });
}
var cachedRuntime = null;
async function detectRuntime() {
  if (cachedRuntime !== null)
    return cachedRuntime;
  for (const rt2 of ["docker", "podman"]) {
    try {
      await run(rt2, ["info", "--format", "{{.ServerVersion}}"], 1e4);
      cachedRuntime = rt2;
      log("INFO", `Container runtime detected: ${rt2}`);
      return rt2;
    } catch {
    }
  }
  log("WARN", "No container runtime (docker/podman) detected");
  return null;
}
async function rt() {
  const name = await detectRuntime();
  if (!name)
    throw new Error("No container runtime available");
  return name;
}
async function pullImage(image) {
  const runtime = await rt();
  log("INFO", `Pulling image ${image}...`);
  try {
    await run(runtime, ["pull", image], 3e5);
    log("INFO", `Image pulled: ${image}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("WARN", `Failed to pull image (may use cached): ${msg}`);
  }
}
async function createContainer(opts) {
  const runtime = await rt();
  const args2 = [
    "run",
    "-d",
    "--name",
    opts.name,
    // Resource limits
    "--memory",
    `${opts.ramMb}m`,
    "--cpus",
    `${opts.cpuCores}`,
    // Security hardening
    "--read-only",
    "--cap-drop=ALL",
    "--security-opt=no-new-privileges",
    // Networking
    "--network",
    opts.network ?? "bridge",
    "-p",
    `${opts.port}:3000`,
    // Volume mounts — workspace and state
    "-v",
    `${opts.workspaceDir}:/workspace`,
    "-v",
    `${opts.stateDir}:/state`,
    // Tmpfs for /tmp so read-only rootfs still works
    "--tmpfs",
    "/tmp:rw,noexec,nosuid,size=256m",
    // Tmpfs for OpenClaw home dir (cron, browser state, canvas, etc.)
    "--tmpfs",
    "/home/node/.openclaw:rw,noexec,nosuid,size=128m"
  ];
  // Tell OpenClaw to read config from the mounted state volume
  args2.push("-e", "OPENCLAW_CONFIG_PATH=/state/openclaw.json");
  for (const [key, value] of Object.entries(opts.env)) {
    args2.push("-e", `${key}=${value}`);
  }
  args2.push(opts.image);
  const { stdout } = await run(runtime, args2, 12e4);
  const containerId = stdout.trim().slice(0, 12);
  log("INFO", `Container created: ${opts.name} (${containerId})`);
  return containerId;
}
async function startContainer(id) {
  const runtime = await rt();
  await run(runtime, ["start", id], 3e4);
  log("INFO", `Container started: ${id}`);
}
async function stopContainer(id) {
  const runtime = await rt();
  try {
    await run(runtime, ["stop", "-t", "10", id], 3e4);
    log("INFO", `Container stopped: ${id}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("WARN", `Failed to stop container ${id}: ${msg}`);
  }
}
async function removeContainer(id) {
  const runtime = await rt();
  try {
    await run(runtime, ["rm", "-f", id], 3e4);
    log("INFO", `Container removed: ${id}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("WARN", `Failed to remove container ${id}: ${msg}`);
  }
}
async function getContainerStats(id) {
  const runtime = await rt();
  try {
    const { stdout } = await run(runtime, ["stats", "--no-stream", "--format", "{{.CPUPerc}}|{{.MemUsage}}", id], 15e3);
    const line = stdout.trim();
    const [cpuStr, memStr] = line.split("|");
    const cpuPercent = parseFloat((cpuStr ?? "0").replace("%", "")) || 0;
    let ramUsageMb = 0;
    let ramLimitMb = 0;
    if (memStr) {
      const memParts = memStr.split("/").map((s) => s.trim());
      ramUsageMb = parseMemValue(memParts[0] ?? "0");
      ramLimitMb = parseMemValue(memParts[1] ?? "0");
    }
    return { cpuPercent, ramUsageMb, ramLimitMb };
  } catch {
    return { cpuPercent: 0, ramUsageMb: 0, ramLimitMb: 0 };
  }
}
function parseMemValue(s) {
  const num = parseFloat(s);
  if (isNaN(num))
    return 0;
  const upper = s.toUpperCase();
  if (upper.includes("GIB") || upper.includes("GB"))
    return Math.round(num * 1024);
  if (upper.includes("MIB") || upper.includes("MB"))
    return Math.round(num);
  if (upper.includes("KIB") || upper.includes("KB"))
    return Math.round(num / 1024);
  return Math.round(num);
}
async function isContainerRunning(id) {
  const runtime = await rt();
  try {
    const { stdout } = await run(runtime, ["inspect", "--format", "{{.State.Running}}", id], 1e4);
    return stdout.trim() === "true";
  } catch {
    return false;
  }
}

// dist/profile-fallback.js
var import_node_child_process3 = require("node:child_process");
function run2(cmd, args2, timeoutMs = 3e4) {
  return new Promise((resolve, reject) => {
    (0, import_node_child_process3.execFile)(cmd, args2, { timeout: timeoutMs, maxBuffer: 2 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(`${cmd} ${args2.join(" ")} failed: ${err.message}`));
      } else {
        resolve({ stdout: stdout ?? "", stderr: stderr ?? "" });
      }
    });
  });
}
var openclawBin = null;
async function findOpenclawBinary() {
  if (openclawBin)
    return openclawBin;
  for (const bin of ["openclaw", "npx openclaw"]) {
    try {
      await run2(bin.split(" ")[0], bin.split(" ").length > 1 ? [bin.split(" ")[1], "--version"] : ["--version"], 1e4);
      openclawBin = bin;
      return bin;
    } catch {
    }
  }
  const { homedir: homedir3 } = await import("node:os");
  const paths = [
    `${homedir3()}/.local/bin/openclaw`,
    "/usr/local/bin/openclaw",
    "/usr/bin/openclaw"
  ];
  for (const p of paths) {
    try {
      await run2(p, ["--version"], 1e4);
      openclawBin = p;
      return p;
    } catch {
    }
  }
  return null;
}
async function startProfile(profileName, port, env) {
  const bin = await findOpenclawBinary();
  if (!bin) {
    log("ERROR", "openclaw binary not found \u2014 cannot start profile agent");
    return null;
  }
  try {
    const args2 = ["--profile", profileName, "gateway", "start", "--port", String(port)];
    const spawnEnv = { ...process.env, ...env };
    const { spawn } = await import("node:child_process");
    const child = spawn(bin, args2, {
      detached: true,
      stdio: "ignore",
      env: spawnEnv
    });
    child.unref();
    const pid = child.pid ?? null;
    if (pid) {
      log("INFO", `Profile agent started: ${profileName} (PID: ${pid}, port: ${port})`);
    } else {
      log("WARN", `Profile agent started but no PID captured: ${profileName}`);
    }
    return pid;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("ERROR", `Failed to start profile agent ${profileName}: ${msg}`);
    return null;
  }
}
async function stopProfile(profileName) {
  const bin = await findOpenclawBinary();
  if (!bin) {
    log("ERROR", "openclaw binary not found \u2014 cannot stop profile agent");
    return;
  }
  try {
    await run2(bin, ["--profile", profileName, "gateway", "stop"], 15e3);
    log("INFO", `Profile agent stopped: ${profileName}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("WARN", `Failed to stop profile agent ${profileName}: ${msg}`);
  }
}
async function isProfileRunning(pid) {
  if (!pid)
    return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
async function getProfileStatus(profileName, pid) {
  const bin = await findOpenclawBinary();
  if (!bin)
    return "unknown";
  try {
    const { stdout } = await run2(bin, ["--profile", profileName, "gateway", "status"], 1e4);
    if (stdout.toLowerCase().includes("running"))
      return "running";
    if (stdout.toLowerCase().includes("stopped"))
      return "stopped";
  } catch {
  }
  if (pid) {
    return await isProfileRunning(pid) ? "running" : "stopped";
  }
  return "unknown";
}
async function killProfile(pid) {
  if (!pid)
    return;
  try {
    process.kill(pid, "SIGTERM");
    await new Promise((resolve) => setTimeout(resolve, 3e3));
    try {
      process.kill(pid, 0);
      process.kill(pid, "SIGKILL");
    } catch {
    }
  } catch {
  }
}

// dist/agent-manager.js
var SPAREBOX_DIR = path2.join(os3.homedir(), ".sparebox");
var AGENTS_FILE = path2.join(SPAREBOX_DIR, "agents.json");
var AGENTS_DIR = path2.join(SPAREBOX_DIR, "agents");
var DEFAULT_IMAGE = "ghcr.io/openclaw/openclaw:latest";
var BASE_PORT = 19001;
var agents = /* @__PURE__ */ new Map();
var isolationMode = "none";
var daemonConfig = null;
var pendingAcks = [];
async function initAgentManager(config) {
  daemonConfig = config;
  ensureDir(SPAREBOX_DIR);
  ensureDir(AGENTS_DIR);
  loadAgents();
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
      log("WARN", "Agent isolation: none \u2014 no docker/podman or openclaw binary found");
    }
  }
  await reconcileAgents();
  return isolationMode;
}
function getIsolationMode() {
  return isolationMode;
}
function getAgentCount() {
  return agents.size;
}
function getAgentRecordsForMessaging() {
  const result = /* @__PURE__ */ new Map();
  for (const [id, agent] of agents) {
    if (agent.status === "running") {
      result.set(id, {
        containerId: agent.containerId,
        pid: agent.pid,
        isolation: agent.isolation,
        port: agent.port,
        profile: agent.profile
      });
    }
  }
  return result;
}
async function processCommands(commands) {
  const acks = [];
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
async function processCommand(cmd) {
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
      return { id: cmd.id, status: "error", error: `Unknown command type: ${cmd.type}` };
  }
}
async function handleDeploy(cmd) {
  const { agentId, payload, id } = cmd;
  const profile = payload.profile ?? `sparebox-agent-${agentId.slice(0, 8)}`;
  const image = payload.image ?? DEFAULT_IMAGE;
  const resources = {
    ramMb: payload.resources?.ramMb ?? 2048,
    cpuCores: payload.resources?.cpuCores ?? 1,
    diskGb: payload.resources?.diskGb ?? 10
  };
  if (agents.has(agentId)) {
    const existing = agents.get(agentId);
    log("WARN", `Agent ${agentId} already deployed as ${existing.containerId ?? existing.pid}`);
    return { id, status: "acked", containerId: existing.containerId ?? `pid:${existing.pid}` };
  }
  const port = allocatePort();
  const workspaceDir = path2.join(AGENTS_DIR, agentId, "workspace");
  const stateDir = path2.join(AGENTS_DIR, agentId, "state");
  ensureDir(workspaceDir);
  ensureDir(stateDir);
  let agentEnv = { ...payload.env ?? {} };
  if (payload.configUrl && daemonConfig) {
    try {
      const configData = await fetchConfig(payload.configUrl, daemonConfig);
      if (configData.env) {
        agentEnv = { ...agentEnv, ...configData.env };
      }
      if (configData.workspaceFiles && typeof configData.workspaceFiles === "object") {
        for (const [filename, content] of Object.entries(configData.workspaceFiles)) {
          if (typeof content === "string") {
            const filePath = path2.join(workspaceDir, filename);
            ensureDir(path2.dirname(filePath));
            fs2.writeFileSync(filePath, content, "utf-8");
            log("INFO", `Wrote workspace file: ${filename} (${content.length} bytes)`);
          }
        }
      }
      // Chat V2: Write openclaw.json with HTTP API enabled for direct chat
      if (configData.openclawConfig && typeof configData.openclawConfig === "object") {
        // The deploy-config now includes gateway auth and HTTP endpoint config
        fs2.writeFileSync(
          path2.join(stateDir, "openclaw.json"),
          JSON.stringify(configData.openclawConfig, null, 2),
          "utf-8"
        );
        log("INFO", `Wrote openclaw.json with HTTP API enabled for ${agentId}`);
      }
      fs2.writeFileSync(path2.join(stateDir, "deploy-config.json"), JSON.stringify(configData, null, 2), "utf-8");
      log("INFO", `Deploy config applied for ${agentId}: ${Object.keys(agentEnv).join(", ") || "no env vars"}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log("WARN", `Failed to fetch deploy config for ${agentId}: ${msg}`);
    }
  }
  let containerId = null;
  let pid = null;
  if (isolationMode === "docker") {
    await pullImage(image);
    containerId = await createContainer({
      name: profile,
      image,
      ramMb: resources.ramMb,
      cpuCores: resources.cpuCores,
      port,
      workspaceDir,
      stateDir,
      env: agentEnv
    });
    let healthy = false;
    for (let i = 0; i < 10; i++) {
      await sleep2(1e3);
      if (await isContainerRunning(containerId)) {
        healthy = true;
        break;
      }
    }
    if (!healthy) {
      log("WARN", `Container ${containerId} did not become healthy in 10s`);
    }
  } else if (isolationMode === "profile") {
    if (agentEnv.ANTHROPIC_API_KEY || agentEnv.OPENAI_API_KEY) {
      try {
        const { homedir: homedir3 } = await import("node:os");
        const profileDir = path2.join(homedir3(), `.openclaw-${profile}`);
        const agentAuthDir = path2.join(profileDir, "agents", "main", "agent");
        ensureDir(agentAuthDir);
        const authProfiles = {
          version: 1,
          profiles: {},
          lastGood: {}
        };
        if (agentEnv.ANTHROPIC_API_KEY) {
          authProfiles.profiles["anthropic:sparebox"] = {
            type: "token",
            provider: "anthropic",
            token: agentEnv.ANTHROPIC_API_KEY
          };
          authProfiles.lastGood["anthropic"] = "anthropic:sparebox";
        }
        if (agentEnv.OPENAI_API_KEY) {
          authProfiles.profiles["openai:sparebox"] = {
            type: "token",
            provider: "openai",
            token: agentEnv.OPENAI_API_KEY
          };
          authProfiles.lastGood["openai"] = "openai:sparebox";
        }
        fs2.writeFileSync(path2.join(agentAuthDir, "auth-profiles.json"), JSON.stringify(authProfiles, null, 2), "utf-8");
        const isOpenAI = !!agentEnv.OPENAI_API_KEY && !agentEnv.ANTHROPIC_API_KEY;
        const openclawConfig = {
          auth: {
            profiles: isOpenAI ? { "openai:sparebox": { provider: "openai", mode: "token" } } : { "anthropic:sparebox": { provider: "anthropic", mode: "token" } }
          },
          agents: {
            defaults: {
              model: {
                primary: isOpenAI ? "openai/gpt-4o" : "anthropic/claude-sonnet-4-20250514"
              }
            }
          }
        };
        fs2.writeFileSync(path2.join(profileDir, "openclaw.json"), JSON.stringify(openclawConfig, null, 2), "utf-8");
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
  const record = {
    agentId,
    profile,
    containerId,
    pid,
    port,
    status: "running",
    isolation: isolationMode,
    image,
    deployedAt: (/* @__PURE__ */ new Date()).toISOString(),
    resources
  };
  agents.set(agentId, record);
  saveAgents();
  log("INFO", `Agent ${agentId} deployed: ${containerId ?? `pid:${pid}`} on port ${port}`);
  return { id, status: "acked", containerId: containerId ?? `pid:${pid}` };
}
async function handleStart(cmd) {
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
async function handleStop(cmd) {
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
async function handleRestart(cmd) {
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
      await sleep2(1e3);
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
async function handleUndeploy(cmd) {
  const agent = agents.get(cmd.agentId);
  if (!agent) {
    return { id: cmd.id, status: "acked" };
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
    const agentDir = path2.join(AGENTS_DIR, cmd.agentId);
    try {
      fs2.rmSync(agentDir, { recursive: true, force: true });
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
async function handleUpdateConfig(cmd) {
  const agent = agents.get(cmd.agentId);
  if (!agent) {
    return { id: cmd.id, status: "error", error: `Agent ${cmd.agentId} not found` };
  }
  try {
    let newEnv = {};
    if (cmd.payload.configUrl && daemonConfig) {
      const configData = await fetchConfig(cmd.payload.configUrl, daemonConfig);
      const stateDir = path2.join(AGENTS_DIR, cmd.agentId, "state");
      const workspaceDir = path2.join(AGENTS_DIR, cmd.agentId, "workspace");
      ensureDir(stateDir);
      ensureDir(workspaceDir);
      if (configData.env) {
        newEnv = { ...configData.env };
      }
      if (configData.workspaceFiles && typeof configData.workspaceFiles === "object") {
        for (const [filename, content] of Object.entries(configData.workspaceFiles)) {
          if (typeof content === "string") {
            const filePath = path2.join(workspaceDir, filename);
            ensureDir(path2.dirname(filePath));
            fs2.writeFileSync(filePath, content, "utf-8");
          }
        }
      }
      if (configData.openclawConfig && typeof configData.openclawConfig === "object") {
        fs2.writeFileSync(path2.join(stateDir, "openclaw-config.json"), JSON.stringify(configData.openclawConfig, null, 2), "utf-8");
      }
      fs2.writeFileSync(path2.join(stateDir, "deploy-config.json"), JSON.stringify(configData, null, 2), "utf-8");
    }
    if (agent.isolation === "docker" && agent.containerId) {
      await stopContainer(agent.containerId);
      await startContainer(agent.containerId);
    } else if (agent.isolation === "profile") {
      await stopProfile(agent.profile);
      await sleep2(1e3);
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
async function getAgentStatuses() {
  const statuses = [];
  for (const [agentId, agent] of agents) {
    let stats = { cpuPercent: 0, ramUsageMb: 0, ramLimitMb: 0 };
    let status = agent.status;
    try {
      if (agent.isolation === "docker" && agent.containerId) {
        const running2 = await isContainerRunning(agent.containerId);
        status = running2 ? "running" : "stopped";
        if (running2) {
          stats = await getContainerStats(agent.containerId);
        }
      } else if (agent.isolation === "profile") {
        const profileStatus = await getProfileStatus(agent.profile, agent.pid);
        status = profileStatus === "running" ? "running" : profileStatus === "stopped" ? "stopped" : agent.status;
      }
    } catch {
    }
    statuses.push({
      agentId,
      containerId: agent.containerId,
      status,
      cpuPercent: stats.cpuPercent,
      ramUsageMb: stats.ramUsageMb,
      ramLimitMb: stats.ramLimitMb,
      port: agent.port
    });
  }
  return statuses;
}
function drainAcks() {
  const acks = [...pendingAcks];
  pendingAcks = [];
  return acks;
}
function queueAcks(acks) {
  pendingAcks.push(...acks);
}
async function shutdownAllAgents() {
  log("INFO", `Shutting down ${agents.size} agent(s)...`);
  const stopPromises = [];
  for (const [agentId, agent] of agents) {
    if (agent.status !== "running")
      continue;
    log("INFO", `Stopping agent ${agentId}...`);
    if (agent.isolation === "docker" && agent.containerId) {
      stopPromises.push(stopContainer(agent.containerId).catch((err) => {
        const msg = err instanceof Error ? err.message : String(err);
        log("WARN", `Failed to stop agent ${agentId}: ${msg}`);
      }));
    } else if (agent.isolation === "profile") {
      stopPromises.push(stopProfile(agent.profile).catch((err) => {
        const msg = err instanceof Error ? err.message : String(err);
        log("WARN", `Failed to stop profile agent ${agentId}: ${msg}`);
      }));
    }
  }
  await Promise.race([
    Promise.all(stopPromises),
    sleep2(15e3)
    // 15s max shutdown time
  ]);
  log("INFO", "All agents stopped");
}
function loadAgents() {
  try {
    if (fs2.existsSync(AGENTS_FILE)) {
      const raw = fs2.readFileSync(AGENTS_FILE, "utf-8");
      const records = JSON.parse(raw);
      agents = new Map(records.map((r) => [r.agentId, r]));
      log("INFO", `Loaded ${agents.size} agent(s) from state file`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("WARN", `Failed to load agents state: ${msg}`);
    agents = /* @__PURE__ */ new Map();
  }
}
function saveAgents() {
  try {
    const records = Array.from(agents.values());
    fs2.writeFileSync(AGENTS_FILE, JSON.stringify(records, null, 2), "utf-8");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("ERROR", `Failed to save agents state: ${msg}`);
  }
}
async function reconcileAgents() {
  if (agents.size === 0)
    return;
  log("INFO", `Reconciling ${agents.size} persisted agent(s) with runtime...`);
  for (const [agentId, agent] of agents) {
    try {
      if (agent.isolation === "docker" && agent.containerId) {
        const running2 = await isContainerRunning(agent.containerId);
        const newStatus = running2 ? "running" : "stopped";
        if (agent.status !== newStatus) {
          log("INFO", `Agent ${agentId}: ${agent.status} \u2192 ${newStatus} (reconciled)`);
          agent.status = newStatus;
        }
      } else if (agent.isolation === "profile") {
        const status = await getProfileStatus(agent.profile, agent.pid);
        if (status !== agent.status && status !== "unknown") {
          log("INFO", `Agent ${agentId}: ${agent.status} \u2192 ${status} (reconciled)`);
          agent.status = status;
        }
      }
    } catch {
    }
  }
  saveAgents();
}
function allocatePort() {
  const usedPorts = /* @__PURE__ */ new Set();
  for (const agent of agents.values()) {
    usedPorts.add(agent.port);
  }
  let port = BASE_PORT;
  while (usedPorts.has(port)) {
    port++;
  }
  return port;
}
function fetchConfig(configUrl, config) {
  const fullUrl = configUrl.startsWith("http") ? configUrl : `${config.apiUrl}${configUrl}`;
  return new Promise((resolve, reject) => {
    const parsed = new import_node_url.URL(fullUrl);
    const transport = parsed.protocol === "https:" ? https : http;
    const req = transport.get(fullUrl, {
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        Accept: "application/json"
      },
      timeout: 3e4
    }, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const body = Buffer.concat(chunks).toString("utf-8");
        if (res.statusCode === 200) {
          try {
            resolve(JSON.parse(body));
          } catch {
            reject(new Error(`Invalid JSON in deploy config: ${body.slice(0, 200)}`));
          }
        } else {
          reject(new Error(`Deploy config fetch failed: ${res.statusCode} \u2014 ${body.slice(0, 200)}`));
        }
      });
    });
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy(new Error("Config fetch timeout (30s)"));
    });
  });
}
function ensureDir(dir) {
  try {
    fs2.mkdirSync(dir, { recursive: true });
  } catch {
  }
}
function sleep2(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// dist/message-handler.js
var import_node_child_process4 = require("node:child_process");
var pendingResponses = [];
function drainMessageResponses() {
  const responses = [...pendingResponses];
  pendingResponses = [];
  return responses;
}
function queueMessageResponses(responses) {
  pendingResponses.push(...responses);
}
function run3(cmd, args2, timeoutMs = 12e4, env) {
  return new Promise((resolve, reject) => {
    (0, import_node_child_process4.execFile)(cmd, args2, {
      timeout: timeoutMs,
      maxBuffer: 5 * 1024 * 1024,
      // 5MB for long responses
      env: env ? { ...process.env, ...env } : { ...process.env }
    }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(`${cmd} failed: ${err.message}
stderr: ${stderr}`));
      } else {
        resolve({ stdout: stdout ?? "", stderr: stderr ?? "" });
      }
    });
  });
}
async function processMessages(messages, agentRecords) {
  for (const msg of messages) {
    handleMessage(msg, agentRecords).catch((err) => {
      const errMsg = err instanceof Error ? err.message : String(err);
      log("ERROR", `Message ${msg.id} for agent ${msg.agentId} failed: ${errMsg}`);
      pendingResponses.push({
        messageId: msg.id,
        agentId: msg.agentId,
        content: `[System] Failed to deliver message to agent: ${errMsg}`
      });
    });
  }
}
async function handleMessage(msg, agentRecords) {
  const agent = agentRecords.get(msg.agentId);
  if (!agent) {
    log("WARN", `Message for unknown agent ${msg.agentId} \u2014 skipping`);
    pendingResponses.push({
      messageId: msg.id,
      agentId: msg.agentId,
      content: "[System] Agent not found on this host."
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
      content: "[System] Agent isolation mode does not support messaging."
    });
  }
}
async function handleDockerMessage(msg, containerId) {
  const runtime = await detectRuntime();
  if (!runtime) {
    throw new Error("No container runtime available");
  }
  log("INFO", `Sending message to Docker agent ${msg.agentId} (${containerId.slice(0, 12)})`);
  const sessionId = `sparebox-chat-${msg.agentId.slice(0, 12)}`;
  try {
    const { stdout, stderr } = await run3(runtime, [
      "exec",
      containerId,
      "openclaw",
      "agent",
      "--session-id",
      sessionId,
      "--message",
      msg.content,
      "--json",
      "--timeout",
      "90"
    ], 12e4);
    const response = parseAgentResponse(stdout, stderr);
    log("INFO", `Agent ${msg.agentId} responded (${response.length} chars)`);
    pendingResponses.push({
      messageId: msg.id,
      agentId: msg.agentId,
      content: response
    });
  } catch (err) {
    throw new Error(`Docker message delivery failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}
async function handleProfileMessage(msg, agentId, profileName, port) {
  const bin = await findOpenclawBinary();
  if (!bin) {
    throw new Error("openclaw binary not found \u2014 cannot send message to profile agent");
  }
  log("INFO", `Sending message to profile agent ${agentId} (${profileName}) on port ${port}`);
  const sessionId = `sparebox-chat-${agentId.slice(0, 12)}`;
  try {
    const { stdout, stderr } = await run3(bin, [
      "--profile",
      profileName,
      "agent",
      "--session-id",
      sessionId,
      "--message",
      msg.content,
      "--json",
      "--timeout",
      "90"
    ], 12e4);
    const response = parseAgentResponse(stdout, stderr);
    log("INFO", `Agent ${agentId} responded (${response.length} chars)`);
    pendingResponses.push({
      messageId: msg.id,
      agentId,
      content: response
    });
  } catch (err) {
    throw new Error(`Profile agent CLI failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}
function parseAgentResponse(stdout, stderr) {
  const trimmed = stdout.trim();
  try {
    const data = JSON.parse(trimmed);
    if (data.result?.payloads) {
      const texts = data.result.payloads.map((p) => p.text).filter(Boolean);
      if (texts.length > 0)
        return texts.join("\n\n");
    }
    if (data.reply)
      return data.reply;
    if (data.text)
      return data.text;
    if (data.content)
      return data.content;
    if (data.message)
      return data.message;
    if (data.output)
      return data.output;
    if (data.response)
      return data.response;
    if (typeof data === "string")
      return data;
    if (data.status === "error" || data.error) {
      const errMsg = data.error || data.message || data.summary || "Unknown error";
      return `[System] Agent error: ${errMsg}`;
    }
    return JSON.stringify(data, null, 2);
  } catch {
    if (trimmed.length > 0)
      return trimmed;
    if (stderr?.trim())
      return `[System] Agent error: ${stderr.trim()}`;
    return "[Agent returned empty response]";
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
var openclawVersion = "unknown";
function detectOpenclawVersion() {
  try {
    const { execFileSync } = require("node:child_process");
    const out = execFileSync("openclaw", ["--version"], { timeout: 5e3, encoding: "utf-8" });
    openclawVersion = out.trim().split("\n")[0] ?? "unknown";
  } catch {
    openclawVersion = "unknown";
  }
}
detectOpenclawVersion();
function request(url, options, body) {
  return new Promise((resolve, reject) => {
    const parsed = new import_node_url2.URL(url);
    const transport = parsed.protocol === "https:" ? https2 : http2;
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
  const [cpuUsage, diskUsage, totalDiskGb, agentStatuses] = await Promise.all([
    getCpuUsage(),
    getDiskUsage(),
    getTotalDiskGb(),
    getAgentStatuses()
  ]);
  const ramUsage = getRamUsage();
  const commandAcks = drainAcks();
  // Note: messageResponses removed in Chat V2 - messaging now uses direct HTTP
  const payload = {
    cpuUsage,
    ramUsage,
    diskUsage,
    agentCount: getAgentCount(),
    agentStatuses,
    daemonVersion,
    osInfo: getOsInfo(),
    nodeVersion: process.version,
    uptime: Math.round((Date.now() - startTime) / 1e3),
    totalRamGb: getTotalRamGb(),
    totalDiskGb: totalDiskGb >= 0 ? totalDiskGb : 0,
    cpuCores: getCpuCores(),
    cpuModel: getCpuModel(),
    isolationMode: getIsolationMode(),
    openclawVersion,
    commandAcks
    // messageResponses removed - Chat V2 uses direct HTTP
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
      const ackInfo = commandAcks.length > 0 ? `, sent ${commandAcks.length} ack(s)` : "";
      log("INFO", `Heartbeat sent (CPU: ${cpuUsage}%, RAM: ${ramUsage}%, Disk: ${diskUsage === -1 ? "N/A" : diskUsage + "%"}, agents: ${getAgentCount()}${ackInfo})`);
      if (data.commands && data.commands.length > 0) {
        log("INFO", `Received ${data.commands.length} command(s) from platform`);
        processCommands(data.commands).then((acks) => {
          if (acks.length > 0) {
            queueAcks(acks);
            log("INFO", `Queued ${acks.length} command ack(s) for next heartbeat`);
          }
        }).catch((err) => {
          const msg = err instanceof Error ? err.message : String(err);
          log("ERROR", `Command processing failed: ${msg}`);
        });
      }
      // Note: message handling removed in Chat V2 - messaging now uses direct HTTP
      return data;
    }
    if (res.statusCode === 401 || res.statusCode === 403) {
      log("ERROR", `Authentication failed (${res.statusCode}). Check your API key.`);
      log("ERROR", "Heartbeats stopped \u2014 fix your API key and restart the daemon.");
      if (commandAcks.length > 0)
        queueAcks(commandAcks);
      return null;
    }
    if (res.statusCode === 429) {
      const retryAfter = res.headers["retry-after"];
      const waitMs = retryAfter ? parseInt(retryAfter, 10) * 1e3 : nextBackoff();
      log("WARN", `Rate limited (429). Retrying in ${Math.round(waitMs / 1e3)}s`);
      if (commandAcks.length > 0)
        queueAcks(commandAcks);
      await sleep3(waitMs);
      return { ok: false, ts: Date.now(), commands: [], nextHeartbeatMs: waitMs };
    }
    if (res.statusCode >= 500) {
      const wait2 = nextBackoff();
      log("WARN", `Server error (${res.statusCode}). Retrying in ${Math.round(wait2 / 1e3)}s`);
      if (commandAcks.length > 0)
        queueAcks(commandAcks);
      await sleep3(wait2);
      return { ok: false, ts: Date.now(), commands: [], nextHeartbeatMs: wait2 };
    }
    log("WARN", `Unexpected response: ${res.statusCode} \u2014 ${res.body.slice(0, 200)}`);
    if (commandAcks.length > 0)
      queueAcks(commandAcks);
    const wait = nextBackoff();
    await sleep3(wait);
    return { ok: false, ts: Date.now(), commands: [], nextHeartbeatMs: wait };
  } catch (err) {
    const wait = nextBackoff();
    const msg = err instanceof Error ? err.message : String(err);
    log("WARN", `Heartbeat failed: ${msg} \u2014 retrying in ${Math.round(wait / 1e3)}s (attempt ${consecutiveFailures})`);
    if (commandAcks.length > 0)
      queueAcks(commandAcks);
    await sleep3(wait);
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
function sleep3(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// dist/index.js
var import_meta = {};
function getDaemonVersion() {
  try {
    const thisFile = (0, import_node_url3.fileURLToPath)(import_meta.url);
    const distDir = path3.dirname(thisFile);
    const pkgPath = path3.join(distDir, "..", "package.json");
    const pkg = JSON.parse(fs3.readFileSync(pkgPath, "utf-8"));
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
  SIGTERM, SIGINT   Graceful shutdown (stops agents, then heartbeat loop)
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
  console.log("\n\u2500\u2500 Agent Manager \u2500\u2500");
  if (errors.length === 0) {
    const mode = await initAgentManager(config);
    console.log(`  Isolation:  ${mode}`);
    console.log(`  Agents:     ${getAgentCount()}`);
  } else {
    console.log("  (skipped \u2014 fix config errors first)");
  }
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
// =============================================================================
// Chat Relay — long-poll pending messages and forward to containers
// =============================================================================

function httpRequest(url, options) {
  return new Promise((resolve, reject) => {
    const parsed = new import_node_url2.URL(url);
    const transport = parsed.protocol === "https:" ? https2 : http2;
    const req = transport.request(url, options, (res) => {
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
    if (options.timeout) {
      req.setTimeout(options.timeout, () => {
        req.destroy(new Error(`Request timeout (${options.timeout}ms)`));
      });
    }
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

var chatRelayRunning = false;

async function chatRelayLoop(config) {
  chatRelayRunning = true;
  const pendingUrl = `${config.apiUrl}/api/agents/chat/pending`;

  while (chatRelayRunning) {
    try {
      // Long-poll for pending messages (30s timeout to cover 25s server hold)
      const res = await httpRequest(pendingUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${config.apiKey}`
        },
        timeout: 35000
      });

      if (res.statusCode === 401 || res.statusCode === 403) {
        log("ERROR", `[ChatRelay] Auth failed (${res.statusCode}). Stopping.`);
        chatRelayRunning = false;
        return;
      }

      if (res.statusCode !== 200) {
        log("WARN", `[ChatRelay] Unexpected status ${res.statusCode}, retrying in 2s`);
        await sleep3(2000);
        continue;
      }

      const data = JSON.parse(res.body);
      const messages = data.messages || [];

      if (messages.length === 0) {
        // No pending messages — loop immediately for next long-poll
        continue;
      }

      log("INFO", `[ChatRelay] Got ${messages.length} pending message(s)`);

      // Process each message concurrently
      await Promise.all(messages.map((msg) => relayMessage(config, msg)));

    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes("timeout")) {
        // Normal long-poll timeout — just retry
        continue;
      }
      log("WARN", `[ChatRelay] Error: ${errMsg}, retrying in 2s`);
      await sleep3(2000);
    }
  }
}

async function relayMessage(config, msg) {
  const { messageId, agentId, content, containerPort, gatewayToken } = msg;
  const respondUrl = `${config.apiUrl}/api/agents/${agentId}/chat/respond`;

  if (!containerPort || !gatewayToken) {
    log("WARN", `[ChatRelay] Missing port/token for agent ${agentId}, failing message`);
    await postRespond(respondUrl, config.apiKey, { messageId, status: "failed", error: "Missing container port or gateway token" });
    return;
  }

  try {
    const containerUrl = `http://127.0.0.1:${containerPort}/v1/chat/completions`;
    log("INFO", `[ChatRelay] Forwarding to container at :${containerPort} for agent ${agentId}`);

    const body = JSON.stringify({
      messages: [{ role: "user", content }],
      stream: false
    });

    const res = await httpRequest(containerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
        Authorization: `Bearer ${gatewayToken}`
      },
      timeout: 120000,
      body
    });

    if (res.statusCode !== 200) {
      log("WARN", `[ChatRelay] Container returned ${res.statusCode} for agent ${agentId}`);
      await postRespond(respondUrl, config.apiKey, { messageId, status: "failed", error: `Container error: ${res.statusCode}` });
      return;
    }

    const data = JSON.parse(res.body);
    const assistantContent =
      data.choices?.[0]?.message?.content ||
      data.choices?.[0]?.delta?.content ||
      "[No response from agent]";

    log("INFO", `[ChatRelay] Agent ${agentId} responded (${assistantContent.length} chars)`);
    await postRespond(respondUrl, config.apiKey, { messageId, content: assistantContent, status: "responded" });

  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    log("ERROR", `[ChatRelay] Failed to relay to agent ${agentId}: ${errMsg}`);
    await postRespond(respondUrl, config.apiKey, { messageId, status: "failed", error: errMsg });
  }
}

async function postRespond(url, apiKey, body) {
  try {
    const bodyStr = JSON.stringify(body);
    await httpRequest(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(bodyStr)
      },
      timeout: 10000,
      body: bodyStr
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    log("ERROR", `[ChatRelay] Failed to post response: ${errMsg}`);
  }
}

function stopChatRelay() {
  chatRelayRunning = false;
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
  const isolationMode2 = await initAgentManager(config);
  log("INFO", `Isolation mode: ${isolationMode2}`);
  log("INFO", `Tracked agents: ${getAgentCount()}`);
  let shuttingDown = false;
  async function shutdown(signal) {
    if (shuttingDown)
      return;
    shuttingDown = true;
    log("INFO", `Received ${signal} \u2014 shutting down gracefully`);
    stopHeartbeatLoop();
    stopChatRelay();
    try {
      await shutdownAllAgents();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log("ERROR", `Error during agent shutdown: ${msg}`);
    }
    setTimeout(() => {
      log("INFO", "Daemon stopped");
      process.exit(0);
    }, 2e3);
  }
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
  log("INFO", "Starting heartbeat loop...");
  startHeartbeatLoop(config, VERSION);
  log("INFO", "Starting chat relay loop...");
  chatRelayLoop(config).catch((err) => {
    const msg = err instanceof Error ? err.message : String(err);
    log("ERROR", `Chat relay loop crashed: ${msg}`);
  });
}
