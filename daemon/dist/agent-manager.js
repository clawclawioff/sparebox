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
import { detectRuntime, pullImage, createContainer, startContainer, stopContainer, removeContainer, getContainerStats, isContainerRunning, } from "./docker.js";
import { findOpenclawBinary, startProfile, stopProfile, killProfile, getProfileStatus, } from "./profile-fallback.js";
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
let agents = new Map();
let isolationMode = "none";
let daemonConfig = null;
let pendingAcks = [];
// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------
/**
 * Initialize the agent manager: detect runtime, load persisted state.
 */
export async function initAgentManager(config) {
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
    }
    else {
        const bin = await findOpenclawBinary();
        if (bin) {
            isolationMode = "profile";
            log("INFO", `Agent isolation: profile (openclaw at ${bin})`);
        }
        else {
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
export function getIsolationMode() {
    return isolationMode;
}
/**
 * Get count of tracked agents.
 */
export function getAgentCount() {
    return agents.size;
}
/**
 * Get agent records for message handling (reduced info for message-handler module).
 */
export function getAgentRecordsForMessaging() {
    const result = new Map();
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
export async function processCommands(commands) {
    const acks = [];
    for (const cmd of commands) {
        try {
            log("INFO", `Processing command: ${cmd.type} for agent ${cmd.agentId} (cmd: ${cmd.id})`);
            const ack = await processCommand(cmd);
            acks.push(ack);
        }
        catch (err) {
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
// ---------------------------------------------------------------------------
// Command handlers
// ---------------------------------------------------------------------------
async function handleDeploy(cmd) {
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
        const existing = agents.get(agentId);
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
    let agentEnv = { ...(payload.env ?? {}) };
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
                fs.writeFileSync(path.join(stateDir, "openclaw-config.json"), JSON.stringify(configData.openclawConfig, null, 2), "utf-8");
            }
            // 4. Write full deploy config for reference
            fs.writeFileSync(path.join(stateDir, "deploy-config.json"), JSON.stringify(configData, null, 2), "utf-8");
            log("INFO", `Deploy config applied for ${agentId}: ${Object.keys(agentEnv).join(", ") || "no env vars"}`);
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            log("WARN", `Failed to fetch deploy config for ${agentId}: ${msg}`);
        }
    }
    // Deploy based on isolation mode
    let containerId = null;
    let pid = null;
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
    }
    else if (isolationMode === "profile") {
        pid = await startProfile(profile, port, agentEnv);
    }
    else {
        return { id, status: "error", error: "No isolation runtime available" };
    }
    // Record the agent
    const record = {
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
async function handleStart(cmd) {
    const agent = agents.get(cmd.agentId);
    if (!agent) {
        return { id: cmd.id, status: "error", error: `Agent ${cmd.agentId} not found` };
    }
    try {
        if (agent.isolation === "docker" && agent.containerId) {
            await startContainer(agent.containerId);
        }
        else if (agent.isolation === "profile") {
            const pid = await startProfile(agent.profile, agent.port, {});
            agent.pid = pid;
        }
        agent.status = "running";
        saveAgents();
        return { id: cmd.id, status: "acked", containerId: agent.containerId ?? `pid:${agent.pid}` };
    }
    catch (err) {
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
        }
        else if (agent.isolation === "profile") {
            await stopProfile(agent.profile);
        }
        agent.status = "stopped";
        saveAgents();
        return { id: cmd.id, status: "acked", containerId: agent.containerId ?? `pid:${agent.pid}` };
    }
    catch (err) {
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
        }
        else if (agent.isolation === "profile") {
            await stopProfile(agent.profile);
            await sleep(1000);
            const pid = await startProfile(agent.profile, agent.port, {});
            agent.pid = pid;
        }
        agent.status = "running";
        saveAgents();
        return { id: cmd.id, status: "acked", containerId: agent.containerId ?? `pid:${agent.pid}` };
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        agent.status = "error";
        saveAgents();
        return { id: cmd.id, status: "error", error: msg };
    }
}
async function handleUndeploy(cmd) {
    const agent = agents.get(cmd.agentId);
    if (!agent) {
        return { id: cmd.id, status: "acked" }; // Already gone
    }
    try {
        if (agent.isolation === "docker" && agent.containerId) {
            await removeContainer(agent.containerId);
        }
        else if (agent.isolation === "profile") {
            await stopProfile(agent.profile);
            if (agent.pid) {
                await killProfile(agent.pid);
            }
        }
        // Cleanup agent directories
        const agentDir = path.join(AGENTS_DIR, cmd.agentId);
        try {
            fs.rmSync(agentDir, { recursive: true, force: true });
        }
        catch {
            log("WARN", `Failed to clean up agent dir: ${agentDir}`);
        }
        agents.delete(cmd.agentId);
        saveAgents();
        log("INFO", `Agent ${cmd.agentId} undeployed`);
        return { id: cmd.id, status: "acked" };
    }
    catch (err) {
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
        // Fetch new config
        let newEnv = {};
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
                fs.writeFileSync(path.join(stateDir, "openclaw-config.json"), JSON.stringify(configData.openclawConfig, null, 2), "utf-8");
            }
            fs.writeFileSync(path.join(stateDir, "deploy-config.json"), JSON.stringify(configData, null, 2), "utf-8");
        }
        // Restart the agent to pick up new config
        if (agent.isolation === "docker" && agent.containerId) {
            await stopContainer(agent.containerId);
            await startContainer(agent.containerId);
        }
        else if (agent.isolation === "profile") {
            await stopProfile(agent.profile);
            await sleep(1000);
            const pid = await startProfile(agent.profile, agent.port, newEnv);
            agent.pid = pid;
        }
        agent.status = "running";
        saveAgents();
        log("INFO", `Agent ${cmd.agentId} config updated and restarted`);
        return { id: cmd.id, status: "acked", containerId: agent.containerId ?? `pid:${agent.pid}` };
    }
    catch (err) {
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
export async function getAgentStatuses() {
    const statuses = [];
    for (const [agentId, agent] of agents) {
        let stats = { cpuPercent: 0, ramUsageMb: 0, ramLimitMb: 0 };
        let status = agent.status;
        try {
            if (agent.isolation === "docker" && agent.containerId) {
                const running = await isContainerRunning(agent.containerId);
                status = running ? "running" : "stopped";
                if (running) {
                    stats = await getContainerStats(agent.containerId);
                }
            }
            else if (agent.isolation === "profile") {
                const profileStatus = await getProfileStatus(agent.profile, agent.pid);
                status = profileStatus === "running" ? "running" : profileStatus === "stopped" ? "stopped" : agent.status;
            }
        }
        catch {
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
export function drainAcks() {
    const acks = [...pendingAcks];
    pendingAcks = [];
    return acks;
}
/**
 * Queue acks from command processing.
 */
export function queueAcks(acks) {
    pendingAcks.push(...acks);
}
// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------
/**
 * Stop all running agents (used during daemon shutdown).
 */
export async function shutdownAllAgents() {
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
        }
        else if (agent.isolation === "profile") {
            stopPromises.push(stopProfile(agent.profile).catch((err) => {
                const msg = err instanceof Error ? err.message : String(err);
                log("WARN", `Failed to stop profile agent ${agentId}: ${msg}`);
            }));
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
function loadAgents() {
    try {
        if (fs.existsSync(AGENTS_FILE)) {
            const raw = fs.readFileSync(AGENTS_FILE, "utf-8");
            const records = JSON.parse(raw);
            agents = new Map(records.map((r) => [r.agentId, r]));
            log("INFO", `Loaded ${agents.size} agent(s) from state file`);
        }
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log("WARN", `Failed to load agents state: ${msg}`);
        agents = new Map();
    }
}
function saveAgents() {
    try {
        const records = Array.from(agents.values());
        fs.writeFileSync(AGENTS_FILE, JSON.stringify(records, null, 2), "utf-8");
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log("ERROR", `Failed to save agents state: ${msg}`);
    }
}
// ---------------------------------------------------------------------------
// Reconciliation — sync persisted state with actual container state
// ---------------------------------------------------------------------------
async function reconcileAgents() {
    if (agents.size === 0)
        return;
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
            }
            else if (agent.isolation === "profile") {
                const status = await getProfileStatus(agent.profile, agent.pid);
                if (status !== agent.status && status !== "unknown") {
                    log("INFO", `Agent ${agentId}: ${agent.status} → ${status} (reconciled)`);
                    agent.status = status;
                }
            }
        }
        catch {
            // Can't check this agent — leave state as-is
        }
    }
    saveAgents();
}
// ---------------------------------------------------------------------------
// Port allocation
// ---------------------------------------------------------------------------
function allocatePort() {
    const usedPorts = new Set();
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
    // configUrl is relative — prepend apiUrl
    const fullUrl = configUrl.startsWith("http") ? configUrl : `${config.apiUrl}${configUrl}`;
    return new Promise((resolve, reject) => {
        const parsed = new URL(fullUrl);
        const transport = parsed.protocol === "https:" ? https : http;
        const req = transport.get(fullUrl, {
            headers: {
                Authorization: `Bearer ${config.apiKey}`,
                Accept: "application/json",
            },
            timeout: 30_000,
        }, (res) => {
            const chunks = [];
            res.on("data", (chunk) => chunks.push(chunk));
            res.on("end", () => {
                const body = Buffer.concat(chunks).toString("utf-8");
                if (res.statusCode === 200) {
                    try {
                        resolve(JSON.parse(body));
                    }
                    catch {
                        reject(new Error(`Invalid JSON in deploy config: ${body.slice(0, 200)}`));
                    }
                }
                else {
                    reject(new Error(`Deploy config fetch failed: ${res.statusCode} — ${body.slice(0, 200)}`));
                }
            });
        });
        req.on("error", reject);
        req.on("timeout", () => {
            req.destroy(new Error("Config fetch timeout (30s)"));
        });
    });
}
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function ensureDir(dir) {
    try {
        fs.mkdirSync(dir, { recursive: true });
    }
    catch {
        // may already exist
    }
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
