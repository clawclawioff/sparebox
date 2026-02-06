import { requireAuth } from "@/lib/auth/guards";
import { UserDashboard } from "@/components/user-dashboard";
import { HostDashboard } from "@/components/host-dashboard";
import { Rocket } from "lucide-react";

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
      {/* Early Access Banner */}
      <div className="mb-6 bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-start gap-3">
        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
          <Rocket className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="font-medium text-foreground">Early Access</p>
          <p className="text-sm text-muted-foreground mt-0.5">
            Sparebox is in early access. We&apos;re building fast — hosting and deployment will go live soon.
            Thanks for being here early!
          </p>
        </div>
      </div>

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
