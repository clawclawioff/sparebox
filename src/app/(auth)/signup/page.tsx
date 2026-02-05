"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Server, Cpu } from "lucide-react";

function SignupForm() {
  const searchParams = useSearchParams();
  const initialRole = searchParams.get("role") || "";
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"host" | "user" | "">(
    initialRole === "host" || initialRole === "user" ? initialRole : ""
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) {
      setError("Please select whether you want to host or deploy agents");
      return;
    }

    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role,
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <div className="w-full max-w-md">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center">
          <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Check your email</h1>
          <p className="text-gray-400">
            We&apos;ve sent a confirmation link to <strong className="text-white">{email}</strong>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
        <h1 className="text-2xl font-bold text-white mb-2">Create your account</h1>
        <p className="text-gray-400 mb-6">Join the Sparebox network</p>

        <form onSubmit={handleSignup} className="space-y-4">
          {/* Role selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              I want to...
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole("host")}
                className={`p-4 rounded-lg border text-left transition ${
                  role === "host"
                    ? "border-emerald-500 bg-emerald-500/10"
                    : "border-gray-700 bg-gray-800 hover:border-gray-600"
                }`}
              >
                <Server className={`w-5 h-5 mb-2 ${role === "host" ? "text-emerald-400" : "text-gray-400"}`} />
                <div className={`font-medium ${role === "host" ? "text-white" : "text-gray-300"}`}>
                  Host agents
                </div>
                <div className="text-xs text-gray-500 mt-1">Earn money</div>
              </button>
              <button
                type="button"
                onClick={() => setRole("user")}
                className={`p-4 rounded-lg border text-left transition ${
                  role === "user"
                    ? "border-emerald-500 bg-emerald-500/10"
                    : "border-gray-700 bg-gray-800 hover:border-gray-600"
                }`}
              >
                <Cpu className={`w-5 h-5 mb-2 ${role === "user" ? "text-emerald-400" : "text-gray-400"}`} />
                <div className={`font-medium ${role === "user" ? "text-white" : "text-gray-300"}`}>
                  Deploy agents
                </div>
                <div className="text-xs text-gray-500 mt-1">Run your AI</div>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="••••••••"
              minLength={8}
              required
            />
            <p className="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-2 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="text-gray-400 text-sm text-center mt-6">
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
    <Suspense fallback={
      <div className="w-full max-w-md">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 animate-pulse">
          <div className="h-8 bg-gray-800 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-800 rounded w-1/2 mb-6"></div>
          <div className="space-y-4">
            <div className="h-24 bg-gray-800 rounded"></div>
            <div className="h-10 bg-gray-800 rounded"></div>
            <div className="h-10 bg-gray-800 rounded"></div>
          </div>
        </div>
      </div>
    }>
      <SignupForm />
    </Suspense>
  );
}
