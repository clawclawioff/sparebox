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
  Key,
  Copy,
  Check,
  AlertTriangle,
  Globe,
  Workflow,
  RefreshCw,
  X,
  ShieldCheck,
} from "lucide-react";

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "status-success",
    pending: "status-warning",
    inactive: "bg-muted text-muted-foreground",
    suspended: "status-error",
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
            ? "bg-green-600"
            : status === "pending"
            ? "bg-yellow-500"
            : status === "inactive"
            ? "bg-muted-foreground"
            : "bg-destructive"
        }`}
      />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function HeartbeatIndicator({ lastHeartbeat }: { lastHeartbeat: Date | string | null | undefined }) {
  if (!lastHeartbeat) {
    return (
      <span className="inline-flex items-center gap-2">
        <span className="relative flex h-3 w-3">
          <span className="h-3 w-3 rounded-full bg-gray-400" />
        </span>
        <span className="text-muted-foreground/70">Never connected</span>
      </span>
    );
  }

  const lastBeat = new Date(lastHeartbeat);
  const minutesAgo = Math.floor((Date.now() - lastBeat.getTime()) / 60000);

  if (minutesAgo < 2) {
    return (
      <span className="inline-flex items-center gap-2">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
        </span>
        <span className="text-green-600 font-medium">Online — {minutesAgo < 1 ? "just now" : `${minutesAgo} min ago`}</span>
      </span>
    );
  }

  if (minutesAgo < 5) {
    return (
      <span className="inline-flex items-center gap-2">
        <span className="relative flex h-3 w-3">
          <span className="h-3 w-3 rounded-full bg-yellow-500" />
        </span>
        <span className="text-yellow-600">{minutesAgo} min ago</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <span className="relative flex h-3 w-3">
        <span className="h-3 w-3 rounded-full bg-red-500" />
      </span>
      <span className="text-destructive">{minutesAgo} min ago</span>
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
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-semibold text-foreground">{value}</p>
          {sublabel && (
            <p className="text-xs text-muted-foreground/70">{sublabel}</p>
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
        <span className="text-muted-foreground">{label}</span>
        <span className="text-foreground font-medium">{value.toFixed(1)}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
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
    running: "text-green-600",
    stopped: "text-muted-foreground",
    pending: "text-yellow-600",
    deploying: "text-blue-600",
    failed: "text-destructive",
  };

  return (
    <span className={`inline-flex items-center gap-1.5 text-sm ${colors[status] || colors.pending}`}>
      <span
        className={`w-1.5 h-1.5 rounded-full ${
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

function SpecValue({
  value,
  unit,
  specsVerified,
}: {
  value: number | string | null | undefined;
  unit: string;
  specsVerified: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 flex-wrap">
      <span>{value ?? "—"}{unit}</span>
      {specsVerified && (
        <span className="inline-flex items-center gap-0.5 text-green-600 text-xs font-medium">
          <Check className="w-3 h-3" />
          Verified
        </span>
      )}
    </span>
  );
}

function ApiKeySection({ hostId }: { hostId: string }) {
  const [showNewKey, setShowNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"regenerate" | "revoke" | null>(null);

  const { data: keyInfo, refetch: refetchKey } = trpc.hosts.getApiKeyInfo.useQuery({ hostId });
  const generateKey = trpc.hosts.generateApiKey.useMutation({
    onSuccess: (data) => {
      setShowNewKey(data.apiKey);
      refetchKey();
    },
  });
  const revokeKey = trpc.hosts.revokeApiKey.useMutation({
    onSuccess: () => {
      setShowNewKey(null);
      refetchKey();
      setConfirmAction(null);
    },
  });

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGenerate = () => {
    generateKey.mutate({ hostId });
  };

  const handleRegenerate = () => {
    setConfirmAction(null);
    generateKey.mutate({ hostId });
  };

  const handleRevoke = () => {
    revokeKey.mutate({ hostId });
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "Never";
    return new Date(date).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
          <Key className="w-4 h-4 text-primary" />
        </div>
        <h3 className="font-semibold text-foreground">API Key</h3>
      </div>

      {/* New key modal/alert */}
      {showNewKey && (
        <div className="mb-4 bg-primary/5 border border-primary/20 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground mb-1">
                Save this key — it won't be shown again.
              </p>
              <div className="flex items-center gap-2 mt-2">
                <code className="flex-1 bg-muted px-3 py-2 rounded-lg text-sm text-primary font-mono break-all">
                  {showNewKey}
                </code>
                <button
                  onClick={() => handleCopy(showNewKey)}
                  className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors shrink-0"
                >
                  {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <button
                onClick={() => setShowNewKey(null)}
                className="text-xs text-muted-foreground hover:text-foreground mt-2"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation dialogs */}
      {confirmAction && (
        <div className="mb-4 bg-destructive/5 border border-destructive/20 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground mb-1">
                {confirmAction === "regenerate"
                  ? "Regenerate API key?"
                  : "Revoke API key?"}
              </p>
              <p className="text-xs text-muted-foreground mb-3">
                {confirmAction === "regenerate"
                  ? "The current key will stop working immediately. Your daemon will need the new key to reconnect."
                  : "This key will stop working immediately. Your daemon will disconnect."}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={confirmAction === "regenerate" ? handleRegenerate : handleRevoke}
                  disabled={generateKey.isPending || revokeKey.isPending}
                  className="px-3 py-1.5 bg-destructive hover:bg-destructive/90 text-destructive-foreground text-sm font-medium rounded-lg transition-colors"
                >
                  {(generateKey.isPending || revokeKey.isPending) ? "Processing..." : "Confirm"}
                </button>
                <button
                  onClick={() => setConfirmAction(null)}
                  className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {keyInfo ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <code className="bg-muted px-3 py-2 rounded-lg text-sm font-mono text-foreground">
              {keyInfo.keyPrefix}...{keyInfo.keySuffix}
            </code>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>Created: {formatDate(keyInfo.createdAt)}</span>
            <span>Last used: {formatDate(keyInfo.lastUsedAt)}</span>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => setConfirmAction("regenerate")}
              disabled={generateKey.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-muted hover:bg-accent text-foreground rounded-lg transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Regenerate
            </button>
            <button
              onClick={() => setConfirmAction("revoke")}
              disabled={revokeKey.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-lg transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Revoke
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground mb-3">No API key generated</p>
          <button
            onClick={handleGenerate}
            disabled={generateKey.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors"
          >
            {generateKey.isPending ? (
              <>Generating...</>
            ) : (
              <>
                <Key className="w-4 h-4" />
                Generate API Key
              </>
            )}
          </button>
        </div>
      )}
    </div>
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

  if (!host) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Machine not found</p>
        <Link
          href="/dashboard/hosts"
          className="text-primary hover:underline mt-2 inline-block"
        >
          Back to machines
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/dashboard/hosts"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
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
                className="text-2xl font-bold bg-muted text-foreground px-3 py-1 rounded-lg border border-border focus:ring-ring focus:outline-none"
              />
            ) : (
              <h1 className="text-2xl font-bold text-foreground">{host.name}</h1>
            )}
            <StatusBadge status={host.status} />
          </div>
          <div className="mt-2">
            <HeartbeatIndicator lastHeartbeat={host.lastHeartbeat} />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={updateHost.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors"
              >
                {updateHost.isPending ? "Saving..." : "Save"}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleEdit}
                className="inline-flex items-center gap-2 px-4 py-2 bg-muted hover:bg-accent text-foreground rounded-lg transition-colors"
              >
                <Pencil className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteHost.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-lg transition-colors"
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
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="font-semibold text-foreground">Machine Info</h3>
            {(host as any).specsVerified && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-600 border border-green-500/20">
                <ShieldCheck className="w-3 h-3" />
                Verified
              </span>
            )}
          </div>
          <div className="space-y-4 text-sm">
            <div className="flex items-start gap-3">
              <Cpu className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <span className="text-muted-foreground">CPU</span>
                <p className="text-foreground">
                  <SpecValue
                    value={host.cpuCores}
                    unit=" cores"
                    specsVerified={(host as any).specsVerified ?? false}
                  />
                </p>
                <span className="text-muted-foreground">RAM</span>
                <p className="text-foreground">
                  <SpecValue
                    value={host.ramGb}
                    unit=" GB"
                    specsVerified={(host as any).specsVerified ?? false}
                  />
                </p>
                <span className="text-muted-foreground">Storage</span>
                <p className="text-foreground">
                  <SpecValue
                    value={host.storageGb}
                    unit=" GB"
                    specsVerified={(host as any).specsVerified ?? false}
                  />
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Server className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <span className="text-muted-foreground">Operating System</span>
                <p className="text-foreground">
                  {host.osInfo || "Not specified"}
                  {(host as any).specsVerified && (
                    <span className="ml-2 inline-flex items-center gap-0.5 text-green-600 text-xs font-medium">
                      <Check className="w-3 h-3" />
                      Verified
                    </span>
                  )}
                </p>
              </div>
            </div>
            {(host as any).daemonVersion && (
              <div className="flex items-start gap-3">
                <Workflow className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <span className="text-muted-foreground">Daemon</span>
                  <p className="text-foreground">
                    v{(host as any).daemonVersion}
                    {(host as any).nodeVersion && (
                      <span className="text-muted-foreground ml-2">
                        (Node {(host as any).nodeVersion})
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )}
            {(host as any).publicIp && (
              <div className="flex items-start gap-3">
                <Globe className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <span className="text-muted-foreground">Public IP</span>
                  <p className="text-foreground">{(host as any).publicIp}</p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <span className="text-muted-foreground">Location</span>
                <p className="text-foreground">
                  {[host.city, host.region, host.country].filter(Boolean).join(", ") || "Not specified"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <DollarSign className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <span className="text-muted-foreground">Price</span>
                {isEditing ? (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-muted-foreground">$</span>
                    <input
                      type="number"
                      value={(editForm.pricePerMonth / 100).toFixed(2)}
                      onChange={(e) =>
                        setEditForm({ ...editForm, pricePerMonth: Math.round(parseFloat(e.target.value) * 100) })
                      }
                      className="w-24 bg-muted text-foreground px-2 py-1 rounded border border-border focus:ring-ring focus:outline-none"
                      step="0.01"
                      min="5"
                      max="100"
                    />
                    <span className="text-muted-foreground">/month</span>
                  </div>
                ) : (
                  <p className="text-foreground">
                    {formatCurrency(host.pricePerMonth || 0)}/month{" "}
                    <span className="text-muted-foreground/70">(you receive {formatCurrency((host.pricePerMonth || 0) * 0.6)})</span>
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <span className="text-muted-foreground">Added</span>
                <p className="text-foreground">{formatDate(host.createdAt)}</p>
              </div>
            </div>
          </div>

          {isEditing && (
            <div className="mt-4 pt-4 border-t border-border">
              <label className="text-sm text-muted-foreground">Description</label>
              <textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                className="w-full mt-1 bg-muted text-foreground px-3 py-2 rounded-lg border border-border focus:ring-ring focus:outline-none resize-none"
                rows={3}
                placeholder="A brief description of your machine..."
              />
            </div>
          )}
        </div>

        {/* System Metrics */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">System Metrics</h3>
            <span className="text-xs text-muted-foreground/70">Last 24h</span>
          </div>
          
          {metrics?.latest ? (
            <div className="space-y-4">
              <UsageBar
                label="CPU Usage"
                value={metrics.latest.cpuUsage || 0}
                color="bg-primary"
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
              <div className="pt-2 border-t border-border">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Active Agents</span>
                  <span className="text-foreground font-medium">{metrics.latest.agentCount || 0}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center mb-3">
                <Activity className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-sm">No metrics available</p>
              <p className="text-muted-foreground/70 text-xs mt-1">
                Metrics will appear once the host agent is installed and connected.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* API Key Management */}
      <div className="mb-8">
        <ApiKeySection hostId={hostId} />
      </div>

      {/* Hosted Agents */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="font-semibold text-foreground mb-4">Hosted Agents</h3>
        
        {stats?.agents && stats.agents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="pb-3 font-medium">Agent</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Started</th>
                  <th className="pb-3 font-medium text-right">Earnings</th>
                </tr>
              </thead>
              <tbody>
                {stats.agents.map((agent) => (
                  <tr key={agent.id} className="border-b border-border/50 last:border-0">
                    <td className="py-3">
                      <span className="text-foreground font-medium">{agent.name}</span>
                      <span className="text-muted-foreground/70 text-xs ml-2">
                        {agent.id.slice(0, 8)}...
                      </span>
                    </td>
                    <td className="py-3">
                      <AgentStatusBadge status={agent.status} />
                    </td>
                    <td className="py-3 text-muted-foreground">
                      {formatDate(agent.createdAt)}
                    </td>
                    <td className="py-3 text-right text-primary font-medium">
                      {formatCurrency((host.pricePerMonth || 0) * 0.6)}/mo
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center mx-auto mb-3">
              <Bot className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No agents hosted yet</p>
            <p className="text-muted-foreground/70 text-xs mt-1">
              Agents will appear here when users deploy to this machine.
            </p>
          </div>
        )}
        
        <p className="text-xs text-muted-foreground/70 mt-4 pt-4 border-t border-border">
          Note: Agent details are private to their owners. You can only see basic status information.
        </p>
      </div>
    </div>
  );
}
