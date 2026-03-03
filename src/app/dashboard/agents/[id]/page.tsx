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
  Loader2,
  Send,
  Bot,
  User,
  AlertCircle,
  Settings,
  MoreVertical,
} from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { TIERS, type TierKey } from "@/lib/constants";

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
// Chat-First Agent Page
// ============================================================================

export default function AgentDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const agentId = params.id as string;

  const [showSettings, setShowSettings] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const utils = trpc.useUtils();

  const {
    data: agent,
    isLoading,
  } = trpc.agents.get.useQuery({ id: agentId });

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

  const host = (agent as any).host;
  const agentTier = (agent as any).tier as string | null;
  const tierInfo = agentTier ? TIERS[agentTier as TierKey] : null;
  const isAgentOnline = agent.status === "running";

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/agents"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Agents
          </Link>
          <div className="w-px h-5 bg-border" />
          <h1 className="font-semibold text-foreground">{agent.name}</h1>
          <div className="flex items-center gap-1.5">
            <StatusDot status={agent.status} />
            <span className="text-xs text-muted-foreground capitalize">{agent.status}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Actions dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full mt-1 z-50 bg-card border border-border rounded-lg shadow-lg py-1 w-48">
                  {agent.status === "running" && (
                    <>
                      <button
                        onClick={() => { restartAgent.mutate({ agentId, type: "restart" }); setShowMenu(false); }}
                        disabled={isCommandPending}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
                      >
                        <RotateCw className="w-4 h-4" /> Restart
                      </button>
                      <button
                        onClick={() => { stopAgent.mutate({ id: agentId }); setShowMenu(false); }}
                        disabled={isCommandPending}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
                      >
                        <Square className="w-4 h-4" /> Stop
                      </button>
                    </>
                  )}
                  {(agent.status === "stopped" || agent.status === "failed") && (
                    <button
                      onClick={() => { startAgent.mutate({ id: agentId }); setShowMenu(false); }}
                      disabled={isCommandPending}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
                    >
                      <Play className="w-4 h-4" /> Start
                    </button>
                  )}
                  <div className="border-t border-border my-1" />
                  <Link
                    href={`/dashboard/agents/${agentId}/settings`}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
                    onClick={() => setShowMenu(false)}
                  >
                    <Settings className="w-4 h-4" /> Settings
                  </Link>
                  <div className="border-t border-border my-1" />
                  <button
                    onClick={() => {
                      if (confirm("Delete this agent? This cannot be undone.")) {
                        deleteAgent.mutate({ id: agentId });
                      }
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-accent transition-colors"
                  >
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                </div>
              </>
            )}
          </div>

          <Link
            href={`/dashboard/agents/${agentId}/settings`}
            className="p-2 rounded-lg transition-colors text-muted-foreground hover:text-foreground hover:bg-accent"
          >
            <Settings className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Settings Panel (slide-in) */}
      {showSettings && (
        <SettingsPanel
          agent={agent as any}
          host={host}
          tierInfo={tierInfo}
          agentTier={agentTier}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Chat Area */}
      {!showSettings && (
        <ChatArea agentId={agentId} agentStatus={agent.status} isAgentOnline={isAgentOnline} />
      )}
    </div>
  );
}

// ============================================================================
// Settings Panel
// ============================================================================

