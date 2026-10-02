import Link from "next/link";
import { Brand } from "@/components/brand";
import { SharedDeviceSignOut } from "@/components/shared-device-signout";
import { PwaInstallButton } from "@/components/pwa-install-button";

const links = {
  STUDENT: [
    ["Overview", "/dashboard/student"], ["Learning path", "/dashboard/student/learning-path"], ["AI Lab Coach", "/dashboard/student/ai-lab-coach"], ["Projects", "/dashboard/student/projects"], ["Progress", "/dashboard/student/progress"],
  ],
  TEACHER: [
    ["Overview", "/dashboard/teacher"], ["Classes", "/dashboard/teacher/classes"], ["Reviews", "/dashboard/teacher/reviews"], ["Analytics", "/dashboard/teacher/analytics"],
  ],
  ADMIN: [
    ["Overview", "/dashboard/admin"], ["Users", "/dashboard/admin/users"], ["Schools", "/dashboard/admin/schools"], ["Curriculum", "/dashboard/admin/curriculum"], ["Hardware", "/dashboard/admin/hardware"], ["Rubrics", "/dashboard/admin/rubrics"], ["Skills", "/dashboard/admin/skills"], ["Outcomes", "/dashboard/admin/outcomes"],
  ],
} as const;

export function DashboardNav({ role, name, learnerId }: { role: keyof typeof links; name: string; learnerId?: string }) {
  return <aside className="sidebar">
    <Brand />
    <nav className="nav">{links[role].map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}</nav>
    <div className="sidebar-footer">
      <PwaInstallButton />
      <div className="small muted" style={{marginBottom:10}}>{name}<br />{role.toLowerCase()}</div>
      <SharedDeviceSignOut learnerId={learnerId}/>
    </div>
  </aside>;
}
