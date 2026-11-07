"use client";

import { useState } from "react";
import { GATES, LOGIC_CIRCUITS, evaluateGate, truthTable, type GateType } from "@/lib/logic";

const ON = "#06856b", OFF = "#a6c0d8";

function Toggle({ name, value, onChange }: { name: string; value: boolean; onChange: (value: boolean) => void }) {
  return <button type="button" className={value ? "logic-toggle on" : "logic-toggle"} role="switch" aria-checked={value} onClick={() => onChange(!value)}>
    <span className="logic-toggle-name">{name}</span><span className="logic-toggle-value">{value ? "1" : "0"}</span>
  </button>;
}

function Lamp({ name, on }: { name: string; on: boolean }) {
  return <div className={on ? "logic-lamp on" : "logic-lamp"} role="status" aria-label={`${name} is ${on ? "1 (on)" : "0 (off)"}`}><span className="logic-lamp-bulb" aria-hidden="true" /><span>{name}</span><strong>{on ? "1" : "0"}</strong></div>;
}

/** Standard distinctive-shape gate symbols, drawn with live wire colours. */
function GateSymbol({ type, a, b, q }: { type: GateType; a: boolean; b: boolean; q: boolean }) {
  const single = type === "NOT";
  const inverted = type === "NOT" || type === "NAND" || type === "NOR" || type === "XNOR";
  const orFamily = type === "OR" || type === "NOR" || type === "XOR" || type === "XNOR";
  const body = type === "NOT" ? "M60,20 L60,80 L120,50 Z"
    : orFamily ? "M55,20 Q75,50 55,80 Q105,80 125,50 Q105,20 55,20 Z"
      : "M55,20 L95,20 A30,30 0 0 1 95,80 L55,80 Z";
  const outX = inverted ? 140 : 128;
  return <svg viewBox="0 0 200 100" className="logic-gate-svg" role="img" aria-label={`${type} gate: inputs ${single ? (a ? 1 : 0) : `${a ? 1 : 0} and ${b ? 1 : 0}`}, output ${q ? 1 : 0}`}>
    {single ? <line x1={0} y1={50} x2={60} y2={50} stroke={a ? ON : OFF} strokeWidth={4} /> : <>
      <line x1={0} y1={35} x2={type === "AND" || type === "NAND" ? 55 : 64} y2={35} stroke={a ? ON : OFF} strokeWidth={4} />
      <line x1={0} y1={65} x2={type === "AND" || type === "NAND" ? 55 : 64} y2={65} stroke={b ? ON : OFF} strokeWidth={4} />
    </>}
    {type === "XOR" || type === "XNOR" ? <path d="M45,20 Q65,50 45,80" fill="none" stroke="#0e3462" strokeWidth={3} /> : null}
    <path d={body} fill="#ffffff" stroke="#0e3462" strokeWidth={3} />
    {inverted ? <circle cx={type === "NOT" ? 127 : 132} cy={50} r={7} fill="#ffffff" stroke="#0e3462" strokeWidth={3} /> : null}
    <line x1={outX} y1={50} x2={200} y2={50} stroke={q ? ON : OFF} strokeWidth={4} />
    <text x={4} y={single ? 42 : 27} className="logic-pin">A</text>
    {!single ? <text x={4} y={88} className="logic-pin">B</text> : null}
    <text x={186} y={42} className="logic-pin">Q</text>
  </svg>;
}

