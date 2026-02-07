"use client";

import { useSession } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Server, Cpu, Loader2 } from "lucide-react";

export default function RoleSelectionPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [role, setRole] = useState<"host" | "user" | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const setRoleMutation = trpc.users.setInitialRole.useMutation();

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login");
      return;
    }
    // If user already has a non-default role, skip to dashboard
    const userRole = (session?.user as any)?.role;
    if (userRole && userRole !== "user") {
      router.push("/dashboard");
    }
  }, [session, isPending, router]);

  const handleSubmit = async () => {
    if (!role) return;
    setLoading(true);
    setError("");

    try {
      await setRoleMutation.mutateAsync({ role });
      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to set role";
      // If role was already set (race condition), just go to dashboard
      if (message.includes("already been set")) {
        router.push("/dashboard");
        return;
      }
      setError(message);
      setLoading(false);
    }
  };

  if (isPending) {
    return (
      <div className="w-full max-w-md flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-foreground mb-2">Welcome to Sparebox!</h1>
        <p className="text-muted-foreground mb-6">
          One last thing — what do you want to do on Sparebox?
        </p>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            type="button"
            onClick={() => setRole("host")}
            className={`p-4 rounded-lg border text-left transition ${
              role === "host"
                ? "border-primary bg-primary/10"
                : "border-border bg-card hover:border-border/80 hover:bg-accent"
            }`}
          >
            <Server className={`w-5 h-5 mb-2 ${role === "host" ? "text-primary" : "text-muted-foreground"}`} />
            <div className="font-medium text-foreground">Host agents</div>
            <div className="text-xs text-muted-foreground mt-1">Earn money with your hardware</div>
          </button>
          <button
            type="button"
            onClick={() => setRole("user")}
            className={`p-4 rounded-lg border text-left transition ${
              role === "user"
                ? "border-primary bg-primary/10"
                : "border-border bg-card hover:border-border/80 hover:bg-accent"
            }`}
          >
            <Cpu className={`w-5 h-5 mb-2 ${role === "user" ? "text-primary" : "text-muted-foreground"}`} />
            <div className="font-medium text-foreground">Deploy agents</div>
            <div className="text-xs text-muted-foreground mt-1">Run your AI on Sparebox</div>
          </button>
        </div>

        {error && (
          <div className="status-error rounded-lg p-3 mb-4">
            <p className="text-sm">{error}</p>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || !role}
          className="w-full bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground text-primary-foreground font-medium py-2.5 px-4 rounded-lg transition flex items-center justify-center gap-2 shadow-sm"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Setting up...
            </>
          ) : (
            "Continue"
          )}
        </button>
      </div>
    </div>
  );
}
