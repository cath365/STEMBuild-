import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/public-header";
import { InviteForm } from "@/components/account-forms";
import { acceptTeacherInvite } from "@/lib/account-actions";
import { hashToken, tokenStatus } from "@/lib/account-tokens";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Teacher invitation", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await db.accountToken.findUnique({ where: { tokenHash: hashToken(token) }, include: { createdBy: { select: { displayName: true } } } });
  const status = invite?.kind === "TEACHER_INVITE" ? tokenStatus(invite) : "invalid";
  const school = invite?.schoolId ? await db.school.findUnique({ where: { id: invite.schoolId }, select: { name: true } }) : null;
  return <div className="auth-page"><PublicHeader /><main className="container auth-layout">
    <section className="auth-intro">
      <div className="eyebrow">Teacher invitation</div>
      <h1>Set up your teacher account.</h1>
      <p className="lead">Create classes, share a class code with your learners, review their practical evidence and see where they need help.</p>
    </section>
    <section className="card login-card">
      {status === "valid" ? <>
        <h2>Create your account</h2>
        <p className="muted small">Invited by {invite!.createdBy.displayName}{school ? ` for ${school.name}` : ""}.</p>
        <InviteForm action={acceptTeacherInvite.bind(null, token)} email={invite!.email} />
      </> : <>
        <h2>{status === "used" ? "This invitation has been used" : status === "expired" ? "This invitation has expired" : "Invitation not found"}</h2>
        <p className="muted">{status === "used" ? "An account was already created with this link. Sign in instead." : "Ask your administrator for a new invitation link."}</p>
        <Link className="btn" href="/login">Go to sign in</Link>
      </>}
    </section>
  </main></div>;
}
