import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Resend } from "resend";

const FROM_EMAIL = "Sparebox <noreply@sparebox.dev>";

function getResend() {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set — emails will not be sent");
    return null;
  }
  return new Resend(process.env.RESEND_API_KEY);
}

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || "https://sparebox.dev",
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }: { user: { email: string }; url: string }) => {
      const resend = getResend();
      if (!resend) return;
      await resend.emails.send({
        from: FROM_EMAIL,
        to: user.email,
        subject: "Reset your Sparebox password",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
            <h2 style="color: #1C1917; margin-bottom: 16px;">Reset your password</h2>
            <p style="color: #78716C; line-height: 1.6;">
              We received a request to reset your password. Click the button below to choose a new one.
            </p>
            <a href="${url}" style="display: inline-block; background: #C2410C; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; margin: 24px 0;">
              Reset Password
            </a>
            <p style="color: #A8A29E; font-size: 14px; line-height: 1.6;">
              If you didn't request this, you can safely ignore this email. This link expires in 1 hour.
            </p>
            <hr style="border: none; border-top: 1px solid #E7E5E4; margin: 32px 0;" />
            <p style="color: #A8A29E; font-size: 12px;">Sparebox — Your hardware. Their agents. Everyone wins.</p>
          </div>
        `,
      });
    },
    sendVerificationEmail: async ({ user, url }: { user: { email: string }; url: string }) => {
      const resend = getResend();
      if (!resend) return;
      await resend.emails.send({
        from: FROM_EMAIL,
        to: user.email,
        subject: "Verify your Sparebox email",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
            <h2 style="color: #1C1917; margin-bottom: 16px;">Verify your email</h2>
            <p style="color: #78716C; line-height: 1.6;">
              Welcome to Sparebox! Click the button below to verify your email address.
            </p>
            <a href="${url}" style="display: inline-block; background: #C2410C; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; margin: 24px 0;">
              Verify Email
            </a>
            <p style="color: #A8A29E; font-size: 14px; line-height: 1.6;">
              If you didn't create a Sparebox account, you can safely ignore this email.
            </p>
            <hr style="border: none; border-top: 1px solid #E7E5E4; margin: 32px 0;" />
            <p style="color: #A8A29E; font-size: 12px;">Sparebox — Your hardware. Their agents. Everyone wins.</p>
          </div>
        `,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
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
        input: false,
      },
      stripeCustomerId: {
        type: "string",
        required: false,
        input: false,
      },
      stripeConnectAccountId: {
        type: "string",
        required: false,
        input: false,
      },
    },
    deleteUser: {
      enabled: true,
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
