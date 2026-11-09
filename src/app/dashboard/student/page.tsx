import Link from "next/link";
import { StatCard } from "@/components/stat-card";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { formatDate, percent } from "@/lib/format";

const DUE_SOON_MS = 3 * 24 * 60 * 60 * 1000;
const statusRank = { IN_PROGRESS: 0, NOT_STARTED: 1, COMPLETED: 2 } as const;

type Assignment = { dueAt: Date | null; lesson: { progress: { status: keyof typeof statusRank }[] } };

// Work that needs attention first: in progress, then not started (earliest due first), completed last.
// Evaluated per request (the dashboard is force-dynamic), so "now" is the request time.
function prioritise<T extends Assignment>(assignments: T[]) {
  const now = Date.now();
  return assignments.map((a) => {
    const status = a.lesson.progress[0]?.status ?? "NOT_STARTED";
    const due = a.dueAt ? a.dueAt.getTime() : null;
    const open = status !== "COMPLETED";
    return { a, status, overdue: open && due !== null && due < now, dueSoon: open && due !== null && due >= now && due - now <= DUE_SOON_MS, due };
  }).sort((x, y) => statusRank[x.status] - statusRank[y.status] || (x.due ?? Infinity) - (y.due ?? Infinity));
}

export default async function StudentDashboard() {
  const user = await requireRole("STUDENT");
  const assignments = await db.lessonAssignment.findMany({
    where: { status: "ACTIVE", classroom: { enrollments: { some: { studentId: user.id, status: "ACTIVE" } } } },
    include: { classroom: true, lesson: { include: { module: true, progress: { where: { studentId: user.id } } } } },
    orderBy: { createdAt: "asc" },
  });
  const submissions = await db.practicalSubmission.count({ where: { studentId: user.id, status: { in: ["SUBMITTED", "ASSESSED", "NEEDS_REVISION"] } } });
  const quizAttempts = await db.quizAttempt.count({ where: { studentId: user.id, completedAt: { not: null } } });

  const items = prioritise(assignments);
  const completed = items.filter((item) => item.status === "COMPLETED").length;
  const next = items.find((item) => item.status !== "COMPLETED");
  const overdueCount = items.filter((item) => item.overdue).length;

  return <>
    <div className="topbar"><div className="page-title"><div className="eyebrow">Student</div><h1 style={{fontSize:38}}>Welcome, {user.displayName}</h1><div className="muted">Continue your assigned practical learning.</div></div><Link className="btn" href="/join">Join a class</Link></div>

    {next ? <section className="card continue-card" aria-labelledby="continue-title">
      <div>
        <div className="eyebrow">{next.status === "IN_PROGRESS" ? "Pick up where you left off" : "Your next lesson"}</div>
        <h2 id="continue-title">{next.a.lesson.title}</h2>
        <p className="muted">{next.a.lesson.module.title} · {next.a.classroom.name}{next.a.dueAt ? ` · Due ${formatDate(next.a.dueAt)}` : ""}</p>
      </div>
      <Link className="btn btn-primary" href={`/dashboard/student/lessons/${next.a.lessonId}`}>{next.status === "IN_PROGRESS" ? "Continue lesson" : "Start lesson"} →</Link>
    </section> : assignments.length ? <div className="card continue-card"><div><div className="eyebrow">All caught up</div><h2>Every assigned lesson is complete.</h2><p className="muted">Try a new build from the project library while you wait for your next assignment.</p></div><Link className="btn" href="/projects">Browse projects</Link></div> : null}

    <div className="grid grid-3" style={{marginTop:16}}>
      <StatCard label="Assigned lessons" value={assignments.length} detail={overdueCount ? `${overdueCount} overdue` : undefined}/>
      <div className="card card-muted"><div className="muted small">Completed lessons</div><div className="metric">{completed}<span className="muted small"> / {assignments.length}</span></div><div className="progress" role="progressbar" aria-label="Assigned lessons completed" aria-valuemin={0} aria-valuemax={assignments.length || 1} aria-valuenow={completed} style={{marginTop:10}}><span style={{width:percent(completed, assignments.length)}}/></div></div>
      <StatCard label="Recorded attempts" value={quizAttempts + submissions} detail="Quiz + practical submission attempts"/>
    </div>

    <section className="section"><div className="section-title"><h2>Current assignments</h2><Link className="btn" href="/dashboard/student/learning-path">View full path</Link></div>
      <div className="grid grid-2">{items.length ? items.map(({a, status, overdue, dueSoon}) => <Link className={overdue ? "card assignment-card overdue" : "card assignment-card"} key={a.id} href={`/dashboard/student/lessons/${a.lessonId}`}>
        <div className="inline"><span className="badge">{a.lesson.module.title}</span><span className={status === "COMPLETED" ? "badge badge-green" : "badge badge-yellow"}>{status.replaceAll("_", " ")}</span>{overdue ? <span className="badge badge-yellow">Overdue</span> : dueSoon ? <span className="badge">Due soon</span> : null}</div>
        <h3 style={{marginTop:14}}>{a.lesson.title}</h3>
        <p className="muted">Class: {a.classroom.name}</p>
        <div className="small muted">Due {formatDate(a.dueAt)}</div>
      </Link>) : <div className="card empty">No active lesson assignments yet. Your teacher will add lessons here — meanwhile, <Link className="text-link" href="/projects">explore a project</Link>.</div>}</div>
    </section>

    <section className="section"><div className="card"><div className="eyebrow">STEMBuild AI Lab Coach</div><div className="section-title" style={{marginTop:8}}><div><h2>Get an evidence-based next-step plan</h2><p className="muted">The coach uses your real lesson progress, quiz/practical history, troubleshooting, teacher feedback and skill mastery. It cannot grade practical work or control hardware.</p></div><Link className="btn btn-primary" href="/dashboard/student/ai-lab-coach">Open AI Lab Coach</Link></div></div></section>
  </>;
}
