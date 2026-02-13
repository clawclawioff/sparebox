import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import { Resend } from "resend";
import { render } from "@react-email/render";
import { VerifyEmail } from "@/emails/verify-email";
import { ResetPassword } from "@/emails/reset-password";
import { sendWelcomeEmail } from "@/lib/email/notifications";

const FROM_EMAIL = "Sparebox <noreply@sparebox.dev>";

function getResend() {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set — emails will not be sent");
    return null;
  }
  return new Resend(process.env.RESEND_API_KEY);
}

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || "https://www.sparebox.dev",
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }: { user: { email: string }; url: string }) => {
      const resend = getResend();
      if (!resend) return;
      const html = await render(ResetPassword({ url }));
      await resend.emails.send({
        from: FROM_EMAIL,
        to: user.email,
        subject: "Reset your Sparebox password",
        html,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }: { user: { email: string }; url: string }) => {
      const resend = getResend();
      if (!resend) return;
      // Replace the default callbackURL with our email-verified page
      const verifyUrl = new URL(url);
      verifyUrl.searchParams.set("callbackURL", "/email-verified");
      const html = await render(VerifyEmail({ url: verifyUrl.toString() }));
      await resend.emails.send({
        from: FROM_EMAIL,
        to: user.email,
        subject: "Verify your Sparebox email",
        html,
      });
    },
    afterEmailVerification: async (user: { email: string; name: string | null; role?: string }) => {
      // Send welcome email after successful verification (fire-and-forget)
      sendWelcomeEmail(user.email, {
        userName: user.name || "",
        role: (user.role as "host" | "deployer" | "default") || "default",
      }).catch((err) => console.error("[email] Failed to send welcome email:", err));
    },
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
        defaultValue: "default",
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
});

export type Auth = typeof auth;
