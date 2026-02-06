"use client";

import { CreditCard, Plus } from "lucide-react";

export default function BillingPage() {
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
          <span className="text-3xl font-bold text-foreground">$0.00</span>
          <span className="text-muted-foreground">0 active subscriptions</span>
        </div>
      </div>

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
          <p className="text-muted-foreground">No payment methods added yet</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Add a payment method to deploy agents
          </p>
        </div>
      </div>

      {/* Active Subscriptions */}
      <div className="bg-card border border-border rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Active Subscriptions</h2>
        <p className="text-muted-foreground">No active subscriptions</p>
      </div>

      {/* Billing History */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Billing History</h2>
          <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Download All
          </button>
        </div>
        <p className="text-muted-foreground">No billing history yet</p>
      </div>
    </div>
  );
}
