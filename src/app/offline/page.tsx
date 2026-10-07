import Link from "next/link";
import { Brand } from "@/components/brand";

export default function OfflinePage() {
  return <main className="login-shell"><div className="card login-card"><Brand/><h1 style={{fontSize:40,marginTop:30}}>You are offline</h1><p className="lead">Downloaded STEMBuild lessons remain available on this device. Private dashboards, quizzes, AI coaching, evidence uploads and teacher assessment require a secure connection.</p><div className="stack"><a className="btn btn-primary" href="/offline-lesson.html">Open a downloaded lesson</a><a className="btn" href="/showcase/smart-environment-monitor">Open the public sample lesson</a><Link className="btn" href="/">Return home</Link></div></div></main>;
}