export function LogicLab() {
  const [gate, setGate] = useState<GateType>("AND");
  const [a, setA] = useState(false);
  const [b, setB] = useState(false);
  const [circuitId, setCircuitId] = useState(LOGIC_CIRCUITS[0].id);
  const circuit = LOGIC_CIRCUITS.find((c) => c.id === circuitId)!;
  const [inputs, setInputs] = useState<Record<string, boolean>>({});
  const values = Object.fromEntries(circuit.inputs.map((name) => [name, inputs[name] ?? false])) as Record<string, boolean>;
  const info = GATES.find((g) => g.type === gate)!;
  const single = gate === "NOT";
  const q = evaluateGate(gate, a, b);

  return <div className="stack">
    <section className="card">
      <div className="calc-head"><h2>Gate explorer</h2><span className="badge">Level 2</span></div>
      <div className="project-area-chips" role="group" aria-label="Gate type" style={{ marginTop: 10 }}>{GATES.map((g) => <button key={g.type} type="button" className={gate === g.type ? "chip active" : "chip"} aria-pressed={gate === g.type} onClick={() => setGate(g.type)}>{g.type}</button>)}</div>
      <div className="logic-explorer">
        <div className="logic-inputs"><Toggle name="A" value={a} onChange={setA} />{!single ? <Toggle name="B" value={b} onChange={setB} /> : null}</div>
        <GateSymbol type={gate} a={a} b={b} q={q} />
        <Lamp name="Q" on={q} />
      </div>
      <p><strong>{info.expression}</strong>: {info.summary}</p>
      <div className="table-wrap" style={{ maxWidth: 360 }}>
        <table className="logic-table" style={{ minWidth: 0 }}>
          <caption>{gate} truth table (your current inputs are highlighted)</caption>
          <thead><tr><th>A</th>{!single ? <th>B</th> : null}<th>Q</th></tr></thead>
          <tbody>{truthTable(single ? ["A"] : ["A", "B"]).map((row, index) => {
            const out = evaluateGate(gate, row.A, row.B ?? false);
            const current = row.A === a && (single || row.B === b);
            return <tr key={index} className={current ? "current" : undefined} aria-current={current ? "true" : undefined}><td>{+row.A}</td>{!single ? <td>{+row.B}</td> : null}<td><strong>{+out}</strong></td></tr>;
          })}</tbody>
        </table>
      </div>
      <p className="small muted">On real hardware these gates come as chips: 74HC08 (AND), 74HC32 (OR), 74HC04 (NOT), 74HC00 (NAND), 74HC02 (NOR), 74HC86 (XOR). In Arduino code they are <code>&amp;&amp;</code>, <code>||</code>, <code>!</code> and <code>^</code>.</p>
    </section>

    <section className="card">
      <div className="calc-head"><h2>Logic circuits</h2><span className="badge">Level 2–3</span></div>
      <div className="project-area-chips" role="group" aria-label="Circuit" style={{ marginTop: 10 }}>{LOGIC_CIRCUITS.map((c) => <button key={c.id} type="button" className={circuitId === c.id ? "chip active" : "chip"} aria-pressed={circuitId === c.id} onClick={() => { setCircuitId(c.id); setInputs({}); }}>{c.name}</button>)}</div>
      <p>{circuit.summary}</p>
      <div className="logic-explorer">
        <div className="logic-inputs">{circuit.inputs.map((name) => <Toggle key={name} name={name} value={values[name]} onChange={(value) => setInputs({ ...values, [name]: value })} />)}</div>
        <div className="logic-circuit-box"><strong>{circuit.name}</strong><span className="small muted">Built from {circuit.gates.join(" + ")}</span>{circuit.outputs.map((o) => <code key={o.name}>{o.name} = {o.expression}</code>)}</div>
        <div className="logic-inputs">{circuit.outputs.map((o) => <Lamp key={o.name} name={o.name} on={o.evaluate(values)} />)}</div>
      </div>
      <div className="table-wrap">
        <table className="logic-table">
          <caption>Truth table: every possible input combination</caption>
          <thead><tr>{circuit.inputs.map((name) => <th key={name}>{name}</th>)}{circuit.outputs.map((o) => <th key={o.name}>{o.name}</th>)}</tr></thead>
          <tbody>{truthTable(circuit.inputs).map((row, index) => {
            const current = circuit.inputs.every((name) => row[name] === values[name]);
            return <tr key={index} className={current ? "current" : undefined} aria-current={current ? "true" : undefined}>{circuit.inputs.map((name) => <td key={name}>{+row[name]}</td>)}{circuit.outputs.map((o) => <td key={o.name}><strong>{+o.evaluate(row)}</strong></td>)}</tr>;
          })}</tbody>
        </table>
      </div>
    </section>
  </div>;
}
