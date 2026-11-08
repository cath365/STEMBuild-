import Link from "next/link";
import { Brand } from "@/components/brand";

const columns: { title: string; links: [string, string][] }[] = [
  { title: "Learn", links: [["Projects", "/projects"], ["First robot path", "/learning-paths/first-robot"], ["Sample lesson", "/showcase/smart-environment-monitor"], ["Component library", "/components"]] },
  { title: "Tools", links: [["3D Lab", "/3d-lab"], ["Virtual electronics lab", "/tools"], ["Virtual Arduino Uno", "/tools/virtual-arduino"], ["Live hardware monitor", "/hardware-monitor"]] },
  { title: "Schools", links: [["Teacher guide", "/teachers"], ["About & impact", "/about"], ["Sign in", "/login"]] },
];

const YEAR = new Date().getFullYear();

export function PublicFooter() {
  return <footer className="site-footer">
    <div className="container site-footer-inner">
      <div className="site-footer-about">
        <Brand />
        <p>Hands-on electronics, robotics and IoT for schools, assessed on what learners actually build.</p>
      </div>
      {columns.map((column) => <nav key={column.title} aria-label={`${column.title} links`}>
        <h2>{column.title}</h2>
        <ul>{column.links.map(([label, href]) => <li key={href}><Link href={href}>{label}</Link></li>)}</ul>
      </nav>)}
    </div>
    <div className="container site-footer-base">
      <span>© {YEAR} STEMBuild</span>
      <span>Built for low-bandwidth classrooms · Works offline for saved lessons</span>
    </div>
  </footer>;
}
