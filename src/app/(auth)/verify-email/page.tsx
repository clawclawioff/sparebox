"use client";

import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Mail, Loader2, RefreshCw } from "lucide-react";

export default function VerifyEmailPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login");
    }
    if (session?.user?.emailVerified) {
      router.push("/dashboard");
    }
  }, [session, isPending, router]);

  const handleResend = async () => {
    setResending(true);
    try {
      await fetch("/api/auth/send-verification-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: session?.user?.email,
          callbackURL: "/email-verified",
        }),
      });
      setResent(true);
      setTimeout(() => setResent(false), 5000);
    } catch (err) {
      console.error("Failed to resend:", err);
    } finally {
      setResending(false);
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
      <div className="bg-card border border-border rounded-2xl p-8 shadow-sm text-center">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <Mail className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Check your email</h1>
        <p className="text-muted-foreground mb-6">
          We sent a verification link to{" "}
          <span className="text-foreground font-medium">{session?.user?.email}</span>.
          Click the link to verify your account.
        </p>
        
        <button
          onClick={handleResend}
          disabled={resending || resent}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground text-primary-foreground font-medium rounded-lg transition"
        >
          {resending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Sending...
            </>
          ) : resent ? (
            <>
              <RefreshCw className="w-4 h-4" />
              Email sent!
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Resend verification email
            </>
          )}
        </button>

        <p className="text-xs text-muted-foreground mt-6">
          Didn't receive it? Check your spam folder or try resending.
        </p>
      </div>
    </div>
  );
}
