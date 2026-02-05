"use client";

import { useSession } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc";
import Link from "next/link";
import { Server, Cpu, DollarSign, Clock, Plus, ArrowRight } from "lucide-react";

function StatCard({
  label,
  value,
  icon: Icon,
  sublabel,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  sublabel?: string;
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-zinc-400">{label}</p>
          <p className="text-2xl font-semibold text-white mt-1">{value}</p>
          {sublabel && <p className="text-xs text-zinc-500 mt-1">{sublabel}</p>}
        </div>
        <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center">
          <Icon className="w-5 h-5 text-emerald-400" />
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    running: "bg-emerald-500/10 text-emerald-400",
    active: "bg-emerald-500/10 text-emerald-400",
    online: "bg-emerald-500/10 text-emerald-400",
    stopped: "bg-zinc-500/10 text-zinc-400",
    offline: "bg-zinc-500/10 text-zinc-400",
    inactive: "bg-zinc-500/10 text-zinc-400",
    pending: "bg-yellow-500/10 text-yellow-400",
    deploying: "bg-blue-500/10 text-blue-400",
    failed: "bg-red-500/10 text-red-400",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
        colors[status] || colors.pending
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          status === "running" || status === "active" || status === "online"
            ? "bg-emerald-400"
            : status === "stopped" || status === "offline" || status === "inactive"
            ? "bg-zinc-400"
            : status === "pending" || status === "deploying"
            ? "bg-yellow-400"
            : "bg-red-400"
        }`}
      />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  actionHref,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  action: string;
  actionHref: string;
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
      <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center mx-auto mb-4">
        <Icon className="w-6 h-6 text-zinc-500" />
      </div>
      <h3 className="text-lg font-medium text-white mb-2">{title}</h3>
      <p className="text-sm text-zinc-400 mb-6 max-w-sm mx-auto">{description}</p>
      <Link
        href={actionHref}
        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-black font-medium rounded-lg transition-colors"
      >
        <Plus className="w-4 h-4" />
        {action}
      </Link>
    </div>
  );
}

function UserDashboard() {
  const { data: agents, isLoading: agentsLoading } = trpc.agents.list.useQuery();
  
  const activeAgents = agents?.filter((a) => a.status === "running").length || 0;
  const totalCost = agents?.reduce((sum, a) => {
    // TODO: Calculate from actual subscriptions
    return sum;
  }, 0) || 0;

  if (agentsLoading) {
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
        />
        <StatCard
          label="Avg Uptime"
          value="99.9%"
          icon={Clock}
        />
      </div>

      {/* Agents list */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Your Agents</h2>
          <Link
            href="/dashboard/agents/new"
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-black text-sm font-medium rounded-lg transition-colors"
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
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left text-xs font-medium text-zinc-400 uppercase tracking-wider px-6 py-3">
                    Agent
                  </th>
                  <th className="text-left text-xs font-medium text-zinc-400 uppercase tracking-wider px-6 py-3">
                    Status
                  </th>
                  <th className="text-left text-xs font-medium text-zinc-400 uppercase tracking-wider px-6 py-3">
                    Host
                  </th>
                  <th className="text-right text-xs font-medium text-zinc-400 uppercase tracking-wider px-6 py-3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {agents.map((agent) => (
                  <tr key={agent.id} className="hover:bg-zinc-800/50">
                    <td className="px-6 py-4">
                      <span className="text-white font-medium">{agent.name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={agent.status} />
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-400">
                      {(agent as any).host?.name || "—"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/dashboard/agents/${agent.id}`}
                        className="text-sm text-emerald-400 hover:text-emerald-300"
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

function HostDashboard() {
  const { data: hosts, isLoading: hostsLoading } = trpc.hosts.list.useQuery();
  
  const activeMachines = hosts?.filter((h) => h.status === "active").length || 0;
  const totalEarnings = hosts?.reduce((sum, h) => sum + (h.totalEarnings || 0), 0) || 0;

  if (hostsLoading) {
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

export default function DashboardPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role || "user";

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          Welcome back{session?.user?.name ? `, ${session.user.name.split(" ")[0]}` : ""}
        </h1>
        <p className="text-zinc-400 mt-1">
          {userRole === "host"
            ? "Manage your machines and track earnings"
            : "Deploy and monitor your AI agents"}
        </p>
      </div>

      {userRole === "host" ? <HostDashboard /> : <UserDashboard />}
    </div>
  );
}
