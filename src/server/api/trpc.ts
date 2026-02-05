import { initTRPC, TRPCError } from "@trpc/server";
import { db } from "@/db";
import { auth } from "@/server/auth";
import type { Session, User } from "better-auth";

export type Context = {
  db: typeof db;
  session: Session | null;
  user: User | null;
};

export async function createContext(opts: { headers: Headers }): Promise<Context> {
  const session = await auth.api.getSession({
    headers: opts.headers,
  });

  return {
    db,
    session: session?.session ?? null,
    user: session?.user ?? null,
  };
}

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session || !ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      user: ctx.user,
    },
  });
});
