"use client";

import { useActionState, useState } from "react";
import type { FormState } from "@/lib/account-actions";

type Action = (state: FormState, formData: FormData) => Promise<FormState>;

function PasswordFields() {
  return <>
    <div className="field"><label htmlFor="password">Password</label><input className="input" id="password" name="password" type="password" minLength={12} required autoComplete="new-password" /><span className="small muted">At least 12 characters. A short sentence is easy to remember and hard to guess.</span></div>
    <div className="field"><label htmlFor="confirm">Repeat password</label><input className="input" id="confirm" name="confirm" type="password" minLength={12} required autoComplete="new-password" /></div>
  </>;
}

/** Join a class: creates a student account, or enrols an already signed-in student. */
export function JoinForm({ action, code, signedInAs }: { action: Action; code: string; signedInAs: string | null }) {
  const [state, submit, pending] = useActionState(action, {});
  return <form action={submit} className="form">
    <div className="field"><label htmlFor="code">Class code</label><input className="input account-code" id="code" name="code" defaultValue={code} placeholder="STEM-1A2B3C" required autoComplete="off" autoCapitalize="characters" spellCheck={false} /></div>
    {signedInAs ? <p className="small muted">You are signed in as <strong>{signedInAs}</strong>. The class will be added to your account.</p> : <>
      <div className="field"><label htmlFor="displayName">Your name</label><input className="input" id="displayName" name="displayName" required autoComplete="name" maxLength={80} /><span className="small muted">Your teacher sees this name.</span></div>
      <div className="field"><label htmlFor="email">Email</label><input className="input" id="email" name="email" type="email" required autoComplete="email" /></div>
      <PasswordFields />
    </>}
    {state.error ? <div className="error" role="alert">{state.error}</div> : null}
    <button className="btn btn-primary" disabled={pending}>{pending ? "Joining…" : signedInAs ? "Join class" : "Create account and join"}</button>
  </form>;
}

export function InviteForm({ action, email }: { action: Action; email: string | null }) {
  const [state, submit, pending] = useActionState(action, {});
  return <form action={submit} className="form">
    <div className="field"><label htmlFor="displayName">Your name</label><input className="input" id="displayName" name="displayName" required autoComplete="name" maxLength={80} /></div>
    <div className="field"><label htmlFor="email">Email</label><input className="input" id="email" name="email" type="email" required autoComplete="email" defaultValue={email ?? ""} readOnly={Boolean(email)} /></div>
    <PasswordFields />
    {state.error ? <div className="error" role="alert">{state.error}</div> : null}
    <button className="btn btn-primary" disabled={pending}>{pending ? "Creating account…" : "Create teacher account"}</button>
  </form>;
}

export function ResetForm({ action }: { action: Action }) {
  const [state, submit, pending] = useActionState(action, {});
  return <form action={submit} className="form">
    <PasswordFields />
    {state.error ? <div className="error" role="alert">{state.error}</div> : null}
    <button className="btn btn-primary" disabled={pending}>{pending ? "Saving…" : "Set new password"}</button>
  </form>;
}

/** A button that asks the server for a single-use link, then shows it with a copy button. */
export function LinkMaker({ action, label, children }: { action: Action; label: string; children?: React.ReactNode }) {
  const [state, submit, pending] = useActionState(action, {});
  const [copied, setCopied] = useState(false);
  return <div className="link-maker">
    <form action={submit} className="link-maker-form">
      {children}
      <button className="btn" disabled={pending}>{pending ? "Creating…" : label}</button>
    </form>
    {state.error ? <div className="error small" role="alert">{state.error}</div> : null}
    {state.link ? <div className="link-maker-result" role="status">
      <code>{state.link}</code>
      <button type="button" className="btn" onClick={() => { void navigator.clipboard?.writeText(state.link!).then(() => setCopied(true)); }}>{copied ? "Copied" : "Copy link"}</button>
      {state.message ? <p className="small muted">{state.message}</p> : null}
    </div> : null}
  </div>;
}
