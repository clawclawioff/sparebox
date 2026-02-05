"use client";

import { trpc } from "@/lib/trpc";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Play,
  Square,
  Trash2,
  Clock,
  Server,
  DollarSign,
  Copy,
  ExternalLink,
} from "lucide-react";
import { useState } from "react";

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    running: "bg-emerald-500/10 text-emerald-400",
    stopped: "bg-zinc-500/10 text-zinc-400",
    pending: "bg-yellow-500/10 text-yellow-400",
    deploying: "bg-blue-500/10 text-blue-400",
    failed: "bg-red-500/10 text-red-400",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium ${
        colors[status] || colors.pending
      }`}
    >
      <span
        className={`w-2 h-2 rounded-full ${
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

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
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
        </div>
      </div>
    </div>
  );
}

export default function AgentDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"overview" | "logs" | "config">(
    "overview"
  );

  const { data: agent, isLoading, refetch } = trpc.agents.get.useQuery({
    id: params.id,
  });

  const stopAgent = trpc.agents.stop.useMutation({ onSuccess: () => refetch() });
  const startAgent = trpc.agents.start.useMutation({
    onSuccess: () => refetch(),
  });
  const deleteAgent = trpc.agents.delete.useMutation({
    onSuccess: () => router.push("/dashboard/agents"),
  });

  const handleStop = async () => {
    if (confirm("Are you sure you want to stop this agent?")) {
      await stopAgent.mutateAsync({ id: params.id });
    }
  };

  const handleStart = async () => {
    await startAgent.mutateAsync({ id: params.id });
  };

  const handleDelete = async () => {
    if (
      confirm(
        "Are you sure you want to delete this agent? This cannot be undone."
      )
    ) {
      await deleteAgent.mutateAsync({ id: params.id });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
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

  if (!agent) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-400">Agent not found</p>
        <Link
          href="/dashboard/agents"
          className="text-emerald-400 hover:underline mt-2 inline-block"
        >
          Back to agents
        </Link>
      </div>
    );
  }

  const host = (agent as any).host;
  const gatewayUrl = `wss://${agent.id.slice(0, 8)}.sparebox.dev`;
  const dashboardUrl = `https://${agent.id.slice(0, 8)}.sparebox.dev/dashboard`;

  return (
    <div>
      <Link
        href="/dashboard/agents"
        className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Agents
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{agent.name}</h1>
            <StatusBadge status={agent.status} />
          </div>
          <p className="text-zinc-400 mt-1">
            {agent.lastActive
              ? `Last active ${new Date(agent.lastActive).toLocaleString()}`
              : "Never active"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {agent.status === "running" ? (
            <button
              onClick={handleStop}
              disabled={stopAgent.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
            >
              <Square className="w-4 h-4" />
              Stop
            </button>
          ) : agent.status === "stopped" ? (
            <button
              onClick={handleStart}
              disabled={startAgent.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-black font-medium rounded-lg transition-colors"
            >
              <Play className="w-4 h-4" />
              Start
            </button>
          ) : null}

          <button
            onClick={handleDelete}
            disabled={deleteAgent.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard
          label="Uptime"
          value="99.9%"
          icon={Clock}
        />
        <StatCard
          label="Total Runtime"
          value={`${Math.round((agent.totalUptime || 0) / 3600)}h`}
          icon={Server}
        />
        <StatCard
          label="Monthly Cost"
          value="$12.00"
          icon={DollarSign}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6">
        {(["overview", "logs", "config"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === tab
                ? "bg-zinc-800 text-white"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Machine Info */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="font-semibold text-white mb-4">Host Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-zinc-400">Host</span>
                <p className="text-white">{host?.name || "—"}</p>
              </div>
              <div>
                <span className="text-zinc-400">Location</span>
                <p className="text-white">
                  {host?.city || host?.region || "Unknown"}
                </p>
              </div>
              <div>
                <span className="text-zinc-400">Started</span>
                <p className="text-white">
                  {new Date(agent.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div>
                <span className="text-zinc-400">Version</span>
                <p className="text-white">{(agent as any).openclawVersion || "latest"}</p>
              </div>
            </div>
          </div>

          {/* Connection Info */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="font-semibold text-white mb-4">Connection</h3>
            <div className="space-y-4">
              <div>
                <span className="text-sm text-zinc-400">Gateway URL</span>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 bg-zinc-800 px-3 py-2 rounded-lg text-sm text-emerald-400 font-mono">
                    {gatewayUrl}
                  </code>
                  <button
                    onClick={() => copyToClipboard(gatewayUrl)}
                    className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div>
                <span className="text-sm text-zinc-400">Dashboard</span>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 bg-zinc-800 px-3 py-2 rounded-lg text-sm text-emerald-400 font-mono">
                    {dashboardUrl}
                  </code>
                  <a
                    href={dashboardUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "logs" && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">Logs (Last 100 lines)</h3>
            <button className="text-sm text-emerald-400 hover:underline">
              Download Full
            </button>
          </div>
          <div className="bg-zinc-950 rounded-lg p-4 font-mono text-xs text-zinc-400 h-80 overflow-y-auto">
            <p className="text-zinc-500">
              Logs will appear here when the agent is running...
            </p>
            {/* TODO: Implement real-time logs */}
          </div>
        </div>
      )}

      {activeTab === "config" && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">Configuration</h3>
            <button className="text-sm text-emerald-400 hover:underline">
              Edit
            </button>
          </div>
          <div className="bg-zinc-950 rounded-lg p-4 font-mono text-xs text-zinc-300 h-80 overflow-y-auto">
            <pre>
              {agent.config ||
                `# openclaw.yaml
auth:
  provider: anthropic
  apiKey: $ANTHROPIC_API_KEY
channels:
  telegram:
    enabled: true
    botToken: $TELEGRAM_BOT_TOKEN
`}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
