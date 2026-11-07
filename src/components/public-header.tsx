"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Brand } from "@/components/brand";

const links = [
  { label: "3D Lab", href: "/3d-lab" },
  { label: "Virtual lab", href: "/tools", also: ["/hardware-monitor"] },
  { label: "First robot path", href: "/learning-paths/first-robot" },
  { label: "Projects", href: "/projects", also: ["/build"] },
  { label: "Components", href: "/components" },
  { label: "Sample lesson", href: "/showcase/smart-environment-monitor" },
  { label: "For teachers", href: "/teachers" },
  { label: "About", href: "/about" },
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
        <span aria-hidden="true">{open ? "✕" : "☰"}</span><span className="public-menu-label">{open ? "Close" : "Menu"}</span>
      </button>
      <nav id="public-nav" aria-label="Main navigation" data-open={open}>
        {links.map((link) => <Link key={link.href} href={link.href} aria-current={isActive(pathname, link) ? "page" : undefined} onClick={() => setOpen(false)}>{link.label}</Link>)}
      </nav>
      {pathname === "/login" ? null : <Link className="btn btn-primary public-signin" href="/login">Sign in</Link>}
    </div>
  </header>;
}
