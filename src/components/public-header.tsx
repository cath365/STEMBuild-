import Link from "next/link";
import { Brand } from "@/components/brand";

export function PublicHeader() {
  return <header className="public-header"><div className="container"><Brand /><nav aria-label="Main navigation"><Link href="/#topics">Learning areas</Link><Link href="/#boards">Our boards</Link><Link href="/#teachers">For teachers</Link></nav><Link className="btn" href="/">Back to home</Link></div></header>;
}
