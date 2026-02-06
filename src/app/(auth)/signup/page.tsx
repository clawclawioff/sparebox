"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { signUp } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc";
import { Server, Cpu, Loader2 } from "lucide-react";
import { PasswordInput } from "@/components/ui/password-input";

function SignupForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialRole = searchParams.get("role") || "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"host" | "user" | "">(
    initialRole === "host" || initialRole === "user" ? initialRole : ""
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // tRPC mutation to set role after signup
  const setRoleMutation = trpc.users.setRole.useMutation();

  const validateForm = (): string | null => {
    if (!role) {
      return "Please select whether you want to host or deploy agents";
    }
    if (password.length < 8) {
      return "Password must be at least 8 characters";
    }
    if (password !== confirmPassword) {
      return "Passwords do not match";
    }
    return null;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Step 1: Create the account
      const { error: signupError } = await signUp.email({
        email,
        password,
        name,
      });

      if (signupError) {
        setError(signupError.message || "Failed to create account");
        setLoading(false);
        return;
      }

      // Step 2: Set the user's role
      // Small delay to ensure session is established
      await new Promise(resolve => setTimeout(resolve, 500));
      
      try {
        await setRoleMutation.mutateAsync({ role: role as "host" | "user" });
      } catch (roleError: unknown) {
        // Role setting failed, but account was created
        console.error("Failed to set role:", roleError);
        // Continue anyway - they can update role in settings or we default to 'user'
      }

      // Step 3: Redirect to dashboard
      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(message);
      setLoading(false);
    }
  };

  const passwordsMatch = password === confirmPassword || confirmPassword === "";
  const passwordError = !passwordsMatch ? "Passwords do not match" : undefined;

  return (
    <div className="w-full max-w-md">
      <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-foreground mb-2">Create your account</h1>
        <p className="text-muted-foreground mb-6">Join the Sparebox network</p>

        <form onSubmit={handleSignup} className="space-y-4">
          {/* Role selection */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              I want to...
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole("host")}
                className={`p-4 rounded-lg border text-left transition ${
                  role === "host"
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:border-border/80 hover:bg-accent"
                }`}
              >
                <Server
                  className={`w-5 h-5 mb-2 ${role === "host" ? "text-primary" : "text-muted-foreground"}`}
                />
                <div className={`font-medium ${role === "host" ? "text-foreground" : "text-foreground"}`}>
                  Host agents
                </div>
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
                <Cpu
                  className={`w-5 h-5 mb-2 ${role === "user" ? "text-primary" : "text-muted-foreground"}`}
                />
                <div className={`font-medium ${role === "user" ? "text-foreground" : "text-foreground"}`}>
                  Deploy agents
                </div>
                <div className="text-xs text-muted-foreground mt-1">Run your AI on Sparebox</div>
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-foreground mb-1"
            >
              Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition"
              placeholder="Your name"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-foreground mb-1"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition"
              placeholder="you@example.com"
              required
              disabled={loading}
            />
          </div>

          <PasswordInput
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            hint="Minimum 8 characters"
            minLength={8}
            required
            disabled={loading}
          />

          <PasswordInput
            label="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            error={passwordError}
            required
            disabled={loading}
          />

          {error && (
            <div className="status-error rounded-lg p-3">
              <p className="text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !role || !passwordsMatch}
            className="w-full bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground text-primary-foreground font-medium py-2.5 px-4 rounded-lg transition flex items-center justify-center gap-2 shadow-sm"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating account...
              </>
            ) : (
              "Create account"
            )}
          </button>
        </form>

        <p className="text-muted-foreground text-sm text-center mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:text-primary/80 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-md">
          <div className="bg-card border border-border rounded-2xl p-8 animate-pulse">
            <div className="h-8 bg-muted rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-muted rounded w-1/2 mb-6"></div>
            <div className="space-y-4">
              <div className="h-24 bg-muted rounded"></div>
              <div className="h-10 bg-muted rounded"></div>
              <div className="h-10 bg-muted rounded"></div>
            </div>
          </div>
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
