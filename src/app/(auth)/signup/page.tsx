"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { signUp } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc";
import { Server, Cpu, Loader2 } from "lucide-react";

function SignupForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialRole = searchParams.get("role") || "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"host" | "user" | "">(
    initialRole === "host" || initialRole === "user" ? initialRole : ""
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // tRPC mutation to set role after signup
  const setRoleMutation = trpc.users.setRole.useMutation();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) {
      setError("Please select whether you want to host or deploy agents");
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
        await setRoleMutation.mutateAsync({ role });
      } catch (roleError: any) {
        // Role setting failed, but account was created
        console.error("Failed to set role:", roleError);
        // Continue anyway - they can update role in settings or we default to 'user'
      }

      // Step 3: Redirect to dashboard
      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
        <h1 className="text-2xl font-bold text-white mb-2">Create your account</h1>
        <p className="text-zinc-400 mb-6">Join the Sparebox network</p>

        <form onSubmit={handleSignup} className="space-y-4">
          {/* Role selection */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              I want to...
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole("host")}
                className={`p-4 rounded-lg border text-left transition ${
                  role === "host"
                    ? "border-emerald-500 bg-emerald-500/10"
                    : "border-zinc-700 bg-zinc-800 hover:border-zinc-600"
                }`}
              >
                <Server
                  className={`w-5 h-5 mb-2 ${role === "host" ? "text-emerald-400" : "text-zinc-400"}`}
                />
                <div className={`font-medium ${role === "host" ? "text-white" : "text-zinc-300"}`}>
                  Host agents
                </div>
                <div className="text-xs text-zinc-500 mt-1">Earn money with your hardware</div>
              </button>
              <button
                type="button"
                onClick={() => setRole("user")}
                className={`p-4 rounded-lg border text-left transition ${
                  role === "user"
                    ? "border-emerald-500 bg-emerald-500/10"
                    : "border-zinc-700 bg-zinc-800 hover:border-zinc-600"
                }`}
              >
                <Cpu
                  className={`w-5 h-5 mb-2 ${role === "user" ? "text-emerald-400" : "text-zinc-400"}`}
                />
                <div className={`font-medium ${role === "user" ? "text-white" : "text-zinc-300"}`}>
                  Deploy agents
                </div>
                <div className="text-xs text-zinc-500 mt-1">Run your AI on Sparebox</div>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="Your name"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="you@example.com"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="••••••••"
              minLength={8}
              required
              disabled={loading}
            />
            <p className="text-xs text-zinc-500 mt-1">Minimum 8 characters</p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !role}
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-700 disabled:text-zinc-400 text-black font-medium py-2.5 px-4 rounded-lg transition flex items-center justify-center gap-2"
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

        <p className="text-zinc-400 text-sm text-center mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-emerald-400 hover:text-emerald-300">
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
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 animate-pulse">
            <div className="h-8 bg-zinc-800 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-zinc-800 rounded w-1/2 mb-6"></div>
            <div className="space-y-4">
              <div className="h-24 bg-zinc-800 rounded"></div>
              <div className="h-10 bg-zinc-800 rounded"></div>
              <div className="h-10 bg-zinc-800 rounded"></div>
            </div>
          </div>
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
