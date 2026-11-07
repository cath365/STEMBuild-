"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { buildProjects, componentCatalog, componentCategories } from "@/lib/build-catalog";
import { componentName, ownedBoardNames, projectReadiness, useOwnedComponents } from "@/lib/my-components";
import { ComponentVisualCard } from "@/components/component-visual-card";

const INITIAL_MATCHES = 8;

export function ComponentBrowser() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [owned, setOwned] = useOwnedComponents();
  const [showMine, setShowMine] = useState(false);
  const [showAllMatches, setShowAllMatches] = useState(false);

  function toggle(slug: string) {
    setOwned(owned.includes(slug) ? owned.filter((item) => item !== slug) : [...owned, slug]);
  }

  function clearOwned() {
    if (!window.confirm(`Remove all ${owned.length} parts from My Components on this device?`)) return;
    setOwned([]);
    setShowMine(false);
  }

  function resetFilters() {
    setQuery("");
    setCategory("All");
    setShowMine(false);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return componentCatalog.filter((item) => {
      if (showMine && !owned.includes(item.slug)) return false;
      if (category !== "All" && item.category !== category) return false;
      if (!q) return true;
      return [item.name, item.category, item.summary, item.interface, item.voltage].join(" ").toLowerCase().includes(q);
    });
  }, [query, category, owned, showMine]);

  const matchedProjects = useMemo(() => {
    const boards = ownedBoardNames(owned);
    return buildProjects.map((project) => ({ project, ...projectReadiness(project, owned, boards) })).sort((a, b) => {
      const aScore = a.missing.length + (a.hasBoard ? 0 : 1);
      const bScore = b.missing.length + (b.hasBoard ? 0 : 1);
      return aScore - bScore || a.project.title.localeCompare(b.project.title);
    });
  }, [owned]);
  const readyCount = matchedProjects.filter((item) => item.ready).length;
  const visibleMatches = showAllMatches ? matchedProjects : matchedProjects.slice(0, INITIAL_MATCHES);
  const filtersActive = Boolean(query.trim()) || category !== "All" || showMine;

  return <div className="stack">
    <section className="card component-toolbox">
      <div>
        <div className="eyebrow">My Components</div>
        <h2>Tell STEMBuild what you have.</h2>
        <p className="muted">Tick the parts in your kit. This list stays on this device only; it does not mark lessons or assessments complete.</p>
        {owned.length ? <div className="inline"><a className="text-link" href="#kit-matches">See projects for my kit →</a><button type="button" className="kit-clear" onClick={clearOwned}>Clear my parts</button></div> : null}
      </div>
      <div className="component-toolbox-count"><strong>{owned.length}</strong><span>parts selected</span>{owned.length ? <span className="kit-ready-count">{readyCount} {readyCount === 1 ? "project" : "projects"} ready</span> : null}</div>
    </section>

    <section className="card">
      <div className="component-search-row">
        <label className="field component-search"><span>Find a component</span><input className="input" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try ultrasonic, motor, ESP32, display…"/></label>
        <label className="field component-filter"><span>Category</span><select className="select" value={category} onChange={(event) => setCategory(event.target.value)}><option>All</option>{componentCategories.map((item) => <option key={item}>{item}</option>)}</select></label>
        <button type="button" className={showMine ? "btn btn-primary" : "btn"} aria-pressed={showMine} disabled={!owned.length && !showMine} onClick={() => setShowMine((value) => !value)}>{showMine ? "Showing my parts" : "Show only my parts"}</button>
      </div>
      <div className="inline small muted" style={{marginTop:12}}><span role="status">{filtered.length} of {componentCatalog.length} components shown</span>{filtersActive ? <button type="button" className="kit-clear" onClick={resetFilters}>Reset filters</button> : null}</div>
    </section>

    <section className="component-grid" aria-label="Component library">
      {filtered.map((item) => {
        const selected = owned.includes(item.slug);
        return <article className={selected ? "card component-card owned" : "card component-card"} key={item.slug}>
          <ComponentVisualCard slug={item.slug} compact />
          <div className="component-card-top"><span className="badge">{item.category}</span><button type="button" className={selected ? "component-own selected" : "component-own"} aria-pressed={selected} onClick={() => toggle(item.slug)}>{selected ? "✓ I have this" : "+ I have this"}</button></div>
          <h3>{item.name}</h3>
          <p className="muted">{item.summary}</p>
          <dl className="component-facts"><div><dt>Voltage</dt><dd>{item.voltage}</dd></div><div><dt>Interface</dt><dd>{item.interface}</dd></div></dl>
          <div className="component-safety"><strong>Safety:</strong> {item.safety}</div>
          <Link className="text-link" href={`/components/${item.slug}`}>Learn this component →</Link>
        </article>;
      })}
    </section>
    {!filtered.length ? <div className="card empty"><h3>No components match</h3><p>Try a shorter word such as “sensor”, “motor” or “LED”.</p><button type="button" className="btn" onClick={resetFilters}>Show all components</button></div> : null}

    {owned.length ? <div className="kit-bar" aria-label="My kit summary">
      <span><strong>{owned.length}</strong> {owned.length === 1 ? "part" : "parts"} selected · <strong>{readyCount}</strong> ready to build</span>
      <a className="btn btn-primary" href="#kit-matches">See matches</a>
    </div> : null}

    <section className="card kit-matches" id="kit-matches">
      <div className="eyebrow">What can I build?</div>
      <h2 style={{marginTop:8}}>Projects matched to your kit</h2>
      <p className="muted">A project counts as ready only when you selected every required part and at least one compatible microcontroller board.</p>
      {!owned.length ? <div className="notice">Select a few components above and STEMBuild will start matching projects.</div> : <>
        <div className="project-match-grid">{visibleMatches.map(({project, missing, hasBoard, ready}) => <div className="card card-muted" key={project.slug}>
          <div className="inline"><span className="badge">{project.level}</span><span className="badge">{project.area}</span>{ready ? <span className="badge badge-green">Ready to build</span> : null}</div>
          <h3 style={{marginTop:12}}>{project.title}</h3>
          {ready ? <p>You have the required parts and a compatible board.</p> : <div className="small muted kit-missing">
            {!hasBoard ? <p>Add a compatible board: {project.boards.join(", ")}.</p> : null}
            {missing.length ? <p>Missing {missing.length} required part{missing.length === 1 ? "" : "s"}: {missing.slice(0, 4).map(componentName).join(", ")}{missing.length > 4 ? ` and ${missing.length - 4} more` : ""}.</p> : null}
          </div>}
          <Link className="text-link" href={`/build/${project.slug}`}>{ready ? "Start building" : "See what I need"} →</Link>
        </div>)}</div>
        {matchedProjects.length > INITIAL_MATCHES ? <button type="button" className="btn" style={{marginTop:16}} onClick={() => setShowAllMatches((value) => !value)}>{showAllMatches ? "Show fewer projects" : `Show all ${matchedProjects.length} projects`}</button> : null}
      </>}
    </section>
  </div>;
}
