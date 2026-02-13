// Revenue split
export const PLATFORM_FEE_PERCENT = 40;
export const HOST_PAYOUT_PERCENT = 60;

// Subscription
export const MIN_HOST_PRICE_CENTS = 500; // $5/month minimum
export const MAX_HOST_PRICE_CENTS = 100000; // $1000/month maximum

// Rate limiting
export const AUTH_RATE_LIMIT_PER_MIN = 10;
export const HEARTBEAT_RATE_LIMIT_PER_SEC = 2;

// Host heartbeat
export const HEARTBEAT_INTERVAL_MS = 60_000; // 60 seconds
export const HEARTBEAT_STALE_THRESHOLD_MS = 5 * 60_000; // 5 minutes
export const HEARTBEAT_REACTIVATE_THRESHOLD_MS = 2 * 60_000; // 2 minutes

// API key
export const API_KEY_PREFIX = "sbx_host_";
export const API_KEY_ENTROPY_BYTES = 32; // 32 bytes = 64 hex chars

// Resource tiers
export const TIERS = {
  lite: {
    name: "Lite",
    ramMb: 1024,
    cpuCores: 0.5,
    diskGb: 5,
    description: "Simple chatbots, webhook-only agents, API-only workloads",
  },
  standard: {
    name: "Standard",
    ramMb: 2048,
    cpuCores: 1,
    diskGb: 10,
    description: "Most agents — chat, tools, memory, moderate traffic",
  },
  pro: {
    name: "Pro",
    ramMb: 4096,
    cpuCores: 2,
    diskGb: 20,
    description: "Browser automation, multi-channel, coding agents",
  },
  compute: {
    name: "Compute",
    ramMb: 8192,
    cpuCores: 4,
    diskGb: 40,
    description: "Local model inference (Ollama 7B), heavy automation",
  },
} as const;

export type TierKey = keyof typeof TIERS;

// System overhead reserved on each host (not allocatable to agents)
export const HOST_OVERHEAD_RAM_MB = 1024;
export const HOST_OVERHEAD_CPU_CORES = 0.5;

// Command queue
export const COMMAND_EXPIRY_MS = 5 * 60_000; // 5 minutes
