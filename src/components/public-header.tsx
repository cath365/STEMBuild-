import Link from "next/link";
import { Brand } from "@/components/brand";

export function PublicHeader() {
  return <header className="public-header"><div className="container"><Brand /><nav aria-label="Main navigation"><Link href="/3d-lab">3D Lab</Link><Link href="/learning-paths/first-robot">First robot path</Link><Link href="/projects">Projects</Link><Link href="/components">Components</Link><Link href="/showcase/smart-environment-monitor">Sample lesson</Link><Link href="/teachers">For teachers</Link><Link href="/about">About</Link></nav><Link className="btn" href="/">Home</Link></div></header>;
}
