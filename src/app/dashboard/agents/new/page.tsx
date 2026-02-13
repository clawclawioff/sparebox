"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Cpu,
  HardDrive,
  MemoryStick,
  Eye,
  EyeOff,
  KeyRound,
  MessageSquare,
} from "lucide-react";
import { TIERS, type TierKey } from "@/lib/constants";

const TIER_ICONS: Record<TierKey, string> = {
  lite: "⚡",
  standard: "🚀",
  pro: "💎",
  compute: "🔥",
};

function getTierPrice(host: Record<string, unknown>, tier: TierKey): number | null {
  const priceMap: Record<TierKey, string> = {
    lite: "priceLite",
    standard: "priceStandard",
    pro: "pricePro",
    compute: "priceCompute",
  };
  const key = priceMap[tier];
  const val = host[key];
  if (typeof val === "number" && val > 0) return val;
  // Fallback for standard tier to pricePerMonth
  if (tier === "standard" && typeof host.pricePerMonth === "number") return host.pricePerMonth as number;
  return null;
}

export default function DeployAgentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedHostId = searchParams.get("hostId");

  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [selectedTier, setSelectedTier] = useState<TierKey>("standard");
  const [selectedHostId, setSelectedHostId] = useState(preselectedHostId || "");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [error, setError] = useState("");

  const { data: hosts } = trpc.hosts.listAvailable.useQuery();
  const createCheckout = trpc.billing.createCheckoutSession.useMutation();

  // Filter hosts that offer the selected tier
  const availableHosts = hosts?.filter((h) => {
    const price = getTierPrice(h as unknown as Record<string, unknown>, selectedTier);
    return price !== null && price > 0;
  });

  const selectedHost = hosts?.find((h) => h.id === selectedHostId);
  const selectedPrice = selectedHost
    ? getTierPrice(selectedHost as unknown as Record<string, unknown>, selectedTier)
    : null;

  const canProceedStep1 = name.trim().length >= 1;
  const canProceedStep2 = !!selectedHostId;
  // Step 3 (config) is always optional
  const totalSteps = 4;

  const handleDeploy = async () => {
    if (!selectedHostId || !name.trim()) return;

    setIsDeploying(true);
    setError("");

    try {
      const result = await createCheckout.mutateAsync({
        agentName: name.trim().toLowerCase().replace(/\s+/g, "-"),
        hostId: selectedHostId,
        tier: selectedTier,
      });

      if (result.url) {
        window.location.href = result.url;
      } else {
        setError("Failed to create checkout session");
        setIsDeploying(false);
      }
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Failed to start checkout";
      setError(message);
      setIsDeploying(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        href="/dashboard/agents"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Agents
      </Link>

      <h1 className="text-2xl font-bold text-foreground mb-2">Deploy a New Agent</h1>
      <p className="text-muted-foreground mb-8">
        Get your AI agent running in minutes
      </p>

      {/* Progress */}
      <div className="flex items-center gap-2 mb-8">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step > s
                  ? "bg-primary text-primary-foreground"
                  : step === s
                  ? "bg-primary/20 text-primary border border-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {step > s ? <Check className="w-4 h-4" /> : s}
            </div>
            {s < totalSteps && (
              <div
                className={`w-12 h-0.5 ${
                  step > s ? "bg-primary" : "bg-muted"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Agent Name + Tier Selection */}
      {step === 1 && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-1">
            Step 1: Agent Details & Tier
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Name your agent and choose a resource tier
          </p>

          <div className="space-y-6">
            {/* Agent name */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Agent Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="my-assistant"
                className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                Lowercase letters, numbers, and hyphens only
              </p>
            </div>

            {/* Tier selection */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-3">
                Resource Tier *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(Object.entries(TIERS) as [TierKey, (typeof TIERS)[TierKey]][]).map(
                  ([key, tier]) => (
                    <label
                      key={key}
                      className={`relative flex flex-col p-4 border rounded-xl cursor-pointer transition-all ${
                        selectedTier === key
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border hover:border-border/80 hover:bg-accent"
                      }`}
                    >
                      <input
                        type="radio"
                        name="tier"
                        value={key}
                        checked={selectedTier === key}
                        onChange={() => {
                          setSelectedTier(key);
                          // Reset host if current host doesn't offer new tier
                          setSelectedHostId("");
                        }}
                        className="sr-only"
                      />
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{TIER_ICONS[key]}</span>
                        <span className="font-semibold text-foreground">
                          {tier.name}
                        </span>
                        {key === "standard" && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                            Popular
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mb-2">
                        <span className="flex items-center gap-1">
                          <MemoryStick className="w-3 h-3" />
                          {tier.ramMb >= 1024
                            ? `${tier.ramMb / 1024}GB`
                            : `${tier.ramMb}MB`}{" "}
                          RAM
                        </span>
                        <span className="flex items-center gap-1">
                          <Cpu className="w-3 h-3" />
                          {tier.cpuCores} CPU
                        </span>
                        <span className="flex items-center gap-1">
                          <HardDrive className="w-3 h-3" />
                          {tier.diskGb}GB disk
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {tier.description}
                      </p>
                      {selectedTier === key && (
                        <div className="absolute top-3 right-3">
                          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                            <Check className="w-3 h-3 text-primary-foreground" />
                          </div>
                        </div>
                      )}
                    </label>
                  )
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <button
              onClick={() => setStep(2)}
              disabled={!canProceedStep1}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground text-primary-foreground font-medium rounded-lg transition-colors"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Select Host */}
      {step === 2 && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-1">
            Step 2: Select Host
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Choose where your{" "}
            <span className="font-medium text-foreground">
              {TIERS[selectedTier].name}
            </span>{" "}
            agent will run
          </p>

          {!availableHosts || availableHosts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground text-sm">
                No hosts currently offer the{" "}
                <span className="font-medium">{TIERS[selectedTier].name}</span>{" "}
                tier. Try a different tier or check back later.
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {availableHosts.map((host) => {
                const tierPrice = getTierPrice(
                  host as unknown as Record<string, unknown>,
                  selectedTier
                );
                return (
                  <label
                    key={host.id}
                    className={`flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedHostId === host.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-border/80 hover:bg-accent"
                    }`}
                  >
                    <input
                      type="radio"
                      name="host"
                      value={host.id}
                      checked={selectedHostId === host.id}
                      onChange={(e) => setSelectedHostId(e.target.value)}
                      className="sr-only"
                    />
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        selectedHostId === host.id
                          ? "border-primary"
                          : "border-muted-foreground/40"
                      }`}
                    >
                      {selectedHostId === host.id && (
                        <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground">
                          {host.name}
                        </span>
                        <span className="text-primary font-medium">
                          ${((tierPrice || 0) / 100).toFixed(0)}/mo
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {host.cpuCores} cores • {host.ramGb}GB RAM •{" "}
                        {host.city || host.region || "Unknown location"} •{" "}
                        {host.uptimePercent?.toFixed(1)}% uptime
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          )}

          <div className="flex justify-between mt-6">
            <button
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-2 px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!canProceedStep2}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground text-primary-foreground font-medium rounded-lg transition-colors"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Agent Configuration */}
      {step === 3 && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-1">
            Step 3: Agent Configuration
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Quick setup — you can change these later
          </p>

          <div className="space-y-5">
            {/* System prompt */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                System Prompt
              </label>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="You are a helpful assistant that..."
                rows={5}
                className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                Define your agent&apos;s personality and instructions
              </p>
            </div>

            {/* LLM API Key */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                <KeyRound className="w-4 h-4 text-muted-foreground" />
                LLM API Key
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full bg-background border border-border rounded-lg px-4 py-2.5 pr-10 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showApiKey ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                Your API key for Anthropic, OpenAI, or other providers. Stored encrypted.
              </p>
            </div>
          </div>

          <div className="flex justify-between mt-6">
            <button
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-2 px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setStep(4)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Skip for now
              </button>
              <button
                onClick={() => setStep(4)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Review & Deploy */}
      {step === 4 && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-1">
            Step 4: Review & Deploy
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Confirm your deployment details
          </p>

          {error && (
            <div className="status-error rounded-lg p-4 mb-6">
              <p className="text-sm">{error}</p>
            </div>
          )}

          <div className="bg-muted/50 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-medium text-foreground mb-3">
              Order Summary
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Agent</span>
                <span className="text-foreground font-medium">{name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tier</span>
                <span className="text-foreground font-medium">
                  {TIER_ICONS[selectedTier]} {TIERS[selectedTier].name}
                  <span className="text-muted-foreground font-normal ml-1.5">
                    ({TIERS[selectedTier].ramMb >= 1024
                      ? `${TIERS[selectedTier].ramMb / 1024}GB`
                      : `${TIERS[selectedTier].ramMb}MB`}{" "}
                    RAM, {TIERS[selectedTier].cpuCores} CPU)
                  </span>
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Host</span>
                <span className="text-foreground">{selectedHost?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Location</span>
                <span className="text-foreground">
                  {selectedHost?.city || selectedHost?.region || "—"}
                </span>
              </div>
              {systemPrompt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">System Prompt</span>
                  <span className="text-foreground text-right max-w-[60%] truncate">
                    {systemPrompt.slice(0, 60)}
                    {systemPrompt.length > 60 ? "..." : ""}
                  </span>
                </div>
              )}
              {apiKey && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">API Key</span>
                  <span className="text-foreground font-mono">
                    {apiKey.slice(0, 7)}...{apiKey.slice(-4)}
                  </span>
                </div>
              )}
              <div className="border-t border-border my-3" />
              <div className="flex justify-between font-medium">
                <span className="text-foreground">Monthly subscription</span>
                <span className="text-primary">
                  ${((selectedPrice || 0) / 100).toFixed(2)}/mo
                </span>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground mb-6">
            By deploying, you agree to our{" "}
            <Link href="/terms-of-service" className="text-primary hover:underline">
              Terms of Service
            </Link>
          </p>

          <div className="flex justify-between">
            <button
              onClick={() => setStep(3)}
              className="inline-flex items-center gap-2 px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <button
              onClick={handleDeploy}
              disabled={isDeploying}
              className="inline-flex items-center gap-2 px-6 py-2 bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-primary-foreground font-medium rounded-lg transition-colors"
            >
              {isDeploying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Redirecting to payment...
                </>
              ) : (
                <>
                  Deploy Agent — $
                  {((selectedPrice || 0) / 100).toFixed(2)}/mo
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
