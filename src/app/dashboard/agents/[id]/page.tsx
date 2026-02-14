"use client";

import { trpc } from "@/lib/trpc";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Play,
  Square,
  RotateCw,
  Trash2,
  Clock,
  Server,
  DollarSign,
  Copy,
  Loader2,
  Cpu,
  MemoryStick,
} from "lucide-react";
import { useState } from "react";
import { TIERS, type TierKey } from "@/lib/constants";

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    running: "status-success",
    stopped: "bg-muted text-muted-foreground",
    pending: "status-warning",
    deploying: "bg-blue-500/10 text-blue-600",
    failed: "status-error",
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
            ? "bg-green-600"
            : status === "stopped"
            ? "bg-muted-foreground"
            : status === "pending" || status === "deploying"
            ? "bg-yellow-500"
            : "bg-destructive"
        }`}
      />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function TierBadge({ tier }: { tier: string | null | undefined }) {
  if (!tier) return null;

  const tierInfo = TIERS[tier as TierKey];
  if (!tierInfo) return null;

  const tierColors: Record<string, string> = {
    lite: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    standard: "bg-primary/10 text-primary border-primary/20",
    pro: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    compute: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
        tierColors[tier] || tierColors.standard
      }`}
    >
      {tierInfo.name} Tier
    </span>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  subtext,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  subtext?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-semibold text-foreground">{value}</p>
          {subtext && (
            <p className="text-xs text-muted-foreground">{subtext}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AgentDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const agentId = params.id as string;

  const [activeTab, setActiveTab] = useState<"overview" | "logs" | "config">(
    "overview"
  );

  const utils = trpc.useUtils();

  const {
    data: agent,
    isLoading,
    refetch,
  } = trpc.agents.get.useQuery({
    id: agentId,
  });

  const stopAgent = trpc.agents.stop.useMutation({
    onSuccess: () => {
      utils.agents.get.invalidate({ id: agentId });
      utils.agents.list.invalidate();
    },
  });
  const startAgent = trpc.agents.start.useMutation({
    onSuccess: () => {
      utils.agents.get.invalidate({ id: agentId });
      utils.agents.list.invalidate();
    },
  });
  const restartAgent = trpc.agents.sendCommand.useMutation({
    onSuccess: () => {
      utils.agents.get.invalidate({ id: agentId });
      utils.agents.list.invalidate();
    },
  });
  const deleteAgent = trpc.agents.delete.useMutation({
    onSuccess: () => router.push("/dashboard/agents"),
  });

  const isCommandPending =
    stopAgent.isPending || startAgent.isPending || restartAgent.isPending;

  const handleStop = async () => {
    if (confirm("Are you sure you want to stop this agent?")) {
      await stopAgent.mutateAsync({ id: agentId });
    }
  };

  const handleStart = async () => {
    await startAgent.mutateAsync({ id: agentId });
  };

  const handleRestart = async () => {
    if (confirm("Are you sure you want to restart this agent?")) {
      await restartAgent.mutateAsync({ agentId, type: "restart" });
    }
  };

  const handleDelete = async () => {
    if (
      confirm(
        "Are you sure you want to delete this agent? This cannot be undone."
      )
    ) {
      await deleteAgent.mutateAsync({ id: agentId });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-muted rounded-xl" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Agent not found</p>
        <Link
          href="/dashboard/agents"
          className="text-primary hover:underline mt-2 inline-block"
        >
          Back to agents
        </Link>
      </div>
    );
  }

  const host = (agent as any).host;
  const subscriptionsData = (agent as any).subscriptions || [];
  const activeSubscription = subscriptionsData.find(
    (s: any) => s.status === "active"
  );
  const monthlyCost = activeSubscription ? activeSubscription.pricePerMonth : 0;
  const agentTier = (agent as any).tier as string | null;
  const tierInfo = agentTier ? TIERS[agentTier as TierKey] : null;

  // Calculate uptime indicator based on lastActive
  const getUptimeDisplay = () => {
    if (!agent.lastActive) return "N/A";
    const lastActiveDate = new Date(agent.lastActive);
    const now = new Date();
    const diffMs = now.getTime() - lastActiveDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (agent.status === "running") {
      if (diffMins < 5) return "Online";
      if (diffMins < 60) return `${diffMins}m ago`;
      return `${Math.floor(diffMins / 60)}h ago`;
    }
    return "Offline";
  };

  return (
    <div>
      <Link
        href="/dashboard/agents"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Agents
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground">{agent.name}</h1>
            <StatusBadge status={agent.status} />
            <TierBadge tier={agentTier} />
          </div>
          <p className="text-muted-foreground mt-1">
            {agent.lastActive
              ? `Last active ${new Date(agent.lastActive).toLocaleString()}`
              : "Never active"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {agent.status === "running" ? (
            <>
              <button
                onClick={handleRestart}
                disabled={isCommandPending}
                className="inline-flex items-center gap-2 px-4 py-2 bg-muted hover:bg-accent text-foreground rounded-lg transition-colors disabled:opacity-50"
              >
                {restartAgent.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RotateCw className="w-4 h-4" />
                )}
                Restart
              </button>
              <button
                onClick={handleStop}
                disabled={isCommandPending}
                className="inline-flex items-center gap-2 px-4 py-2 bg-muted hover:bg-accent text-foreground rounded-lg transition-colors disabled:opacity-50"
              >
                {stopAgent.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                Stop
              </button>
            </>
          ) : agent.status === "stopped" || agent.status === "failed" ? (
            <button
              onClick={handleStart}
              disabled={isCommandPending}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {startAgent.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              Start
            </button>
          ) : agent.status === "deploying" ? (
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 text-blue-600 rounded-lg text-sm font-medium">
              <Loader2 className="w-4 h-4 animate-spin" />
              Deploying...
            </span>
          ) : null}

          <button
            onClick={handleDelete}
            disabled={deleteAgent.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      {/* Command feedback */}
      {(stopAgent.isError || startAgent.isError || restartAgent.isError) && (
        <div className="status-error rounded-lg p-4 mb-6">
          <p className="text-sm">
            {stopAgent.error?.message ||
              startAgent.error?.message ||
              restartAgent.error?.message ||
              "Command failed"}
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Status"
          value={getUptimeDisplay()}
          icon={Clock}
        />
        <StatCard
          label="Total Runtime"
          value={`${Math.round((agent.totalUptime || 0) / 3600)}h`}
          icon={Server}
        />
        <StatCard
          label="Monthly Cost"
          value={
            monthlyCost > 0 ? `$${(monthlyCost / 100).toFixed(2)}` : "N/A"
          }
          icon={DollarSign}
        />
        {tierInfo && (
          <StatCard
            label="Resources"
            value={`${tierInfo.ramMb >= 1024 ? `${tierInfo.ramMb / 1024}GB` : `${tierInfo.ramMb}MB`} RAM`}
            icon={MemoryStick}
            subtext={`${tierInfo.cpuCores} CPU • ${tierInfo.diskGb}GB disk`}
          />
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6">
        {(["overview", "logs", "config"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === tab
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground"
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
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-semibold text-foreground mb-4">
              Host Information
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Host</span>
                <p className="text-foreground">{host?.name || "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Location</span>
                <p className="text-foreground">
                  {host?.city || host?.region || "Unknown"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Started</span>
                <p className="text-foreground">
                  {new Date(agent.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Version</span>
                <p className="text-foreground">
                  {(agent as any).openclawVersion || "latest"}
                </p>
              </div>
              {agentTier && (
                <div>
                  <span className="text-muted-foreground">Tier</span>
                  <p className="text-foreground">
                    {tierInfo?.name || agentTier} —{" "}
                    <span className="text-muted-foreground">
                      {tierInfo?.description}
                    </span>
                  </p>
                </div>
              )}
              {(agent as any).containerId && (
                <div>
                  <span className="text-muted-foreground">Container</span>
                  <p className="text-foreground font-mono text-xs">
                    {((agent as any).containerId as string).slice(0, 12)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Container Stats (if available) */}
          {(agent as any).containerStats && (
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="font-semibold text-foreground mb-4">
                Container Stats
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {(agent as any).containerStats.cpuPercent !== undefined && (
                  <div className="text-center">
                    <Cpu className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
                    <p className="text-lg font-semibold text-foreground">
                      {((agent as any).containerStats.cpuPercent as number).toFixed(
                        1
                      )}
                      %
                    </p>
                    <p className="text-xs text-muted-foreground">CPU Usage</p>
                  </div>
                )}
                {(agent as any).containerStats.ramUsageMb !== undefined && (
                  <div className="text-center">
                    <MemoryStick className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
                    <p className="text-lg font-semibold text-foreground">
                      {(agent as any).containerStats.ramUsageMb}MB
                    </p>
                    <p className="text-xs text-muted-foreground">
                      RAM{" "}
                      {tierInfo
                        ? `/ ${tierInfo.ramMb}MB`
                        : ""}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Connection Info - only show when agent is running */}
          {agent.status === "running" && (
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="font-semibold text-foreground mb-4">Connection</h3>
              <div className="space-y-4">
                <div>
                  <span className="text-sm text-muted-foreground">
                    Agent ID
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 bg-muted px-3 py-2 rounded-lg text-sm text-primary font-mono">
                      {agent.id}
                    </code>
                    <button
                      onClick={() => copyToClipboard(agent.id)}
                      className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Connection details will be available once the agent is fully
                  deployed.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "logs" && (
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">
              Logs (Last 100 lines)
            </h3>
            <button className="text-sm text-primary hover:underline">
              Download Full
            </button>
          </div>
          <div className="bg-muted rounded-lg p-4 font-mono text-xs text-muted-foreground h-80 overflow-y-auto">
            <p className="text-muted-foreground/70">
              Logs will appear here when the agent is running...
            </p>
            {/* TODO: Implement real-time logs */}
          </div>
        </div>
      )}

      {activeTab === "config" && (
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Configuration</h3>
            <button className="text-sm text-primary hover:underline">
              Edit
            </button>
          </div>
          <div className="bg-muted rounded-lg p-4 font-mono text-xs text-foreground h-80 overflow-y-auto">
            <pre>
              {(agent.config &&
                Object.keys(agent.config as Record<string, unknown>).length > 0
                ? JSON.stringify(agent.config, null, 2)
                : null) ||
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
