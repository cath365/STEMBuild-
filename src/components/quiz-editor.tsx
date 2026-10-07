"use client";
import { useId, useState } from "react";

type Draft = { id: string; prompt: string; options: string[]; answer: number; explanation: string };
export function QuizEditor() {
  const prefix = useId();
  const [questions, setQuestions] = useState<Draft[]>([{ id: "first", prompt: "", options: ["", ""], answer: 0, explanation: "" }]);
  function update(id: string, change: Partial<Draft>) { setQuestions((items) => items.map((q) => q.id === id ? { ...q, ...change } : q)); }
  return <div className="stack"><h3>Knowledge questions</h3><p className="small muted">Use clear questions with one correct answer. Answer keys are shown only to curriculum administrators.</p>
    <input type="hidden" name="questions" value={JSON.stringify(questions.map((q) => ({ prompt: q.prompt, options: q.options, correctAnswer: q.options[q.answer], explanation: q.explanation })))}/>
    {questions.map((q, index) => <fieldset className="card card-muted" key={q.id}><legend>Question {index + 1}</legend><div className="form">
      <div className="field"><label htmlFor={`${prefix}-${q.id}-prompt`}>Question</label><textarea id={`${prefix}-${q.id}-prompt`} className="textarea" value={q.prompt} onChange={(e) => update(q.id,{prompt:e.target.value})} required maxLength={1000}/></div>
      {q.options.map((option, i) => <div className="field" key={i}><label htmlFor={`${prefix}-${q.id}-${i}`}>Option {i + 1}</label><input id={`${prefix}-${q.id}-${i}`} className="input" value={option} onChange={(e) => update(q.id,{options:q.options.map((old,n) => n === i ? e.target.value : old)})} required maxLength={500}/></div>)}
      <div className="field"><label htmlFor={`${prefix}-${q.id}-answer`}>Correct answer</label><select id={`${prefix}-${q.id}-answer`} className="select" value={q.answer} onChange={(e) => update(q.id,{answer:Number(e.target.value)})}>{q.options.map((option,i) => <option key={i} value={i}>Option {i+1}{option ? `: ${option}` : ""}</option>)}</select></div>
      <div className="field"><label htmlFor={`${prefix}-${q.id}-explain`}>Teaching explanation</label><textarea id={`${prefix}-${q.id}-explain`} className="textarea" value={q.explanation} onChange={(e) => update(q.id,{explanation:e.target.value})} required maxLength={2000}/></div>
      <div className="inline"><button className="btn" type="button" disabled={q.options.length >= 6} onClick={() => update(q.id,{options:[...q.options,""]})}>Add option</button>{q.options.length > 2 ? <button className="btn" type="button" onClick={() => update(q.id,{options:q.options.slice(0,-1),answer:Math.min(q.answer,q.options.length-2)})}>Remove last option</button> : null}{questions.length > 1 ? <button className="btn" type="button" onClick={() => setQuestions((items) => items.filter((item) => item.id !== q.id))}>Remove question</button> : null}</div>
    </div></fieldset>)}
    <button className="btn" type="button" disabled={questions.length >= 20} onClick={() => setQuestions((items) => [...items,{id:crypto.randomUUID(),prompt:"",options:["",""],answer:0,explanation:""}])}>Add question</button>
  </div>;
}
