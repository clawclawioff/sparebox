/**
 * Profile-based fallback for hosts without Docker/Podman.
 *
 * Uses `openclaw --profile sparebox-agent-{shortId}` to run agents
 * as separate OpenClaw gateway instances. Much simpler than the
 * Docker path — relies on the host's existing openclaw installation.
 */
import { execFile } from "node:child_process";
import { log } from "./log.js";
// ---------------------------------------------------------------------------
// exec helper
// ---------------------------------------------------------------------------
function run(cmd, args, timeoutMs = 30_000) {
    return new Promise((resolve, reject) => {
        execFile(cmd, args, { timeout: timeoutMs, maxBuffer: 2 * 1024 * 1024 }, (err, stdout, stderr) => {
            if (err) {
                reject(new Error(`${cmd} ${args.join(" ")} failed: ${err.message}`));
            }
            else {
                resolve({ stdout: stdout ?? "", stderr: stderr ?? "" });
            }
        });
    });
}
// ---------------------------------------------------------------------------
// OpenClaw binary detection
// ---------------------------------------------------------------------------
let openclawBin = null;
/**
 * Find the openclaw binary on the system.
 */
export async function findOpenclawBinary() {
    if (openclawBin)
        return openclawBin;
    for (const bin of ["openclaw", "npx openclaw"]) {
        try {
            await run(bin.split(" ")[0], bin.split(" ").length > 1 ? [bin.split(" ")[1], "--version"] : ["--version"], 10_000);
            openclawBin = bin;
            return bin;
        }
        catch {
            // try next
        }
    }
    // Try common install locations
    const { homedir } = await import("node:os");
    const paths = [
        `${homedir()}/.local/bin/openclaw`,
        "/usr/local/bin/openclaw",
        "/usr/bin/openclaw",
    ];
    for (const p of paths) {
        try {
            await run(p, ["--version"], 10_000);
            openclawBin = p;
            return p;
        }
        catch {
            // try next
        }
    }
    return null;
}
// ---------------------------------------------------------------------------
// Profile management
// ---------------------------------------------------------------------------
/**
 * Start an agent using an openclaw profile.
 */
export async function startProfile(profileName, port, env) {
    const bin = await findOpenclawBinary();
    if (!bin) {
        log("ERROR", "openclaw binary not found — cannot start profile agent");
        return null;
    }
    try {
        // Start the gateway in the background
        const args = ["--profile", profileName, "gateway", "start", "--port", String(port)];
        // Set environment variables for the spawned process
        const spawnEnv = { ...process.env, ...env };
        const { spawn } = await import("node:child_process");
        const child = spawn(bin, args, {
            detached: true,
            stdio: "ignore",
            env: spawnEnv,
        });
        child.unref();
        const pid = child.pid ?? null;
        if (pid) {
            log("INFO", `Profile agent started: ${profileName} (PID: ${pid}, port: ${port})`);
        }
        else {
            log("WARN", `Profile agent started but no PID captured: ${profileName}`);
        }
        return pid;
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log("ERROR", `Failed to start profile agent ${profileName}: ${msg}`);
        return null;
    }
}
/**
 * Stop an agent profile.
 */
export async function stopProfile(profileName) {
    const bin = await findOpenclawBinary();
    if (!bin) {
        log("ERROR", "openclaw binary not found — cannot stop profile agent");
        return;
    }
    try {
        await run(bin, ["--profile", profileName, "gateway", "stop"], 15_000);
        log("INFO", `Profile agent stopped: ${profileName}`);
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log("WARN", `Failed to stop profile agent ${profileName}: ${msg}`);
    }
}
/**
 * Check if a profile agent is running by checking its PID.
 */
export async function isProfileRunning(pid) {
    if (!pid)
        return false;
    try {
        // Sending signal 0 checks if process exists without killing it
        process.kill(pid, 0);
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Get the status of a profile agent.
 */
export async function getProfileStatus(profileName, pid) {
    const bin = await findOpenclawBinary();
    if (!bin)
        return "unknown";
    try {
        const { stdout } = await run(bin, ["--profile", profileName, "gateway", "status"], 10_000);
        if (stdout.toLowerCase().includes("running"))
            return "running";
        if (stdout.toLowerCase().includes("stopped"))
            return "stopped";
    }
    catch {
        // Fall back to PID check
    }
    if (pid) {
        return (await isProfileRunning(pid)) ? "running" : "stopped";
    }
    return "unknown";
}
/**
 * Kill a profile agent by PID (forceful).
 */
export async function killProfile(pid) {
    if (!pid)
        return;
    try {
        process.kill(pid, "SIGTERM");
        // Wait a bit then force kill if still alive
        await new Promise((resolve) => setTimeout(resolve, 3000));
        try {
            process.kill(pid, 0); // check if still alive
            process.kill(pid, "SIGKILL");
        }
        catch {
            // Already dead
        }
    }
    catch {
        // Process already gone
    }
}
