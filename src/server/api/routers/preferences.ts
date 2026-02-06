/**
 * Preferences Router
 * 
 * Handles user notification preferences (email settings)
 */

import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { userPreferences } from "@/db/schema";
import { eq } from "drizzle-orm";

export const preferencesRouter = router({
  /**
   * Get current user's notification preferences
   * Creates default preferences if none exist
   */
  get: protectedProcedure.query(async ({ ctx }) => {
    const prefs = await ctx.db.query.userPreferences.findFirst({
      where: eq(userPreferences.userId, ctx.user.id),
    });

    if (!prefs) {
      // Create default preferences
      const [newPrefs] = await ctx.db
        .insert(userPreferences)
        .values({
          userId: ctx.user.id,
        })
        .returning();
      return newPrefs;
    }

    return prefs;
  }),

  /**
   * Update notification preferences
   */
  update: protectedProcedure
    .input(
      z.object({
        emailSecurityAlerts: z.boolean().optional(),
        emailAccountUpdates: z.boolean().optional(),
        emailAgentStatus: z.boolean().optional(),
        emailBillingAlerts: z.boolean().optional(),
        emailNewDeployments: z.boolean().optional(),
        emailMachineOffline: z.boolean().optional(),
        emailPayouts: z.boolean().optional(),
        emailProductUpdates: z.boolean().optional(),
        emailTips: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.userPreferences.findFirst({
        where: eq(userPreferences.userId, ctx.user.id),
      });

      if (existing) {
        const [updated] = await ctx.db
          .update(userPreferences)
          .set({ ...input, updatedAt: new Date() })
          .where(eq(userPreferences.userId, ctx.user.id))
          .returning();
        return updated;
      } else {
        const [created] = await ctx.db
          .insert(userPreferences)
          .values({ userId: ctx.user.id, ...input })
          .returning();
        return created;
      }
    }),
});
