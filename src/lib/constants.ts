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
