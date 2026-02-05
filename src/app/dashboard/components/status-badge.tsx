"use client";

interface StatusBadgeProps {
  status: string;
}

const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
  running: { bg: "bg-emerald-500/10", text: "text-emerald-400", dot: "bg-emerald-400" },
  active: { bg: "bg-emerald-500/10", text: "text-emerald-400", dot: "bg-emerald-400" },
  online: { bg: "bg-emerald-500/10", text: "text-emerald-400", dot: "bg-emerald-400" },
  stopped: { bg: "bg-zinc-500/10", text: "text-zinc-400", dot: "bg-zinc-400" },
  offline: { bg: "bg-zinc-500/10", text: "text-zinc-400", dot: "bg-zinc-400" },
  inactive: { bg: "bg-zinc-500/10", text: "text-zinc-400", dot: "bg-zinc-400" },
  pending: { bg: "bg-yellow-500/10", text: "text-yellow-400", dot: "bg-yellow-400" },
  deploying: { bg: "bg-blue-500/10", text: "text-blue-400", dot: "bg-blue-400" },
  failed: { bg: "bg-red-500/10", text: "text-red-400", dot: "bg-red-400" },
  suspended: { bg: "bg-red-500/10", text: "text-red-400", dot: "bg-red-400" },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.pending;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
