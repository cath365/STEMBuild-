import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";

export default async function LearningPathPage() {
  const user = await requireRole("STUDENT");
  const course = await db.course.findFirst({
    where: { status: "PUBLISHED" },
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            orderBy: { order: "asc" },
            include: {
              progress: { where: { studentId: user.id } },
              hardwareVariants: { select: { id: true } },
            },
          },
        },
      },
    },
  });

  return <>
    <div className="topbar"><div className="page-title"><div className="eyebrow">Learning path</div><h1 style={{fontSize:38}}>{course?.title ?? "Beginner Robotics & IoT"}</h1><div className="muted">Theory, physical build evidence and teacher assessment stay connected.</div></div></div>
    <div className="stack">{course?.modules.map((module)=><div className="card" key={module.id}><div className="small muted">Module {module.order}</div><h2 style={{fontSize:26,marginTop:4}}>{module.title.replace(/^Module \d+: /,"")}</h2><p className="muted">{module.description}</p>{module.lessons.map((lesson)=><div key={lesson.id} className="card card-muted" style={{marginTop:12}}><div className="inline"><span className={lesson.progress[0]?.status==="COMPLETED"?"badge badge-green":"badge"}>{lesson.progress[0]?.status?.replaceAll("_"," ")??"NOT STARTED"}</span><span className="badge">{lesson.hardwareVariants.length} hardware variant{lesson.hardwareVariants.length===1?"":"s"}</span></div><div className="inline" style={{justifyContent:"space-between",marginTop:10}}><div><h3>{lesson.title}</h3><div className="small muted">{lesson.objective}</div></div><Link className="btn" href={`/dashboard/student/lessons/${lesson.id}`}>Open lesson</Link></div></div>)}</div>) ?? <div className="card empty">No published pathway yet.</div>}</div>
  </>;
}
