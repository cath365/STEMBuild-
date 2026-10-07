import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import { BuildMode } from "@/components/build-mode";
import { buildProjects, componentCatalog, projectBySlug } from "@/lib/build-catalog";

export function generateStaticParams() {
  return buildProjects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const project = projectBySlug(slug);
  if (!project) return {};
  return { title: `Build ${project.title}`, description: project.summary };
}

export default async function BuildProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = projectBySlug(slug);
  if (!project) notFound();

  return <div>
    <PublicHeader />
    <main>
      <section className="sample-hero">
        <div className="container">
          <div className="inline"><span className="badge">{project.level}</span><span className="badge">{project.area}</span><span className="badge">~{project.minutes} min</span></div>
          <h1 style={{marginTop:16}}>Build a<br/><span>{project.title}.</span></h1>
          <p className="lead">{project.summary}</p>
          <p className="small muted">Build Mode is a learning guide. It never marks practical work as passed just because you clicked through the steps.</p>
        </div>
      </section>
      <section className="container section">
        <BuildMode project={project} components={componentCatalog}/>
      </section>
    </main>
    <PublicFooter />
  </div>;
}
