"use client";

import { trpc } from "@/lib/trpc";
import Link from "next/link";
import { Cpu, Plus, Play, Square, Trash2, ExternalLink } from "lucide-react";

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
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
        colors[status] || colors.pending
      }`}
    >
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

export default function AgentsPage() {
  const { data: agents, isLoading, refetch } = trpc.agents.list.useQuery();
  const stopAgent = trpc.agents.stop.useMutation({ onSuccess: () => refetch() });
  const startAgent = trpc.agents.start.useMutation({ onSuccess: () => refetch() });
  const deleteAgent = trpc.agents.delete.useMutation({ onSuccess: () => refetch() });

  const handleStop = async (id: string) => {
    if (confirm("Are you sure you want to stop this agent?")) {
      await stopAgent.mutateAsync({ id });
    }
  };

  const handleStart = async (id: string) => {
    await startAgent.mutateAsync({ id });
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this agent? This cannot be undone.")) {
      await deleteAgent.mutateAsync({ id });
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">My Agents</h1>
          <p className="text-zinc-400 mt-1">Manage your deployed AI agents</p>
        </div>
        <Link
          href="/dashboard/agents/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-black font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Deploy Agent
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 h-24 animate-pulse"
            />
          ))}
        </div>
      ) : !agents || agents.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
          <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Cpu className="w-6 h-6 text-zinc-500" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">
            No agents deployed yet
          </h3>
          <p className="text-sm text-zinc-400 mb-6 max-w-sm mx-auto">
            Deploy your first AI agent to get started. Browse available hosts and
            pick one that fits your needs.
          </p>
          <Link
            href="/dashboard/browse"
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-black font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Browse Hosts
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-6"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/dashboard/agents/${agent.id}`}
                      className="font-semibold text-white hover:text-emerald-400 transition-colors"
                    >
                      {agent.name}
                    </Link>
                    <StatusBadge status={agent.status} />
                  </div>
                  <p className="text-sm text-zinc-400 mt-2">
                    {(agent as any).host ? (
                      <>Hosted by {(agent as any).host.name}</>
                    ) : (
                      "No host assigned"
                    )}
                  </p>
                  {agent.lastActive && (
                    <p className="text-xs text-zinc-500 mt-1">
                      Last active:{" "}
                      {new Date(agent.lastActive).toLocaleDateString()}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {agent.status === "running" ? (
                    <button
                      onClick={() => handleStop(agent.id)}
                      disabled={stopAgent.isPending}
                      className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                      title="Stop agent"
                    >
                      <Square className="w-4 h-4" />
                    </button>
                  ) : agent.status === "stopped" ? (
                    <button
                      onClick={() => handleStart(agent.id)}
                      disabled={startAgent.isPending}
                      className="p-2 text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 rounded-lg transition-colors"
                      title="Start agent"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                  ) : null}

                  <Link
                    href={`/dashboard/agents/${agent.id}`}
                    className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                    title="View details"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Link>

                  <button
                    onClick={() => handleDelete(agent.id)}
                    disabled={deleteAgent.isPending}
                    className="p-2 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors"
                    title="Delete agent"
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
