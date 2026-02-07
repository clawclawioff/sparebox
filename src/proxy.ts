import { NextRequest, NextResponse } from "next/server";

// Paths that don't require authentication
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/pricing",
  "/blog",
  "/privacy-policy",
  "/terms-of-service",
  "/api/",
  "/icon.svg",
  "/sitemap.xml",
  "/robots.txt",
  "/_next/",
];

// Auth pages where logged-in users should NOT be redirected away
const AUTH_ALLOWED_WHEN_LOGGED_IN = [
  "/verify-email",
  "/onboarding",
];

// Pages that require auth but allow unverified email
const ALLOW_UNVERIFIED = [
  "/verify-email",
  "/onboarding",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p));
}

function isAuthAllowedWhenLoggedIn(pathname: string): boolean {
  return AUTH_ALLOWED_WHEN_LOGGED_IN.some(p => pathname === p || pathname.startsWith(p));
}

function isAllowUnverified(pathname: string): boolean {
  return ALLOW_UNVERIFIED.some(p => pathname === p || pathname.startsWith(p));
}

function isAuthPage(pathname: string): boolean {
  return ["/login", "/signup", "/forgot-password", "/reset-password"].some(
    p => pathname === p || pathname.startsWith(p)
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Rate limiting for auth API routes ──
  if (pathname.startsWith("/api/auth/") && request.method !== "GET") {
    try {
      const { Ratelimit } = await import("@upstash/ratelimit");
      const { Redis } = await import("@upstash/redis");

      if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
        const ip =
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          request.headers.get("x-real-ip") ||
          "unknown";

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
      }
    } catch {
      // Fail open — if rate limiting breaks, don't block requests
    }
  }

  // ── Skip session checks for public paths and API routes ──
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // ── Session check via better-auth cookie ──
  // We check the session cookie to determine auth state.
  // The actual session validation happens server-side in layouts/guards,
  // but we can use the cookie presence for routing decisions.
  const sessionCookie =
    request.cookies.get("better-auth.session_token") ||
    request.cookies.get("__Secure-better-auth.session_token");

  const isLoggedIn = !!sessionCookie;

  // ── Not logged in: redirect to login (unless on public/auth page) ──
  if (!isLoggedIn) {
    if (isAuthPage(pathname) || isPublicPath(pathname)) {
      return NextResponse.next();
    }
    // Trying to access dashboard or protected route without being logged in
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  // ── Logged in: redirect away from auth pages (login, signup, etc.) ──
  // EXCEPT verify-email and onboarding — those need the session
  if (isAuthPage(pathname)) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    return NextResponse.redirect(dashboardUrl);
  }

  // ── Pass through for verify-email, onboarding, dashboard, etc. ──
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, icon.svg
     * - public files (images, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
