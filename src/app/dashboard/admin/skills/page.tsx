import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";

export default async function SkillsPage() {
  await requireRole("ADMIN");
  const skills = await db.skill.findMany({
    include: { _count: { select: { outcomes: true, rubricCriteria: true, quizQuestions: true, learningEvents: true } } },
    orderBy: { name: "asc" },
  });
  return <><div className="topbar"><div className="page-title"><div className="eyebrow">Skills taxonomy</div><h1 style={{fontSize:38}}>STEMBuild practical skills</h1><div className="muted">Stable skill identifiers connect curriculum, assessments and learner events. The taxonomy is platform data, not synthetic learner data.</div></div></div><div className="grid grid-3">{skills.map((skill) => <div className="card" key={skill.id}><span className="badge">{skill.slug}</span><h3 style={{marginTop:12}}>{skill.name}</h3><p className="muted">{skill.description}</p><div className="small muted">{skill._count.outcomes} outcomes · {skill._count.rubricCriteria} rubric criteria · {skill._count.quizQuestions} quiz questions · {skill._count.learningEvents} events</div></div>)}</div></>;
}
