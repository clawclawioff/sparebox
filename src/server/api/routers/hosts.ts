import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { hosts } from "@/db/schema";
import { eq } from "drizzle-orm";

export const hostsRouter = router({
  // List hosts for the current user
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.hosts.findMany({
      where: eq(hosts.userId, ctx.user.id),
      orderBy: (hosts, { desc }) => [desc(hosts.createdAt)],
    });
  }),

  // Get a single host
  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const host = await ctx.db.query.hosts.findFirst({
        where: eq(hosts.id, input.id),
        with: {
          agents: true,
        },
      });

      if (!host || host.userId !== ctx.user.id) {
        throw new Error("Host not found");
      }

      return host;
    }),

  // Create a new host
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
        cpuCores: z.number().int().positive().optional(),
        ramGb: z.number().int().positive().optional(),
        storageGb: z.number().int().positive().optional(),
        osInfo: z.string().optional(),
        region: z.string().optional(),
        country: z.string().optional(),
        city: z.string().optional(),
        pricePerMonth: z.number().int().positive().default(1000), // cents
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [host] = await ctx.db
        .insert(hosts)
        .values({
          ...input,
          userId: ctx.user.id,
          status: "pending",
        })
        .returning();

      return host;
    }),

  // Update a host
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().max(500).optional(),
        pricePerMonth: z.number().int().positive().optional(),
        status: z.enum(["active", "inactive"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // Verify ownership
      const existing = await ctx.db.query.hosts.findFirst({
        where: eq(hosts.id, id),
      });

      if (!existing || existing.userId !== ctx.user.id) {
        throw new Error("Host not found");
      }

      const [updated] = await ctx.db
        .update(hosts)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(hosts.id, id))
        .returning();

      return updated;
    }),

  // Delete a host
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.hosts.findFirst({
        where: eq(hosts.id, input.id),
      });

      if (!existing || existing.userId !== ctx.user.id) {
        throw new Error("Host not found");
      }

      await ctx.db.delete(hosts).where(eq(hosts.id, input.id));

      return { success: true };
    }),

  // List all available hosts (for users looking to deploy)
  listAvailable: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.hosts.findMany({
      where: eq(hosts.status, "active"),
      orderBy: (hosts, { asc }) => [asc(hosts.pricePerMonth)],
      columns: {
        id: true,
        name: true,
        description: true,
        cpuCores: true,
        ramGb: true,
        storageGb: true,
        region: true,
        country: true,
        city: true,
        pricePerMonth: true,
        uptimePercent: true,
      },
    });
  }),
});
