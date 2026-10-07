import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import { ComponentVisualCard } from "@/components/component-visual-card";
import { componentBySlug, componentCatalog, projectsUsingComponent } from "@/lib/build-catalog";

export function generateStaticParams() {
  return componentCatalog.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const item = componentBySlug(slug);
  if (!item) return {};
  return { title: item.name, description: item.summary };
}

export default async function ComponentDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = componentBySlug(slug);
  if (!item) notFound();
  const projects = projectsUsingComponent(item.slug);

  return <div>
    <PublicHeader />
    <main>
      <section className="sample-hero">
        <div className="container">
          <div className="eyebrow">{item.category}</div>
          <h1>{item.name}</h1>
          <p className="lead">{item.summary}</p>
          <div className="inline" style={{marginTop:18}}>
            <Link className="btn btn-primary" href="/components">Back to components</Link>
            {projects[0] ? <Link className="btn" href={`/build/${projects[0].slug}`}>Build with this component</Link> : null}
          </div>
        </div>
      </section>

      <div className="container component-detail-layout">
        <article className="stack">
          <section className="card component-recognition-card">
            <div className="eyebrow">Recognise it in real life</div>
            <h2 style={{marginTop:8}}>What should I look for?</h2>
            <ComponentVisualCard slug={item.slug} />
            <p className="small muted">This is a recognition aid, not a substitute for the markings or datasheet on the exact component in your hand. Clones and revisions can look different.</p>
          </section>

          <section className="card">
            <div className="eyebrow">What it is</div>
            <h2 style={{marginTop:8}}>What does this component do?</h2>
            <p>{item.summary}</p>
          </section>

          <section className="card">
            <div className="eyebrow">Connect it safely</div>
            <div className="component-detail-grid">
              <div><h3>Voltage</h3><p>{item.voltage}</p></div>
              <div><h3>Interface</h3><p>{item.interface}</p></div>
              <div><h3>Pins / connections</h3><p>{item.pins}</p></div>
              <div><h3>Compatible boards</h3><p>{item.compatibleBoards.join(", ")}</p></div>
            </div>
            <div className="notice" style={{marginTop:18}}><strong>Safety:</strong> {item.safety}</div>
          </section>

          <section className="card">
            <div className="eyebrow">Beginner guidance</div>
            <h2 style={{marginTop:8}}>Start small</h2>
            <p>{item.beginnerTip}</p>
            <p className="small muted">Module revisions and clones can differ. Always check the markings and documentation for the exact part in your hand before applying power.</p>
          </section>

          <section className="card">
            <div className="eyebrow">Build something</div>
            <h2 style={{marginTop:8}}>Projects that use {item.name}</h2>
            {projects.length ? <div className="project-match-grid" style={{marginTop:18}}>{projects.map((project) => <div className="card card-muted" key={project.slug}>
              <div className="inline"><span className="badge">{project.level}</span><span className="badge">{project.area}</span></div>
              <h3 style={{marginTop:12}}>{project.title}</h3>
              <p className="small muted">{project.summary}</p>
              <Link className="text-link" href={`/build/${project.slug}`}>Open Build Mode →</Link>
            </div>)}</div> : <p className="muted">No public build is linked to this component yet.</p>}
          </section>
        </article>

        <aside className="stack">
          <div className="card">
            <div className="eyebrow">STEMBuild rule</div>
            <h3 style={{marginTop:8}}>Never guess a pinout.</h3>
            <p className="small muted">If the physical module in your hand does not match the labels shown in a lesson, stop and verify the exact board/module before connecting power.</p>
          </div>
          <div className="card">
            <div className="eyebrow">Next step</div>
            <h3 style={{marginTop:8}}>Add it to your kit</h3>
            <p className="small muted">Use My Components to tell STEMBuild which parts you own and see which projects you can build now.</p>
            <Link className="btn" href="/components">Open My Components</Link>
          </div>
        </aside>
      </div>
    </main>
    <PublicFooter />
  </div>;
}
