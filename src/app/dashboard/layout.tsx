import { DashboardNav } from "@/components/dashboard-nav";
import { requireUser } from "@/lib/session";
import { StudentDeviceScope } from "@/components/student-device-scope";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return <div className="dashboard-shell">{user.role === "STUDENT" ? <StudentDeviceScope learnerId={user.id}/> : null}<DashboardNav role={user.role} name={user.displayName} learnerId={user.role === "STUDENT" ? user.id : undefined}/><main className="main">{children}</main></div>;
}
