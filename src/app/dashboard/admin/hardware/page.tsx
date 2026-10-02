import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { createHardware, createRoboticsKit, toggleHardwareActive, toggleRoboticsKit } from "@/lib/admin-actions";

export default async function Hardware() {
  await requireRole("ADMIN");
  const [items, schools, kits] = await Promise.all([
    db.hardwarePlatform.findMany({ include: { _count: { select: { variants: true, projects: true } } }, orderBy: { name: "asc" } }),
    db.school.findMany({ orderBy: { name: "asc" } }),
    db.roboticsKit.findMany({ include: { school: true, hardwarePlatform: true, _count: { select: { usages: true } } }, orderBy: [{ school: { name: "asc" } }, { code: "asc" }] }),
  ]);

  return <>
    <div className="topbar"><div className="page-title"><div className="eyebrow">Hardware</div><h1 style={{fontSize:38}}>Supported platforms & shared kits</h1><div className="muted">Add a board once, then configure lesson/project-specific wiring and code without changing application code.</div></div><Link className="btn btn-primary" href="/dashboard/admin/hardware/variants">Configure board variants</Link></div>
    <div className="grid grid-2">
      <div className="card"><h2 style={{fontSize:24}}>Add platform</h2><form action={createHardware} className="form" style={{marginTop:12}}><div className="field"><label>Name</label><input className="input" name="name" required/></div><div className="field"><label>Family</label><input className="input" name="family" required/></div><div className="field"><label>Description</label><input className="input" name="description"/></div><button className="btn btn-primary">Add hardware</button></form></div>
      <div className="card"><h2 style={{fontSize:24}}>Register a shared robotics kit</h2><p className="small muted">A physical kit can be used by several learners. STEMBuild records a separate kit-usage row for each learner, so their attempts and assessments stay separate.</p><form action={createRoboticsKit} className="form" style={{marginTop:12}}><div className="field"><label>School</label><select className="select" name="schoolId" required><option value="">Select school</option>{schools.map((school)=><option key={school.id} value={school.id}>{school.name}</option>)}</select></div><div className="field"><label>Platform</label><select className="select" name="hardwarePlatformId" required><option value="">Select platform</option>{items.filter((item)=>item.active).map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</select></div><div className="grid grid-2"><div className="field"><label>Kit name</label><input className="input" name="name" placeholder="Robotics Kit 1" required/></div><div className="field"><label>Kit code</label><input className="input" name="code" placeholder="KIT-01" required/></div></div><button className="btn btn-primary">Register kit</button></form></div>
    </div>
    <section className="section"><h2 style={{fontSize:26,marginBottom:14}}>Platforms</h2><div className="table-wrap"><table><thead><tr><th>Platform</th><th>Family</th><th>Lesson variants</th><th>State</th><th>Action</th></tr></thead><tbody>{items.map(h=><tr key={h.id}><td>{h.name}{h.isDemo?<div className="small muted">DEMO catalog</div>:null}</td><td>{h.family}</td><td>{h._count.variants}</td><td>{h.active?"Active":"Inactive"}</td><td><form action={toggleHardwareActive.bind(null,h.id)}><button className="btn">{h.active?"Disable":"Enable"}</button></form></td></tr>)}</tbody></table></div></section>
    <section className="section"><h2 style={{fontSize:26,marginBottom:14}}>Shared kit pool</h2><div className="table-wrap"><table><thead><tr><th>Kit</th><th>School</th><th>Platform</th><th>Learner uses</th><th>State</th><th>Action</th></tr></thead><tbody>{kits.map((kit)=><tr key={kit.id}><td><strong>{kit.code}</strong><div className="small muted">{kit.name}</div></td><td>{kit.school.name}</td><td>{kit.hardwarePlatform.name}</td><td>{kit._count.usages}</td><td>{kit.active?"Available":"Inactive"}</td><td><form action={toggleRoboticsKit.bind(null,kit.id)}><button className="btn">{kit.active?"Disable":"Enable"}</button></form></td></tr>)}{kits.length===0?<tr><td colSpan={6} className="muted">No shared kits registered yet.</td></tr>:null}</tbody></table></div></section>
  </>;
}
