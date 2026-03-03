"use client";

import { trpc } from "@/lib/trpc";
import Link from "next/link";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState, useEffect, useCallback, useMemo } from "react";
import {
  ArrowLeft,
  Play,
  Square,
  RotateCw,
  Trash2,
  Loader2,
  Save,
  Plus,
  Search,
  FileText,
  Settings,
  Shield,
  Puzzle,
  FolderOpen,
  X,
  ChevronRight,
  ExternalLink,
  Eye,
  EyeOff,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TIERS, type TierKey } from "@/lib/constants";

// ============================================================================
// Types
// ============================================================================

interface WorkspaceFile {
  path: string;
  content: string;
  updatedAt: string;
}

interface IntegrationField {
  key: string;
  label: string;
  type: "password" | "text" | "url" | "textarea";
  required?: boolean;
  helpUrl?: string;
  placeholder?: string;
}

interface IntegrationDef {
  id: string;
  name: string;
  category: string;
  icon: string;
  description: string;
  fields: IntegrationField[];
}

interface ConfiguredIntegration {
  id: string;
  integrationId: string;
  enabled: boolean;
  credentials: Record<string, string>;
  updatedAt: string;
}

// ============================================================================
// Constants
// ============================================================================

const FILE_TEMPLATES: Record<string, string> = {
  "SOUL.md":
    "# Who You Are\n\nDefine your agent's personality, tone, and behavioral rules here.\n\n## Vibe\n- Be helpful and concise\n- Be honest when you don't know something\n\n## Lines You Don't Cross\n- Don't share private information\n- Ask before taking destructive actions",
  "USER.md": "# About Your Human\n\n- **Name:** \n- **Timezone:** \n- **Notes:** \n",
  "IDENTITY.md": "# Identity\n\n- **Name:** My Agent\n- **Emoji:** 🤖\n",
  "AGENTS.md": "# Agent Instructions\n\nOperational rules and memory conventions.\n",
  "HEARTBEAT.md":
    "# Heartbeat Checks\n\nDefine what your agent should check periodically.\n\n- Reply HEARTBEAT_OK if nothing needs attention\n",
};

const IDENTITY_FILES = ["SOUL.md", "USER.md", "AGENTS.md", "IDENTITY.md", "HEARTBEAT.md"];

const TAB_KEYS = ["overview", "identity", "integrations", "configuration", "files"] as const;
type TabKey = (typeof TAB_KEYS)[number];

// ============================================================================
// Main Page
// ============================================================================

function AgentSettingsInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const agentId = params.id as string;

  const initialTab = (searchParams.get("tab") as TabKey) || "overview";
  const [activeTab, setActiveTab] = useState<TabKey>(
    TAB_KEYS.includes(initialTab as TabKey) ? (initialTab as TabKey) : "overview"
  );

  const { data: agent, isLoading } = trpc.agents.get.useQuery({ id: agentId });

  const handleTabChange = (value: string) => {
    const tab = value as TabKey;
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.replaceState({}, "", url.toString());
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Agent not found</p>
        <Link href="/dashboard/agents" className="text-primary hover:underline mt-2 inline-block">
          Back to agents
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/agents/${agentId}`}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Chat
          </Link>
          <div className="w-px h-5 bg-border" />
          <h1 className="font-semibold text-foreground">{agent.name}</h1>
          <StatusDot status={agent.status} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="h-full flex flex-col">
          <div className="border-b border-border bg-card px-4">
            <TabsList variant="line" className="h-10">
              <TabsTrigger value="overview" className="gap-1.5">
                <Settings className="w-3.5 h-3.5" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="identity" className="gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                Identity
              </TabsTrigger>
              <TabsTrigger value="integrations" className="gap-1.5">
                <Puzzle className="w-3.5 h-3.5" />
                Integrations
              </TabsTrigger>
              <TabsTrigger value="configuration" className="gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                Configuration
              </TabsTrigger>
              <TabsTrigger value="files" className="gap-1.5">
                <FolderOpen className="w-3.5 h-3.5" />
                Files
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto">
            <TabsContent value="overview" className="p-6">
              <OverviewTab agent={agent as any} agentId={agentId} />
            </TabsContent>
            <TabsContent value="identity" className="p-6">
              <IdentityTab agentId={agentId} />
            </TabsContent>
            <TabsContent value="integrations" className="p-6">
              <IntegrationsTab agentId={agentId} />
            </TabsContent>
            <TabsContent value="configuration" className="p-6">
              <ConfigurationTab agentId={agentId} />
            </TabsContent>
            <TabsContent value="files" className="p-6">
              <FilesTab agentId={agentId} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}

export default function AgentSettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[80vh]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <AgentSettingsInner />
    </Suspense>
  );
}

// ============================================================================
// Status Dot
// ============================================================================

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    running: "bg-green-500",
    stopped: "bg-muted-foreground",
    pending: "bg-yellow-500",
    deploying: "bg-blue-500",
    failed: "bg-red-500",
  };
  return <span className={`w-2.5 h-2.5 rounded-full ${colors[status] || colors.pending}`} />;
}

// ============================================================================
// Overview Tab
// ============================================================================

function OverviewTab({ agent, agentId }: { agent: any; agentId: string }) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const host = agent.host;
  const agentTier = agent.tier as string | null;
  const tierInfo = agentTier ? TIERS[agentTier as TierKey] : null;
  const subscriptions = agent.subscriptions || [];
  const activeSub = subscriptions.find((s: any) => s.status === "active");
  const monthlyCost = activeSub ? activeSub.pricePerMonth : 0;

  const stopAgent = trpc.agents.stop.useMutation({
    onSuccess: () => {
      utils.agents.get.invalidate({ id: agentId });
    },
  });
  const startAgent = trpc.agents.start.useMutation({
    onSuccess: () => {
      utils.agents.get.invalidate({ id: agentId });
    },
  });
  const restartAgent = trpc.agents.sendCommand.useMutation({
    onSuccess: () => {
      utils.agents.get.invalidate({ id: agentId });
    },
  });
  const deleteAgent = trpc.agents.delete.useMutation({
    onSuccess: () => router.push("/dashboard/agents"),
  });

  const isPending = stopAgent.isPending || startAgent.isPending || restartAgent.isPending;

  const { data: settingsData } = trpc.agentSettings.get.useQuery({ agentId });
  const currentSettings = settingsData?.settings ?? {};

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Status & Quick Info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="py-4">
          <CardContent className="px-4">
            <p className="text-xs text-muted-foreground mb-1">Status</p>
            <div className="flex items-center gap-2">
              <StatusDot status={agent.status} />
              <span className="text-sm font-medium capitalize">{agent.status}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="px-4">
            <p className="text-xs text-muted-foreground mb-1">Uptime</p>
            <p className="text-sm font-medium">{Math.round((agent.totalUptime || 0) / 3600)}h total</p>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="px-4">
            <p className="text-xs text-muted-foreground mb-1">Monthly Cost</p>
            <p className="text-sm font-medium">
              {monthlyCost > 0 ? `$${(monthlyCost / 100).toFixed(2)}/mo` : "N/A"}
            </p>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="px-4">
            <p className="text-xs text-muted-foreground mb-1">Tier</p>
            <p className="text-sm font-medium capitalize">{agentTier || "—"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Resources */}
      {tierInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resources</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ResourceBar label="RAM" used={0} total={tierInfo.ramMb} unit="MB" />
            <ResourceBar label="CPU" used={0} total={tierInfo.cpuCores} unit="cores" />
            <ResourceBar label="Disk" used={0} total={tierInfo.diskGb} unit="GB" />
          </CardContent>
        </Card>
      )}

      {/* Host Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Host Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Host</span>
              <p className="text-foreground">{host?.name || "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Location</span>
              <p className="text-foreground">{host?.city || host?.region || "Unknown"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Created</span>
              <p className="text-foreground">{new Date(agent.createdAt).toLocaleDateString()}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Model</span>
              <p className="text-foreground">{(currentSettings.model as string) || "Default"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {(agent.status === "stopped" || agent.status === "failed") && (
              <button
                onClick={() => startAgent.mutate({ id: agentId })}
                disabled={isPending}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {startAgent.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Start
              </button>
            )}
            {agent.status === "running" && (
              <>
                <button
                  onClick={() => restartAgent.mutate({ agentId, type: "restart" })}
                  disabled={isPending}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {restartAgent.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4" />}
                  Restart
                </button>
                <button
                  onClick={() => stopAgent.mutate({ id: agentId })}
                  disabled={isPending}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-muted hover:bg-accent text-foreground rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {stopAgent.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />}
                  Stop
                </button>
              </>
            )}
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-lg text-sm font-medium transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>

          {/* Delete confirmation */}
          {showDeleteConfirm && (
            <div className="mt-4 p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
              <p className="text-sm text-foreground mb-3">
                Are you sure you want to delete this agent? This cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => deleteAgent.mutate({ id: agentId })}
                  disabled={deleteAgent.isPending}
                  className="px-4 py-2 bg-destructive text-white rounded-lg text-sm font-medium hover:bg-destructive/90 disabled:opacity-50"
                >
                  {deleteAgent.isPending ? "Deleting..." : "Yes, Delete"}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 bg-muted text-foreground rounded-lg text-sm font-medium hover:bg-accent"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Agent ID */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Agent ID</CardTitle>
        </CardHeader>
        <CardContent>
          <code className="block bg-muted px-3 py-2 rounded-lg text-sm text-primary font-mono break-all">
            {agentId}
          </code>
        </CardContent>
      </Card>
    </div>
  );
}

function ResourceBar({
  label,
  used,
  total,
  unit,
}: {
  label: string;
  used: number;
  total: number;
  unit: string;
}) {
  const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-foreground">
          {used} / {total} {unit}
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Identity Tab
// ============================================================================

function IdentityTab({ agentId }: { agentId: string }) {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">Identity Files</h2>
        <p className="text-sm text-muted-foreground">
          These files define your agent&apos;s personality, instructions, and context.
        </p>
      </div>
      {IDENTITY_FILES.map((filename) => (
        <FileEditorCard key={filename} agentId={agentId} filename={filename} />
      ))}
    </div>
  );
}

function FileEditorCard({ agentId, filename }: { agentId: string; filename: string }) {
  const utils = trpc.useUtils();
  const [content, setContent] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const { data: fileData, isLoading, isError } = trpc.agentWorkspace.getFile.useQuery(
    { agentId, path: filename },
    { retry: false }
  );

  const upsertFile = trpc.agentWorkspace.upsertFile.useMutation({
    onSuccess: () => {
      setSaveStatus("saved");
      setIsDirty(false);
      utils.agentWorkspace.getFile.invalidate({ agentId, path: filename });
      setTimeout(() => setSaveStatus("idle"), 2000);
    },
    onError: () => setSaveStatus("error"),
  });

  const serverContent = fileData?.content ?? null;
  const exists = !isError && fileData?.content !== undefined && fileData?.content !== null;
  const displayContent = content ?? serverContent ?? "";

  const handleChange = (value: string) => {
    setContent(value);
    setIsDirty(value !== (serverContent ?? ""));
    setSaveStatus("idle");
  };

  const handleSave = () => {
    setSaveStatus("saving");
    upsertFile.mutate({ agentId, path: filename, content: content ?? displayContent });
  };

  const handleCreateFromTemplate = () => {
    const template = FILE_TEMPLATES[filename] || `# ${filename}\n`;
    setContent(template);
    setSaveStatus("saving");
    upsertFile.mutate({ agentId, path: filename, content: template });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <CardTitle className="text-base">{filename}</CardTitle>
            {isDirty && (
              <span className="flex items-center gap-1 text-xs text-yellow-600">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                Unsaved
              </span>
            )}
            {saveStatus === "saved" && (
              <span className="text-xs text-green-600">✓ Saved</span>
            )}
            {saveStatus === "error" && (
              <span className="text-xs text-destructive">Save failed</span>
            )}
          </div>
          {fileData?.updatedAt && (
            <span className="text-xs text-muted-foreground">
              Updated {new Date(fileData.updatedAt).toLocaleString()}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!exists && content === null ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground mb-3">This file doesn&apos;t exist yet.</p>
            <button
              onClick={handleCreateFromTemplate}
              disabled={upsertFile.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {upsertFile.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Create from Template
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <textarea
              value={displayContent}
              onChange={(e) => handleChange(e.target.value)}
              className="w-full h-[300px] bg-background border border-border rounded-lg px-4 py-3 text-sm text-foreground font-mono resize-y focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder={`Content for ${filename}...`}
            />
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={!isDirty || upsertFile.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {upsertFile.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Integrations Tab
// ============================================================================

function IntegrationsTab({ agentId }: { agentId: string }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null);

  const { data: registry, isLoading: registryLoading } =
    trpc.agentIntegrations.getRegistry.useQuery();
  const { data: configured, isLoading: configuredLoading } =
    trpc.agentIntegrations.list.useQuery({ agentId });

  const integrations: IntegrationDef[] = (registry as IntegrationDef[] | undefined) ?? [];
  const configuredMap = useMemo(() => {
    const map = new Map<string, ConfiguredIntegration>();
    ((configured as ConfiguredIntegration[] | undefined) ?? []).forEach((c) =>
      map.set(c.integrationId, c)
    );
    return map;
  }, [configured]);

  const categories = useMemo(() => {
    const cats = new Set(integrations.map((i) => i.category));
    return ["all", ...Array.from(cats).sort()];
  }, [integrations]);

  const filtered = useMemo(() => {
    return integrations.filter((i) => {
      if (categoryFilter !== "all" && i.category !== categoryFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          i.name.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [integrations, categoryFilter, searchQuery]);

  if (registryLoading || configuredLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">Integrations</h2>
        <p className="text-sm text-muted-foreground">
          Connect your agent to external services and APIs.
        </p>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search integrations..."
            className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c === "all" ? "All Categories" : c}
            </option>
          ))}
        </select>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((integration) => {
          const conf = configuredMap.get(integration.id);
          const isConnected = !!conf?.enabled;

          return (
            <button
              key={integration.id}
              onClick={() =>
                setSelectedIntegration(
                  selectedIntegration === integration.id ? null : integration.id
                )
              }
              className={`text-left bg-card border rounded-xl p-4 transition-colors hover:border-primary/50 ${
                selectedIntegration === integration.id
                  ? "border-primary"
                  : "border-border"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{integration.icon}</span>
                  <div>
                    <p className="font-medium text-foreground">{integration.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{integration.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isConnected ? (
                    <Badge variant="default" className="bg-green-600 text-xs">
                      Connected
                    </Badge>
                  ) : conf ? (
                    <Badge variant="secondary" className="text-xs">Disabled</Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">Not configured</Badge>
                  )}
                  <ChevronRight
                    className={`w-4 h-4 text-muted-foreground transition-transform ${
                      selectedIntegration === integration.id ? "rotate-90" : ""
                    }`}
                  />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No integrations found.</p>
        </div>
      )}

      {/* Detail Panel */}
      {selectedIntegration && (
        <IntegrationDetailPanel
          agentId={agentId}
          integration={integrations.find((i) => i.id === selectedIntegration)!}
          configured={configuredMap.get(selectedIntegration) ?? null}
          onClose={() => setSelectedIntegration(null)}
        />
      )}
    </div>
  );
}

function IntegrationDetailPanel({
  agentId,
  integration,
  configured,
  onClose,
}: {
  agentId: string;
  integration: IntegrationDef;
  configured: ConfiguredIntegration | null;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [changedFields, setChangedFields] = useState<Set<string>>(new Set());
  const [showFields, setShowFields] = useState<Set<string>>(new Set());
  const [enabled, setEnabled] = useState(configured?.enabled ?? true);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const upsert = trpc.agentIntegrations.upsert.useMutation({
    onSuccess: () => {
      setSaveStatus("saved");
      setChangedFields(new Set());
      utils.agentIntegrations.list.invalidate({ agentId });
      setTimeout(() => setSaveStatus("idle"), 2000);
    },
    onError: () => setSaveStatus("error"),
  });

  const remove = trpc.agentIntegrations.delete.useMutation({
    onSuccess: () => {
      utils.agentIntegrations.list.invalidate({ agentId });
      onClose();
    },
  });

  const handleFieldChange = (key: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [key]: value }));
    setChangedFields((prev) => new Set(prev).add(key));
  };

  const handleSave = () => {
    const values: Record<string, string> = {};
    changedFields.forEach((key) => {
      if (fieldValues[key] !== undefined) {
        values[key] = fieldValues[key];
      }
    });
    setSaveStatus("saving");
    upsert.mutate({
      agentId,
      integrationId: integration.id,
      enabled,
      credentials: values,
    });
  };

  return (
    <Card className="border-primary">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{integration.icon}</span>
            <div>
              <CardTitle className="text-base">{integration.name}</CardTitle>
              <CardDescription>{integration.description}</CardDescription>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Enable toggle */}
        <label className="flex items-center gap-3 cursor-pointer">
          <div
            onClick={() => setEnabled(!enabled)}
            className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
              enabled ? "bg-primary" : "bg-muted"
            }`}
          >
            <div
              className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                enabled ? "translate-x-5" : "translate-x-1"
              }`}
            />
          </div>
          <span className="text-sm text-foreground">Enabled</span>
        </label>

        {/* Fields */}
        {integration.fields.map((field) => {
          const masked = configured?.credentials?.[field.key];
          const isEditing = showFields.has(field.key) || !masked;
          const inputType = field.type === "password" ? "password" : "text";

          return (
            <div key={field.key}>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-foreground">
                  {field.label}
                  {field.required && <span className="text-destructive ml-0.5">*</span>}
                </label>
                {field.helpUrl && (
                  <a
                    href={field.helpUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    Get key <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              {masked && !isEditing ? (
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-muted px-3 py-2 rounded-lg text-sm font-mono text-muted-foreground">
                    {masked}
                  </code>
                  <button
                    onClick={() => setShowFields((prev) => new Set(prev).add(field.key))}
                    className="px-3 py-2 text-sm bg-muted hover:bg-accent text-foreground rounded-lg transition-colors"
                  >
                    Change
                  </button>
                </div>
              ) : field.type === "textarea" ? (
                <textarea
                  value={fieldValues[field.key] ?? ""}
                  onChange={(e) => handleFieldChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  rows={4}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground font-mono resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                />
              ) : (
                <input
                  type={inputType}
                  value={fieldValues[field.key] ?? ""}
                  onChange={(e) => handleFieldChange(field.key, e.target.value)}
                  placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              )}
            </div>
          );
        })}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <div>
            {configured && (
              <>
                {showDeleteConfirm ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => remove.mutate({ agentId, integrationId: integration.id })}
                      disabled={remove.isPending}
                      className="px-3 py-1.5 bg-destructive text-white rounded-lg text-sm"
                    >
                      {remove.isPending ? "Removing..." : "Confirm Remove"}
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-3 py-1.5 text-sm text-muted-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="inline-flex items-center gap-1.5 text-sm text-destructive hover:text-destructive/80"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove
                  </button>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            {saveStatus === "saved" && <span className="text-sm text-green-600">✓ Saved</span>}
            {saveStatus === "error" && <span className="text-sm text-destructive">Save failed</span>}
            <button
              onClick={handleSave}
              disabled={upsert.isPending || (changedFields.size === 0 && configured?.enabled === enabled)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {upsert.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Configuration Tab
// ============================================================================

function ConfigurationTab({ agentId }: { agentId: string }) {
  const utils = trpc.useUtils();

  const { data: settingsData, isLoading } = trpc.agentSettings.get.useQuery({ agentId });

  const updateSettings = trpc.agentSettings.update.useMutation({
    onSuccess: () => {
      utils.agentSettings.get.invalidate({ agentId });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    },
    onError: () => setSaveStatus("error"),
  });

  const currentSettings = settingsData?.settings ?? {};

  const [model, setModel] = useState<string | null>(null);
  const [thinkingLevel, setThinkingLevel] = useState<string | null>(null);
  const [temperature, setTemperature] = useState<number | null>(null);
  const [execPolicy, setExecPolicy] = useState<string | null>(null);
  const [elevated, setElevated] = useState<boolean | null>(null);
  const [httpApi, setHttpApi] = useState<boolean | null>(null);
  const [heartbeatInterval, setHeartbeatInterval] = useState<number | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // Resolve current values
  const currentModel = model ?? (currentSettings.model as string) ?? "anthropic/claude-sonnet-4-20250514";
  const currentThinking = thinkingLevel ?? (currentSettings.thinkingLevel as string) ?? "low";
  const currentTemp = temperature ?? (currentSettings.temperature as number) ?? 0.7;
  const currentExec = execPolicy ?? (currentSettings.execPolicy as string) ?? "full";
  const currentElevated = elevated ?? (currentSettings.elevated as boolean) ?? false;
  const currentHttpApi = httpApi ?? (currentSettings.httpApi as boolean) ?? false;
  const currentHeartbeat = heartbeatInterval ?? (currentSettings.heartbeatInterval as number) ?? 1800;

  const hasChanges =
    model !== null ||
    thinkingLevel !== null ||
    temperature !== null ||
    execPolicy !== null ||
    elevated !== null ||
    httpApi !== null ||
    heartbeatInterval !== null;

  const handleSave = () => {
    setSaveStatus("saving");
    const settings: Record<string, unknown> = {};
    if (model !== null) settings.model = model;
    if (thinkingLevel !== null) settings.thinkingLevel = thinkingLevel;
    if (temperature !== null) settings.temperature = temperature;
    if (execPolicy !== null) settings.execPolicy = execPolicy;
    if (elevated !== null) settings.elevated = elevated;
    if (httpApi !== null) settings.httpApi = httpApi;
    if (heartbeatInterval !== null) settings.heartbeatInterval = heartbeatInterval;
    updateSettings.mutate({ agentId, settings });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Model Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Model Settings</CardTitle>
          <CardDescription>Configure the LLM provider and model for your agent.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">Primary Model</label>
            <select
              value={currentModel}
              onChange={(e) => setModel(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <optgroup label="Anthropic">
                <option value="anthropic/claude-opus-4-20250514">Claude Opus 4</option>
                <option value="anthropic/claude-sonnet-4-20250514">Claude Sonnet 4</option>
                <option value="anthropic/claude-haiku-3-20250307">Claude Haiku 3.5</option>
              </optgroup>
              <optgroup label="OpenAI">
                <option value="openai/gpt-4o">GPT-4o</option>
                <option value="openai/gpt-4o-mini">GPT-4o Mini</option>
                <option value="openai/o3-mini">o3-mini</option>
              </optgroup>
              <optgroup label="Google">
                <option value="google/gemini-2.5-pro">Gemini 2.5 Pro</option>
                <option value="google/gemini-2.5-flash">Gemini 2.5 Flash</option>
              </optgroup>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground block mb-2">Thinking Level</label>
            <div className="flex gap-2">
              {(["off", "low", "medium", "high"] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => setThinkingLevel(level)}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                    currentThinking === level
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:text-foreground"
                  }`}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground block mb-2">
              Temperature: {currentTemp.toFixed(1)}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={currentTemp}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Precise (0.0)</span>
              <span>Creative (1.0)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tool Permissions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tool Permissions</CardTitle>
          <CardDescription>Control what your agent can execute on the host.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">Exec Policy</label>
            <select
              value={currentExec}
              onChange={(e) => setExecPolicy(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="deny">Deny — no shell access</option>
              <option value="allowlist">Allowlist — approved commands only</option>
              <option value="full">Full — unrestricted shell access</option>
            </select>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => setElevated(!currentElevated)}
              className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
                currentElevated ? "bg-primary" : "bg-muted"
              }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  currentElevated ? "translate-x-5" : "translate-x-1"
                }`}
              />
            </div>
            <div>
              <span className="text-sm font-medium text-foreground">Elevated Access</span>
              <p className="text-xs text-muted-foreground">Allow sudo/admin commands</p>
            </div>
          </label>
        </CardContent>
      </Card>

      {/* Gateway Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gateway Settings</CardTitle>
          <CardDescription>Control the OpenClaw gateway configuration.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => setHttpApi(!currentHttpApi)}
              className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
                currentHttpApi ? "bg-primary" : "bg-muted"
              }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  currentHttpApi ? "translate-x-5" : "translate-x-1"
                }`}
              />
            </div>
            <div>
              <span className="text-sm font-medium text-foreground">HTTP API</span>
              <p className="text-xs text-muted-foreground">Enable external HTTP API access</p>
            </div>
          </label>

          <div>
            <label className="text-sm font-medium text-foreground block mb-1">
              Heartbeat Interval (seconds)
            </label>
            <input
              type="number"
              min="60"
              max="86400"
              value={currentHeartbeat}
              onChange={(e) => setHeartbeatInterval(parseInt(e.target.value) || 1800)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex items-center justify-end gap-3">
        {saveStatus === "saved" && <span className="text-sm text-green-600">✓ Changes saved</span>}
        {saveStatus === "error" && <span className="text-sm text-destructive">Save failed</span>}
        <button
          onClick={handleSave}
          disabled={!hasChanges || updateSettings.isPending}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          {updateSettings.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save Configuration
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Files Tab
// ============================================================================

function FilesTab({ agentId }: { agentId: string }) {
  const utils = trpc.useUtils();
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [showNewFile, setShowNewFile] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const { data: files, isLoading } = trpc.agentWorkspace.getFiles.useQuery({ agentId });
  const { data: fileData } = trpc.agentWorkspace.getFile.useQuery(
    { agentId, path: selectedFile! },
    { enabled: !!selectedFile }
  );

  useEffect(() => {
    if (fileData?.content !== undefined) {
      setFileContent(fileData.content);
      setIsDirty(false);
    }
  }, [fileData]);

  const upsertFile = trpc.agentWorkspace.upsertFile.useMutation({
    onSuccess: () => {
      setSaveStatus("saved");
      setIsDirty(false);
      utils.agentWorkspace.getFiles.invalidate({ agentId });
      utils.agentWorkspace.getFile.invalidate({ agentId, path: selectedFile! });
      setTimeout(() => setSaveStatus("idle"), 2000);
    },
    onError: () => setSaveStatus("error"),
  });

  const deleteFile = trpc.agentWorkspace.deleteFile.useMutation({
    onSuccess: () => {
      if (showDeleteConfirm === selectedFile) {
        setSelectedFile(null);
        setFileContent("");
      }
      setShowDeleteConfirm(null);
      utils.agentWorkspace.getFiles.invalidate({ agentId });
    },
  });

  const handleSave = () => {
    if (!selectedFile) return;
    setSaveStatus("saving");
    upsertFile.mutate({ agentId, path: selectedFile, content: fileContent });
  };

  const handleNewFile = () => {
    const name = newFileName.trim();
    if (!name) return;
    upsertFile.mutate(
      { agentId, path: name, content: "" },
      {
        onSuccess: () => {
          setSelectedFile(name);
          setFileContent("");
          setNewFileName("");
          setShowNewFile(false);
          utils.agentWorkspace.getFiles.invalidate({ agentId });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const fileList = ((files as Array<{ filename: string }> | undefined) ?? []).map((f) => f.filename);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex gap-6">
        {/* File List */}
        <div className="w-64 shrink-0 space-y-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">Files</h3>
            <button
              onClick={() => setShowNewFile(true)}
              className="p-1 text-primary hover:text-primary/80"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {showNewFile && (
            <div className="flex gap-1 mb-2">
              <input
                type="text"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleNewFile()}
                placeholder="filename.md"
                autoFocus
                className="flex-1 bg-background border border-border rounded px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <button onClick={handleNewFile} className="px-2 py-1 bg-primary text-primary-foreground rounded text-xs">
                Add
              </button>
              <button
                onClick={() => {
                  setShowNewFile(false);
                  setNewFileName("");
                }}
                className="px-2 py-1 text-muted-foreground text-xs"
              >
                ✕
              </button>
            </div>
          )}

          {fileList.map((path) => (
            <div
              key={path}
              className={`group flex items-center justify-between px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors ${
                selectedFile === path
                  ? "bg-primary/10 text-primary"
                  : "text-foreground hover:bg-accent"
              }`}
            >
              <button
                onClick={() => {
                  setSelectedFile(path);
                  setIsDirty(false);
                  setSaveStatus("idle");
                }}
                className="flex-1 text-left truncate"
              >
                <FileText className="w-3.5 h-3.5 inline mr-2" />
                {path}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(path)}
                className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}

          {fileList.length === 0 && (
            <p className="text-xs text-muted-foreground py-4 text-center">No files yet</p>
          )}
        </div>

        {/* Editor */}
        <div className="flex-1">
          {selectedFile ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground">{selectedFile}</h3>
                  {isDirty && (
                    <span className="flex items-center gap-1 text-xs text-yellow-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                      Unsaved
                    </span>
                  )}
                  {saveStatus === "saved" && <span className="text-xs text-green-600">✓ Saved</span>}
                </div>
                <button
                  onClick={handleSave}
                  disabled={!isDirty || upsertFile.isPending}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {upsertFile.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  Save
                </button>
              </div>
              <textarea
                value={fileContent}
                onChange={(e) => {
                  setFileContent(e.target.value);
                  setIsDirty(true);
                  setSaveStatus("idle");
                }}
                className="w-full h-[500px] bg-background border border-border rounded-lg px-4 py-3 text-sm text-foreground font-mono resize-y focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
              Select a file to edit
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-xl p-6 max-w-sm w-full mx-4">
            <p className="text-foreground font-medium mb-2">Delete file?</p>
            <p className="text-sm text-muted-foreground mb-4">
              Are you sure you want to delete <code className="text-foreground">{showDeleteConfirm}</code>?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 bg-muted text-foreground rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteFile.mutate({ agentId, path: showDeleteConfirm })}
                disabled={deleteFile.isPending}
                className="px-4 py-2 bg-destructive text-white rounded-lg text-sm"
              >
                {deleteFile.isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
