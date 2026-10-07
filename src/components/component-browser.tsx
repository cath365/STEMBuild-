"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { buildProjects, componentCatalog, componentCategories } from "@/lib/build-catalog";
import { ComponentVisualCard } from "@/components/component-visual-card";

const STORAGE_KEY = "stembuild-my-components-v1";

function readSaved() {
  if (typeof window === "undefined") return [] as string[];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function ComponentBrowser() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [owned, setOwned] = useState<string[]>([]);
  const [showMine, setShowMine] = useState(false);

  useEffect(() => setOwned(readSaved()), []);

  function toggle(slug: string) {
    setOwned((current) => {
      const next = current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug];
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
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

  const ownedBoards = new Set(componentCatalog.filter((item) => item.category === "Microcontrollers" && owned.includes(item.slug)).map((item) => item.name));
  const matchedProjects = buildProjects.map((project) => {
    const missing = project.required.filter((slug) => !owned.includes(slug));
    const hasBoard = project.boards.some((board) => ownedBoards.has(board));
    return { project, missing, hasBoard };
  }).sort((a, b) => {
    const aScore = a.missing.length + (a.hasBoard ? 0 : 1);
    const bScore = b.missing.length + (b.hasBoard ? 0 : 1);
    return aScore - bScore || a.project.title.localeCompare(b.project.title);
  });

  return <div className="stack">
    <section className="card component-toolbox">
      <div>
        <div className="eyebrow">My Components</div>
        <h2>Tell STEMBuild what you have.</h2>
        <p className="muted">Tick the parts in your kit. This list stays on this device only; it does not mark lessons or assessments complete.</p>
      </div>
      <div className="component-toolbox-count"><strong>{owned.length}</strong><span>parts selected</span></div>
    </section>

    <section className="card">
      <div className="component-search-row">
        <label className="field component-search"><span>Find a component</span><input className="input" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try ultrasonic, motor, ESP32, display…"/></label>
        <label className="field component-filter"><span>Category</span><select className="select" value={category} onChange={(event) => setCategory(event.target.value)}><option>All</option>{componentCategories.map((item) => <option key={item}>{item}</option>)}</select></label>
        <button type="button" className={showMine ? "btn btn-primary" : "btn"} onClick={() => setShowMine((value) => !value)}>{showMine ? "Showing my parts" : "Show only my parts"}</button>
      </div>
      <div className="small muted" style={{marginTop:12}}>{filtered.length} components shown</div>
    </section>

    <section className="component-grid" aria-label="Component library">
      {filtered.map((item) => {
        const selected = owned.includes(item.slug);
        return <article className="card component-card" key={item.slug}>
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

    <section className="card">
      <div className="eyebrow">What can I build?</div>
      <h2 style={{marginTop:8}}>Projects matched to your kit</h2>
      <p className="muted">A project counts as ready only when you selected every required part and at least one compatible microcontroller board.</p>
      {!owned.length ? <div className="notice">Select a few components above and STEMBuild will start matching projects.</div> : <div className="project-match-grid">{matchedProjects.slice(0,8).map(({project, missing, hasBoard}) => {
        const ready = missing.length === 0 && hasBoard;
        return <div className="card card-muted" key={project.slug}>
          <div className="inline"><span className="badge">{project.level}</span><span className="badge">{project.area}</span>{ready ? <span className="badge badge-green">Ready to build</span> : null}</div>
          <h3 style={{marginTop:12}}>{project.title}</h3>
          {ready ? <p>You have the required parts and a compatible board.</p> : <p className="small muted">{!hasBoard ? "Choose/add a compatible board. " : ""}{missing.length ? `Missing ${missing.length} required part${missing.length === 1 ? "" : "s"}.` : ""}</p>}
          <Link className="text-link" href={`/build/${project.slug}`}>{ready ? "Start building" : "See what I need"} →</Link>
        </div>;
      })}</div>}
    </section>
  </div>;
}
