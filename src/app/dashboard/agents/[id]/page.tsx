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
  Send,
  MessageSquare,
  Bot,
  User,
  AlertCircle,
  Settings,
  ScrollText,
} from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { TIERS, type TierKey } from "@/lib/constants";
import { AgentSettings } from "@/components/agents/AgentSettings";
import { AgentLogs } from "@/components/agents/AgentLogs";

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    running: "status-success",
    stopped: "bg-muted text-muted-foreground",
    pending: "status-warning",
    deploying: "bg-blue-500/10 text-blue-600",
    failed: "status-error",
    deleted: "bg-muted text-muted-foreground/50",
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
            : status === "stopped" || status === "deleted"
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

// ============================================================================
// Agent Chat Component
// ============================================================================

function AgentChat({ agentId, agentStatus }: { agentId: string; agentStatus: string }) {
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [messages, setMessages] = useState<Array<{ id: string; agentId: string; role: string; content: string; status: string; createdAt: string }>>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastMessageIdRef = useRef<string | null>(null);

  // Load initial messages
  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/agents/${agentId}/chat/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages ?? []);
        const msgs = data.messages ?? [];
        if (msgs.length > 0) {
          lastMessageIdRef.current = msgs[msgs.length - 1].id;
        }
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingMessages(false);
    }
  }, [agentId]);

  useEffect(() => {
    void fetchMessages();
  }, [fetchMessages]);

  // Poll for new messages after the last known message
  const pollStartRef = useRef<number>(0);
  const startPolling = useCallback(() => {
    if (pollTimerRef.current) return;
    pollStartRef.current = Date.now();
    pollTimerRef.current = setInterval(async () => {
      // Safety: stop polling after 2 minutes
      if (Date.now() - pollStartRef.current > 120_000) {
        setIsWaitingForResponse(false);
        stopPolling();
        return;
      }
      const afterId = lastMessageIdRef.current;
      if (!afterId) return;
      try {
        const res = await fetch(`/api/agents/${agentId}/chat/messages?after=${afterId}`);
        if (res.ok) {
          const data = await res.json();
          const newMsgs = data.messages ?? [];
          if (newMsgs.length > 0) {
            setMessages((prev) => {
              const existingIds = new Set(prev.map((m) => m.id));
              const deduped = newMsgs.filter((m: { id: string }) => !existingIds.has(m.id));
              return deduped.length > 0 ? [...prev, ...deduped] : prev;
            });
            lastMessageIdRef.current = newMsgs[newMsgs.length - 1].id;
            // Check if we got an agent response (success or failure) — stop waiting
            const hasAgentResponse = newMsgs.some((m: { role: string }) => m.role === "agent");
            if (hasAgentResponse) {
              setIsWaitingForResponse(false);
              stopPolling();
            }
          }
        }
      } catch {
        // ignore
      }
    }, 2000);
  }, [agentId]);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  // Clear chat mutation (still uses tRPC)
  const clearChat = trpc.messages.clear.useMutation({
    onSuccess: () => {
      setMessages([]);
      lastMessageIdRef.current = null;
      setIsWaitingForResponse(false);
      stopPolling();
    },
  });

  // Auto-scroll to bottom only if user is near bottom
  useEffect(() => {
    if (shouldAutoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, shouldAutoScroll, isWaitingForResponse]);

  // Track scroll position to decide auto-scroll
  const handleScroll = useCallback(() => {
    const el = chatContainerRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    setShouldAutoScroll(nearBottom);
  }, []);

  // Send message — stores as pending, daemon will relay
  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    setSendError(null);
    setShouldAutoScroll(true);

    try {
      const response = await fetch(`/api/agents/${agentId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(data.error || `Request failed: ${response.status}`);
      }

      const { messageId } = await response.json();

      // Optimistically add the user message to the list
      const optimisticMsg = {
        id: messageId,
        agentId,
        role: "user",
        content: trimmed,
        status: "pending",
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimisticMsg]);
      lastMessageIdRef.current = messageId;

      setInput("");
      setIsWaitingForResponse(true);
      startPolling();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send message";
      setSendError(message);
    } finally {
      setIsSending(false);
    }
  }, [input, isSending, agentId, startPolling]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }, [handleSend]);

  const isAgentOnline = agentStatus === "running";

  // Group messages by date for separators
  const messagesWithDates = messages.reduce<
    Array<{ type: "date"; date: string } | { type: "message"; msg: (typeof messages)[0] }>
  >((acc, msg) => {
    const dateStr = new Date(msg.createdAt).toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const lastItem = acc[acc.length - 1];
    if (!lastItem || (lastItem.type === "date" && lastItem.date !== dateStr) || (lastItem.type === "message" && new Date(lastItem.msg.createdAt).toLocaleDateString() !== new Date(msg.createdAt).toLocaleDateString())) {
      acc.push({ type: "date", date: dateStr });
    }
    acc.push({ type: "message", msg });
    return acc;
  }, []);

  return (
    <div className="bg-card border border-border rounded-xl flex flex-col" style={{ height: "70vh" }}>
      {/* Chat header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-foreground">Chat with Agent</h3>
        </div>
        <div className="flex items-center gap-3">
          {messages.length > 0 && (
            <button
              onClick={() => {
                if (confirm("Clear all chat messages? This cannot be undone.")) {
                  clearChat.mutate({ agentId });
                }
              }}
              disabled={clearChat.isPending}
              className="text-xs text-muted-foreground hover:text-destructive transition-colors"
            >
              Clear chat
            </button>
          )}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span
              className={`w-2 h-2 rounded-full ${
                isAgentOnline ? "bg-green-500" : "bg-muted-foreground"
              }`}
            />
            {isAgentOnline ? "Online" : "Offline"}
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div
        ref={chatContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-6 py-4 space-y-4"
      >
        {isLoadingMessages ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
              <Bot className="w-8 h-8 text-primary" />
            </div>
            <p className="text-foreground font-medium">Start a conversation</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Send a message to interact with your deployed OpenClaw agent.
              Responses are delivered instantly.
            </p>
          </div>
        ) : (
          <>
            {messagesWithDates.map((item, i) => {
              if (item.type === "date") {
                return (
                  <div key={`date-${item.date}`} className="flex items-center gap-3 py-2">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground shrink-0">
                      {item.date}
                    </span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                );
              }

              const msg = item.msg;
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {msg.role !== "user" && (
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center shrink-0 mt-1">
                      {msg.role === "agent" ? (
                        <Bot className="w-4 h-4 text-primary" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  )}
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                      msg.role === "user"
                        ? msg.status === "failed"
                          ? "bg-destructive/10 text-destructive border border-destructive/20 rounded-br-md"
                          : "bg-primary text-primary-foreground rounded-br-md"
                        : msg.role === "agent"
                          ? "bg-muted text-foreground rounded-bl-md"
                          : "bg-yellow-500/10 text-yellow-700 rounded-bl-md border border-yellow-500/20"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {msg.content}
                    </p>
                    <div
                      className={`flex items-center gap-2 mt-1.5 text-[10px] ${
                        msg.role === "user"
                          ? msg.status === "failed"
                            ? "text-destructive/60 justify-end"
                            : "text-primary-foreground/60 justify-end"
                          : "text-muted-foreground/60"
                      }`}
                    >
                      <span>
                        {new Date(msg.createdAt).toLocaleTimeString(undefined, {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {msg.role === "user" && (
                        <span>
                          {msg.status === "pending"
                            ? "⏳ Pending"
                            : msg.status === "processing"
                              ? "⏳ Processing"
                              : msg.status === "delivered"
                                ? "✓ Delivered"
                                : msg.status === "responded"
                                  ? "✓✓"
                                  : msg.status === "failed"
                                    ? "✕ Failed"
                                    : ""}
                        </span>
                      )}
                    </div>
                  </div>
                  {msg.role === "user" && (
                    <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center shrink-0 mt-1">
                      <User className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
              );
            })}
            {isWaitingForResponse && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className="bg-muted text-foreground rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input area */}
      <div className="px-6 py-4 border-t border-border">
        {!isAgentOnline ? (
          <div className="flex items-center gap-3 bg-muted rounded-xl px-4 py-3">
            <AlertCircle className="w-5 h-5 text-muted-foreground shrink-0" />
            <p className="text-sm text-muted-foreground">
              Agent is not running. Start it to send messages.
            </p>
          </div>
        ) : (
          <div className="flex items-end gap-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={1}
              disabled={isSending}
              className="flex-1 bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none text-sm min-h-[44px] max-h-32"
              style={{
                height: "auto",
                overflowY: input.split("\n").length > 3 ? "auto" : "hidden",
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "auto";
                target.style.height = Math.min(target.scrollHeight, 128) + "px";
              }}
            />
            <button
              onClick={() => void handleSend()}
              disabled={!input.trim() || isSending}
              className="w-11 h-11 bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground text-primary-foreground rounded-xl flex items-center justify-center transition-colors shrink-0"
            >
              {isSending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        )}
        {sendError && (
          <p className="text-xs text-destructive mt-2">
            {sendError}
          </p>
        )}
      </div>
    </div>
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

  const [activeTab, setActiveTab] = useState<"overview" | "chat" | "settings" | "logs">(
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
        {([
          { key: "overview", label: "Overview", icon: null },
          { key: "chat", label: "Chat", icon: MessageSquare },
          { key: "settings", label: "Settings", icon: Settings },
          { key: "logs", label: "Logs", icon: ScrollText },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === key
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="flex items-center gap-1.5">
              {Icon && <Icon className="w-3.5 h-3.5" />}
              {label}
            </span>
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

      {activeTab === "chat" && (
        <AgentChat agentId={agentId} agentStatus={agent.status} />
      )}

      {activeTab === "settings" && (
        <AgentSettings agentId={agentId} />
      )}

      {activeTab === "logs" && (
        <AgentLogs agentId={agentId} />
      )}
    </div>
  );
}
