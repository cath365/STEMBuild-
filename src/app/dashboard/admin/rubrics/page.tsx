import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { createRubric } from "@/lib/admin-actions";

export default async function Rubrics() {
  await requireRole("ADMIN");
  const [rubrics, skills] = await Promise.all([
    db.rubric.findMany({ include: { criteria: { orderBy: { order: "asc" }, include: { skill: true } }, _count: { select: { practicals: true, projects: true } } }, orderBy: { name: "asc" } }),
    db.skill.findMany({ orderBy: { name: "asc" } }),
  ]);
  return <><div className="topbar"><div className="page-title"><div className="eyebrow">Rubrics</div><h1 style={{fontSize:38}}>Practical assessment rubrics</h1><div className="muted">Every criterion must use a controlled skill slug so rubric scores can become reliable skill evidence.</div></div></div><div className="card"><h2 style={{fontSize:24}}>Create rubric</h2><form action={createRubric} className="form" style={{marginTop:12}}><div className="field"><label>Name</label><input className="input" name="name" required/></div><div className="field"><label>Description</label><input className="input" name="description" required/></div><div className="field"><label>Criteria — one per line: Label | skill-slug | maxScore | Description</label><textarea className="textarea" name="criteria" placeholder="Circuit setup | circuit-building | 4 | Correct and safe connections" required/><span className="small muted">Allowed skill slugs: {skills.map((skill) => skill.slug).join(", ")}</span></div><button className="btn btn-primary">Create rubric</button></form></div><section className="section"><div className="grid grid-2">{rubrics.map((rubric) => <div className="card" key={rubric.id}><div className="inline"><span className="badge">{rubric.criteria.length} criteria</span>{rubric.isDemo ? <span className="badge">DEMO</span> : null}</div><h3 style={{marginTop:10}}>{rubric.name}</h3><p className="muted">{rubric.description}</p><ul className="list">{rubric.criteria.map((criterion) => <li key={criterion.id}>{criterion.label} ({criterion.skill?.name ?? criterion.skillTag}) — {criterion.maxScore} pts</li>)}</ul></div>)}</div></section></>;
}
