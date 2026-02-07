import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Lazy init to avoid build-time errors when env vars aren't set
let _ratelimit: Ratelimit | null = null;

export function getRatelimit(): Ratelimit | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  if (!_ratelimit) {
    _ratelimit = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(10, "60 s"), // Default: 10 requests per minute
      analytics: true,
      prefix: "ratelimit:auth",
    });
  }
  return _ratelimit;
}

// Stricter limits for specific endpoints
let _strictRatelimit: Ratelimit | null = null;

export function getStrictRatelimit(): Ratelimit | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  if (!_strictRatelimit) {
    _strictRatelimit = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(5, "60 s"), // 5 requests per minute
      analytics: true,
      prefix: "ratelimit:auth-strict",
    });
  }
  return _strictRatelimit;
}
