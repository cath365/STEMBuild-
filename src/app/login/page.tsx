import Link from "next/link";
import Image from "next/image";
import { PublicHeader } from "@/components/public-header";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return <div className="auth-page"><PublicHeader /><main className="container auth-layout"><section className="auth-intro"><div className="eyebrow">Your STEMBuild workspace</div><h1>Keep learning.<br /><span>Keep building.</span></h1><p className="lead">Pick up your lessons, work on a project and see how far you have come.</p><div className="auth-photo"><Image src="/electronics-workbench.jpg" alt="Arduino and breadboard on an electronics workbench" fill sizes="(max-width: 760px) 100vw, 480px" /></div></section><section className="card login-card"><div className="eyebrow">Welcome back</div><h2>Sign in</h2><p className="muted">Access your lessons, projects and dashboard.</p><LoginForm /><hr /><p className="small muted">Need an account? Ask your teacher or school administrator.</p><Link className="small" href="/">← Explore STEMBuild</Link></section></main></div>;
}
