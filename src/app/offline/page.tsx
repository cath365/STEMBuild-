import Link from "next/link";
import { Brand } from "@/components/brand";
export default function OfflinePage(){return <main className="login-shell"><div className="card login-card"><Brand/><h1 style={{fontSize:40,marginTop:30}}>You are offline</h1><p className="lead">STEMBuild keeps the public shell available, but private learner records and submissions require a secure connection.</p><Link className="btn" href="/">Return home</Link></div></main>}
