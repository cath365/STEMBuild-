import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { createClass } from "@/lib/teacher-actions";

export default async function ClassesPage(){
 const teacher=await requireRole("TEACHER");
 const classes=await db.classroom.findMany({where:{teacherId:teacher.id},include:{_count:{select:{enrollments:true,lessons:true,projects:true}}},orderBy:{createdAt:"desc"}});
 return <><div className="topbar"><div className="page-title"><div className="eyebrow">Classes</div><h1 style={{fontSize:38}}>Classes and assignments</h1></div></div><div className="grid grid-2"><div className="card"><h2 style={{fontSize:26}}>Create class</h2><form className="form" action={createClass} style={{marginTop:14}}><div className="field"><label>Class name</label><input className="input" name="name" required placeholder="Grade 8 Robotics A"/></div><button className="btn btn-primary">Create class</button></form></div><div className="card"><h2 style={{fontSize:26}}>How enrollment works</h2><p className="muted">For the MVP, an administrator creates student accounts. Teachers add those students to a class by email, then assign lessons and projects.</p></div></div><section className="section"><div className="grid grid-2">{classes.map(c=><Link className="card" key={c.id} href={`/dashboard/teacher/classes/${c.id}`}><div className="inline"><span className="badge">{c._count.enrollments} learners</span><span className="badge">{c._count.lessons} lessons</span></div><h3 style={{marginTop:12}}>{c.name}</h3><div className="small muted">Join code: {c.joinCode}</div></Link>)}</div></section></>;
}
