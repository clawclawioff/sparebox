/**
 * Users Router
 * 
 * Handles user profile management and role updates
 */

import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { user } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const usersRouter = router({
  /**
   * Get current user profile
   */
  me: protectedProcedure.query(async ({ ctx }) => {
    const userData = await ctx.db.query.user.findFirst({
      where: eq(user.id, ctx.user.id),
      columns: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    if (!userData) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }

    return userData;
  }),

  /**
   * Set initial role (one-time, only if role is still default "user")
   * 
   * Called immediately after signup to set the user's chosen role.
   * Cannot change role once set to "host". Prevents role escalation.
   */
  setInitialRole: protectedProcedure
    .input(z.object({
      role: z.enum(["host", "user"]),
    }))
    .mutation(async ({ ctx, input }) => {
      // Only allow if role is still the default "user"
      // This is a one-time operation right after signup
      const [updated] = await ctx.db
        .update(user)
        .set({ 
          role: input.role,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(user.id, ctx.user.id),
            eq(user.role, "user"), // Only if still default role
          )
        )
        .returning();

      if (!updated) {
        throw new TRPCError({ 
          code: "FORBIDDEN", 
          message: "Role has already been set. Contact support to change it." 
        });
      }

      return {
        success: true,
        role: updated.role,
      };
    }),

  /**
   * Update user profile
   */
  update: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(100).optional(),
      image: z.string().url().optional().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(user)
        .set({
          ...input,
          updatedAt: new Date(),
        })
        .where(eq(user.id, ctx.user.id))
        .returning();

      return updated;
    }),
});
