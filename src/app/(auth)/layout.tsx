import { requireGuest } from "@/lib/auth/guards";
import { SpareboxLogo } from "@/components/sparebox-logo";

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
        <div className="w-fit">
          <SpareboxLogo variant="full" size="md" href="/" />
        </div>
      </nav>
      <div className="relative z-10 flex-1 flex items-center justify-center p-6">
        {children}
      </div>
    </div>
  );
}
