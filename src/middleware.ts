import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  // Only rate limit auth API routes
  if (!request.nextUrl.pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  // Skip GET requests (session checks, etc.)
  if (request.method === "GET") {
    return NextResponse.next();
  }

  // Get client IP
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
    request.headers.get("x-real-ip") || 
    "unknown";

  // Dynamic import to avoid build issues
  try {
    const { Ratelimit } = await import("@upstash/ratelimit");
    const { Redis } = await import("@upstash/redis");

    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      return NextResponse.next();
    }

    const ratelimit = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(10, "60 s"),
      prefix: "ratelimit:auth",
    });

    const { success, limit, remaining, reset } = await ratelimit.limit(ip);

    if (!success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { 
          status: 429,
          headers: {
            "X-RateLimit-Limit": limit.toString(),
            "X-RateLimit-Remaining": remaining.toString(),
            "X-RateLimit-Reset": reset.toString(),
            "Retry-After": Math.ceil((reset - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    const response = NextResponse.next();
    response.headers.set("X-RateLimit-Limit", limit.toString());
    response.headers.set("X-RateLimit-Remaining", remaining.toString());
    return response;
  } catch (error) {
    // If rate limiting fails, allow the request through (fail open)
    console.error("[Rate Limit] Error:", error);
    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/api/auth/:path*"],
};
