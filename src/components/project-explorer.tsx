"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { buildProjects, type BuildProject, type LearningLevel } from "@/lib/build-catalog";
import { componentName, ownedBoardNames, projectReadiness, useOwnedComponents } from "@/lib/my-components";

const levels: LearningLevel[] = ["Beginner", "Intermediate", "Advanced"];
const levelHeadings: Record<LearningLevel, string> = {
  Beginner: "I want to make something work.",
  Intermediate: "I want to build a useful system.",
  Advanced: "I want to solve a real problem.",
};
const areas = ["All", ...Array.from(new Set(buildProjects.map((project) => project.area)))];
const boards = Array.from(new Set(buildProjects.flatMap((project) => project.boards)));
type LengthFilter = "any" | "short" | "medium" | "long";
const lengths: { value: LengthFilter; label: string; test: (minutes: number) => boolean }[] = [
  { value: "any", label: "Any length", test: () => true },
  { value: "short", label: "Under 1 hour", test: (minutes) => minutes < 60 },
  { value: "medium", label: "1–2 hours", test: (minutes) => minutes >= 60 && minutes <= 120 },
  { value: "long", label: "Over 2 hours", test: (minutes) => minutes > 120 },
];

function matchesQuery(project: BuildProject, q: string) {
  if (!q) return true;
  return [project.title, project.summary, project.area, project.outcome, ...project.skills].join(" ").toLowerCase().includes(q);
}

export function ProjectExplorer() {
  const [query, setQuery] = useState("");
  const [area, setArea] = useState("All");
  const [board, setBoard] = useState("Any board");
  const [length, setLength] = useState<LengthFilter>("any");
  const [owned] = useOwnedComponents();
  const [readyOnly, setReadyOnly] = useState(false);

  const readiness = useMemo(() => {
    const ownedBoards = ownedBoardNames(owned);
    return new Map(buildProjects.map((project) => [project.slug, projectReadiness(project, owned, ownedBoards)]));
  }, [owned]);

  const lengthTest = lengths.find((item) => item.value === length)?.test ?? (() => true);
  const q = query.trim().toLowerCase();
  const filtered = buildProjects.filter((project) =>
    matchesQuery(project, q)
    && (area === "All" || project.area === area)
    && (board === "Any board" || project.boards.includes(board))
    && lengthTest(project.minutes)
    && (!readyOnly || readiness.get(project.slug)?.ready));
  const filtersActive = Boolean(q) || area !== "All" || board !== "Any board" || length !== "any" || readyOnly;

  function reset() {
    setQuery("");
    setArea("All");
    setBoard("Any board");
    setLength("any");
    setReadyOnly(false);
  }

  return <div className="stack">
    <section className="card project-filters" aria-label="Filter projects">
      <div className="project-filter-row">
        <label className="field"><span>Search projects</span><input className="input" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try robot, sensor, Bluetooth, LED…"/></label>
        <label className="field"><span>Board</span><select className="select" value={board} onChange={(event) => setBoard(event.target.value)}><option>Any board</option>{boards.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="field"><span>Time</span><select className="select" value={length} onChange={(event) => setLength(event.target.value as LengthFilter)}>{lengths.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
      </div>
      <div className="project-area-chips" role="group" aria-label="Project area">{areas.map((item) => <button key={item} type="button" aria-pressed={area === item} className={area === item ? "chip active" : "chip"} onClick={() => setArea(item)}>{item}</button>)}</div>
      <div className="project-filter-foot">
        {owned.length
          ? <label className="project-ready-toggle"><input type="checkbox" checked={readyOnly} onChange={(event) => setReadyOnly(event.target.checked)}/> Only projects I have all the parts for</label>
          : <span className="small muted">Tick the parts in your kit on <Link className="text-link" href="/components">My Components</Link> to see what you can build right now.</span>}
        <span className="small muted" role="status">{filtered.length} of {buildProjects.length} projects{filtersActive ? <> · <button type="button" className="kit-clear" onClick={reset}>Reset filters</button></> : null}</span>
      </div>
    </section>

    {levels.map((level) => {
      const projects = filtered.filter((project) => project.level === level);
      if (!projects.length) return null;
      return <section id={level} key={level} className="project-level-section">
        <div className="section-title"><div><div className="eyebrow">{level}</div><h2>{levelHeadings[level]}</h2></div><span className="badge">{projects.length} {projects.length === 1 ? "project" : "projects"}</span></div>
        <div className="project-library-grid">{projects.map((project) => {
          const status = owned.length ? readiness.get(project.slug) : undefined;
          return <article className="card project-library-card" key={project.slug}>
            <div className="inline"><span className="badge">{project.area}</span><span className="badge">~{project.minutes} min</span>{status?.ready ? <span className="badge badge-green">Ready to build</span> : null}</div>
            <h3>{project.title}</h3>
            <p className="muted">{project.summary}</p>
            <div className="small"><strong>You will learn:</strong> {project.skills.join(" · ")}</div>
            <div className="small muted" style={{marginTop:8}}><strong>Boards:</strong> {project.boards.join(", ")}</div>
            {status && !status.ready && status.missing.length ? <div className="small muted" style={{marginTop:8}}><strong>Still need:</strong> {status.missing.slice(0, 3).map(componentName).join(", ")}{status.missing.length > 3 ? ` +${status.missing.length - 3} more` : ""}</div> : null}
            <div className="project-card-actions"><Link className="btn btn-primary" href={`/build/${project.slug}`}>Start Build Mode</Link></div>
          </article>;
        })}</div>
      </section>;
    })}

    {!filtered.length ? <div className="card empty"><h3>No projects match those filters</h3><p>Try a different board or time, or clear the search.</p><button type="button" className="btn" onClick={reset}>Show all projects</button></div> : null}
  </div>;
}
