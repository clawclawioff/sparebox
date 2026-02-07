"use client";

import { trpc } from "@/lib/trpc";
import { useSearchParams } from "next/navigation";
import {
  DollarSign,
  ExternalLink,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
} from "lucide-react";
import { Suspense } from "react";

function EarningsContent() {
  const searchParams = useSearchParams();
  const onboarded = searchParams.get("onboarded") === "true";
  const refresh = searchParams.get("refresh") === "true";

  const {
    data: accountStatus,
    isLoading: statusLoading,
    refetch: refetchStatus,
  } = trpc.connect.getAccountStatus.useQuery();

  const { data: payoutsData, isLoading: payoutsLoading } =
    trpc.connect.getPayouts.useQuery(undefined, {
      enabled: accountStatus?.status === "active",
    });

  const createAccount = trpc.connect.createConnectAccount.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
  });

  const createDashboardLink = trpc.connect.createDashboardLink.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        window.open(data.url, "_blank");
      }
    },
  });

  const isLoading = statusLoading;

  if (isLoading) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Earnings</h1>
          <p className="text-muted-foreground mt-1">
            Track your hosting earnings
          </p>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-card border border-border rounded-xl p-6 h-32 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  const status = accountStatus?.status ?? "not_created";

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Earnings</h1>
        <p className="text-muted-foreground mt-1">
          Track your hosting earnings
        </p>
      </div>

      {/* Success Banner */}
      {onboarded && (
        <div className="mb-6 bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-foreground">
              Payout account connected!
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Your bank account is being verified by Stripe. You&apos;ll start
              receiving payouts once verification is complete.
            </p>
          </div>
        </div>
      )}

      {/* Refresh Banner */}
      {refresh && (
        <div className="mb-6 bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-foreground">
              Setup session expired
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Your onboarding session expired. Please try setting up payouts
              again.
            </p>
          </div>
        </div>
      )}

      {/* Not Created — Onboarding CTA */}
      {status === "not_created" && (
        <div className="bg-card border border-border rounded-xl p-8 text-center mb-6">
          <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
            <DollarSign className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Set up payouts to get paid
          </h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Connect your bank account through Stripe to receive earnings when
            users deploy agents on your machines. You&apos;ll earn 60% of each
            subscription.
          </p>
          <button
            onClick={() => createAccount.mutate()}
            disabled={createAccount.isPending}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {createAccount.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ExternalLink className="w-4 h-4" />
            )}
            Set Up Payouts
          </button>
          {createAccount.error && (
            <p className="text-sm text-destructive mt-3">
              {createAccount.error.message}
            </p>
          )}
        </div>
      )}

      {/* Onboarding Incomplete */}
      {status === "onboarding_incomplete" && (
        <div className="bg-card border border-border rounded-xl p-8 text-center mb-6">
          <div className="w-14 h-14 status-warning rounded-xl flex items-center justify-center mx-auto mb-4">
            <Clock className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Complete your payout setup
          </h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            You started the payout setup but didn&apos;t finish. Complete the
            process with Stripe to start receiving earnings.
          </p>
          <button
            onClick={() => createAccount.mutate()}
            disabled={createAccount.isPending}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {createAccount.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ArrowRight className="w-4 h-4" />
            )}
            Complete Setup
          </button>
          {createAccount.error && (
            <p className="text-sm text-destructive mt-3">
              {createAccount.error.message}
            </p>
          )}
        </div>
      )}

      {/* Pending (details submitted but not yet active) */}
      {status === "pending" && (
        <div className="bg-card border border-border rounded-xl p-8 text-center mb-6">
          <div className="w-14 h-14 status-warning rounded-xl flex items-center justify-center mx-auto mb-4">
            <Clock className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Account under review
          </h2>
          <p className="text-muted-foreground mb-4 max-w-md mx-auto">
            Stripe is reviewing your account. This usually takes a few minutes
            but can take up to a couple of days. You&apos;ll be able to receive
            payouts once approved.
          </p>
          <button
            onClick={() => refetchStatus()}
            className="text-sm text-primary hover:text-primary/80 transition-colors"
          >
            Check status
          </button>
        </div>
      )}

      {/* Active — Full Earnings Dashboard */}
      {status === "active" && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-card border border-border rounded-xl p-6">
              <p className="text-sm text-muted-foreground">Total Earnings</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                $
                {((payoutsData?.totalEarnings ?? 0) / 100).toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Your 60% share of hosting revenue
              </p>
            </div>
            <div className="bg-card border border-border rounded-xl p-6">
              <p className="text-sm text-muted-foreground">
                Recent Transfers
              </p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {payoutsData?.transfers.length ?? 0}
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Last 20 transfers
              </p>
            </div>
            <div className="bg-card border border-border rounded-xl p-6">
              <p className="text-sm text-muted-foreground">Payout Status</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <p className="text-lg font-semibold text-foreground">Active</p>
              </div>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Payouts enabled
              </p>
            </div>
          </div>

          {/* Payout Account */}
          <div className="bg-card border border-border rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Payout Account
            </h2>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-foreground font-medium">
                    Stripe Connected
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Charges &amp; payouts enabled
                  </p>
                </div>
              </div>
              <button
                onClick={() => createDashboardLink.mutate()}
                disabled={createDashboardLink.isPending}
                className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
              >
                {createDashboardLink.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ExternalLink className="w-4 h-4" />
                )}
                Open Stripe Dashboard
              </button>
            </div>
            {createDashboardLink.error && (
              <p className="text-sm text-destructive mt-3">
                {createDashboardLink.error.message}
              </p>
            )}
          </div>

          {/* Recent Transfers */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Recent Transfers
            </h2>
            {payoutsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : !payoutsData?.transfers.length ? (
              <p className="text-muted-foreground">
                No transfers yet. You&apos;ll see payouts here once users deploy
                agents on your machines.
              </p>
            ) : (
              <div className="space-y-3">
                {payoutsData.transfers.map((transfer) => (
                  <div
                    key={transfer.id}
                    className="flex items-center justify-between py-3 border-b border-border last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {transfer.description || "Agent hosting payout"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(transfer.created * 1000).toLocaleDateString(
                          undefined,
                          {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          }
                        )}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      +$
                      {(transfer.amount / 100).toFixed(2)}{" "}
                      <span className="text-muted-foreground font-normal uppercase">
                        {transfer.currency}
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function EarningsPage() {
  return (
    <Suspense
      fallback={
        <div>
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground">Earnings</h1>
            <p className="text-muted-foreground mt-1">
              Track your hosting earnings
            </p>
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-card border border-border rounded-xl p-6 h-32 animate-pulse"
              />
            ))}
          </div>
        </div>
      }
    >
      <EarningsContent />
    </Suspense>
  );
}
