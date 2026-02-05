"use client";

import { DollarSign, ExternalLink } from "lucide-react";

export default function EarningsPage() {
  const isStripeConnected = false; // TODO: Check from user data

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Earnings</h1>
        <p className="text-zinc-400 mt-1">Track your hosting earnings</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <p className="text-sm text-zinc-400">This Month</p>
          <p className="text-2xl font-bold text-white mt-1">$0.00</p>
          <p className="text-xs text-zinc-500 mt-1">0 agents hosted</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <p className="text-sm text-zinc-400">Total Earnings</p>
          <p className="text-2xl font-bold text-white mt-1">$0.00</p>
          <p className="text-xs text-zinc-500 mt-1">Since you joined</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <p className="text-sm text-zinc-400">Next Payout</p>
          <p className="text-2xl font-bold text-white mt-1">$0.00</p>
          <p className="text-xs text-zinc-500 mt-1">Feb 15, 2026</p>
        </div>
      </div>

      {/* Payout Account */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">Payout Account</h2>

        {isStripeConnected ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-white font-medium">Stripe Connected</p>
                <p className="text-sm text-zinc-400">Bank account: ****4567</p>
              </div>
            </div>
            <button className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors">
              Manage Account
            </button>
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="w-12 h-12 bg-yellow-500/10 rounded-xl flex items-center justify-center mx-auto mb-4">
              <DollarSign className="w-6 h-6 text-yellow-400" />
            </div>
            <p className="text-white font-medium mb-2">
              Payout account not set up
            </p>
            <p className="text-sm text-zinc-400 mb-4">
              Connect your bank account to receive earnings
            </p>
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-black font-medium rounded-lg transition-colors">
              Set Up Payouts
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Earnings by Machine */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          Earnings by Machine
        </h2>
        <p className="text-zinc-400">No machines registered yet</p>
      </div>

      {/* Payout History */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Payout History</h2>
        <p className="text-zinc-400">No payouts yet</p>
      </div>
    </div>
  );
}
