import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import { buildProjects } from "@/lib/build-catalog";

export const metadata: Metadata = {
  title: "Projects",
  description: "Choose a hands-on STEMBuild project and learn electronics, robotics, programming and IoT by building it.",
};

const levels = ["Beginner","Intermediate","Advanced"] as const;

export default function ProjectsPage() {
  return <div>
    <PublicHeader />
    <main>
      <section className="sample-hero">
        <div className="container">
          <div className="eyebrow">WHAT DO YOU WANT TO BUILD?</div>
          <h1>Choose a project.<br/><span>Learn what you need.</span></h1>
          <p className="lead">Start small, build something real, test it, fix problems and improve it. Pick a project by your current experience—not by how impressive it looks.</p>
          <div className="inline" style={{marginTop:18}}><Link className="btn btn-primary" href="#Beginner">Start with beginner projects</Link><Link className="btn" href="/components">Check My Components</Link></div>
        </div>
      </section>

      <div className="container section stack">
        {levels.map((level) => {
          const projects=buildProjects.filter((project) => project.level===level);
          return <section id={level} key={level} className="project-level-section">
            <div className="section-title"><div><div className="eyebrow">{level.toUpperCase()}</div><h2>{level === "Beginner" ? "I want to make something work." : level === "Intermediate" ? "I want to build a useful system." : "I want to solve a real problem."}</h2></div><span className="badge">{projects.length} projects</span></div>
            <div className="project-library-grid">{projects.map((project) => <article className="card project-library-card" key={project.slug}>
              <div className="inline"><span className="badge">{project.area}</span><span className="badge">~{project.minutes} min</span></div>
              <h3>{project.title}</h3>
              <p className="muted">{project.summary}</p>
              <div className="small"><strong>You will learn:</strong> {project.skills.join(" · ")}</div>
              <div className="small muted" style={{marginTop:8}}><strong>Boards:</strong> {project.boards.join(", ")}</div>
              <div className="project-card-actions"><Link className="btn btn-primary" href={`/build/${project.slug}`}>Start Build Mode</Link></div>
            </article>)}</div>
          </section>;
        })}
      </div>
    </main>
    <PublicFooter />
  </div>;
}
