import type { Metadata } from "next";
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
        <ComponentBrowser />
      </section>
    </main>
    <PublicFooter />
  </div>;
}
