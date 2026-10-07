import Link from "next/link";
import { aiCoachSafetyNotice, getStudentCoachSessions } from "@/lib/ai-coach";
import { generateAiLabCoachPlan, revealAiLabCoachHint, submitAiLabCoachCheck } from "@/lib/ai-coach-actions";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { requireRole } from "@/lib/session";

function sourceLabel(sourceMode: string) {
  return sourceMode === "ai-gateway" ? "AI-generated plan" : "Rules-based safety fallback";
}

function outcomeLabel(value: string | null) {
  return value ? value.replaceAll("_", " ").toLowerCase() : "Not checked yet";
}

export default async function AiLabCoachPage({ searchParams }: { searchParams: Promise<{ session?: string; lesson?: string }> }) {
  const user = await requireRole("STUDENT");
  const params = await searchParams;
  const assignments = await db.lessonAssignment.findMany({
    where: { status: "ACTIVE", classroom: { enrollments: { some: { studentId: user.id, status: "ACTIVE" } } } },
    include: {
      lesson: { include: { module: { include: { course: true } }, hardwareVariants: { include: { hardwarePlatform: true }, orderBy: { title: "asc" } } } },
      classroom: true,
    },
    orderBy: { createdAt: "asc" },
  });
  const selectedLessonId = params.lesson && assignments.some((item) => item.lessonId === params.lesson) ? params.lesson : assignments[0]?.lessonId;
  const sessions = await getStudentCoachSessions(user.id, params.session ?? null);
  const current = sessions[0] ?? null;
  const history = params.session ? await getStudentCoachSessions(user.id) : sessions;
  const selectedAssignment = assignments.find((item) => item.lessonId === selectedLessonId);
  const activeSteps = current?.steps.filter((step) => step.status !== "SUPERSEDED" && step.status !== "SKIPPED") ?? [];
  const nextPending = activeSteps.find((step) => step.status === "PENDING");

  return <>
    <div className="topbar">
      <div className="page-title">
        <div className="eyebrow">STEMBuild AI Lab Coach</div>
        <h1 style={{fontSize:38}}>Evidence-based next-step coaching</h1>
        <div className="muted">The coach uses your stored lesson progress, quiz performance, practical history, troubleshooting, teacher feedback and skill mastery. It does not grade practical work.</div>
      </div>
    </div>

    <div className="notice"><strong>Safety boundary:</strong> {aiCoachSafetyNotice()}</div>

    <section className="section">
      <div className="grid grid-2">
        <div className="card">
          <div className="eyebrow">Start / refresh a plan</div>
          <h2 style={{marginTop:8}}>Choose your current lesson</h2>
          <p className="muted">A new run captures a fresh evidence snapshot. The coach does not use another student&apos;s data.</p>
          {assignments.length ? <div className="stack" style={{marginTop:16}}>
            <form method="get" className="form">
              <div className="field"><label>Assigned lesson</label><select className="select" name="lesson" defaultValue={selectedLessonId}>{assignments.map((assignment) => <option key={assignment.id} value={assignment.lessonId}>{assignment.lesson.module.course.title} — {assignment.lesson.title}</option>)}</select></div>
              <button className="btn">Load lesson hardware</button>
            </form>
            {selectedAssignment ? <form action={generateAiLabCoachPlan} className="form"><input type="hidden" name="lessonId" value={selectedAssignment.lessonId}/><div className="field"><label>Hardware platform</label><select className="select" name="hardwarePlatformId" defaultValue={selectedAssignment.lesson.hardwareVariants[0]?.hardwarePlatformId ?? ""}>{selectedAssignment.lesson.hardwareVariants.map((variant) => <option key={variant.id} value={variant.hardwarePlatformId}>{variant.hardwarePlatform.name}</option>)}</select></div><button className="btn btn-primary">Create next-step learning plan</button></form> : null}
          </div> : <div className="empty">You need an active lesson assignment before the AI Lab Coach can build a plan.</div>}
        </div>

        <div className="card card-muted">
          <div className="eyebrow">What the coach is allowed to do</div>
          <ul className="list" style={{marginTop:12}}>
            <li>Observe stored learning evidence and identify evidence-backed gaps.</li>
            <li>Plan review, practice, debugging, retry, verification and teacher-help steps.</li>
            <li>Provide a teaching hint only when you request one.</li>
            <li>Ask you to check an observable result and adapt from your response.</li>
            <li><strong>Never</strong> mark practical work as passed or control physical devices.</li>
          </ul>
        </div>
      </div>
    </section>

    {current ? <>
      <section>
        <div className="section-title"><div><div className="inline"><span className="badge">{sourceLabel(current.sourceMode)}</span><span className="badge">{current.model}</span><span className={current.status === "COMPLETED" ? "badge badge-green" : "badge badge-yellow"}>{current.status.toLowerCase()}</span></div><h2 style={{marginTop:12}}>{current.lesson.title}</h2><div className="small muted">Plan created {formatDate(current.createdAt)}{current.hardwarePlatform ? ` · ${current.hardwarePlatform.name}` : ""}</div></div><Link className="btn" href={`/dashboard/student/lessons/${current.lessonId}`}>Open lesson</Link></div>
        {current.sourceMode !== "ai-gateway" ? <div className="notice"><strong>AI generation was unavailable or blocked by a safeguard.</strong> STEMBuild returned a conservative rules-based coaching plan instead. The UI does not present fallback content as AI-generated.</div> : null}
        <div className="grid grid-2" style={{marginTop:14}}>
          <div className="card"><div className="eyebrow">OBSERVE</div><h3 style={{marginTop:8}}>What the stored evidence shows</h3><p className="muted">{current.observeSummary}</p></div>
          <div className="card"><div className="eyebrow">REASON</div><h3 style={{marginTop:8}}>Likely learning gap</h3><p className="muted">{current.reasonSummary}</p><div className="small muted">This is a learning recommendation, not an assessment result.</div></div>
        </div>
      </section>

      <section className="section">
        <h2>PLAN → GUIDE → CHECK → ADAPT</h2>
        <p className="muted">Work through the active steps in order. A self-check only changes coaching recommendations; it cannot complete your practical assessment.</p>
        <div className="stack" style={{marginTop:16}}>{current.steps.map((step) => {
          const superseded = step.status === "SUPERSEDED" || step.status === "SKIPPED";
          const isNext = nextPending?.id === step.id;
          return <div className={`card ${superseded ? "card-muted" : ""}`} key={step.id} style={{opacity: superseded ? 0.55 : 1}}>
            <div className="section-title"><div><div className="inline"><span className="badge">Step {step.order}</span>{step.revision ? <span className="badge">Adaptation {step.revision}</span> : null}{step.skill ? <span className="badge">{step.skill.name}</span> : null}<span className={step.status === "VERIFIED" ? "badge badge-green" : step.status === "NEEDS_HELP" ? "badge badge-yellow" : "badge"}>{step.status.replaceAll("_", " ").toLowerCase()}</span>{step.sourceMode === "ai-gateway" ? <span className="badge">AI-generated content</span> : <span className="badge">Rules-based content</span>}</div><h3 style={{marginTop:10}}>{step.title}</h3></div><span className="small muted">{step.actionType.replaceAll("_", " ")}</span></div>
            <p>{step.instruction}</p>
            <p className="small muted"><strong>Why:</strong> {step.rationale}</p>
            {step.safetyNote ? <div className="notice"><strong>Safety:</strong> {step.safetyNote}</div> : null}

            {!superseded ? <div style={{marginTop:16}}>
              <div className="eyebrow">GUIDE</div>
              {!step.hintRevealedAt ? <form action={revealAiLabCoachHint.bind(null, step.id)} style={{marginTop:8}}><button className="btn">Request a teaching hint</button></form> : <div className="card card-muted" style={{marginTop:8}}><div className="inline"><span className="badge">{step.sourceMode === "ai-gateway" ? "AI teaching hint" : "Approved teaching hint"}</span></div><p style={{marginBottom:0}}>{step.hint}</p></div>}
            </div> : null}

            {!superseded && step.status !== "VERIFIED" && (isNext || step.status === "NEEDS_HELP") ? <form action={submitAiLabCoachCheck.bind(null, step.id)} className="form" style={{marginTop:18}}>
              <div className="eyebrow">CHECK{isNext ? " — next active step" : ""}</div>
              <p><strong>{step.checkPrompt}</strong></p>
              <div className="field"><label>What happened?</label><select className="select" name="outcome" required defaultValue=""><option value="" disabled>Choose an observed result</option><option value="WORKED">The check worked as expected</option><option value="PARTLY_WORKED">It partly worked / result changed</option><option value="DID_NOT_WORK">It did not work</option><option value="NEED_TEACHER">I need teacher help</option></select></div>
              <div className="field"><label>Describe what you actually observed</label><textarea className="textarea" name="learnerResult" required placeholder="Example: The LED now blinks, but the sensor value still stays at zero." /></div>
              <button className="btn btn-primary">Record check and adapt next step</button>
              <div className="small muted">Your self-check is coaching evidence only. It does not mark the practical task as complete.</div>
            </form> : step.checkOutcome ? <div className="small muted" style={{marginTop:14}}>Recorded check: {outcomeLabel(step.checkOutcome)}{step.learnerResult ? ` — ${step.learnerResult}` : ""}</div> : null}
          </div>;
        })}</div>
      </section>

      <section>
        <div className="card card-muted"><div className="eyebrow">Evaluation logging</div><h3 style={{marginTop:8}}>Why STEMBuild logs recommendations</h3><p className="muted">The system stores the evidence snapshot, generated plan, safeguard decisions, hint requests, learner checks and adaptations. Later evaluation can compare recommendations with subsequent real learning events and teacher-assessed outcomes without pretending that the AI caused improvement.</p></div>
      </section>
    </> : null}

    <section className="section">
      <h2>Recent coaching sessions</h2>
      <div className="table-wrap" style={{marginTop:14}}><table><thead><tr><th>Date</th><th>Lesson</th><th>Source</th><th>Status</th><th></th></tr></thead><tbody>{history.map((session) => <tr key={session.id}><td>{formatDate(session.createdAt)}</td><td>{session.lesson.title}</td><td>{sourceLabel(session.sourceMode)}</td><td>{session.status.toLowerCase()}</td><td><Link className="btn" href={`/dashboard/student/ai-lab-coach?session=${session.id}`}>View</Link></td></tr>)}{history.length === 0 ? <tr><td colSpan={5} className="muted">No AI Lab Coach sessions yet.</td></tr> : null}</tbody></table></div>
    </section>
  </>;
}
