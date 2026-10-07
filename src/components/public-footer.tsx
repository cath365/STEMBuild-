import Link from "next/link";
import { Brand } from "@/components/brand";

export function PublicFooter() {
  return <footer className="public-footer container"><div><Brand /><p>Learn it. Build it. Test it. Understand it.</p></div><nav aria-label="Footer navigation"><Link href="/3d-lab">3D Lab</Link><Link href="/learning-paths/first-robot">First robot path</Link><Link href="/projects">Projects</Link><Link href="/components">Components</Link><Link href="/showcase/smart-environment-monitor">Sample lesson</Link><Link href="/teachers">Teacher guide</Link><Link href="/about">About &amp; impact</Link></nav></footer>;
}
