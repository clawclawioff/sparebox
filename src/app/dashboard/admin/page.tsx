import { requireAuth } from "@/lib/auth/guards";
import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/admin-dashboard";

/**
 * Admin Dashboard Page
 *
 * Server-side auth check ensures only admin users can access.
 * All data fetching happens client-side via tRPC.
 */
export default async function AdminPage() {
  const session = await requireAuth();

  if (session.user.role !== "admin") {
    redirect("/dashboard");
  }

  return <AdminDashboard />;
}
