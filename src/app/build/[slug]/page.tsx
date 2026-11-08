import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import { BuildMode } from "@/components/build-mode";
import { PageHeader } from "@/components/page-header";
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
      <PageHeader
        crumbs={[{ label: "Home", href: "/" }, { label: "Projects", href: "/projects" }, { label: project.title }]}
        meta={<><span className="badge">{project.level}</span><span className="badge">{project.area}</span><span className="badge">~{project.minutes} min</span></>}
        title={project.title}
        description={project.summary}
      />
      <section className="container section">
        <BuildMode project={project} components={componentCatalog}/>
      </section>
    </main>
    <PublicFooter />
  </div>;
}
