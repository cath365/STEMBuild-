import { StatCard } from "@/components/stat-card";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";

export default async function AdminDashboard(){
 await requireRole("ADMIN");
 const [users,schools,courses,hardware,submissions]=await Promise.all([db.user.count(),db.school.count(),db.course.count(),db.hardwarePlatform.count({where:{active:true}}),db.practicalSubmission.count()]);
 return <><div className="topbar"><div className="page-title"><div className="eyebrow">Administrator</div><h1 style={{fontSize:38}}>STEMBuild administration</h1><div className="muted">Manage platform identity, curriculum structures, hardware and assessment definitions.</div></div></div><div className="grid grid-4"><StatCard label="Users" value={users}/><StatCard label="Schools" value={schools}/><StatCard label="Courses" value={courses}/><StatCard label="Active hardware platforms" value={hardware}/></div><section className="section"><div className="card"><h2 style={{fontSize:26}}>Data integrity boundary</h2><p className="muted">Seed records are explicitly marked DEMO. No production school, learner or impact data is included. Current practical submissions in this database: {submissions}.</p></div></section></>;
}
