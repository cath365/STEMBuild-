import { DashboardNav } from "@/components/dashboard-nav";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return <div className="dashboard-shell"><DashboardNav role={user.role} name={user.displayName}/><main className="main">{children}</main></div>;
}
