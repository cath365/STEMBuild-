import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/public-header";
import { JoinForm } from "@/components/account-forms";
import { joinWithCode } from "@/lib/account-actions";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Join your class", description: "Use the code from your teacher to create your STEMBuild account and join your class." };
export const dynamic = "force-dynamic";

export default async function JoinPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;
  const user = await getCurrentUser();
  return <div className="auth-page"><PublicHeader /><main className="container auth-layout">
    <section className="auth-intro">
      <div className="eyebrow">Join your class</div>
      <h1>Your teacher gave you a code.</h1>
      <p className="lead">Enter it here to create your account and see the lessons and projects your teacher has set. It takes a minute.</p>
      <ul className="list small"><li>No email is sent: your teacher’s code is all you need.</li><li>Forgot your password later? Your teacher can give you a reset link.</li></ul>
    </section>
    <section className="card login-card">
      <h2>Join a class</h2>
      {user && user.role !== "STUDENT"
        ? <p className="muted">You are signed in as a {user.role.toLowerCase()}. Class codes are for student accounts. <Link className="text-link" href={`/dashboard/${user.role.toLowerCase()}`}>Go to your dashboard</Link></p>
        : <JoinForm action={joinWithCode} code={code ?? ""} signedInAs={user ? user.displayName : null} />}
      <hr />
      <p className="small muted">Already have an account? <Link className="text-link" href="/login">Sign in</Link></p>
    </section>
  </main></div>;
}
