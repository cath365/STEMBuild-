import type { Metadata } from "next";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import { ComponentBrowser } from "@/components/component-browser";

export const metadata: Metadata = {
  title: "Component Library",
  description: "Explore microcontrollers, sensors, motors, displays, communication modules, power parts and other STEMBuild components.",
};

export default function ComponentsPage() {
  return <div>
    <PublicHeader />
    <main>
      <section className="sample-hero">
        <div className="container">
          <div className="eyebrow">STEMBuild COMPONENT LIBRARY</div>
          <h1>Know your parts.<br/><span>Build with confidence.</span></h1>
          <p className="lead">Learn what each component does, how to connect it safely, which boards it works with and what real projects you can build with it.</p>
        </div>
      </section>
      <section className="container section">
        <ComponentBrowser />
      </section>
    </main>
    <PublicFooter />
  </div>;
}
