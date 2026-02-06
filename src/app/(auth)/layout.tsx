import Link from "next/link";
import { Box } from "lucide-react";
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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Subtle gradient background */}
      <div className="fixed inset-0 gradient-page pointer-events-none" />
      
      <nav className="relative z-10 p-6">
        <Link href="/" className="flex items-center gap-2 w-fit">
          <div className="w-8 h-8 gradient-brand rounded-lg flex items-center justify-center shadow-sm">
            <Box className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-xl text-foreground">Sparebox</span>
        </Link>
      </nav>
      <div className="relative z-10 flex-1 flex items-center justify-center p-6">
        {children}
      </div>
    </div>
  );
}
