import { router, hostProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { getStripe } from "@/lib/stripe";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";

export const connectRouter = router({
  // Create a Stripe Connect account for the host and return onboarding link
  createConnectAccount: hostProcedure.mutation(async ({ ctx }) => {
    // Check if host already has a Connect account
    if (ctx.user.stripeConnectAccountId) {
      // Return a new account link for existing account (in case they need to complete onboarding)
      const accountLink = await getStripe().accountLinks.create({
        account: ctx.user.stripeConnectAccountId,
        refresh_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://www.sparebox.dev"}/dashboard/earnings?refresh=true`,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://www.sparebox.dev"}/dashboard/earnings?onboarded=true`,
        type: "account_onboarding",
      });
      return { url: accountLink.url };
    }

    // Create a new Connect account using controller properties (NOT legacy types)
    const account = await getStripe().accounts.create({
      controller: {
        losses: { payments: "application" },
        fees: { payer: "application" },
        stripe_dashboard: { type: "express" },
        requirement_collection: "stripe",
      },
      capabilities: {
        transfers: { requested: true },
      },
      email: ctx.user.email,
      metadata: {
        sparebox_user_id: ctx.user.id,
      },
    });

    // Save the Connect account ID to the user
    await ctx.db
      .update(user)
      .set({ stripeConnectAccountId: account.id })
      .where(eq(user.id, ctx.user.id));

    // Create an account link for onboarding
    const accountLink = await getStripe().accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://www.sparebox.dev"}/dashboard/earnings?refresh=true`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://www.sparebox.dev"}/dashboard/earnings?onboarded=true`,
      type: "account_onboarding",
    });

    return { url: accountLink.url };
  }),

  // Get Connect account status
  getAccountStatus: hostProcedure.query(async ({ ctx }) => {
    if (!ctx.user.stripeConnectAccountId) {
      return {
        status: "not_created" as const,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
      };
    }

    const account = await getStripe().accounts.retrieve(
      ctx.user.stripeConnectAccountId
    );

    return {
      status: account.details_submitted
        ? account.charges_enabled && account.payouts_enabled
          ? ("active" as const)
          : ("pending" as const)
        : ("onboarding_incomplete" as const),
      chargesEnabled: account.charges_enabled ?? false,
      payoutsEnabled: account.payouts_enabled ?? false,
      detailsSubmitted: account.details_submitted ?? false,
    };
  }),

  // Create a login link for the Express Dashboard
  createDashboardLink: hostProcedure.mutation(async ({ ctx }) => {
    if (!ctx.user.stripeConnectAccountId) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "No Connect account found. Please complete onboarding first.",
      });
    }

    const loginLink = await getStripe().accounts.createLoginLink(
      ctx.user.stripeConnectAccountId
    );

    return { url: loginLink.url };
  }),

  // Get recent earnings for the host (using connected account balance transactions)
  getPayouts: hostProcedure.query(async ({ ctx }) => {
    if (!ctx.user.stripeConnectAccountId) {
      return { transactions: [], totalEarnings: 0 };
    }

    try {
      // Fetch balance transactions from the connected account
      // The 'net' field reflects the host's actual take-home (after application fee)
      const balanceTransactions = await getStripe().balanceTransactions.list(
        { limit: 100, type: "payment" },
        { stripeAccount: ctx.user.stripeConnectAccountId }
      );

      const totalEarnings = balanceTransactions.data.reduce(
        (sum, t) => sum + t.net,
        0
      );

      return {
        transactions: balanceTransactions.data.map((t) => ({
          id: t.id,
          amount: t.net, // Net amount after application fee (host's 60%)
          gross: t.amount,
          fee: t.fee, // Application fee (platform's 40%)
          currency: t.currency,
          created: t.created,
          description: t.description,
        })),
        totalEarnings,
      };
    } catch {
      return { transactions: [], totalEarnings: 0 };
    }
  }),
});
