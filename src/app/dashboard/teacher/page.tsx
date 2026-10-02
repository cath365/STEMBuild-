import Link from "next/link";
import { StatCard } from "@/components/stat-card";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";

export default async function TeacherDashboard(){
 const user=await requireRole("TEACHER");
 const [classes,pending,assessed]=await Promise.all([
  db.classroom.findMany({where:{teacherId:user.id},include:{_count:{select:{enrollments:true,lessons:true}}},orderBy:{createdAt:"desc"}}),
  db.practicalSubmission.count({where:{status:"SUBMITTED",classroom:{teacherId:user.id}}}),
  db.practicalAssessment.count({where:{teacherId:user.id}}),
 ]);
 const learners=classes.reduce((sum,c)=>sum+c._count.enrollments,0);
 return <><div className="topbar"><div className="page-title"><div className="eyebrow">Teacher</div><h1 style={{fontSize:38}}>Practical learning dashboard</h1><div className="muted">Review what learners build, where they struggle and how many attempts they need.</div></div></div><div className="grid grid-4"><StatCard label="Classes" value={classes.length}/><StatCard label="Enrollments" value={learners}/><StatCard label="Awaiting review" value={pending}/><StatCard label="Assessments completed" value={assessed}/></div><section className="section"><div className="section-title"><h2>Your classes</h2><Link className="btn" href="/dashboard/teacher/classes">Manage classes</Link></div><div className="grid grid-2">{classes.map(c=><Link href={`/dashboard/teacher/classes/${c.id}`} className="card" key={c.id}><span className="badge">{c._count.enrollments} learners</span><h3 style={{marginTop:12}}>{c.name}</h3><div className="small muted">{c._count.lessons} lesson assignments · code {c.joinCode}</div></Link>)}{classes.length===0?<div className="card empty">Create a class to begin assigning practical lessons.</div>:null}</div></section></>;
}
