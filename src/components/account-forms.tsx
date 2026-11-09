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

export function SetupForm({ action }: { action: Action }) {
  const [state, submit, pending] = useActionState(action, {});
  return <form action={submit} className="form">
    <div className="field"><label htmlFor="displayName">Your name</label><input className="input" id="displayName" name="displayName" required autoComplete="name" maxLength={80} /></div>
    <div className="field"><label htmlFor="email">Email</label><input className="input" id="email" name="email" type="email" required autoComplete="email" /><span className="small muted">You will sign in with this email.</span></div>
    <PasswordFields />
    {state.error ? <div className="error" role="alert">{state.error}</div> : null}
    <button className="btn btn-primary" disabled={pending}>{pending ? "Creating account…" : "Create administrator account"}</button>
  </form>;
}

/** Admin: create an account directly. Clears itself after a success so the next one starts fresh. */
export function CreateUserForm({ action, schools }: { action: Action; schools: { id: string; name: string }[] }) {
  const [state, submit, pending] = useActionState(action, {});
  return <form action={submit} className="form" style={{ marginTop: 14 }} key={state.message ?? "new"}>
    <div className="grid grid-2">
      <div className="field"><label htmlFor="new-name">Name</label><input id="new-name" className="input" name="displayName" required maxLength={80} /></div>
      <div className="field"><label htmlFor="new-email">Email</label><input id="new-email" className="input" type="email" name="email" required /></div>
      <div className="field"><label htmlFor="new-role">Role</label><select id="new-role" className="select" name="role" defaultValue="STUDENT"><option value="STUDENT">Student</option><option value="TEACHER">Teacher</option><option value="ADMIN">Administrator</option></select></div>
      <div className="field"><label htmlFor="new-school">School</label><select id="new-school" className="select" name="schoolId"><option value="">No school</option>{schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
    </div>
    <div className="field"><label htmlFor="new-password">Temporary password (12+ characters)</label><input id="new-password" className="input" type="password" name="password" minLength={12} required autoComplete="new-password" /></div>
    {state.error ? <div className="error" role="alert">{state.error}</div> : null}
    {state.message ? <div className="notice" role="status">{state.message}</div> : null}
    <button className="btn btn-primary" disabled={pending}>{pending ? "Creating…" : "Create user"}</button>
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
