import Link from "next/link";
import { Brand } from "@/components/brand";

export function PublicFooter() {
  return <footer className="public-footer container"><div><Brand /><p>Practical skills. Observable evidence. Teacher feedback.</p></div><nav aria-label="Footer navigation"><Link href="/showcase/smart-environment-monitor">Sample lesson</Link><Link href="/teachers">Teacher guide</Link><Link href="/about">About &amp; impact</Link></nav></footer>;
}
