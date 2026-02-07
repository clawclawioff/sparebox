import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { SpareboxLogo } from "@/components/sparebox-logo";

/**
 * Auth Layout - For login/signup pages
 * 
 * This layout:
 * 1. Redirects authenticated users to /dashboard (except for verify-email and onboarding)
 * 2. Provides a clean centered layout for auth forms
 */
export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || "";
  
  // Allow logged-in users on these paths (they need the session)
  const allowAuthenticatedPaths = ["/verify-email", "/onboarding"];
  const isAllowedPath = allowAuthenticatedPaths.some(p => pathname.startsWith(p));
  
  // Redirect logged-in verified users away from auth pages (unless on allowed path)
  if (session && !isAllowedPath) {
    redirect("/dashboard");
  }

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
