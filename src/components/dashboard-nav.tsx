"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brand } from "@/components/brand";
import { SharedDeviceSignOut } from "@/components/shared-device-signout";
import { PwaInstallButton } from "@/components/pwa-install-button";

const links = {
  STUDENT: [
    ["Overview", "/dashboard/student"], ["Learning path", "/dashboard/student/learning-path"], ["Build library", "/projects"], ["Components", "/components"], ["AI Lab Coach", "/dashboard/student/ai-lab-coach"], ["Projects", "/dashboard/student/projects"], ["Progress", "/dashboard/student/progress"],
  ],
  TEACHER: [
    ["Overview", "/dashboard/teacher"], ["Classes", "/dashboard/teacher/classes"], ["Reviews", "/dashboard/teacher/reviews"], ["Analytics", "/dashboard/teacher/analytics"],
  ],
  ADMIN: [
    ["Overview", "/dashboard/admin"], ["Users", "/dashboard/admin/users"], ["Schools", "/dashboard/admin/schools"], ["Curriculum", "/dashboard/admin/curriculum"], ["Hardware", "/dashboard/admin/hardware"], ["Visual media", "/dashboard/admin/hardware/visuals"], ["Board variants", "/dashboard/admin/hardware/variants"], ["Rubrics", "/dashboard/admin/rubrics"], ["Skills", "/dashboard/admin/skills"], ["Outcomes", "/dashboard/admin/outcomes"],
  ],
} as const;

export function DashboardNav({ role, name, learnerId }: { role: keyof typeof links; name: string; learnerId?: string }) {
  const pathname = usePathname();
  const activeHref = links[role].find(([, href]) => pathname === href)?.[1] ?? [...links[role]].reverse().find(([label, href]) => label !== "Overview" && pathname.startsWith(`${href}/`))?.[1];
  return <aside className="sidebar">
    <Brand />
    <div className="workspace-label">{role === "STUDENT" ? "Learner workspace" : role === "TEACHER" ? "Teacher workspace" : "Administration"}</div>
    <nav className="nav" aria-label="Workspace navigation">{links[role].map(([label, href]) => {
      const active = activeHref === href;
      return <Link key={href} href={href} aria-current={active ? "page" : undefined}>{label}</Link>;
    })}</nav>
    <div className="sidebar-footer">
      <PwaInstallButton />
      <div className="small muted" style={{marginBottom:10}}>{name}<br />{role.toLowerCase()}</div>
      <SharedDeviceSignOut learnerId={learnerId}/>
    </div>
  </aside>;
}
