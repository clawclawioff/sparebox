"use client";

import { DollarSign, ExternalLink } from "lucide-react";

export default function EarningsPage() {
  const isStripeConnected = false; // TODO: Check from user data

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Earnings</h1>
        <p className="text-muted-foreground mt-1">Track your hosting earnings</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-card border border-border rounded-xl p-6">
          <p className="text-sm text-muted-foreground">This Month</p>
          <p className="text-2xl font-bold text-foreground mt-1">$0.00</p>
          <p className="text-xs text-muted-foreground/70 mt-1">0 agents hosted</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-6">
          <p className="text-sm text-muted-foreground">Total Earnings</p>
          <p className="text-2xl font-bold text-foreground mt-1">$0.00</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Since you joined</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-6">
          <p className="text-sm text-muted-foreground">Next Payout</p>
          <p className="text-2xl font-bold text-foreground mt-1">$0.00</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Feb 15, 2026</p>
        </div>
      </div>

      {/* Payout Account */}
      <div className="bg-card border border-border rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Payout Account</h2>

        {isStripeConnected ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-foreground font-medium">Stripe Connected</p>
                <p className="text-sm text-muted-foreground">Bank account: ****4567</p>
              </div>
            </div>
            <button className="text-sm text-primary hover:text-primary/80 transition-colors">
              Manage Account
            </button>
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="w-12 h-12 status-warning rounded-xl flex items-center justify-center mx-auto mb-4">
              <DollarSign className="w-6 h-6" />
            </div>
            <p className="text-foreground font-medium mb-2">
              Payout account not set up
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Connect your bank account to receive earnings
            </p>
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors">
              Set Up Payouts
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Earnings by Machine */}
      <div className="bg-card border border-border rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Earnings by Machine
        </h2>
        <p className="text-muted-foreground">No machines registered yet</p>
      </div>

      {/* Payout History */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Payout History</h2>
        <p className="text-muted-foreground">No payouts yet</p>
      </div>
    </div>
  );
}
