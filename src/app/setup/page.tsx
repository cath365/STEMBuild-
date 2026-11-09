import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/public-header";
import { SetupForm } from "@/components/account-forms";
import { createFirstAdmin } from "@/lib/account-actions";
import { setupIsOpen } from "@/lib/setup";

export const metadata: Metadata = { title: "Set up STEMBuild", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const open = await setupIsOpen();
  return <div className="auth-page"><PublicHeader /><main className="container auth-layout">
    <section className="auth-intro">
      <div className="eyebrow">First-time setup</div>
      <h1>Create the administrator account.</h1>
      <p className="lead">The administrator invites teachers, manages schools and users, and can reset anyone&apos;s password. Teachers then create classes, and learners join with a class code.</p>
    </section>
    <section className="card login-card">
      {open ? <>
        <h2>Register as administrator</h2>
        <p className="muted small">This page works only once. As soon as this account is created, setup closes and nobody else can use it.</p>
        <SetupForm action={createFirstAdmin} />
      </> : <>
        <h2>Setup is complete</h2>
        <p className="muted">An administrator account already exists. Sign in with it; new teachers are invited from the admin dashboard.</p>
        <Link className="btn btn-primary" href="/login">Go to sign in</Link>
      </>}
    </section>
  </main></div>;
}
