import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { formatDate, percent } from "@/lib/format";
import { startProject, submitProject } from "@/lib/learning-actions";
import { CompressedEvidenceInput } from "@/components/compressed-evidence-input";
import { HardwareVariantSelector, type HardwareVariantOption } from "@/components/hardware-variant-selector";
import { ShowcaseLearningJourney } from "@/components/showcase-learning-journey";

export default async function StudentProjects() {
  const user = await requireRole("STUDENT");
  const assignments = await db.projectAssignment.findMany({
    where: { status: "ACTIVE", classroom: { enrollments: { some: { studentId: user.id, status: "ACTIVE" } } } },
    include: {
      classroom: true,
      project: {
        include: {
          rubric: { include: { criteria: { orderBy: { order: "asc" }, include: { skill: true } } } },
          hardware: { include: { hardwarePlatform: true } },
          submissions: {
            where: { studentId: user.id },
            include: { assessment: true, evidence: true, hardwarePlatform: true },
            orderBy: { submissionNo: "desc" },
          },
        },
      },
    },
  });
  const projectIds = assignments.map((assignment) => assignment.projectId);
  const starts = projectIds.length
    ? await db.learningEvent.findMany({
        where: { learnerId: user.id, type: "PROJECT_STARTED", projectId: { in: projectIds } },
        select: { projectId: true, attemptNo: true, hardwarePlatformId: true },
      })
    : [];
  const showcaseCourseId = assignments.find((assignment) => assignment.project.slug === "smart-environment-monitor")?.project.courseId;
  const showcaseLesson = showcaseCourseId ? await db.lesson.findFirst({
    where: { slug: "smart-environment-monitor", module: { courseId: showcaseCourseId } },
    include: {
      progress: { where: { studentId: user.id } },
      quiz: { include: { attempts: { where: { studentId: user.id } } } },
      practicalTasks: { include: { submissions: { where: { studentId: user.id }, include: { assessment: true } } } },
    },
  }) : null;

  return <>
    <div className="topbar"><div className="page-title"><div className="eyebrow">Projects</div><h1 style={{fontSize:38}}>Practical integration projects</h1><div className="muted">Choose a compatible board when you start. STEMBuild keeps the project objective and assessment fixed while adapting the implementation instructions.</div></div></div>
    <div className="stack">{assignments.map((a) => {
      const nextAttempt = a.project.submissions.length + 1;
      const started = starts.find((event) => event.projectId === a.project.id && event.attemptNo === nextAttempt);
      const variants: HardwareVariantOption[] = a.project.hardware.map((variant) => ({
        hardwarePlatformId: variant.hardwarePlatformId,
        hardwarePlatform: variant.hardwarePlatform.name,
        wiringInstructions: variant.wiringInstructions,
        gpioMappings: variant.gpioMappings,
        codeLanguage: variant.codeLanguage,
        programmingFramework: variant.programmingFramework,
        sourceCode: variant.sourceCode,
        uploadProcedure: variant.uploadProcedure,
        expectedOutput: variant.expectedOutput,
        troubleshooting: variant.troubleshooting,
        advancedExtension: variant.hardwarePlatform.slug === "esp32" ? variant.notes : null,
      }));
      const lockedVariant = started?.hardwarePlatformId
        ? variants.find((variant) => variant.hardwarePlatformId === started.hardwarePlatformId)
        : null;

      const showcaseLessonStarted = (showcaseLesson?.progress[0]?.status ?? "NOT_STARTED") !== "NOT_STARTED";
      const showcaseQuizAttempted = Boolean(showcaseLesson?.quiz?.attempts.length);
      const showcaseEvidenceSubmitted = Boolean(a.project.submissions.length || showcaseLesson?.practicalTasks.some((task) => task.submissions.length));
      const showcaseTeacherReviewed = Boolean(a.project.submissions.some((submission) => submission.assessment) || showcaseLesson?.practicalTasks.some((task) => task.submissions.some((submission) => submission.assessment)));
      return <div className="card" key={a.id}>
        <div className="inline"><span className="badge">{a.classroom.name}</span><span className="badge">Due {formatDate(a.dueAt)}</span></div>
        <h2 style={{fontSize:28,marginTop:12}}>{a.project.title}</h2>
        {a.project.slug === "smart-environment-monitor" ? <><div className="notice" style={{marginTop:12}}><strong>Showcase build:</strong> measure first, interpret second, and only claim success when evidence or teacher validation supports it.</div><ShowcaseLearningJourney lessonStarted={showcaseLessonStarted} quizAttempted={showcaseQuizAttempted} evidenceSubmitted={showcaseEvidenceSubmitted} teacherReviewed={showcaseTeacherReviewed}/></> : null}
        <p className="muted">{a.project.description}</p>
        <p>{a.project.instructions}</p>
        <div className="small"><strong>Success criteria:</strong> {a.project.successCriteria}</div>
        <div className="small muted" style={{marginTop:8}}>Compatible boards: {a.project.hardware.map((h) => h.hardwarePlatform.name).join(", ") || "No variants configured"}</div>
        <hr/>

        {!started ? <form action={startProject.bind(null, a.project.id)} className="form">
          <HardwareVariantSelector variants={variants} label={`Choose your board for attempt ${nextAttempt}`}/>
          <button className="btn btn-primary" disabled={!variants.length}>Start project attempt</button>
          <div className="small muted">Your board choice is locked to this attempt so wiring, code, evidence and analytics stay consistent.</div>
        </form> : <form action={submitProject.bind(null, a.project.id)} className="form" encType="multipart/form-data">
          <HardwareVariantSelector variants={lockedVariant ? [lockedVariant] : variants} defaultId={started.hardwarePlatformId} label="Board selected for this attempt"/>
          <CompressedEvidenceInput label="Project evidence photo or PDF"/>
          <div className="field"><label>Build notes</label><textarea className="textarea" name="studentNotes" required/></div>
          <div className="field"><label>Code</label><textarea className="textarea" name="codeSnippet"/></div>
          <div className="field"><label>Troubleshooting attempts</label><textarea className="textarea" name="troubleshootingNotes" placeholder="Describe a fault, what you tested, and what changed." required/></div>
          <button className="btn btn-primary">Submit project</button>
        </form>}

        {a.project.submissions.length ? <div style={{marginTop:22}}><h3>Submission history</h3><div className="stack" style={{marginTop:10}}>{a.project.submissions.map((s) => <div className="card card-muted" key={s.id}><div className="inline"><span className="badge">Attempt {s.submissionNo}</span><span className={s.status === "ASSESSED" ? "badge badge-green" : s.status === "NEEDS_REVISION" ? "badge badge-yellow" : "badge"}>{s.status.replaceAll("_", " ")}</span><span className="badge">{s.hardwarePlatform.name}</span></div><p className="muted">{s.studentNotes}</p><div className="inline">{s.evidence.map((e) => <a className="btn" key={e.id} href={`/api/evidence/${e.id}`} target="_blank" rel="noreferrer">View evidence</a>)}</div>{s.assessment ? <div style={{marginTop:12}}><strong>Teacher score: {percent(s.assessment.totalScore, s.assessment.maxScore)}</strong><p>{s.assessment.feedback}</p></div> : null}</div>)}</div></div> : null}
        <hr/>
        <h3>Project rubric</h3>
        <ul className="list">{a.project.rubric.criteria.map((criterion) => <li key={criterion.id}>{criterion.label} — {criterion.maxScore} pts{criterion.skill ? ` · ${criterion.skill.name}` : ""}</li>)}</ul>
      </div>;
    })}
    {assignments.length === 0 ? <div className="card empty">No projects assigned yet.</div> : null}
    </div>
  </>;
}
