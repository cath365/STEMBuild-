"use client";
import { useActionState } from "react";
import { login } from "@/lib/auth-actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, {});
  return (
    <form action={action} className="form">
      <div className="field"><label htmlFor="email">Email</label><input className="input" id="email" name="email" type="email" required autoComplete="email" /></div>
      <div className="field"><label htmlFor="password">Password</label><input className="input" id="password" name="password" type="password" required autoComplete="current-password" /></div>
      {state.error ? <div className="error" role="alert">{state.error}</div> : null}
      <button className="btn btn-primary" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}
