"use client";

import Link from "next/link";
import { ROADMAP } from "@/lib/learn/roadmap";
import { useLearned } from "@/components/learn/use-learning";
import { useIsClient } from "@/lib/use-stored-value";

export function RoadmapProgress({ names, studioReady }: { names: Record<string, string>; studioReady: string[] }) {
  const [learned] = useLearned();
  const isClient = useIsClient();
  const total = ROADMAP.reduce((n, s) => n + s.core.length, 0);
  const done = ROADMAP.reduce((n, s) => n + s.core.filter((c) => learned.has(c)).length, 0);
  const current = ROADMAP.find((s) => s.core.some((c) => !learned.has(c))) ?? ROADMAP[ROADMAP.length - 1];
  const nextSlug = current.core.find((c) => !learned.has(c));
  const simulated = new Set(studioReady);

  return <div className="roadmap">
    <div className="roadmap-summary card" aria-live="polite">
      <div>
        <div className="eyebrow">Your progress</div>
        <h2 style={{ marginTop: 6 }}>{isClient ? `${done} of ${total} core components learned` : `${total} core components`}</h2>
        <div className="roadmap-meter" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} aria-label="Roadmap progress"><span style={{ width: `${(done / total) * 100}%` }} /></div>
        <p className="small muted">Progress is saved in this browser. A component counts as learned when you answer its check question correctly.</p>
      </div>
      {nextSlug ? <Link className="btn btn-primary" href={`/components/${nextSlug}`}>{done ? "Continue" : "Start"} with {names[nextSlug]}</Link> : <span className="badge badge-green">All stages complete</span>}
    </div>

    <ol className="roadmap-stages">
      {ROADMAP.map((stage, index) => {
        const stageDone = stage.core.filter((c) => learned.has(c)).length;
        return <li key={stage.id} className="card roadmap-stage" data-current={stage.id === current.id && isClient ? "true" : undefined}>
          <div className="roadmap-stage-head">
            <span className="roadmap-number" aria-hidden="true">{index + 1}</span>
            <div>
              <h3>Stage {index + 1}: {stage.title}</h3>
              <p className="small muted">{stage.goal}</p>
            </div>
            <span className="roadmap-count">{stageDone}/{stage.core.length}</span>
          </div>
          <ul className="roadmap-parts" aria-label={`${stage.title} components`}>
            {stage.core.map((slug) => <li key={slug}>
              <Link href={`/components/${slug}`} className={learned.has(slug) ? "roadmap-part is-learned" : "roadmap-part"}>
                <span aria-hidden="true">{learned.has(slug) ? "✓" : "○"}</span>{names[slug]}
                {simulated.has(slug) ? <small title="Can be tried in Maker Studio">sim</small> : null}
                <span className="sr-only">{learned.has(slug) ? " (learned)" : ""}</span>
              </Link>
            </li>)}
          </ul>
          <details className="roadmap-more">
            <summary>Also explore ({stage.more.length})</summary>
            <ul className="roadmap-parts">{stage.more.map((slug) => <li key={slug}><Link href={`/components/${slug}`} className={learned.has(slug) ? "roadmap-part is-learned" : "roadmap-part"}><span aria-hidden="true">{learned.has(slug) ? "✓" : "·"}</span>{names[slug]}</Link></li>)}</ul>
          </details>
          <div className="roadmap-stage-grid">
            <div><h4>You will be able to</h4><ul>{stage.skills.map((s) => <li key={s}>{s}</li>)}</ul></div>
            <div>
              <h4>Prove it with a project</h4>
              <p><Link className="text-link" href={`/build/${stage.project.slug}`}>{stage.project.title} →</Link></p>
              <h4>Why it matters for your career</h4>
              <p className="small muted">{stage.career}</p>
            </div>
          </div>
        </li>;
      })}
    </ol>
  </div>;
}
