import Link from "next/link";
import { Server } from "lucide-react";
import { requireGuest } from "@/lib/auth/guards";

/**
 * Auth Layout - For login/signup pages
 * 
 * This layout:
 * 1. Redirects authenticated users to /dashboard
 * 2. Provides a clean centered layout for auth forms
 */
export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Redirect if user is already logged in
  await requireGuest({ redirectTo: "/dashboard" });

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <nav className="p-6">
        <Link href="/" className="flex items-center gap-2 w-fit">
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center">
            <Server className="w-5 h-5 text-black" />
          </div>
          <span className="font-bold text-xl text-white">Sparebox</span>
        </Link>
      </nav>
      <div className="flex-1 flex items-center justify-center p-6">
        {children}
      </div>
    </div>
  );
}
