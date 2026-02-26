"use client";

import { trpc } from "@/lib/trpc";
import { useState, useRef, useEffect } from "react";
import { Loader2, ChevronDown, Radio } from "lucide-react";

const LEVEL_COLORS: Record<string, string> = {
  debug: "bg-muted text-muted-foreground",
  info: "bg-blue-500/10 text-blue-600",
  warn: "bg-yellow-500/10 text-yellow-700",
  error: "bg-destructive/10 text-destructive",
};

type LogEntry = {
  id: string;
  timestamp: Date | string;
  level: string | null;
  message: string;
  source: string | null;
};

export function AgentLogs({ agentId }: { agentId: string }) {
  const [levelFilter, setLevelFilter] = useState<"debug" | "info" | "warn" | "error" | undefined>(undefined);
  const [isLive, setIsLive] = useState(false);
  const [displayLogs, setDisplayLogs] = useState<LogEntry[]>([]);
  const [lastPollTime, setLastPollTime] = useState<string>(new Date().toISOString());
  const bottomRef = useRef<HTMLDivElement>(null);

  // Initial load
  const { data: initialData, isLoading } = trpc.logs.list.useQuery(
    { agentId, limit: 100, level: levelFilter },
    { refetchOnWindowFocus: false },
  );

  // Update display logs when initial data changes
  useEffect(() => {
    if (initialData) {
      const reversed = [...initialData.logs].reverse();
      setDisplayLogs(reversed);
      if (reversed.length > 0) {
        setLastPollTime(new Date(reversed[reversed.length - 1].timestamp).toISOString());
      }
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "auto" }), 50);
    }
  }, [initialData]);

  // Live poll via tRPC
  const utils = trpc.useUtils();
  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(async () => {
      try {
        const newLogs = await utils.logs.poll.fetch({ agentId, since: lastPollTime });
        if (newLogs.length > 0) {
          setDisplayLogs((prev) => {
            const existingIds = new Set(prev.map((l) => l.id));
            const deduped = newLogs.filter((l: LogEntry) => !existingIds.has(l.id));
            if (deduped.length === 0) return prev;
            return [...prev, ...deduped];
          });
          setLastPollTime(new Date(newLogs[newLogs.length - 1].timestamp).toISOString());
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
        }
      } catch {
        // ignore poll errors
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isLive, agentId, lastPollTime, utils]);

  const hasMore = initialData?.hasMore ?? false;

  return (
    <div className="bg-card border border-border rounded-xl flex flex-col" style={{ height: "70vh" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h3 className="font-semibold text-foreground">Agent Logs</h3>
        <div className="flex items-center gap-3">
          <select
            value={levelFilter || ""}
            onChange={(e) => setLevelFilter((e.target.value || undefined) as typeof levelFilter)}
            className="bg-background border border-border rounded-lg px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All levels</option>
            <option value="debug">Debug</option>
            <option value="info">Info</option>
            <option value="warn">Warn</option>
            <option value="error">Error</option>
          </select>

          <button
            onClick={() => setIsLive(!isLive)}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              isLive
                ? "bg-green-500/10 text-green-600 border border-green-500/20"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            <Radio className={`w-3 h-3 ${isLive ? "animate-pulse" : ""}`} />
            {isLive ? "Live" : "Paused"}
          </button>
        </div>
      </div>

      {/* Log content */}
      <div className="flex-1 overflow-y-auto px-4 py-3 font-mono text-xs">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : displayLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-muted-foreground">No logs yet</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Logs will appear here when the agent is running.
            </p>
          </div>
        ) : (
          <>
            {hasMore && (
              <div className="flex justify-center mb-3">
                <span className="text-xs text-muted-foreground">
                  <ChevronDown className="w-3 h-3 rotate-180 inline mr-1" />
                  Older logs available
                </span>
              </div>
            )}
            {displayLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-2 py-0.5 hover:bg-muted/30 rounded px-1">
                <span className="text-muted-foreground/60 shrink-0 w-[140px]">
                  {new Date(log.timestamp).toLocaleString(undefined, {
                    month: "short",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </span>
                <span
                  className={`inline-flex items-center px-1.5 py-0 rounded text-[10px] font-medium shrink-0 w-[44px] justify-center ${
                    LEVEL_COLORS[log.level || "info"] || LEVEL_COLORS.info
                  }`}
                >
                  {(log.level || "info").toUpperCase()}
                </span>
                <span className="text-foreground break-all">{log.message}</span>
              </div>
            ))}
            <div ref={bottomRef} />
          </>
        )}
      </div>
    </div>
  );
}
