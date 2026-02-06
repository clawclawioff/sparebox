import { requireAuth } from "@/lib/auth/guards";
import { UserDashboard } from "@/components/user-dashboard";
import { HostDashboard } from "@/components/host-dashboard";

/**
 * Dashboard Overview Page
 * 
 * Shows role-specific content:
 * - Users see their agents, costs, and deployment options
 * - Hosts see their machines, earnings, and hosted agents
 */
export default async function DashboardPage() {
  const session = await requireAuth();
  const user = session.user;
  const isHost = user.role === "host" || user.role === "admin";

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back{user.name ? `, ${user.name.split(" ")[0]}` : ""}
        </h1>
        <p className="text-muted-foreground mt-1">
          {isHost
            ? "Manage your machines and track earnings"
            : "Deploy and monitor your AI agents"}
        </p>
      </div>

      {isHost ? (
        <HostDashboard userId={user.id} />
      ) : (
        <UserDashboard userId={user.id} />
      )}
    </div>
  );
}
