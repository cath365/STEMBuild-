import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import { ProjectExplorer } from "@/components/project-explorer";

export const metadata: Metadata = {
  title: "Projects",
  description: "Choose a hands-on STEMBuild project and learn electronics, robotics, programming and IoT by building it.",
};

export default function ProjectsPage() {
  return <div>
    <PublicHeader />
    <main>
      <section className="sample-hero">
        <div className="container">
          <div className="eyebrow">WHAT DO YOU WANT TO BUILD?</div>
          <h1>Choose a project.<br/><span>Learn what you need.</span></h1>
          <p className="lead">Start small, build something real, test it, fix problems and improve it. Pick a project by your current experience—not by how impressive it looks.</p>
          <div className="inline" style={{marginTop:18}}><Link className="btn btn-primary" href="/learning-paths/first-robot">Follow the First Robot Path</Link><Link className="btn" href="#Beginner">Browse beginner projects</Link><Link className="btn" href="/components">Check My Components</Link></div>
        </div>
      </section>

      <div className="container section">
        <ProjectExplorer />
      </div>
    </main>
    <PublicFooter />
  </div>;
}
