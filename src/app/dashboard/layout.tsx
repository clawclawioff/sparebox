import { requireAuth } from "@/lib/auth/guards";
import { DashboardShell } from "./components/dashboard-shell";

/**
 * Dashboard Layout - Protected by server-side auth
 * 
 * This layout:
 * 1. Requires authentication (redirects to /login if not)
 * 2. Passes verified session to DashboardShell
 * 3. Provides consistent sidebar navigation
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side auth check - redirects if not logged in
  const session = await requireAuth();

  return (
    <DashboardShell 
      user={{
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
        role: session.user.role,
      }}
    >
      {children}
    </DashboardShell>
  );
}
