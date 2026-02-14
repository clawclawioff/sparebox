"use client";

import { trpc } from "@/lib/trpc";
import Link from "next/link";
import { Server, DollarSign, Cpu, Plus, ArrowRight } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { Card } from "@/components/ui/card";

interface HostDashboardProps {
  userId: string;
}

function formatRelativeTime(date: Date | string | null): string {
  if (!date) return "never";
  const ms = Date.now() - new Date(date).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function HostDashboard({ userId }: HostDashboardProps) {
  const { data: hosts, isLoading } = trpc.hosts.list.useQuery();

  const activeMachines = hosts?.filter((h) => h.status === "active").length || 0;

  // Count total hosted agents across all machines
  const totalHostedAgents = hosts?.reduce(
    (sum, h) => sum + (h.agents?.length || 0),
    0
  ) || 0;

  // Sum earnings from subscription-linked agents (hostPayoutPerMonth from getStats)
  // For the overview, we show per-tier pricing info from the hosts list
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
          value={totalHostedAgents}
          icon={Cpu}
          sublabel={`across ${hosts?.length || 0} machine${(hosts?.length || 0) !== 1 ? "s" : ""}`}
        />
      </div>

      {/* Machines list */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Your Machines</h2>
          <Link
            href="/dashboard/hosts/new"
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-lg transition-colors"
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
                className="bg-card border border-border rounded-xl p-6"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={host.status} />
                      <h3 className="font-medium text-foreground">{host.name}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      {host.cpuCores ? `${host.cpuCores} cores` : "Specs pending"} • {host.ramGb ? `${host.ramGb}GB RAM` : ""} • {host.city || host.region || "Unknown location"}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground/70 flex-wrap">
                      <span>{host.agents?.length || 0} agent{(host.agents?.length || 0) !== 1 ? "s" : ""}</span>
                      <span>•</span>
                      {/* Show per-tier pricing if available */}
                      <span className="text-primary font-medium">
                        {[
                          host.priceLite && `Lite: $${(host.priceLite / 100).toFixed(0)}`,
                          host.priceStandard && `Std: $${(host.priceStandard / 100).toFixed(0)}`,
                          host.pricePro && `Pro: $${(host.pricePro / 100).toFixed(0)}`,
                          host.priceCompute && `Compute: $${(host.priceCompute / 100).toFixed(0)}`,
                        ]
                          .filter(Boolean)
                          .join(" | ") || `$${((host.pricePerMonth || 0) / 100).toFixed(2)}/mo`}
                      </span>
                      <span>•</span>
                      <span>Last heartbeat: {formatRelativeTime(host.lastHeartbeat)}</span>
                    </div>
                  </div>
                  <Link
                    href={`/dashboard/hosts/${host.id}`}
                    className="text-sm text-primary hover:text-primary/80 flex items-center gap-1"
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
          <div key={i} className="bg-card border border-border rounded-xl p-6 h-24" />
        ))}
      </div>
      <div className="bg-card border border-border rounded-xl h-64" />
    </div>
  );
}
