import Link from "next/link";
import { useId } from "react";
import { QuizEditor } from "@/components/quiz-editor";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { createCourse, setCourseStatus } from "@/lib/admin-actions";
import { createModule, createLesson, createProject, setLessonStatus, setProjectStatus } from "@/lib/curriculum-actions";

function Field({ name, label, large = false }: { name: string; label: string; large?: boolean }) {
  const id = useId();
  return <div className="field"><label htmlFor={id}>{label}</label>{large ? <textarea id={id} className="textarea" name={name} required/> : <input id={id} className="input" name={name} required/>}</div>;
}
function Status({ value }: { value: string }) {
  return <select className="select" aria-label="Publication status" name="status" defaultValue={value}><option>DRAFT</option><option>PUBLISHED</option><option>ARCHIVED</option></select>;
}

export default async function Curriculum() {
  await requireRole("ADMIN");
  const [courses, rubrics] = await Promise.all([
    db.course.findMany({ include: { modules: { include: { lessons: { include: { _count: { select: { hardwareVariants: true } } }, orderBy: { order: "asc" } } }, orderBy: { order: "asc" } }, projects: true }, orderBy: { createdAt: "desc" } }),
    db.rubric.findMany({ where: { criteria: { some: {} } }, orderBy: { name: "asc" } }),
  ]);
  const modules = courses.flatMap((c) => c.modules.map((m) => ({ ...m, courseTitle: c.title })));
  const courseSelect = <div className="field"><label>Course<select name="courseId" className="select" required>{courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select></label></div>;
  const rubricSelect = <div className="field"><label>Teacher rubric<select name="rubricId" className="select" required>{rubrics.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label></div>;
  return <>
    <div className="topbar"><div className="page-title"><div className="eyebrow">Curriculum</div><h1>Build your learning pathway</h1><p className="muted">Author core content once, then add board-specific wiring and code. New lessons and projects start as drafts.</p></div><Link className="btn" href="/dashboard/admin/hardware/variants">Manage board variants</Link></div>
    <div className="grid grid-2">
      <details className="card"><summary>Create course</summary><form action={createCourse} className="form" style={{marginTop:16}}><Field name="title" label="Course title"/><Field name="description" label="Course description" large/><button className="btn btn-primary">Create draft course</button></form></details>
      <details className="card"><summary>Add module</summary><form action={createModule} className="form" style={{marginTop:16}}>{courseSelect}<Field name="title" label="Module title"/><Field name="description" label="Module description" large/><button className="btn btn-primary" disabled={!courses.length}>Add module</button></form></details>
      <details className="card"><summary>Create lesson, quiz and practical task</summary><form action={createLesson} className="form" style={{marginTop:16}}><div className="field"><label>Module<select className="select" name="moduleId" required>{modules.map((m) => <option key={m.id} value={m.id}>{m.courseTitle} / {m.title}</option>)}</select></label></div><Field name="title" label="Lesson title"/><Field name="objective" label="Learning objective" large/><Field name="theory" label="Core theory" large/><Field name="safetyNotes" label="Safety notes" large/><Field name="practicalChallenge" label="Practical instructions" large/><Field name="expectedOutput" label="Measurable success criteria" large/><Field name="generalTroubleshoot" label="Troubleshooting guidance" large/><Field name="evidencePrompt" label="Required evidence" large/>{rubricSelect}<div className="field"><label>Estimated minutes<input className="input" name="estimatedMinutes" type="number" min={5} max={240} defaultValue={45} required/></label></div><QuizEditor/><button className="btn btn-primary" disabled={!modules.length || !rubrics.length}>Create draft lesson</button></form></details>
      <details className="card"><summary>Create integration project</summary><form action={createProject} className="form" style={{marginTop:16}}>{courseSelect}{rubricSelect}<Field name="title" label="Project title"/><Field name="description" label="Project description" large/><Field name="instructions" label="Build instructions" large/><Field name="successCriteria" label="Measurable success criteria" large/><button className="btn btn-primary" disabled={!courses.length || !rubrics.length}>Create draft project</button></form></details>
    </div>
    <section className="section stack">{courses.map((c) => <div className="card" key={c.id}><div className="inline"><span className="badge">{c.status}</span>{c.isDemo ? <span className="badge">DEMO</span> : null}</div><h2 style={{marginTop:12}}>{c.title}</h2><p className="muted">{c.description}</p><form action={setCourseStatus.bind(null,c.id)} className="inline"><Status value={c.status}/><button className="btn">Update course status</button></form>{c.modules.map((m) => <section key={m.id} style={{marginTop:24}}><h3>Module {m.order}: {m.title}</h3>{m.lessons.map((l) => <div className="card card-muted" key={l.id} style={{marginTop:12}}><strong>{l.title}</strong><p className="small muted">{l._count.hardwareVariants} board variants · {l.objective}</p><form action={setLessonStatus.bind(null,l.id)} className="inline"><Status value={l.status}/><button className="btn">Update lesson status</button></form></div>)}</section>)}{c.projects.map((p) => <div className="card card-muted" key={p.id} style={{marginTop:16}}><h3>Project: {p.title}</h3><form action={setProjectStatus.bind(null,p.id)} className="inline"><Status value={p.status}/><button className="btn">Update project status</button></form></div>)}</div>)}{!courses.length ? <div className="card empty">No courses yet. Create a course to begin.</div> : null}</section>
  </>;
}
