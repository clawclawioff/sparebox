import { SpareboxLogo } from "@/components/sparebox-logo";

/**
 * Auth Layout - For login, signup, verify-email, onboarding pages
 * 
 * Auth redirects (logged-in users away from login/signup, unauthenticated
 * users away from protected routes) are handled by proxy.ts.
 * This layout just provides the centered UI shell.
 */
export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
