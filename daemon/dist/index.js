#!/usr/bin/env node
/**
 * Sparebox Host Daemon
 *
 * A lightweight Node.js process that reports system metrics to the
 * Sparebox platform via periodic heartbeat POST requests.
 *
 * Usage:
 *   node daemon.js              Start the daemon
 *   node daemon.js --verify     Dry run: load config + collect metrics, then exit
 *   node daemon.js --help       Show help
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig, validateConfig, CONFIG_PATH } from "./config.js";
import { getCpuUsage, getRamUsage, getDiskUsage, getOsInfo } from "./metrics.js";
import { startHeartbeatLoop, stopHeartbeatLoop } from "./heartbeat.js";
import { log } from "./log.js";
// ---------------------------------------------------------------------------
// Version — read from package.json
// ---------------------------------------------------------------------------
function getDaemonVersion() {
    try {
        // Walk up from dist/ to find package.json
        const thisFile = fileURLToPath(import.meta.url);
        const distDir = path.dirname(thisFile);
        const pkgPath = path.join(distDir, "..", "package.json");
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
        return pkg.version;
    }
    catch {
        return "0.0.0";
    }
}
const VERSION = getDaemonVersion();
// ---------------------------------------------------------------------------
// CLI handling
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
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
// ---------------------------------------------------------------------------
// Verify mode
// ---------------------------------------------------------------------------
async function runVerify() {
    console.log(`\nSparebox Daemon v${VERSION} — Verify Mode\n`);
    // 1. Config
    console.log("── Configuration ──");
    const config = loadConfig();
    const errors = validateConfig(config);
    console.log(`  API Key:    ${config.apiKey ? config.apiKey.slice(0, 12) + "..." + config.apiKey.slice(-4) : "(not set)"}`);
    console.log(`  Host ID:    ${config.hostId || "(not set)"}`);
    console.log(`  API URL:    ${config.apiUrl}`);
    console.log(`  Interval:   ${config.heartbeatIntervalMs}ms`);
    if (errors.length > 0) {
        console.log("\n── Config Errors ──");
        for (const e of errors) {
            console.log(`  ✗ ${e}`);
        }
    }
    else {
        console.log("\n  ✓ Config valid");
    }
    // 2. Metrics
    console.log("\n── System Metrics ──");
    console.log("  Collecting CPU usage (1s sample)...");
    const [cpu, disk] = await Promise.all([getCpuUsage(), getDiskUsage()]);
    const ram = getRamUsage();
    console.log(`  CPU:        ${cpu}%`);
    console.log(`  RAM:        ${ram}%`);
    console.log(`  Disk:       ${disk === -1 ? "N/A (could not determine)" : disk + "%"}`);
    console.log(`  OS:         ${getOsInfo()}`);
    console.log(`  Node.js:    ${process.version}`);
    // 3. Summary
    console.log("\n── Ready ──");
    if (errors.length > 0) {
        console.log("  ✗ Fix config errors above before starting the daemon.");
        process.exit(1);
    }
    else {
        console.log("  ✓ All checks passed. Run without --verify to start the daemon.");
        process.exit(0);
    }
}
if (args.includes("--verify")) {
    void runVerify();
}
else {
    // ---------------------------------------------------------------------------
    // Normal daemon mode
    // ---------------------------------------------------------------------------
    void startDaemon();
}
async function startDaemon() {
    log("INFO", `Sparebox Daemon v${VERSION} starting`);
    // 1. Load & validate config
    const config = loadConfig();
    const errors = validateConfig(config);
    if (errors.length > 0) {
        for (const e of errors) {
            log("ERROR", e);
        }
        log("ERROR", "Cannot start — fix configuration and try again.");
        process.exit(1);
    }
    log("INFO", `Host ID: ${config.hostId}`);
    log("INFO", `API URL: ${config.apiUrl}`);
    log("INFO", `Heartbeat interval: ${config.heartbeatIntervalMs / 1000}s`);
    // 2. Graceful shutdown
    let shuttingDown = false;
    function shutdown(signal) {
        if (shuttingDown)
            return;
        shuttingDown = true;
        log("INFO", `Received ${signal} — shutting down gracefully`);
        stopHeartbeatLoop();
        // Give any in-flight requests a moment to complete
        setTimeout(() => {
            log("INFO", "Daemon stopped");
            process.exit(0);
        }, 2000);
    }
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
    // 3. Start heartbeat loop
    log("INFO", "Starting heartbeat loop...");
    startHeartbeatLoop(config, VERSION);
}
