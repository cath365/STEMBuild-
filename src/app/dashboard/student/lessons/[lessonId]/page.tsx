import Link from "next/link";
import { notFound } from "next/navigation";
import { AiHelp } from "@/components/ai-help";
import { db } from "@/lib/db";
import { percent } from "@/lib/format";
import { requireRole } from "@/lib/session";
import { startLesson, startPracticalTask, startQuiz, submitPractical, submitQuiz } from "@/lib/learning-actions";

export default async function LessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const user = await requireRole("STUDENT");
  const { lessonId } = await params;
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    include: {
      module: { include: { course: true } },
      outcomes: { include: { outcome: { include: { skill: true } } } },
      progress: { where: { studentId: user.id } },
      hardwareVariants: { include: { hardwarePlatform: true, components: { include: { component: true } } }, orderBy: { title: "asc" } },
      quiz: { include: { questions: { orderBy: { order: "asc" }, select: { id: true, prompt: true, type: true, options: true, points: true, order: true } }, attempts: { where: { studentId: user.id }, orderBy: { attemptNo: "desc" } } } },
      practicalTasks: { include: { rubric: { include: { criteria: { orderBy: { order: "asc" }, include: { skill: true } } } }, submissions: { where: { studentId: user.id }, include: { evidence: true, troubleshooting: true, assessment: { include: { scores: { include: { criterion: true } } } }, hardwarePlatform: true }, orderBy: { submissionNo: "desc" } } } },
    },
  });
  if (!lesson || lesson.status !== "PUBLISHED") notFound();

  const assigned = await db.lessonAssignment.findFirst({ where: { lessonId, status: "ACTIVE", classroom: { enrollments: { some: { studentId: user.id, status: "ACTIVE" } } } } });
  if (!assigned) notFound();

  const openStarts = await db.learningEvent.findMany({
    where: { learnerId: user.id, lessonId, type: { in: ["QUIZ_STARTED", "PRACTICAL_TASK_STARTED"] } },
    select: { type: true, quizId: true, practicalTaskId: true, attemptNo: true, hardwarePlatformId: true },
  });
  const progress = lesson.progress[0]?.status ?? "NOT_STARTED";
  const hardwareOptions = lesson.hardwareVariants.map((v) => ({ id: v.hardwarePlatform.id, name: v.hardwarePlatform.name }));

  return <>
    <div className="topbar"><div className="page-title"><div className="eyebrow">{lesson.module.course.title} / {lesson.module.title}</div><h1 style={{fontSize:38}}>{lesson.title}</h1><div className="inline"><span className="badge">{lesson.difficulty}</span><span className="badge">~{lesson.estimatedMinutes} min</span><span className={progress === "COMPLETED" ? "badge badge-green" : "badge badge-yellow"}>{progress.replaceAll("_", " ")}</span></div></div><Link className="btn" href="/dashboard/student/learning-path">Back to path</Link></div>
    <div className="lesson-layout">
      <div className="stack">
        <div className="card"><div className="eyebrow">Learning objective</div><h2 style={{fontSize:28,marginTop:8}}>{lesson.objective}</h2><p className="lead" style={{fontSize:16}}>{lesson.theory}</p><div className="inline">{lesson.outcomes.map(({outcome}) => <span className="badge" key={outcome.id}>{outcome.code}: {outcome.title}{outcome.skill ? ` · ${outcome.skill.name}` : ""}</span>)}</div></div>
        <div className="notice"><strong>Safety:</strong> {lesson.safetyNotes}</div>
        <div className="card"><h2 style={{fontSize:26}}>Hardware-specific instructions</h2><p className="muted">Choose the variant that matches the actual board used. The learning objective and rubric stay the same.</p><div className="stack" style={{marginTop:14}}>{lesson.hardwareVariants.map((variant) => <details key={variant.id} className="card card-muted" open={lesson.hardwareVariants.length <= 2}><summary><strong>{variant.hardwarePlatform.name}</strong></summary><div style={{marginTop:14}}><h3>Components</h3><ul className="list">{variant.components.length ? variant.components.map((x) => <li key={x.id}>{x.quantity}× {x.component.name}{x.notes ? ` — ${x.notes}` : ""}</li>) : <li>No programmable-board components required for this activity.</li>}</ul><h3 style={{marginTop:16}}>Wiring</h3><p className="muted">{variant.wiringInstructions}</p><h3 style={{marginTop:16}}>Starter code</h3><pre className="code">{variant.codeSnippet}</pre><h3 style={{marginTop:16}}>Expected output</h3><p className="muted">{variant.expectedOutput}</p><h3 style={{marginTop:16}}>Troubleshooting</h3><p className="muted">{variant.troubleshooting}</p></div></details>)}</div></div>
        <div className="card"><div className="eyebrow">Practical challenge</div><h2 style={{fontSize:26,marginTop:8}}>{lesson.practicalChallenge}</h2><p className="muted"><strong>Expected result:</strong> {lesson.expectedOutput}</p>{progress === "NOT_STARTED" ? <form action={startLesson.bind(null, lesson.id)}><button className="btn btn-primary">Start practical lesson</button></form> : null}</div>

        {lesson.practicalTasks.map((task) => {
          const nextAttempt = task.submissions.length + 1;
          const started = openStarts.find((event) => event.type === "PRACTICAL_TASK_STARTED" && event.practicalTaskId === task.id && event.attemptNo === nextAttempt);
          return <div className="card" key={task.id}><div className="eyebrow">Practical evidence</div><h2 style={{fontSize:26,marginTop:8}}>{task.title}</h2><p className="muted">{task.evidencePrompt}</p>
            {!started ? <form action={startPracticalTask.bind(null, task.id)} className="form" style={{marginTop:14}}><div className="field"><label>Board you will use for attempt {nextAttempt}</label><select className="select" name="hardwarePlatformId" required>{hardwareOptions.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}</select></div><button className="btn btn-primary">Start practical task</button><div className="small muted">Starting the task records the attempt start time so duration can be measured from real learner activity.</div></form> : <form action={submitPractical} className="form" encType="multipart/form-data" style={{marginTop:14}}><input type="hidden" name="taskId" value={task.id}/><div className="field"><label>Microcontroller / platform actually used</label><select className="select" name="hardwarePlatformId" defaultValue={started.hardwarePlatformId ?? hardwareOptions[0]?.id} required>{hardwareOptions.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}</select></div><div className="field"><label>Evidence photo or PDF</label><input className="input" type="file" name="evidence" accept="image/jpeg,image/png,image/webp,application/pdf" required/><span className="small muted">MVP server upload limit: 3.5 MB. Evidence is stored privately.</span></div><div className="field"><label>What did you build / observe?</label><textarea className="textarea" name="studentNotes" required/></div><div className="field"><label>Code used or changed</label><textarea className="textarea" name="codeSnippet" placeholder="Paste the relevant code or explain that no code was required."/></div><div className="grid grid-3"><div className="field"><label>Problem found</label><textarea className="textarea" name="issue"/></div><div className="field"><label>What you tried</label><textarea className="textarea" name="actionTried"/></div><div className="field"><label>Result</label><textarea className="textarea" name="result"/></div></div><button className="btn btn-primary">Submit practical evidence</button></form>}
            {task.submissions.length ? <div style={{marginTop:22}}><h3>Submission history</h3><div className="stack" style={{marginTop:10}}>{task.submissions.map((s) => <div className="card card-muted" key={s.id}><div className="inline"><span className="badge">Attempt {s.submissionNo}</span><span className={s.status === "ASSESSED" ? "badge badge-green" : s.status === "NEEDS_REVISION" ? "badge badge-yellow" : "badge"}>{s.status.replaceAll("_", " ")}</span><span className="badge">{s.hardwarePlatform.name}</span></div><p className="muted">{s.studentNotes}</p><div className="inline">{s.evidence.map((e) => <a className="btn" target="_blank" rel="noreferrer" href={`/api/evidence/${e.id}`} key={e.id}>View {e.type.toLowerCase()} evidence</a>)}</div>{s.troubleshooting.length ? <><h3 style={{marginTop:14}}>Troubleshooting record</h3>{s.troubleshooting.map((t) => <p className="small muted" key={t.id}><strong>Issue:</strong> {t.issue} · <strong>Tried:</strong> {t.actionTried} · <strong>Result:</strong> {t.result}</p>)}</> : null}{s.assessment ? <div style={{marginTop:14}}><div className="inline"><strong>Teacher assessment</strong><span className="badge badge-green">{percent(s.assessment.totalScore, s.assessment.maxScore)}</span></div><p>{s.assessment.feedback}</p></div> : null}</div>)}</div></div> : null}
          </div>;
        })}

        {lesson.quiz ? (() => {
          const nextAttempt = lesson.quiz.attempts.length + 1;
          const started = openStarts.some((event) => event.type === "QUIZ_STARTED" && event.quizId === lesson.quiz!.id && event.attemptNo === nextAttempt);
          const latest = lesson.quiz.attempts[0];
          return <div className="card"><div className="eyebrow">Knowledge check</div><h2 style={{fontSize:26,marginTop:8}}>{lesson.quiz.title}</h2>{latest ? <p className="muted">Latest attempt: <strong>{percent(latest.score, latest.maxScore)}</strong> — {latest.passed ? "passed" : "retry recommended"}.</p> : null}{!started ? <form action={startQuiz.bind(null, lesson.quiz.id)}><button className="btn">Start quiz attempt {nextAttempt}</button></form> : <form action={submitQuiz.bind(null, lesson.quiz.id)} className="form">{lesson.quiz.questions.map((q) => <fieldset className="card card-muted" key={q.id} style={{borderColor:"var(--border)"}}><legend><strong>{q.order}. {q.prompt}</strong></legend><div className="form" style={{marginTop:10}}>{(Array.isArray(q.options) ? q.options : []).map((option) => <label className="inline" key={String(option)}><input type="radio" name={`q_${q.id}`} value={String(option)} required/> <span>{String(option)}</span></label>)}</div></fieldset>)}<button className="btn">Submit quiz</button></form>}</div>;
        })() : null}
      </div>
      <aside className="stack"><div className="card"><div className="eyebrow">STEMBuild AI Lab Coach</div><h3 style={{margin:"8px 0 12px"}}>Need a structured next-step plan?</h3><p className="small muted">The AI Lab Coach reviews your stored learning evidence and builds an OBSERVE → REASON → PLAN → GUIDE → CHECK → ADAPT sequence. It cannot mark practical work as passed.</p><Link className="btn btn-primary" href={`/dashboard/student/ai-lab-coach?lesson=${lesson.id}`}>Open AI Lab Coach</Link></div><div className="card"><div className="eyebrow">Approved lesson guidance</div><h3 style={{margin:"8px 0 12px"}}>Quick troubleshooting lookup</h3><AiHelp lessonId={lesson.id} hardware={hardwareOptions}/></div><div className="card"><h3>Teacher rubric</h3><p className="small muted">You are assessed on practical evidence, not only the quiz.</p><ul className="list">{lesson.practicalTasks[0]?.rubric.criteria.map((c) => <li key={c.id}>{c.label} — {c.maxScore} pts{c.skill ? ` · ${c.skill.name}` : ""}</li>)}</ul></div></aside>
    </div>
  </>;
}
