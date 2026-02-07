"use client";

import { CheckCircle } from "lucide-react";
import Link from "next/link";

export default function EmailVerifiedPage() {
  return (
    <div className="w-full max-w-md">
      <div className="bg-card border border-border rounded-2xl p-8 shadow-sm text-center">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Email verified!
        </h1>
        <p className="text-muted-foreground mb-6">
          Your email has been verified successfully. You can close this tab and
          return to the one where you signed up — it will update automatically.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
