"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";

export default function DeployAgentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedHostId = searchParams.get("hostId");

  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [selectedHostId, setSelectedHostId] = useState(preselectedHostId || "");
  const [isDeploying, setIsDeploying] = useState(false);
  const [error, setError] = useState("");

  const { data: hosts } = trpc.hosts.listAvailable.useQuery();
  const createCheckout = trpc.billing.createCheckoutSession.useMutation();

  const selectedHost = hosts?.find((h) => h.id === selectedHostId);

  const canProceedStep1 = name.trim().length >= 1;
  const canProceedStep2 = !!selectedHostId;

  const handleDeploy = async () => {
    if (!selectedHostId || !name.trim()) return;

    setIsDeploying(true);
    setError("");

    try {
      const result = await createCheckout.mutateAsync({
        agentName: name.trim().toLowerCase().replace(/\s+/g, "-"),
        hostId: selectedHostId,
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
        {[1, 2, 3].map((s) => (
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
            {s < 3 && (
              <div
                className={`w-12 h-0.5 ${
                  step > s ? "bg-primary" : "bg-muted"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Agent Details */}
      {step === 1 && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-1">
            Step 1: Agent Details
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Give your agent a name to identify it
          </p>

          <div className="space-y-4">
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

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                OpenClaw Version
              </label>
              <select className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="latest">Latest (v2.1.0)</option>
                <option value="2.0.0">v2.0.0</option>
              </select>
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
            Choose where your agent will run
          </p>

          <div className="space-y-3 max-h-80 overflow-y-auto">
            {hosts?.map((host) => (
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
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedHostId === host.id
                      ? "border-primary"
                      : "border-muted-foreground/40"
                  }`}
                >
                  {selectedHostId === host.id && (
                    <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">{host.name}</span>
                    <span className="text-primary font-medium">
                      ${((host.pricePerMonth || 0) / 100).toFixed(0)}/mo
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {host.cpuCores} cores • {host.ramGb}GB RAM •{" "}
                    {host.city || host.region || "Unknown location"} •{" "}
                    {host.uptimePercent?.toFixed(1)}% uptime
                  </p>
                </div>
              </label>
            ))}
          </div>

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

      {/* Step 3: Review & Deploy */}
      {step === 3 && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-1">
            Step 3: Review & Deploy
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
                <span className="text-foreground">{name}</span>
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
              <div className="border-t border-border my-3" />
              <div className="flex justify-between font-medium">
                <span className="text-foreground">Monthly subscription</span>
                <span className="text-primary">
                  ${((selectedHost?.pricePerMonth || 0) / 100).toFixed(2)}/mo
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
              onClick={() => setStep(2)}
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
                  {((selectedHost?.pricePerMonth || 0) / 100).toFixed(2)}/mo
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
