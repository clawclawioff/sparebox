"use client";

import { trpc } from "@/lib/trpc";
import Link from "next/link";
import { Cpu, DollarSign, Clock, Plus } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface UserDashboardProps {
  userId: string;
}

export function UserDashboard({ userId }: UserDashboardProps) {
  const { data: agents, isLoading } = trpc.agents.list.useQuery();
  const { data: subscriptions } = trpc.billing.getMySubscriptions.useQuery();

  const activeAgents = agents?.filter((a) => a.status === "running").length || 0;
  
  // Calculate from actual active subscriptions
  const activeSubs = subscriptions?.filter((s) => s.status === "active" || s.status === "past_due") || [];
  const totalCost = activeSubs.reduce((sum, s) => sum + s.pricePerMonth, 0);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Active Agents"
          value={activeAgents}
          icon={Cpu}
          sublabel={`${agents?.length || 0} total`}
        />
        <StatCard
          label="Monthly Cost"
          value={`$${(totalCost / 100).toFixed(2)}`}
          icon={DollarSign}
          sublabel={`${activeSubs.length} subscription${activeSubs.length !== 1 ? "s" : ""}`}
        />
        <StatCard
          label="Total Agents"
          value={agents?.length || 0}
          icon={Clock}
          sublabel={`${activeAgents} running`}
        />
      </div>

      {/* Agents list */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Your Agents</h2>
          <Link
            href="/dashboard/agents/new"
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Deploy
          </Link>
        </div>

        {!agents || agents.length === 0 ? (
          <EmptyState
            icon={Cpu}
            title="No agents deployed yet"
            description="Deploy your first AI agent to get started. Browse available hosts and pick one that fits your needs."
            action="Browse Hosts"
            actionHref="/dashboard/browse"
          />
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                    Agent
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                    Status
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                    Host
                  </th>
                  <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {agents.map((agent) => (
                  <tr key={agent.id} className="hover:bg-muted/50">
                    <td className="px-6 py-4">
                      <span className="text-foreground font-medium">{agent.name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={agent.status} />
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {(agent as any).host?.name || "—"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/dashboard/agents/${agent.id}`}
                        className="text-sm text-primary hover:text-primary/80"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
