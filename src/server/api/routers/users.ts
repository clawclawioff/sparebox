/**
 * Users Router
 * 
 * Handles user profile management and role updates
 */

import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../trpc";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";
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
   * Set user role (can only be done once, right after signup)
   * 
   * This is called immediately after signup to set the user's role.
   * Once set to 'host' or 'user', it cannot be changed without admin action.
   */
  setRole: protectedProcedure
    .input(z.object({
      role: z.enum(["host", "user"]),
    }))
    .mutation(async ({ ctx, input }) => {
      // Get current user
      const currentUser = await ctx.db.query.user.findFirst({
        where: eq(user.id, ctx.user.id),
      });

      if (!currentUser) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      // Only allow setting role if it's currently 'user' (default)
      // This prevents users from switching roles freely
      // Host -> User switching should require admin action
      if (currentUser.role !== "user") {
        throw new TRPCError({ 
          code: "FORBIDDEN", 
          message: "Role has already been set. Contact support to change it." 
        });
      }

      // Update the role
      const [updated] = await ctx.db
        .update(user)
        .set({ 
          role: input.role,
          updatedAt: new Date(),
        })
        .where(eq(user.id, ctx.user.id))
        .returning();

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
