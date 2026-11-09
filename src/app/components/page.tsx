import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import { PageHeader } from "@/components/page-header";
import { ComponentBrowser } from "@/components/component-browser";
import { componentCatalog } from "@/lib/build-catalog";

export const metadata: Metadata = {
  title: "Component Library",
  description: "Explore microcontrollers, sensors, motors, displays, communication modules, power parts and other STEMBuild components.",
};

export default function ComponentsPage() {
  return <div>
    <PublicHeader />
    <main>
      <PageHeader
        crumbs={[{ label: "Home", href: "/" }, { label: "Components" }]}
        title="Component library"
        description={`${componentCatalog.length} parts with voltages, interfaces and safety notes. Tick the ones in your kit to see which projects you can build.`}
      />
      <section className="container section">
        <div className="card start-banner">
          <div>
            <div className="eyebrow">New to electronics?</div>
            <h2 style={{ marginTop: 6 }}>Learn them in order, wired to your board</h2>
            <p className="small muted">Every component has a lesson: how it works, wiring for Arduino Uno, Nano, Mega, ESP32 or Raspberry Pi Pico, working code and a quick check. The roadmap puts them in the order engineers learn them.</p>
          </div>
          <Link className="btn btn-primary" href="/start">Start the roadmap</Link>
        </div>
        <ComponentBrowser />
      </section>
    </main>
    <PublicFooter />
  </div>;
}
