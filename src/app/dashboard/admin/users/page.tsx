import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { createUser, toggleUserActive } from "@/lib/admin-actions";
import { createAdminResetLink, createTeacherInvite } from "@/lib/account-actions";
import { LinkMaker } from "@/components/account-forms";

export default async function AdminUsers(){
 await requireRole("ADMIN"); const [users,schools,pendingInvites]=await Promise.all([db.user.findMany({include:{school:true},orderBy:{createdAt:"desc"}}),db.school.findMany({orderBy:{name:"asc"}}),db.accountToken.count({where:{kind:"TEACHER_INVITE",usedAt:null,expiresAt:{gt:new Date()}}})]);
 return <><div className="topbar"><div className="page-title"><div className="eyebrow">Users</div><h1 style={{fontSize:38}}>Accounts and roles</h1><div className="muted">Students join with their class code. Teachers join with an invitation link. Nobody needs to share a password.</div></div></div>
 <div className="grid grid-2">
  <div className="card"><h2 style={{fontSize:22}}>Invite a teacher</h2><p className="small muted">Creates a single-use link that expires in 7 days. The teacher chooses their own password. {pendingInvites ? `${pendingInvites} invitation${pendingInvites === 1 ? " is" : "s are"} waiting to be used.` : ""}</p>
   <LinkMaker action={createTeacherInvite} label="Create invitation link">
    <div className="field"><label htmlFor="invite-email">Teacher email (optional, locks the invite to it)</label><input id="invite-email" className="input" type="email" name="email"/></div>
    <div className="field"><label htmlFor="invite-school">School</label><select id="invite-school" className="select" name="schoolId"><option value="">No school</option>{schools.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
   </LinkMaker>
  </div>
  <div className="card"><h2 style={{fontSize:22}}>Create an account directly</h2><p className="small muted">For administrators and special cases. Share the temporary password privately and ask the person to change it with a reset link.</p><form action={createUser} className="form" style={{marginTop:14}}><div className="grid grid-2"><div className="field"><label>Name</label><input className="input" name="displayName" required/></div><div className="field"><label>Email</label><input className="input" type="email" name="email" required/></div><div className="field"><label>Role</label><select className="select" name="role"><option>STUDENT</option><option>TEACHER</option><option>ADMIN</option></select></div><div className="field"><label>School</label><select className="select" name="schoolId"><option value="">No school</option>{schools.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div></div><div className="field"><label>Temporary password (12+ chars)</label><input className="input" type="password" name="password" minLength={12} required/></div><button className="btn btn-primary">Create user</button></form></div>
 </div>
 <section className="section"><div className="table-wrap"><table><thead><tr><th>User</th><th>Role</th><th>School</th><th>State</th><th>Access</th><th>Password</th></tr></thead><tbody>{users.map(u=><tr key={u.id}><td>{u.displayName}<div className="small muted">{u.email}{u.isDemo?" · DEMO":""}</div></td><td>{u.role}</td><td>{u.school?.name??"—"}</td><td>{u.isActive?"Active":"Disabled"}</td><td><form action={toggleUserActive.bind(null,u.id)}><button className="btn">{u.isActive?"Disable":"Enable"}</button></form></td><td><LinkMaker action={createAdminResetLink.bind(null,u.id)} label="Reset link"/></td></tr>)}</tbody></table></div></section></>;
}
