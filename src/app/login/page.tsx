import Link from "next/link";
import { Brand } from "@/components/brand";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return <main className="login-shell"><div className="card login-card"><Brand/><div style={{margin:"28px 0 20px"}}><h1 style={{fontSize:42}}>Sign in</h1><p className="muted">Use an account created by your STEMBuild administrator.</p></div><LoginForm/><hr/><p className="small muted">DEMO accounts are created only by the seed script and are labeled DEMO. Change demo passwords before any shared deployment.</p><Link className="small" href="/">← Back to home</Link></div></main>;
}
