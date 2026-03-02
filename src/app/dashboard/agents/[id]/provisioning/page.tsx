"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useCallback, useRef } from "react";
import { Loader2, CheckCircle2, Circle, AlertCircle, RotateCw, Rocket } from "lucide-react";

const STAGES: readonly { key: string; label: string; alwaysComplete?: boolean }[] = [
  { key: "payment", label: "Payment confirmed", alwaysComplete: true },
  { key: "pulling", label: "Preparing container..." },
  { key: "creating", label: "Creating environment" },
  { key: "starting", label: "Starting agent" },
  { key: "health_check", label: "Running health check" },
  { key: "ready", label: "Ready!" },
];

const STAGE_ORDER = STAGES.map((s) => s.key);

function getStageIndex(stage: string | null): number {
  if (!stage) return 0;
  const idx = STAGE_ORDER.indexOf(stage);
  return idx === -1 ? 0 : idx;
}

export default function ProvisioningPage() {
  const params = useParams();
  const router = useRouter();
  const agentId = params.id as string;

  const [currentStage, setCurrentStage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/agents/${agentId}/deploy-status`);
      if (!res.ok) return;
      const data = await res.json();

      if (data.error) {
        setError(data.error);
        if (pollRef.current) clearInterval(pollRef.current);
        return;
      }

      setCurrentStage(data.stage || "pulling");

      if (data.stage === "ready") {
        setIsReady(true);
        if (pollRef.current) clearInterval(pollRef.current);
        // Brief celebration then redirect
        setTimeout(() => {
          router.push(`/dashboard/agents/${agentId}`);
        }, 1500);
      }
    } catch {
      // ignore network errors, will retry
    }
  }, [agentId, router]);

  useEffect(() => {
    void poll();
    pollRef.current = setInterval(poll, 2000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [poll]);

  const handleRetry = () => {
    setError(null);
    setCurrentStage(null);
    void poll();
    pollRef.current = setInterval(poll, 2000);
  };

  const currentIndex = getStageIndex(currentStage);

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="bg-card border border-border rounded-xl p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          {isReady ? (
            <>
              <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Rocket className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="text-xl font-bold text-foreground">Agent Ready! 🎉</h1>
              <p className="text-sm text-muted-foreground mt-1">Redirecting to your agent...</p>
            </>
          ) : error ? (
            <>
              <div className="w-16 h-16 bg-destructive/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
              <h1 className="text-xl font-bold text-foreground">Deployment Failed</h1>
              <p className="text-sm text-destructive mt-1">{error}</p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
              <h1 className="text-xl font-bold text-foreground">Deploying Your Agent</h1>
              <p className="text-sm text-muted-foreground mt-1">This usually takes 1–3 minutes</p>
            </>
          )}
        </div>

        {/* Stage Timeline */}
        <div className="space-y-0 ml-2">
          {STAGES.map((stage, i) => {
            const isComplete = stage.alwaysComplete || i < currentIndex;
            const isCurrent = i === currentIndex && !stage.alwaysComplete && !isReady && !error;
            const isFuture = i > currentIndex;

            return (
              <div key={stage.key} className="flex items-start gap-3">
                {/* Vertical line + icon */}
                <div className="flex flex-col items-center">
                  <div className="shrink-0">
                    {isComplete || (stage.key === "ready" && isReady) ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : isCurrent ? (
                      <Loader2 className="w-5 h-5 text-primary animate-spin" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted-foreground/30" />
                    )}
                  </div>
                  {i < STAGES.length - 1 && (
                    <div
                      className={`w-0.5 h-6 ${
                        isComplete ? "bg-green-600/30" : "bg-border"
                      }`}
                    />
                  )}
                </div>
                {/* Label */}
                <span
                  className={`text-sm pt-0.5 ${
                    isComplete || (stage.key === "ready" && isReady)
                      ? "text-green-600 font-medium"
                      : isCurrent
                      ? "text-foreground font-medium"
                      : "text-muted-foreground/50"
                  }`}
                >
                  {stage.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Error retry */}
        {error && (
          <div className="mt-6 text-center">
            <button
              onClick={handleRetry}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors"
            >
              <RotateCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