function SettingsPanel({
  agent,
  host,
  tierInfo,
  agentTier,
  onClose,
}: {
  agent: any;
  host: any;
  tierInfo: any;
  agentTier: string | null;
  onClose: () => void;
}) {
  const subscriptionsData = agent.subscriptions || [];
  const activeSubscription = subscriptionsData.find((s: any) => s.status === "active");
  const monthlyCost = activeSubscription ? activeSubscription.pricePerMonth : 0;

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Agent Settings</h2>
          <button
            onClick={onClose}
            className="text-sm text-primary hover:underline"
          >
            ← Back to chat
          </button>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground">Status</p>
            <p className="text-sm font-medium text-foreground capitalize mt-1">{agent.status}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground">Runtime</p>
            <p className="text-sm font-medium text-foreground mt-1">{Math.round((agent.totalUptime || 0) / 3600)}h</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground">Cost</p>
            <p className="text-sm font-medium text-foreground mt-1">
              {monthlyCost > 0 ? `$${(monthlyCost / 100).toFixed(2)}/mo` : "N/A"}
            </p>
          </div>
          {tierInfo && (
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground">Resources</p>
              <p className="text-sm font-medium text-foreground mt-1">
                {tierInfo.ramMb >= 1024 ? `${tierInfo.ramMb / 1024}GB` : `${tierInfo.ramMb}MB`} RAM
              </p>
              <p className="text-xs text-muted-foreground">{tierInfo.cpuCores} CPU • {tierInfo.diskGb}GB</p>
            </div>
          )}
        </div>

        {/* Host Info */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-semibold text-foreground mb-4">Host Information</h3>
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
            {agentTier && (
              <div>
                <span className="text-muted-foreground">Tier</span>
                <p className="text-foreground capitalize">{agentTier}</p>
              </div>
            )}
          </div>
        </div>

        {/* Agent ID */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-semibold text-foreground mb-2">Agent ID</h3>
          <code className="block bg-muted px-3 py-2 rounded-lg text-sm text-primary font-mono break-all">
            {agent.id}
          </code>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Chat Area (Primary View)
// ============================================================================

function ChatArea({
  agentId,
  agentStatus,
  isAgentOnline,
}: {
  agentId: string;
  agentStatus: string;
  isAgentOnline: boolean;
}) {
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [messages, setMessages] = useState<
    Array<{ id: string; agentId: string; role: string; content: string; status: string; createdAt: string }>
  >([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastMessageIdRef = useRef<string | null>(null);

  const clearChat = trpc.messages.clear.useMutation({
    onSuccess: () => {
      setMessages([]);
      lastMessageIdRef.current = null;
      setIsWaitingForResponse(false);
      stopPolling();
    },
  });

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

  const pollStartRef = useRef<number>(0);
  const startPolling = useCallback(() => {
    if (pollTimerRef.current) return;
    pollStartRef.current = Date.now();
    pollTimerRef.current = setInterval(async () => {
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId]);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  useEffect(() => {
    if (shouldAutoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, shouldAutoScroll, isWaitingForResponse]);

  const handleScroll = useCallback(() => {
    const el = chatContainerRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    setShouldAutoScroll(nearBottom);
  }, []);

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

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        void handleSend();
      }
    },
    [handleSend]
  );

  const hasMessages = messages.length > 0;

  return (
    <>
      {/* Messages */}
      <div
        ref={chatContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 md:px-8 py-6"
      >
        {isLoadingMessages ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !hasMessages ? (
          /* Welcome message */
          <div className="flex items-center justify-center h-full">
            <div className="max-w-lg text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Bot className="w-8 h-8 text-primary" />
              </div>
              <div className="bg-card border border-border rounded-2xl rounded-bl-md p-6 text-left">
                <p className="text-foreground mb-4">
                  Welcome! I&apos;m your OpenClaw agent. I have full access to my environment —
                  ask me to install tools, create files, run scripts, or anything else.
                </p>
                <p className="text-sm text-muted-foreground mb-2">Some things to try:</p>
                <ul className="text-sm text-muted-foreground space-y-1.5">
                  <li>• &quot;Install Python 3.12 and pandas&quot;</li>
                  <li>• &quot;Set up a cron job to check my website every hour&quot;</li>
                  <li>• &quot;Install the weather skill&quot;</li>
                  <li>• &quot;Create a startup script that runs on boot&quot;</li>
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role !== "user" && (
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center shrink-0 mt-1">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                    msg.role === "user"
                      ? msg.status === "failed"
                        ? "bg-destructive/10 text-destructive border border-destructive/20 rounded-br-md"
                        : "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-card border border-border text-foreground rounded-bl-md"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
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
                          ? "⏳"
                          : msg.status === "processing"
                          ? "⏳"
                          : msg.status === "delivered"
                          ? "✓"
                          : msg.status === "responded"
                          ? "✓✓"
                          : msg.status === "failed"
                          ? "✕"
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
            ))}
            {isWaitingForResponse && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className="bg-card border border-border text-foreground rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-border bg-card px-4 md:px-8 py-4">
        <div className="max-w-3xl mx-auto">
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
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                rows={1}
                disabled={isSending}
                className="flex-1 bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none text-sm min-h-[44px] max-h-32"
                style={{ height: "auto", overflowY: input.split("\n").length > 3 ? "auto" : "hidden" }}
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
            <p className="text-xs text-destructive mt-2">{sendError}</p>
          )}
        </div>
      </div>
    </>
  );
}
