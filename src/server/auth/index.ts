import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || "https://sparebox.dev",
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  trustedOrigins: [
    "https://sparebox.dev",
    "https://www.sparebox.dev",
    ...(process.env.NODE_ENV === "development" ? ["http://localhost:3000"] : []),
  ],
  // Include custom user fields in the session
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "user",
        input: false, // Not settable during signup
      },
    },
  },
  // Database hooks to ensure role is always returned
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          // Fetch the user's role from the database
          const userData = await db.query.user.findFirst({
            where: eq(user.id, session.userId),
            columns: { role: true },
          });
          
          return {
            data: {
              ...session,
            },
          };
        },
      },
    },
  },
});

export type Auth = typeof auth;
