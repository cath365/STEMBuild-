import Link from "next/link";
import { StatCard } from "@/components/stat-card";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { formatDate } from "@/lib/format";

export default async function StudentDashboard() {
  const user = await requireRole("STUDENT");
  const assignments = await db.lessonAssignment.findMany({
    where: { status: "ACTIVE", classroom: { enrollments: { some: { studentId: user.id, status: "ACTIVE" } } } },
    include: { classroom: true, lesson: { include: { module: true, progress: { where: { studentId: user.id } } } } },
    orderBy: { createdAt: "asc" },
  });
  const completed = assignments.filter((a) => a.lesson.progress[0]?.status === "COMPLETED").length;
  const submissions = await db.practicalSubmission.count({ where: { studentId: user.id, status: { in: ["SUBMITTED", "ASSESSED", "NEEDS_REVISION"] } } });
  const quizAttempts = await db.quizAttempt.count({ where: { studentId: user.id, completedAt: { not: null } } });

  return <>
    <div className="topbar"><div className="page-title"><div className="eyebrow">Student</div><h1 style={{fontSize:38}}>Welcome, {user.displayName}</h1><div className="muted">Continue your assigned practical learning.</div></div></div>
    <div className="grid grid-3"><StatCard label="Assigned lessons" value={assignments.length}/><StatCard label="Completed requirements" value={completed}/><StatCard label="Recorded attempts" value={quizAttempts + submissions} detail="Quiz + practical submission attempts"/></div>
    <section className="section"><div className="card"><div className="eyebrow">STEMBuild AI Lab Coach</div><div className="section-title" style={{marginTop:8}}><div><h2>Get an evidence-based next-step plan</h2><p className="muted">The coach uses your real lesson progress, quiz/practical history, troubleshooting, teacher feedback and skill mastery. It cannot grade practical work or control hardware.</p></div><Link className="btn btn-primary" href="/dashboard/student/ai-lab-coach">Open AI Lab Coach</Link></div></div></section>

    <section className="section"><div className="section-title"><h2>Current assignments</h2><Link className="btn" href="/dashboard/student/learning-path">View full path</Link></div>
      <div className="grid grid-2">{assignments.length ? assignments.map((a)=><Link className="card" key={a.id} href={`/dashboard/student/lessons/${a.lessonId}`}><div className="inline"><span className="badge">{a.lesson.module.title}</span><span className={a.lesson.progress[0]?.status === "COMPLETED" ? "badge badge-green" : "badge badge-yellow"}>{a.lesson.progress[0]?.status?.replaceAll("_"," ") ?? "NOT STARTED"}</span></div><h3 style={{marginTop:14}}>{a.lesson.title}</h3><p className="muted">Class: {a.classroom.name}</p><div className="small muted">Due {formatDate(a.dueAt)}</div></Link>) : <div className="card empty">No active lesson assignments yet.</div>}</div>
    </section>
  </>;
}
