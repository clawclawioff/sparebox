/**
 * tRPC Server Configuration
 * 
 * This file sets up:
 * - Context creation with session/user
 * - Base procedures (public, protected)
 * - Role-based procedures (hostProcedure, userProcedure)
 * 
 * @see https://trpc.io/docs/server/context
 */

import { initTRPC, TRPCError } from "@trpc/server";
import { db } from "@/db";
import { auth } from "@/server/auth";
import type { Session, User } from "better-auth";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// =============================================================================
// Types
// =============================================================================

export type UserRole = 'default' | 'deployer' | 'host' | 'admin';

export interface AuthUser extends User {
  role: UserRole;
  stripeCustomerId: string | null;
  stripeConnectAccountId: string | null;
}

export interface AuthSession extends Session {
  // Additional session fields if needed
}

export type Context = {
  db: typeof db;
  session: AuthSession | null;
  user: AuthUser | null;
};

export type ProtectedContext = Context & {
  session: AuthSession;
  user: AuthUser;
};

// =============================================================================
// Context Creation
// =============================================================================

/**
 * Creates context for each tRPC request
 * Called for every incoming request
 */
export async function createContext(opts: { headers: Headers }): Promise<Context> {
  const result = await auth.api.getSession({
    headers: opts.headers,
  });

  return {
    db,
    session: (result?.session as AuthSession) ?? null,
    user: (result?.user as AuthUser) ?? null,
  };
}

// =============================================================================
// tRPC Initialization
// =============================================================================

const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        // Add custom error data here if needed
      },
    };
  },
});

export const router = t.router;
export const middleware = t.middleware;

// =============================================================================
// Middleware
// =============================================================================

/**
 * Logging middleware - logs all procedure calls
 */
const loggerMiddleware = middleware(async ({ path, type, next }) => {
  const start = Date.now();
  const result = await next();
  const duration = Date.now() - start;
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`[tRPC] ${type} ${path} - ${duration}ms`);
  }
  
  return result;
});

/**
 * tRPC rate limiter — 30 requests per minute per user
 */
let _trpcRatelimit: Ratelimit | null = null;
function getTrpcRatelimit(): Ratelimit | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  if (!_trpcRatelimit) {
    _trpcRatelimit = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(30, "60 s"),
      analytics: false,
      prefix: "ratelimit:trpc",
    });
  }
  return _trpcRatelimit;
}

/**
 * Auth middleware - ensures user is authenticated + rate limited
 * Narrows context type to guarantee session/user exist
 */
const enforceAuth = middleware(async ({ ctx, next }) => {
  if (!ctx.session || !ctx.user) {
    throw new TRPCError({ 
      code: "UNAUTHORIZED",
      message: "You must be logged in to perform this action",
    });
  }

  // Rate limit per user (30 req/min)
  const rl = getTrpcRatelimit();
  if (rl) {
    const { success } = await rl.limit(ctx.user.id);
    if (!success) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: "Too many requests. Please slow down.",
      });
    }
  }
  
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      user: ctx.user,
    } satisfies ProtectedContext,
  });
});

/**
 * Role middleware factory - ensures user has required role
 * Admin role always passes
 */
const enforceRole = (allowedRoles: UserRole[]) => {
  return middleware(async ({ ctx, next }) => {
    if (!ctx.session || !ctx.user) {
      throw new TRPCError({ 
        code: "UNAUTHORIZED",
        message: "You must be logged in to perform this action",
      });
    }
    
    const userRole = ctx.user.role;
    
    // Admin can do everything
    if (userRole === 'admin') {
      return next({
        ctx: {
          ...ctx,
          session: ctx.session,
          user: ctx.user,
        } satisfies ProtectedContext,
      });
    }
    
    if (!allowedRoles.includes(userRole)) {
      throw new TRPCError({ 
        code: "FORBIDDEN",
        message: `This action requires ${allowedRoles.join(' or ')} role`,
      });
    }
    
    return next({
      ctx: {
        ...ctx,
        session: ctx.session,
        user: ctx.user,
      } satisfies ProtectedContext,
    });
  });
};

// =============================================================================
// Procedures
// =============================================================================

/**
 * Public procedure - no authentication required
 * Use for: landing page data, public listings, health checks
 */
export const publicProcedure = t.procedure.use(loggerMiddleware);

/**
 * Protected procedure - requires authentication
 * Use for: any action that needs a logged-in user
 */
export const protectedProcedure = t.procedure
  .use(loggerMiddleware)
  .use(enforceAuth);

/**
 * Host procedure - requires host or admin role
 * Use for: machine management, earnings, payouts
 */
export const hostProcedure = t.procedure
  .use(loggerMiddleware)
  .use(enforceRole(['host', 'admin']));

/**
 * User procedure - requires deployer or admin role  
 * Use for: agent deployment, subscriptions, billing
 * Note: 'deployer' is the role for agent deployers
 */
export const userProcedure = t.procedure
  .use(loggerMiddleware)
  .use(enforceRole(['deployer', 'admin']));

/**
 * Admin procedure - requires admin role only
 * Use for: user management, platform admin, moderation
 */
export const adminProcedure = t.procedure
  .use(loggerMiddleware)
  .use(enforceRole(['admin']));

// =============================================================================
// Helpers
// =============================================================================

/**
 * Helper to create custom role procedures
 * 
 * @example
 * const hostOrUserProcedure = createRoleProcedure(['host', 'user'])
 */
export const createRoleProcedure = (roles: UserRole[]) => {
  return t.procedure
    .use(loggerMiddleware)
    .use(enforceRole(roles));
};
