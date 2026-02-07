"use client";

import { trpc } from "@/lib/trpc";
import { CreditCard, Plus, Server, AlertCircle } from "lucide-react";

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "bg-green-500/10 text-green-600",
    canceled: "bg-muted text-muted-foreground",
    past_due: "bg-yellow-500/10 text-yellow-600",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        colors[status] || colors.active
      }`}
    >
      {status.replace("_", " ").charAt(0).toUpperCase() + status.slice(1).replace("_", " ")}
    </span>
  );
}

export default function BillingPage() {
  const { data: subscriptions, isLoading } = trpc.billing.getMySubscriptions.useQuery();

  const activeSubscriptions = subscriptions?.filter((s) => s.status === "active") || [];
  const canceledSubscriptions = subscriptions?.filter((s) => s.status === "canceled") || [];
  const pastDueSubscriptions = subscriptions?.filter((s) => s.status === "past_due") || [];

  const totalMonthlySpend = activeSubscriptions.reduce(
    (sum, s) => sum + s.pricePerMonth,
    0
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Billing</h1>
        <p className="text-muted-foreground mt-1">
          Manage your payment methods and subscriptions
        </p>
      </div>

      {/* Current Month */}
      <div className="bg-card border border-border rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Current Month</h2>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-foreground">
            ${(totalMonthlySpend / 100).toFixed(2)}
          </span>
          <span className="text-muted-foreground">
            {activeSubscriptions.length} active subscription{activeSubscriptions.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Past Due Warning */}
      {pastDueSubscriptions.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-yellow-600">Payment Past Due</p>
            <p className="text-sm text-yellow-600/80">
              {pastDueSubscriptions.length} subscription{pastDueSubscriptions.length !== 1 ? "s" : ""} have failed payments. 
              Please update your payment method to avoid service interruption.
            </p>
          </div>
        </div>
      )}

      {/* Payment Methods */}
      <div className="bg-card border border-border rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Payment Methods</h2>
          <button className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-primary hover:text-primary/80 transition-colors">
            <Plus className="w-4 h-4" />
            Add New
          </button>
        </div>
        
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center mx-auto mb-4">
            <CreditCard className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">Payment methods managed via Stripe</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Payment info is collected securely at checkout
          </p>
        </div>
      </div>

      {/* Active Subscriptions */}
      <div className="bg-card border border-border rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Active Subscriptions</h2>
        
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : activeSubscriptions.length === 0 ? (
          <p className="text-muted-foreground">No active subscriptions</p>
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
                    <p className="font-medium text-foreground">{sub.agent?.name || "Unknown Agent"}</p>
                    <p className="text-sm text-muted-foreground">
                      {sub.host?.name || "Unknown Host"} • {sub.host?.region || "Unknown Region"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-foreground">
                    ${(sub.pricePerMonth / 100).toFixed(2)}/mo
                  </p>
                  <StatusBadge status={sub.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Past Due Subscriptions */}
      {pastDueSubscriptions.length > 0 && (
        <div className="bg-card border border-yellow-500/30 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Past Due</h2>
          <div className="space-y-3">
            {pastDueSubscriptions.map((sub) => (
              <div
                key={sub.id}
                className="flex items-center justify-between p-4 bg-yellow-500/5 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-yellow-500/10 rounded-lg flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{sub.agent?.name || "Unknown Agent"}</p>
                    <p className="text-sm text-muted-foreground">
                      {sub.host?.name || "Unknown Host"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-foreground">
                    ${(sub.pricePerMonth / 100).toFixed(2)}/mo
                  </p>
                  <StatusBadge status={sub.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Canceled Subscriptions */}
      {canceledSubscriptions.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Canceled</h2>
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
                    <p className="font-medium text-foreground">{sub.agent?.name || "Unknown Agent"}</p>
                    <p className="text-sm text-muted-foreground">
                      Canceled {sub.canceledAt ? new Date(sub.canceledAt).toLocaleDateString() : ""}
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

      {/* Billing History */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Billing History</h2>
          <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Download All
          </button>
        </div>
        <p className="text-muted-foreground">
          Billing history will appear here after your first payment
        </p>
      </div>
    </div>
  );
}
