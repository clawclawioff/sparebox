"use client";

import { trpc } from "@/lib/trpc";
import Link from "next/link";
import { Server, Plus, Trash2, Settings, ArrowRight } from "lucide-react";

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "bg-emerald-500/10 text-emerald-400",
    pending: "bg-yellow-500/10 text-yellow-400",
    inactive: "bg-zinc-500/10 text-zinc-400",
    suspended: "bg-red-500/10 text-red-400",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
        colors[status] || colors.pending
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
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

export default function HostsPage() {
  const { data: hosts, isLoading, refetch } = trpc.hosts.list.useQuery();
  const deleteHost = trpc.hosts.delete.useMutation({
    onSuccess: () => refetch(),
  });

  const handleDelete = async (id: string) => {
    if (
      confirm(
        "Are you sure you want to delete this machine? This cannot be undone."
      )
    ) {
      await deleteHost.mutateAsync({ id });
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">My Machines</h1>
          <p className="text-zinc-400 mt-1">
            Manage your registered hardware
          </p>
        </div>
        <Link
          href="/dashboard/hosts/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-black font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Machine
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 h-32 animate-pulse"
            />
          ))}
        </div>
      ) : !hosts || hosts.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
          <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Server className="w-6 h-6 text-zinc-500" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">
            No machines registered yet
          </h3>
          <p className="text-sm text-zinc-400 mb-6 max-w-sm mx-auto">
            Add your first machine to start earning. You'll need to install our
            lightweight agent software to get started.
          </p>
          <Link
            href="/dashboard/hosts/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-black font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Machine
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {hosts.map((host) => (
            <div
              key={host.id}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <StatusBadge status={host.status} />
                    <Link
                      href={`/dashboard/hosts/${host.id}`}
                      className="font-semibold text-white hover:text-emerald-400 transition-colors"
                    >
                      {host.name}
                    </Link>
                  </div>

                  <p className="text-sm text-zinc-400 mt-2">
                    {host.cpuCores} cores • {host.ramGb}GB RAM •{" "}
                    {host.city || host.region || "Unknown location"}
                  </p>

                  <div className="flex items-center gap-4 mt-3 text-sm">
                    <span className="text-emerald-400 font-medium">
                      ${((host.pricePerMonth || 0) / 100).toFixed(2)}/mo
                    </span>
                    <span className="text-zinc-500">
                      {host.uptimePercent?.toFixed(1)}% uptime
                    </span>
                    <span className="text-zinc-500">
                      Last heartbeat:{" "}
                      {host.lastHeartbeat
                        ? new Date(host.lastHeartbeat).toLocaleString()
                        : "Never"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/dashboard/hosts/${host.id}`}
                    className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                    title="Manage"
                  >
                    <Settings className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => handleDelete(host.id)}
                    disabled={deleteHost.isPending}
                    className="p-2 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
