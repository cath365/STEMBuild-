"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Brand } from "@/components/brand";

// Five destinations; secondary pages (robot path, sample lesson, about) live in the footer.
const links = [
  { label: "Projects", href: "/projects", also: ["/build", "/learning-paths", "/showcase", "/learn"] },
  { label: "Maker Studio", href: "/studio" },
  { label: "Virtual lab", href: "/tools", also: ["/hardware-monitor"] },
  { label: "3D Lab", href: "/3d-lab" },
  { label: "Components", href: "/components" },
  { label: "For teachers", href: "/teachers", also: ["/about"] },
];

function isActive(pathname: string, link: (typeof links)[number]) {
  return [link.href, ...(link.also ?? [])].some((href) => pathname === href || pathname.startsWith(`${href}/`));
}

export function PublicHeader() {
  const pathname = usePathname() ?? "";
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return <header className="public-header">
    <div className="container">
      <Brand />
      <button type="button" className="public-menu-toggle" aria-expanded={open} aria-controls="public-nav" onClick={() => setOpen((value) => !value)}>
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">{open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}</svg><span className="public-menu-label">{open ? "Close" : "Menu"}</span>
      </button>
      <nav id="public-nav" aria-label="Main navigation" data-open={open}>
        {links.map((link) => <Link key={link.href} href={link.href} aria-current={isActive(pathname, link) ? "page" : undefined} onClick={() => setOpen(false)}>{link.label}</Link>)}
      </nav>
      {pathname === "/login" ? null : <Link className="btn btn-primary public-signin" href="/login">Sign in</Link>}
    </div>
  </header>;
}
