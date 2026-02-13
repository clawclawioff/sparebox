"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  CreditCard,
  Receipt,
  XCircle,
  ExternalLink,
  Download,
  Server,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Status Badge                                                       */
/* ------------------------------------------------------------------ */
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "bg-green-500/10 text-green-600",
    canceled: "bg-muted text-muted-foreground",
    past_due: "bg-yellow-500/10 text-yellow-600",
    trialing: "bg-blue-500/10 text-blue-600",
    paid: "bg-green-500/10 text-green-600",
    open: "bg-yellow-500/10 text-yellow-600",
    void: "bg-muted text-muted-foreground",
    draft: "bg-muted text-muted-foreground",
    uncollectible: "bg-red-500/10 text-red-600",
  };

  const label = status.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        colors[status] || "bg-muted text-muted-foreground"
      }`}
    >
      {label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Cancel Confirmation Dialog                                         */
/* ------------------------------------------------------------------ */
function CancelDialog({
  agentName,
  isOpen,
  isPending,
  onConfirm,
  onCancel,
}: {
  agentName: string;
  isOpen: boolean;
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      {/* Dialog */}
      <div className="relative bg-card border border-border rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center">
            <XCircle className="w-5 h-5 text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">
            Cancel Subscription
          </h3>
        </div>

        <p className="text-muted-foreground mb-6">
          Are you sure you want to cancel? Your agent{" "}
          <span className="font-medium text-foreground">{agentName}</span>{" "}
          will be stopped immediately and you will lose access at the end of the
          current billing period.
        </p>

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isPending}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Keep Subscription
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {isPending ? "Canceling…" : "Yes, Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */
export default function BillingPage() {
  const utils = trpc.useUtils();

  // Queries
  const { data: subscriptions, isLoading: subsLoading } =
    trpc.billing.getMySubscriptions.useQuery();
  const { data: invoices, isLoading: invoicesLoading } =
    trpc.billing.getInvoices.useQuery();

  // Mutations
  const cancelMutation = trpc.billing.cancelSubscription.useMutation({
    onSuccess: () => {
      utils.billing.getMySubscriptions.invalidate();
      setCancelTarget(null);
    },
  });
  const portalMutation = trpc.billing.createPortalSession.useMutation({
    onSuccess: (data) => {
      window.location.href = data.url;
    },
  });

  // Cancel dialog state
  const [cancelTarget, setCancelTarget] = useState<{
    id: string;
    agentName: string;
  } | null>(null);

  // Derived data
  const activeSubscriptions =
    subscriptions?.filter((s) => s.status === "active" || s.status === "past_due") || [];
  const canceledSubscriptions =
    subscriptions?.filter((s) => s.status === "canceled") || [];

  const totalMonthlySpend = activeSubscriptions.reduce(
    (sum, s) => sum + s.pricePerMonth,
    0
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Billing &amp; Subscriptions
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your subscriptions, payment methods, and invoices
          </p>
        </div>
        <button
          onClick={() => portalMutation.mutate()}
          disabled={portalMutation.isPending}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {portalMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CreditCard className="w-4 h-4" />
          )}
          Manage Payment Methods
        </button>
      </div>

      {/* Monthly Spend Summary */}
      <div className="bg-card border border-border rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Current Month
        </h2>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-foreground">
            ${(totalMonthlySpend / 100).toFixed(2)}
          </span>
          <span className="text-muted-foreground">
            {activeSubscriptions.length} active subscription
            {activeSubscriptions.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Past Due Warning */}
      {activeSubscriptions.some((s) => s.status === "past_due") && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-yellow-600">Payment Past Due</p>
            <p className="text-sm text-yellow-600/80">
              One or more subscriptions have failed payments. Please update your
              payment method to avoid service interruption.
            </p>
          </div>
        </div>
      )}

      {/* Portal error */}
      {portalMutation.isError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-500">
            {portalMutation.error.message}
          </p>
        </div>
      )}

      {/* Cancel success notice */}
      {cancelMutation.isSuccess && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-6 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-600">
            Subscription canceled successfully. Your agent has been stopped.
          </p>
        </div>
      )}

      {/* ------------------------------------------------------------ */}
      {/*  Active Subscriptions                                         */}
      {/* ------------------------------------------------------------ */}
      <div className="bg-card border border-border rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Active Subscriptions
        </h2>

        {subsLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : activeSubscriptions.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center mx-auto mb-4">
              <Server className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No active subscriptions</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Deploy an agent to get started
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeSubscriptions.map((sub) => (
              <div
                key={sub.id}
                className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Server className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {sub.agent?.name || "Unknown Agent"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {sub.host?.name || "Unknown Host"} •{" "}
                      {sub.host?.region || "Unknown Region"}
                    </p>
                    {sub.currentPeriodEnd && (
                      <p className="text-xs text-muted-foreground/70 mt-0.5">
                        Next billing:{" "}
                        {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-semibold text-foreground">
                      ${(sub.pricePerMonth / 100).toFixed(2)}/mo
                    </p>
                    <StatusBadge status={sub.status} />
                  </div>
                  <button
                    onClick={() =>
                      setCancelTarget({
                        id: sub.id,
                        agentName: sub.agent?.name || "Unknown Agent",
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Cancel subscription"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Cancel
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------ */}
      {/*  Canceled Subscriptions                                       */}
      {/* ------------------------------------------------------------ */}
      {canceledSubscriptions.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Canceled
          </h2>
          <div className="space-y-3">
            {canceledSubscriptions.map((sub) => (
              <div
                key={sub.id}
                className="flex items-center justify-between p-4 bg-muted/30 rounded-lg opacity-60"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                    <Server className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {sub.agent?.name || "Unknown Agent"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Canceled{" "}
                      {sub.canceledAt
                        ? new Date(sub.canceledAt).toLocaleDateString()
                        : ""}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-muted-foreground line-through">
                    ${(sub.pricePerMonth / 100).toFixed(2)}/mo
                  </p>
                  <StatusBadge status={sub.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------ */}
      {/*  Invoice History                                              */}
      {/* ------------------------------------------------------------ */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Receipt className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">
            Invoice History
          </h2>
        </div>

        {invoicesLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : !invoices || invoices.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center mx-auto mb-4">
              <Receipt className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No invoices yet</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Invoices will appear here after your first payment
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider pb-3">
                    Date
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider pb-3">
                    Description
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider pb-3">
                    Amount
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider pb-3">
                    Status
                  </th>
                  <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider pb-3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="group">
                    <td className="py-3 text-sm text-foreground">
                      {new Date(inv.created * 1000).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-sm text-muted-foreground max-w-xs truncate">
                      {inv.description || "Subscription"}
                    </td>
                    <td className="py-3 text-sm font-medium text-foreground">
                      ${(inv.amountPaid / 100).toFixed(2)}
                    </td>
                    <td className="py-3">
                      <StatusBadge status={inv.status || "unknown"} />
                    </td>
                    <td className="py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        {inv.invoicePdf && (
                          <a
                            href={inv.invoicePdf}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            title="Download PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                            PDF
                          </a>
                        )}
                        {inv.hostedInvoiceUrl && (
                          <a
                            href={inv.hostedInvoiceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            title="View invoice"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            View
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cancel Confirmation Dialog */}
      <CancelDialog
        agentName={cancelTarget?.agentName || ""}
        isOpen={cancelTarget !== null}
        isPending={cancelMutation.isPending}
        onConfirm={() => {
          if (cancelTarget) {
            cancelMutation.mutate({ subscriptionId: cancelTarget.id });
          }
        }}
        onCancel={() => setCancelTarget(null)}
      />
    </div>
  );
}
