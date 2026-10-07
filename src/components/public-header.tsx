import Link from "next/link";
import { Brand } from "@/components/brand";

export function PublicHeader() {
  return <header className="public-header"><div className="container"><Brand /><nav aria-label="Main navigation"><Link href="/showcase/smart-environment-monitor">Sample lesson</Link><Link href="/teachers">For teachers</Link><Link href="/about">About &amp; impact</Link></nav><Link className="btn" href="/">Back to home</Link></div></header>;
}
