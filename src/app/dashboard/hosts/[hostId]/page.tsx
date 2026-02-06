"use client";

import { trpc } from "@/lib/trpc";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { use, useState } from "react";
import {
  ArrowLeft,
  Server,
  DollarSign,
  Activity,
  Cpu,
  HardDrive,
  MemoryStick,
  MapPin,
  Calendar,
  Pencil,
  Trash2,
  Bot,
} from "lucide-react";

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "bg-emerald-500/10 text-emerald-400",
    pending: "bg-yellow-500/10 text-yellow-400",
    inactive: "bg-zinc-500/10 text-zinc-400",
    suspended: "bg-red-500/10 text-red-400",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium ${
        colors[status] || colors.pending
      }`}
    >
      <span
        className={`w-2 h-2 rounded-full ${
          status === "active"
            ? "bg-emerald-400"
            : status === "pending"
            ? "bg-yellow-400"
            : status === "inactive"
            ? "bg-zinc-400"
            : "bg-red-400"
        }`}
      />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function StatCard({
  label,
  value,
  sublabel,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  sublabel?: string;
  icon: React.ElementType;
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center">
          <Icon className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <p className="text-xs text-zinc-400">{label}</p>
          <p className="text-lg font-semibold text-white">{value}</p>
          {sublabel && (
            <p className="text-xs text-zinc-500">{sublabel}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function UsageBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-zinc-400">{label}</span>
        <span className="text-white font-medium">{value.toFixed(1)}%</span>
      </div>
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
    </div>
  );
}

function AgentStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    running: "text-emerald-400",
    stopped: "text-zinc-400",
    pending: "text-yellow-400",
    deploying: "text-blue-400",
    failed: "text-red-400",
  };

  return (
    <span className={`inline-flex items-center gap-1.5 text-sm ${colors[status] || colors.pending}`}>
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          status === "running"
            ? "bg-emerald-400"
            : status === "stopped"
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

export default function HostDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const hostId = params.hostId as string;

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", description: "", pricePerMonth: 0 });

  const { data: host, isLoading, refetch } = trpc.hosts.get.useQuery({ id: hostId });
  const { data: stats } = trpc.hosts.getStats.useQuery({ id: hostId }, { enabled: !!host });
  const { data: metrics } = trpc.hosts.getMetrics.useQuery({ id: hostId }, { enabled: !!host });

  const updateHost = trpc.hosts.update.useMutation({
    onSuccess: () => {
      refetch();
      setIsEditing(false);
    },
  });

  const deleteHost = trpc.hosts.delete.useMutation({
    onSuccess: () => router.push("/dashboard/hosts"),
  });

  const handleDelete = async () => {
    if (stats && stats.hostedAgentCount > 0) {
      alert("This machine has active agents. Please wait for them to be migrated before deleting.");
      return;
    }
    if (confirm("Are you sure you want to delete this machine? This cannot be undone.")) {
      await deleteHost.mutateAsync({ id: hostId });
    }
  };

  const handleEdit = () => {
    if (host) {
      setEditForm({
        name: host.name,
        description: host.description || "",
        pricePerMonth: host.pricePerMonth || 1000,
      });
      setIsEditing(true);
    }
  };

  const handleSave = async () => {
    await updateHost.mutateAsync({
      id: hostId,
      name: editForm.name,
      description: editForm.description || undefined,
      pricePerMonth: editForm.pricePerMonth,
    });
  };

  const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  const formatDate = (date: Date | string) => new Date(date).toLocaleDateString();

  const getHeartbeatStatus = () => {
    if (!host?.lastHeartbeat) return { status: "Never connected", color: "text-zinc-500" };
    const lastBeat = new Date(host.lastHeartbeat);
    const minutesAgo = Math.floor((Date.now() - lastBeat.getTime()) / 60000);
    
    if (minutesAgo < 2) return { status: `${minutesAgo} min ago`, color: "text-emerald-400" };
    if (minutesAgo < 5) return { status: `${minutesAgo} min ago`, color: "text-yellow-400" };
    return { status: `${minutesAgo} min ago`, color: "text-red-400" };
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 bg-zinc-800 rounded" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-zinc-800 rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-zinc-800 rounded-xl" />
      </div>
    );
  }

  if (!host) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-400">Machine not found</p>
        <Link
          href="/dashboard/hosts"
          className="text-emerald-400 hover:underline mt-2 inline-block"
        >
          Back to machines
        </Link>
      </div>
    );
  }

  const heartbeat = getHeartbeatStatus();

  return (
    <div>
      <Link
        href="/dashboard/hosts"
        className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Machines
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3">
            {isEditing ? (
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="text-2xl font-bold bg-zinc-800 text-white px-3 py-1 rounded-lg border border-zinc-700 focus:border-emerald-500 focus:outline-none"
              />
            ) : (
              <h1 className="text-2xl font-bold text-white">{host.name}</h1>
            )}
            <StatusBadge status={host.status} />
          </div>
          <p className={`mt-1 ${heartbeat.color}`}>
            Last heartbeat: {heartbeat.status}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={updateHost.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-black font-medium rounded-lg transition-colors"
              >
                {updateHost.isPending ? "Saving..." : "Save"}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleEdit}
                className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
              >
                <Pencil className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteHost.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard
          label="Hosted Agents"
          value={stats?.hostedAgentCount || 0}
          icon={Bot}
        />
        <StatCard
          label="Earnings (This Month)"
          value={formatCurrency(stats?.monthlyEarnings || 0)}
          sublabel={`${formatCurrency(host.pricePerMonth || 0)}/mo × 60%`}
          icon={DollarSign}
        />
        <StatCard
          label="Uptime"
          value={`${(stats?.uptimePercent || 100).toFixed(1)}%`}
          icon={Activity}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Machine Info */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h3 className="font-semibold text-white mb-4">Machine Info</h3>
          <div className="space-y-4 text-sm">
            <div className="flex items-start gap-3">
              <Cpu className="w-4 h-4 text-zinc-500 mt-0.5" />
              <div>
                <span className="text-zinc-400">Specs</span>
                <p className="text-white">
                  {host.cpuCores || "—"} cores • {host.ramGb || "—"}GB RAM • {host.storageGb || "—"}GB Storage
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Server className="w-4 h-4 text-zinc-500 mt-0.5" />
              <div>
                <span className="text-zinc-400">Operating System</span>
                <p className="text-white">{host.osInfo || "Not specified"}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-zinc-500 mt-0.5" />
              <div>
                <span className="text-zinc-400">Location</span>
                <p className="text-white">
                  {[host.city, host.region, host.country].filter(Boolean).join(", ") || "Not specified"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <DollarSign className="w-4 h-4 text-zinc-500 mt-0.5" />
              <div>
                <span className="text-zinc-400">Price</span>
                {isEditing ? (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-zinc-400">$</span>
                    <input
                      type="number"
                      value={(editForm.pricePerMonth / 100).toFixed(2)}
                      onChange={(e) =>
                        setEditForm({ ...editForm, pricePerMonth: Math.round(parseFloat(e.target.value) * 100) })
                      }
                      className="w-24 bg-zinc-800 text-white px-2 py-1 rounded border border-zinc-700 focus:border-emerald-500 focus:outline-none"
                      step="0.01"
                      min="5"
                      max="100"
                    />
                    <span className="text-zinc-400">/month</span>
                  </div>
                ) : (
                  <p className="text-white">
                    {formatCurrency(host.pricePerMonth || 0)}/month{" "}
                    <span className="text-zinc-500">(you receive {formatCurrency((host.pricePerMonth || 0) * 0.6)})</span>
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar className="w-4 h-4 text-zinc-500 mt-0.5" />
              <div>
                <span className="text-zinc-400">Added</span>
                <p className="text-white">{formatDate(host.createdAt)}</p>
              </div>
            </div>
          </div>

          {isEditing && (
            <div className="mt-4 pt-4 border-t border-zinc-800">
              <label className="text-sm text-zinc-400">Description</label>
              <textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                className="w-full mt-1 bg-zinc-800 text-white px-3 py-2 rounded-lg border border-zinc-700 focus:border-emerald-500 focus:outline-none resize-none"
                rows={3}
                placeholder="A brief description of your machine..."
              />
            </div>
          )}
        </div>

        {/* System Metrics */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">System Metrics</h3>
            <span className="text-xs text-zinc-500">Last 24h</span>
          </div>
          
          {metrics?.latest ? (
            <div className="space-y-4">
              <UsageBar
                label="CPU Usage"
                value={metrics.latest.cpuUsage || 0}
                color="bg-emerald-500"
              />
              <UsageBar
                label="RAM Usage"
                value={metrics.latest.ramUsage || 0}
                color="bg-blue-500"
              />
              <UsageBar
                label="Disk Usage"
                value={metrics.latest.diskUsage || 0}
                color="bg-purple-500"
              />
              <div className="pt-2 border-t border-zinc-800">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">Active Agents</span>
                  <span className="text-white font-medium">{metrics.latest.agentCount || 0}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center mb-3">
                <Activity className="w-6 h-6 text-zinc-500" />
              </div>
              <p className="text-zinc-400 text-sm">No metrics available</p>
              <p className="text-zinc-500 text-xs mt-1">
                Metrics will appear once the host agent is installed and connected.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Hosted Agents */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h3 className="font-semibold text-white mb-4">Hosted Agents</h3>
        
        {stats?.agents && stats.agents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-zinc-400 border-b border-zinc-800">
                  <th className="pb-3 font-medium">Agent</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Started</th>
                  <th className="pb-3 font-medium text-right">Earnings</th>
                </tr>
              </thead>
              <tbody>
                {stats.agents.map((agent) => (
                  <tr key={agent.id} className="border-b border-zinc-800/50 last:border-0">
                    <td className="py-3">
                      <span className="text-white font-medium">{agent.name}</span>
                      <span className="text-zinc-500 text-xs ml-2">
                        {agent.id.slice(0, 8)}...
                      </span>
                    </td>
                    <td className="py-3">
                      <AgentStatusBadge status={agent.status} />
                    </td>
                    <td className="py-3 text-zinc-400">
                      {formatDate(agent.createdAt)}
                    </td>
                    <td className="py-3 text-right text-emerald-400 font-medium">
                      {formatCurrency((host.pricePerMonth || 0) * 0.6)}/mo
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Bot className="w-6 h-6 text-zinc-500" />
            </div>
            <p className="text-zinc-400">No agents hosted yet</p>
            <p className="text-zinc-500 text-xs mt-1">
              Agents will appear here when users deploy to this machine.
            </p>
          </div>
        )}
        
        <p className="text-xs text-zinc-500 mt-4 pt-4 border-t border-zinc-800">
          Note: Agent details are private to their owners. You can only see basic status information.
        </p>
      </div>
    </div>
  );
}
