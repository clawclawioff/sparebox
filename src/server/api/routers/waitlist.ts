import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { waitlist } from "@/db/schema";

export const waitlistRouter = router({
  join: publicProcedure
    .input(z.object({
      email: z.string().email(),
      role: z.enum(["host", "deployer"]).optional(),
      source: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
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
