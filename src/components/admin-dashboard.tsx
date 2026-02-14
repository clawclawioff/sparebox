"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Users,
  Server,
  Cpu,
  DollarSign,
  MessageSquare,
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  AlertTriangle,
  Ban,
  UserCheck,
  Search,
  ChevronLeft,
  ChevronRight,
  Square,
  Play,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// =============================================================================
// Stat Card
// =============================================================================

function StatCard({
  label,
  value,
  icon: Icon,
  detail,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  detail?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {detail && (
        <p className="text-xs text-muted-foreground mt-1">{detail}</p>
      )}
    </div>
  );
}

// =============================================================================
// Tabs
// =============================================================================

type Tab = "overview" | "users" | "hosts" | "agents";

// =============================================================================
// Main Component
// =============================================================================

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Shield className="w-6 h-6" />
          Admin Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Platform overview and management
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b border-border mb-6">
        {(["overview", "users", "hosts", "agents"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "overview" && <OverviewTab />}
      {activeTab === "users" && <UsersTab />}
      {activeTab === "hosts" && <HostsTab />}
      {activeTab === "agents" && <AgentsTab />}
    </div>
  );
}

// =============================================================================
// Overview Tab
// =============================================================================

function OverviewTab() {
  const stats = trpc.admin.getSystemStats.useQuery();
  const activity = trpc.admin.getRecentActivity.useQuery({ limit: 15 });

  if (stats.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const s = stats.data;

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          label="Total Users"
          value={s?.users ?? 0}
          icon={Users}
        />
        <StatCard
          label="Hosts"
          value={s?.hosts ?? 0}
          icon={Server}
          detail={`${s?.activeHosts ?? 0} active, ${s?.pendingHosts ?? 0} pending`}
        />
        <StatCard
          label="Agents"
          value={s?.agents ?? 0}
          icon={Cpu}
          detail={`${s?.runningAgents ?? 0} running`}
        />
        <StatCard
          label="Monthly Revenue"
          value={`$${((s?.monthlyRevenue ?? 0) / 100).toFixed(2)}`}
          icon={DollarSign}
          detail={`${s?.activeSubscriptions ?? 0} active subs`}
        />
        <StatCard
          label="Messages"
          value={s?.totalMessages ?? 0}
          icon={MessageSquare}
        />
      </div>

      {/* Pending Hosts Alert */}
      {(s?.pendingHosts ?? 0) > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-foreground">
              {s!.pendingHosts} host{s!.pendingHosts !== 1 ? "s" : ""} pending approval
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Review and approve new hosts in the Hosts tab.
            </p>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Recent Activity
        </h2>
        {activity.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : activity.data?.length === 0 ? (
          <p className="text-muted-foreground text-sm py-8 text-center">
            No activity yet.
          </p>
        ) : (
          <div className="bg-card border border-border rounded-xl divide-y divide-border">
            {activity.data?.map((item, i) => (
              <div key={`${item.type}-${item.id}-${i}`} className="px-4 py-3 flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    item.type === "user_signup"
                      ? "bg-blue-500/10"
                      : item.type === "host_registered"
                        ? "bg-green-500/10"
                        : "bg-purple-500/10"
                  }`}
                >
                  {item.type === "user_signup" ? (
                    <Users className="w-4 h-4 text-blue-500" />
                  ) : item.type === "host_registered" ? (
                    <Server className="w-4 h-4 text-green-500" />
                  ) : (
                    <Cpu className="w-4 h-4 text-purple-500" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">
                    {item.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{item.detail}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {formatRelativeTime(new Date(item.timestamp))}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Users Tab
// =============================================================================

function UsersTab() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [page, setPage] = useState(0);
  const limit = 20;

  const users = trpc.admin.listUsers.useQuery({
    limit,
    offset: page * limit,
    role: roleFilter
      ? (roleFilter as "default" | "deployer" | "host" | "admin")
      : undefined,
    search: search || undefined,
  });

  const updateRole = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => users.refetch(),
  });
  const suspendUser = trpc.admin.suspendUser.useMutation({
    onSuccess: () => users.refetch(),
  });

  const total = users.data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(0);
          }}
          className="px-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground"
        >
          <option value="">All roles</option>
          <option value="admin">Admin</option>
          <option value="host">Host</option>
          <option value="deployer">Deployer</option>
          <option value="default">Default</option>
        </select>
      </div>

      {/* User Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  User
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  Role
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  Verified
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  Joined
                </th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
                  </td>
                </tr>
              ) : users.data?.users.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    No users found.
                  </td>
                </tr>
              ) : (
                users.data?.users.map((u) => (
                  <tr key={u.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-foreground">
                          {u.name || "—"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {u.email}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="px-4 py-3">
                      {u.emailVerified ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-muted-foreground" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <select
                          value={u.role}
                          onChange={(e) =>
                            updateRole.mutate({
                              userId: u.id,
                              role: e.target.value as any,
                            })
                          }
                          className="px-2 py-1 text-xs bg-muted border border-border rounded"
                          disabled={updateRole.isPending}
                        >
                          <option value="default">Default</option>
                          <option value="deployer">Deployer</option>
                          <option value="host">Host</option>
                          <option value="admin">Admin</option>
                        </select>
                        {u.role !== "admin" && (
                          <button
                            onClick={() => {
                              if (
                                confirm(
                                  `Suspend ${u.name || u.email}? This will set their role to default.`
                                )
                              ) {
                                suspendUser.mutate({ userId: u.id });
                              }
                            }}
                            className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                            title="Suspend user"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-xs text-muted-foreground">
              {total} user{total !== 1 ? "s" : ""} total
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-muted-foreground">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() =>
                  setPage((p) => Math.min(totalPages - 1, p + 1))
                }
                disabled={page >= totalPages - 1}
                className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Hosts Tab
// =============================================================================

function HostsTab() {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState(0);
  const limit = 20;

  const hostsList = trpc.admin.listHosts.useQuery({
    limit,
    offset: page * limit,
    status: statusFilter
      ? (statusFilter as "pending" | "active" | "inactive" | "suspended")
      : undefined,
  });

  const approveHost = trpc.admin.approveHost.useMutation({
    onSuccess: () => hostsList.refetch(),
  });
  const rejectHost = trpc.admin.rejectHost.useMutation({
    onSuccess: () => hostsList.refetch(),
  });
  const suspendHost = trpc.admin.suspendHost.useMutation({
    onSuccess: () => hostsList.refetch(),
  });

  const total = hostsList.data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  // Count pending for the badge
  const pendingCount =
    !statusFilter
      ? hostsList.data?.hosts.filter((h) => h.status === "pending").length ?? 0
      : 0;

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex gap-3">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(0);
          }}
          className="px-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground"
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {/* Host Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  Host
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  Owner
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  Status
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  Specs
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  Agents
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  Last Heartbeat
                </th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {hostsList.isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
                  </td>
                </tr>
              ) : hostsList.data?.hosts.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    No hosts found.
                  </td>
                </tr>
              ) : (
                hostsList.data?.hosts.map((h) => (
                  <tr key={h.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-foreground">{h.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {[h.city, h.region, h.country]
                            .filter(Boolean)
                            .join(", ") || "Unknown location"}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-foreground">
                        {h.owner?.name || h.owner?.email || "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <HostStatusBadge status={h.status} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {h.cpuCores ? `${h.cpuCores} CPU` : "—"} ·{" "}
                      {h.ramGb ? `${h.ramGb}GB` : "—"}
                      {h.specsVerified && (
                        <CheckCircle className="w-3 h-3 text-green-500 inline ml-1" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {h.runningAgents}/{h.agentCount}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {h.lastHeartbeat
                        ? formatRelativeTime(new Date(h.lastHeartbeat))
                        : "Never"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {h.status === "pending" && (
                          <>
                            <button
                              onClick={() =>
                                approveHost.mutate({ hostId: h.id })
                              }
                              disabled={approveHost.isPending}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-green-500/10 text-green-600 hover:bg-green-500/20 rounded-md transition-colors"
                            >
                              <CheckCircle className="w-3 h-3" />
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                const reason = prompt(
                                  "Reason for rejection (optional):"
                                );
                                rejectHost.mutate({
                                  hostId: h.id,
                                  reason: reason || undefined,
                                });
                              }}
                              disabled={rejectHost.isPending}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-red-500/10 text-red-600 hover:bg-red-500/20 rounded-md transition-colors"
                            >
                              <XCircle className="w-3 h-3" />
                              Reject
                            </button>
                          </>
                        )}
                        {h.status === "active" && (
                          <button
                            onClick={() => {
                              if (
                                confirm(`Suspend host "${h.name}"?`)
                              ) {
                                suspendHost.mutate({ hostId: h.id });
                              }
                            }}
                            disabled={suspendHost.isPending}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20 rounded-md transition-colors"
                          >
                            <Ban className="w-3 h-3" />
                            Suspend
                          </button>
                        )}
                        {h.status === "suspended" && (
                          <button
                            onClick={() =>
                              approveHost.mutate({ hostId: h.id })
                            }
                            disabled={approveHost.isPending}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 rounded-md transition-colors"
                          >
                            <UserCheck className="w-3 h-3" />
                            Reactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-xs text-muted-foreground">
              {total} host{total !== 1 ? "s" : ""} total
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-muted-foreground">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() =>
                  setPage((p) => Math.min(totalPages - 1, p + 1))
                }
                disabled={page >= totalPages - 1}
                className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Agents Tab
// =============================================================================

function AgentsTab() {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState(0);
  const limit = 20;

  const agentsList = trpc.admin.listAgents.useQuery({
    limit,
    offset: page * limit,
    status: statusFilter
      ? (statusFilter as any)
      : undefined,
  });

  const forceStop = trpc.admin.forceStopAgent.useMutation({
    onSuccess: () => agentsList.refetch(),
  });

  const total = agentsList.data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex gap-3">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(0);
          }}
          className="px-3 py-2 bg-card border border-border rounded-lg text-sm text-foreground"
        >
          <option value="">Active (non-deleted)</option>
          <option value="running">Running</option>
          <option value="stopped">Stopped</option>
          <option value="deploying">Deploying</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
          <option value="deleted">Deleted</option>
        </select>
      </div>

      {/* Agent Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  Agent
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  Owner
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  Host
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  Status
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  Tier
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  Created
                </th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {agentsList.isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
                  </td>
                </tr>
              ) : agentsList.data?.agents.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    No agents found.
                  </td>
                </tr>
              ) : (
                agentsList.data?.agents.map((a) => (
                  <tr key={a.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{a.name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-foreground">
                        {a.owner?.name || a.owner?.email || "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {a.host?.name || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <AgentStatusBadge status={a.status} />
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-xs capitalize">
                        {a.tier}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {new Date(a.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {(a.status === "running" || a.status === "deploying") && (
                        <button
                          onClick={() => {
                            if (
                              confirm(`Force stop agent "${a.name}"?`)
                            ) {
                              forceStop.mutate({ agentId: a.id });
                            }
                          }}
                          disabled={forceStop.isPending}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-red-500/10 text-red-600 hover:bg-red-500/20 rounded-md transition-colors"
                        >
                          <Square className="w-3 h-3" />
                          Force Stop
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-xs text-muted-foreground">
              {total} agent{total !== 1 ? "s" : ""} total
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-muted-foreground">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() =>
                  setPage((p) => Math.min(totalPages - 1, p + 1))
                }
                disabled={page >= totalPages - 1}
                className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Badge Components
// =============================================================================

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    admin: "bg-red-500/10 text-red-600 border-red-500/20",
    host: "bg-green-500/10 text-green-600 border-green-500/20",
    deployer: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    default: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md border capitalize ${colors[role] || colors.default}`}
    >
      {role}
    </span>
  );
}

function HostStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-green-500/10 text-green-600",
    pending: "bg-yellow-500/10 text-yellow-600",
    inactive: "bg-gray-500/10 text-gray-500",
    suspended: "bg-red-500/10 text-red-600",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md capitalize ${styles[status] || styles.inactive}`}
    >
      {status}
    </span>
  );
}

function AgentStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    running: "bg-green-500/10 text-green-600",
    deploying: "bg-blue-500/10 text-blue-600",
    pending: "bg-yellow-500/10 text-yellow-600",
    stopped: "bg-gray-500/10 text-gray-500",
    failed: "bg-red-500/10 text-red-600",
    deleted: "bg-red-500/10 text-red-400",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md capitalize ${styles[status] || styles.stopped}`}
    >
      {status}
    </span>
  );
}

// =============================================================================
// Helpers
// =============================================================================

function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const seconds = Math.floor(diff / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}
