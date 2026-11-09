import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/public-header";
import { ResetForm } from "@/components/account-forms";
import { resetPasswordWithToken } from "@/lib/account-actions";
import { hashToken, tokenStatus } from "@/lib/account-tokens";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Reset your password", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ResetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const reset = await db.accountToken.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: { select: { displayName: true } } } });
  const status = reset?.kind === "PASSWORD_RESET" ? tokenStatus(reset) : "invalid";
  return <div className="auth-page"><PublicHeader /><main className="container auth-layout">
    <section className="auth-intro">
      <div className="eyebrow">Password reset</div>
      <h1>Choose a new password.</h1>
      <p className="lead">After you save it, you will be signed out on every device and can sign in with the new password.</p>
    </section>
    <section className="card login-card">
      {status === "valid" ? <>
        <h2>New password{reset?.user ? ` for ${reset.user.displayName}` : ""}</h2>
        <ResetForm action={resetPasswordWithToken.bind(null, token)} />
      </> : <>
        <h2>{status === "used" ? "This link has already been used" : status === "expired" ? "This link has expired" : "Link not found"}</h2>
        <p className="muted">Reset links work once and expire after 24 hours. Ask your teacher or administrator for a new one.</p>
        <Link className="btn" href="/login">Go to sign in</Link>
      </>}
    </section>
  </main></div>;
}
