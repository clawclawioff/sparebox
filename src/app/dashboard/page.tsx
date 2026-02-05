import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Server, Plus, Settings, LogOut } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const role = user.user_metadata?.role || "user";

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-gray-900 border-r border-gray-800 p-4">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
            <Server className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl text-white">Sparebox</span>
        </div>

        <nav className="space-y-1">
          <NavItem href="/dashboard" icon={<Server className="w-5 h-5" />} label="Overview" active />
          {role === "host" ? (
            <NavItem href="/dashboard/machines" icon={<Server className="w-5 h-5" />} label="My Machines" />
          ) : (
            <NavItem href="/dashboard/agents" icon={<Server className="w-5 h-5" />} label="My Agents" />
          )}
          <NavItem href="/dashboard/settings" icon={<Settings className="w-5 h-5" />} label="Settings" />
        </nav>

        <div className="absolute bottom-4 left-4 right-4">
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="w-full flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
            >
              <LogOut className="w-5 h-5" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-64 p-8">
        <div className="max-w-4xl">
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome back
          </h1>
          <p className="text-gray-400 mb-8">
            {role === "host"
              ? "Manage your machines and track earnings"
              : "Deploy and monitor your AI agents"}
          </p>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <StatCard label={role === "host" ? "Active Machines" : "Active Agents"} value="0" />
            <StatCard label={role === "host" ? "Earnings (MTD)" : "Monthly Cost"} value="$0" />
            <StatCard label="Uptime" value="—" />
          </div>

          {/* Empty state */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              {role === "host" ? (
                <Server className="w-8 h-8 text-gray-600" />
              ) : (
                <Server className="w-8 h-8 text-gray-600" />
              )}
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              {role === "host" ? "No machines yet" : "No agents deployed"}
            </h2>
            <p className="text-gray-400 mb-4">
              {role === "host"
                ? "Add your first machine to start earning"
                : "Deploy your first AI agent to get started"}
            </p>
            <Link
              href={role === "host" ? "/dashboard/machines/new" : "/dashboard/agents/new"}
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium px-4 py-2 rounded-lg transition"
            >
              <Plus className="w-5 h-5" />
              {role === "host" ? "Add Machine" : "Deploy Agent"}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

function NavItem({
  href,
  icon,
  label,
  active = false,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition ${
        active
          ? "bg-emerald-500/10 text-emerald-400"
          : "text-gray-400 hover:text-white hover:bg-gray-800"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <p className="text-gray-400 text-sm mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}
