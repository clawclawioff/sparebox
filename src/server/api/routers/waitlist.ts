import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "../trpc";
import { waitlist } from "@/db/schema";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Rate limit: 5 per minute per email (prevents waitlist flooding)
let _waitlistRatelimit: Ratelimit | null = null;
function getWaitlistRatelimit(): Ratelimit | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  if (!_waitlistRatelimit) {
    _waitlistRatelimit = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(5, "60 s"),
      analytics: false,
      prefix: "ratelimit:waitlist",
    });
  }
  return _waitlistRatelimit;
}

export const waitlistRouter = router({
  join: publicProcedure
    .input(z.object({
      email: z.string().email(),
      role: z.enum(["host", "deployer"]).optional(),
      source: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Rate limit by email address
      const rl = getWaitlistRatelimit();
      if (rl) {
        const { success } = await rl.limit(input.email);
        if (!success) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: "Too many requests. Please try again later.",
          });
        }
      }

      try {
        await ctx.db.insert(waitlist).values({
          email: input.email,
          role: input.role,
          source: input.source || "landing",
        }).onConflictDoNothing();
        return { success: true };
      } catch (error) {
        // If duplicate, still return success (don't reveal if email exists)
        return { success: true };
      }
    }),
});
