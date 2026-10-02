import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { createOutcome } from "@/lib/admin-actions";

export default async function Outcomes() {
  await requireRole("ADMIN");
  const [outcomes, skills] = await Promise.all([
    db.learningOutcome.findMany({ include: { skill: true, _count: { select: { lessons: true } } }, orderBy: { code: "asc" } }),
    db.skill.findMany({ orderBy: { name: "asc" } }),
  ]);
  return <><div className="topbar"><div className="page-title"><div className="eyebrow">Learning outcomes</div><h1 style={{fontSize:38}}>Skills and outcomes</h1><div className="muted">Outcomes link curriculum to the controlled STEMBuild skills taxonomy.</div></div></div><div className="card"><form action={createOutcome} className="grid grid-4"><div className="field"><label>Code</label><input className="input" name="code" placeholder="IOT-01" required/></div><div className="field"><label>Title</label><input className="input" name="title" required/></div><div className="field"><label>Skill</label><select className="select" name="skillId"><option value="">No skill link</option>{skills.map((skill) => <option value={skill.id} key={skill.id}>{skill.name}</option>)}</select></div><div className="field"><label>Description</label><input className="input" name="description" required/></div><button className="btn btn-primary">Create outcome</button></form></div><section className="section"><div className="table-wrap"><table><thead><tr><th>Code</th><th>Outcome</th><th>Skill</th><th>Linked lessons</th></tr></thead><tbody>{outcomes.map((outcome) => <tr key={outcome.id}><td>{outcome.code}</td><td><strong>{outcome.title}</strong><div className="small muted">{outcome.description}{outcome.isDemo ? " · DEMO" : ""}</div></td><td>{outcome.skill?.name ?? "—"}</td><td>{outcome._count.lessons}</td></tr>)}</tbody></table></div></section></>;
}
