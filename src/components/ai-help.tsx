"use client";
import { useActionState } from "react";
import { requestLessonHelp } from "@/lib/learning-actions";

export function AiHelp({ lessonId, hardware }: { lessonId: string; hardware: Array<{id:string; name:string}> }) {
  const action = requestLessonHelp.bind(null, lessonId);
  const [state, formAction, pending] = useActionState(action, {});
  return <form action={formAction} className="form">
    <div className="field"><label>Board</label><select className="select" name="hardwarePlatformId">{hardware.map((h)=><option key={h.id} value={h.id}>{h.name}</option>)}</select></div>
    <div className="field"><label>What is happening?</label><textarea className="textarea" name="question" placeholder="Example: My LED stays off even after uploading the code." required /></div>
    <button className="btn" disabled={pending}>{pending ? "Checking guidance…" : "Get troubleshooting help"}</button>
    {state.error ? <div className="error">{state.error}</div> : null}
    {state.response ? <div className="card card-muted" style={{whiteSpace:"pre-wrap"}}>{state.response}</div> : null}
    <div className="small muted">This quick lookup uses approved lesson troubleshooting guidance; it is separate from the AI Lab Coach and does not grade practical work.</div>
  </form>;
}
