import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

export interface DaemonConfig {
  apiKey: string;
  hostId: string;
  apiUrl: string;
  heartbeatIntervalMs: number;
}

const DEFAULTS = {
  apiUrl: "https://www.sparebox.dev",
  heartbeatIntervalMs: 60_000,
} as const;

const CONFIG_DIR = path.join(os.homedir(), ".sparebox");
const CONFIG_PATH = path.join(CONFIG_DIR, "config.json");

/**
 * Load config with priority: env vars > config file > defaults.
 * Throws if required fields (apiKey, hostId) are missing.
 */
export function loadConfig(): DaemonConfig {
  // 1. Try loading config file
  let fileConfig: Partial<DaemonConfig> = {};
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
      fileConfig = JSON.parse(raw) as Partial<DaemonConfig>;
    }
  } catch (err) {
    // Config file is optional — warn but don't crash
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[WARN] Failed to read config file at ${CONFIG_PATH}: ${msg}`);
  }

  // 2. Merge: env vars > file > defaults
  const config: DaemonConfig = {
    apiKey: process.env["SPAREBOX_API_KEY"] ?? fileConfig.apiKey ?? "",
    hostId: process.env["SPAREBOX_HOST_ID"] ?? fileConfig.hostId ?? "",
    apiUrl: process.env["SPAREBOX_API_URL"] ?? fileConfig.apiUrl ?? DEFAULTS.apiUrl,
    heartbeatIntervalMs: fileConfig.heartbeatIntervalMs ?? DEFAULTS.heartbeatIntervalMs,
  };

  return config;
}

/**
 * Validate config, returning an array of error strings (empty = valid).
 */
export function validateConfig(config: DaemonConfig): string[] {
  const errors: string[] = [];

  if (!config.apiKey) {
    errors.push("Missing API key. Set SPAREBOX_API_KEY env var or apiKey in ~/.sparebox/config.json");
  } else if (!config.apiKey.startsWith("sbx_host_")) {
    errors.push(`Invalid API key format — expected "sbx_host_..." prefix, got "${config.apiKey.slice(0, 12)}..."`);
  }

  if (!config.hostId) {
    errors.push("Missing Host ID. Set SPAREBOX_HOST_ID env var or hostId in ~/.sparebox/config.json");
  }

  if (!config.apiUrl.startsWith("https://") && !config.apiUrl.startsWith("http://")) {
    errors.push(`Invalid API URL: "${config.apiUrl}" — must start with https:// or http://`);
  }

  // Enforce min 30s heartbeat interval per spec
  if (config.heartbeatIntervalMs < 30_000) {
    errors.push(`Heartbeat interval too low: ${config.heartbeatIntervalMs}ms — minimum is 30000ms (30s)`);
  }

  return errors;
}

export { CONFIG_PATH };
