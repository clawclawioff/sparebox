"use client";

import { trpc } from "@/lib/trpc";
import Link from "next/link";
import { Server, DollarSign, Cpu, Plus, ArrowRight } from "lucide-react";
import { StatCard } from "./stat-card";
import { StatusBadge } from "./status-badge";
import { EmptyState } from "./empty-state";

interface HostDashboardProps {
  userId: string;
}

export function HostDashboard({ userId }: HostDashboardProps) {
  const { data: hosts, isLoading } = trpc.hosts.list.useQuery();

  const activeMachines = hosts?.filter((h) => h.status === "active").length || 0;
  const totalEarnings = hosts?.reduce((sum, h) => sum + (h.totalEarnings || 0), 0) || 0;

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Active Machines"
          value={activeMachines}
          icon={Server}
          sublabel={`${hosts?.length || 0} total`}
        />
        <StatCard
          label="Earnings (MTD)"
          value={`$${(totalEarnings / 100).toFixed(2)}`}
          icon={DollarSign}
        />
        <StatCard
          label="Hosted Agents"
          value="0"
          icon={Cpu}
        />
      </div>

      {/* Machines list */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Your Machines</h2>
          <Link
            href="/dashboard/hosts/new"
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-black text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Machine
          </Link>
        </div>

        {!hosts || hosts.length === 0 ? (
          <EmptyState
            icon={Server}
            title="No machines registered yet"
            description="Add your first machine to start earning. You'll need to install our lightweight agent software to get started."
            action="Add Machine"
            actionHref="/dashboard/hosts/new"
          />
        ) : (
          <div className="grid gap-4">
            {hosts.map((host) => (
              <div
                key={host.id}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-6"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={host.status} />
                      <h3 className="font-medium text-white">{host.name}</h3>
                    </div>
                    <p className="text-sm text-zinc-400 mt-2">
                      {host.cpuCores} cores • {host.ramGb}GB RAM • {host.city || host.region || "Unknown location"}
                    </p>
                    <p className="text-sm text-zinc-500 mt-1">
                      ${((host.pricePerMonth || 0) / 100).toFixed(2)}/mo • Last heartbeat: {host.lastHeartbeat ? "just now" : "never"}
                    </p>
                  </div>
                  <Link
                    href={`/dashboard/hosts/${host.id}`}
                    className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                  >
                    Manage
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 h-24" />
        ))}
      </div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl h-64" />
    </div>
  );
}
