import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import { PageHeader } from "@/components/page-header";
import { ProjectExplorer } from "@/components/project-explorer";
import { buildProjects } from "@/lib/build-catalog";

export const metadata: Metadata = {
  title: "Projects",
  description: "Choose a hands-on STEMBuild project and learn electronics, robotics, programming and IoT by building it.",
};

export default function ProjectsPage() {
  return <div>
    <PublicHeader />
    <main>
      <PageHeader
        crumbs={[{ label: "Home", href: "/" }, { label: "Projects" }]}
        title="Projects"
        description={`${buildProjects.length} guided builds, from a first LED to an autonomous robot. Choose by what you know now, not by what looks most impressive.`}
        actions={<><Link className="btn btn-primary" href="/learning-paths/first-robot">Follow the First Robot Path</Link><Link className="btn" href="/components">Match projects to my kit</Link></>}
      />
      <div className="container section">
        <ProjectExplorer />
      </div>
    </main>
    <PublicFooter />
  </div>;
}
