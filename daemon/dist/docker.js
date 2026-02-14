/**
 * Docker/Podman container runtime abstraction.
 *
 * All operations use child_process.execFile — zero npm dependencies.
 * Detects docker or podman CLI and exposes a unified interface for
 * creating, starting, stopping, and inspecting containers.
 */
import { execFile } from "node:child_process";
import { log } from "./log.js";
// ---------------------------------------------------------------------------
// exec helper
// ---------------------------------------------------------------------------
function run(cmd, args, timeoutMs = 60_000) {
    return new Promise((resolve, reject) => {
        execFile(cmd, args, { timeout: timeoutMs, maxBuffer: 4 * 1024 * 1024 }, (err, stdout, stderr) => {
            if (err) {
                reject(new Error(`${cmd} ${args.join(" ")} failed: ${err.message}${stderr ? " — " + stderr.trim() : ""}`));
            }
            else {
                resolve({ stdout: stdout ?? "", stderr: stderr ?? "" });
            }
        });
    });
}
// ---------------------------------------------------------------------------
// Runtime detection
// ---------------------------------------------------------------------------
let cachedRuntime = null;
/**
 * Detect whether docker or podman is available on the host.
 * Result is cached after first call.
 * Returns null if neither is found.
 */
export async function detectRuntime() {
    if (cachedRuntime !== null)
        return cachedRuntime;
    for (const rt of ["docker", "podman"]) {
        try {
            await run(rt, ["info", "--format", "{{.ServerVersion}}"], 10_000);
            cachedRuntime = rt;
            log("INFO", `Container runtime detected: ${rt}`);
            return rt;
        }
        catch {
            // not available, try next
        }
    }
    log("WARN", "No container runtime (docker/podman) detected");
    return null;
}
/**
 * Returns the cached runtime name or throws if none detected.
 */
async function rt() {
    const name = await detectRuntime();
    if (!name)
        throw new Error("No container runtime available");
    return name;
}
// ---------------------------------------------------------------------------
// Image management
// ---------------------------------------------------------------------------
/**
 * Pull a container image.
 */
export async function pullImage(image) {
    const runtime = await rt();
    log("INFO", `Pulling image ${image}...`);
    try {
        await run(runtime, ["pull", image], 300_000); // 5 minute timeout for large images
        log("INFO", `Image pulled: ${image}`);
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log("WARN", `Failed to pull image (may use cached): ${msg}`);
    }
}
// ---------------------------------------------------------------------------
// Container lifecycle
// ---------------------------------------------------------------------------
/**
 * Create and start a container with hardened security defaults.
 * Returns the container ID.
 */
export async function createContainer(opts) {
    const runtime = await rt();
    const args = [
        "run",
        "-d",
        "--name", opts.name,
        // Resource limits
        "--memory", `${opts.ramMb}m`,
        "--cpus", `${opts.cpuCores}`,
        // Security hardening
        "--read-only",
        "--cap-drop=ALL",
        "--security-opt=no-new-privileges",
        // Networking
        "--network", opts.network ?? "bridge",
        "-p", `${opts.port}:3000`,
        // Volume mounts — workspace and state
        "-v", `${opts.workspaceDir}:/workspace`,
        "-v", `${opts.stateDir}:/state`,
        // Tmpfs for /tmp so read-only rootfs still works
        "--tmpfs", "/tmp:rw,noexec,nosuid,size=256m",
    ];
    // Environment variables
    for (const [key, value] of Object.entries(opts.env)) {
        args.push("-e", `${key}=${value}`);
    }
    // Image
    args.push(opts.image);
    const { stdout } = await run(runtime, args, 120_000);
    const containerId = stdout.trim().slice(0, 12);
    log("INFO", `Container created: ${opts.name} (${containerId})`);
    return containerId;
}
/**
 * Start a stopped container.
 */
export async function startContainer(id) {
    const runtime = await rt();
    await run(runtime, ["start", id], 30_000);
    log("INFO", `Container started: ${id}`);
}
/**
 * Stop a running container (10s grace period).
 */
export async function stopContainer(id) {
    const runtime = await rt();
    try {
        await run(runtime, ["stop", "-t", "10", id], 30_000);
        log("INFO", `Container stopped: ${id}`);
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log("WARN", `Failed to stop container ${id}: ${msg}`);
    }
}
/**
 * Remove a container (force).
 */
export async function removeContainer(id) {
    const runtime = await rt();
    try {
        await run(runtime, ["rm", "-f", id], 30_000);
        log("INFO", `Container removed: ${id}`);
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log("WARN", `Failed to remove container ${id}: ${msg}`);
    }
}
// ---------------------------------------------------------------------------
// Container inspection
// ---------------------------------------------------------------------------
/**
 * Get live resource stats for a container.
 */
export async function getContainerStats(id) {
    const runtime = await rt();
    try {
        const { stdout } = await run(runtime, ["stats", "--no-stream", "--format", "{{.CPUPerc}}|{{.MemUsage}}", id], 15_000);
        // Format: "1.23%|123.4MiB / 2GiB"
        const line = stdout.trim();
        const [cpuStr, memStr] = line.split("|");
        const cpuPercent = parseFloat((cpuStr ?? "0").replace("%", "")) || 0;
        // Parse memory: "123.4MiB / 2GiB"
        let ramUsageMb = 0;
        let ramLimitMb = 0;
        if (memStr) {
            const memParts = memStr.split("/").map((s) => s.trim());
            ramUsageMb = parseMemValue(memParts[0] ?? "0");
            ramLimitMb = parseMemValue(memParts[1] ?? "0");
        }
        return { cpuPercent, ramUsageMb, ramLimitMb };
    }
    catch {
        return { cpuPercent: 0, ramUsageMb: 0, ramLimitMb: 0 };
    }
}
/**
 * Parse a memory string like "123.4MiB" or "2GiB" into megabytes.
 */
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
    return Math.round(num); // assume bytes -> ~0MB
}
/**
 * List containers matching a name prefix.
 */
export async function listContainers(prefix) {
    const runtime = await rt();
    try {
        const { stdout } = await run(runtime, [
            "ps",
            "-a",
            "--filter", `name=${prefix}`,
            "--format", "{{.ID}}|{{.Names}}|{{.Status}}|{{.Image}}",
        ], 15_000);
        if (!stdout.trim())
            return [];
        return stdout
            .trim()
            .split("\n")
            .map((line) => {
            const [id, name, status, image] = line.split("|");
            return {
                id: id ?? "",
                name: name ?? "",
                status: status ?? "",
                image: image ?? "",
            };
        })
            .filter((c) => c.id.length > 0);
    }
    catch {
        return [];
    }
}
/**
 * Check if a container is running and healthy.
 */
export async function isContainerRunning(id) {
    const runtime = await rt();
    try {
        const { stdout } = await run(runtime, ["inspect", "--format", "{{.State.Running}}", id], 10_000);
        return stdout.trim() === "true";
    }
    catch {
        return false;
    }
}
