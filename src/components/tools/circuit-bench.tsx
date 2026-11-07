"use client";

import { useMemo, useState } from "react";
import { LED_FORWARD_VOLTS, measureResistance, solveCircuit, type CircuitElement, type ElementKind, type LedColour } from "@/lib/dc-circuit";
import { E12, formatSI } from "@/lib/electronics";
import { useStoredValue } from "@/lib/use-stored-value";

const COLS = 7, ROWS = 4, GAP = 100, OX = 60, OY = 50;
const node = (c: number, r: number) => `n${c}_${r}`;
const position = (id: string) => { const [c, r] = id.slice(1).split("_").map(Number); return { x: OX + c * GAP, y: OY + r * GAP, label: `${String.fromCharCode(65 + c)}${r + 1}` }; };
const NODES = Array.from({ length: COLS * ROWS }, (_, i) => node(i % COLS, Math.floor(i / COLS)));

const RESISTOR_VALUES = [1, 10, 100, 1000, 10_000, 100_000].flatMap((decade) => E12.map((m) => Number((m * decade).toPrecision(3)))).filter((v) => v >= 10 && v <= 1_000_000);
const BATTERY_VALUES = [1.5, 3, 4.5, 5, 6, 9, 12];
const LED_FILL: Record<LedColour, string> = { red: "#ff3b30", yellow: "#ffd60a", green: "#30d158", blue: "#0a84ff", white: "#f5f5f7" };

type Mode = "V" | "A" | "Ω" | "continuity";
type Tool = { kind: "select" } | { kind: "probe" } | { kind: "place"; element: ElementKind };

let counter = 0;
const uid = (kind: string) => `${kind}-${Date.now().toString(36)}-${(counter++).toString(36)}`;

function defaults(kind: ElementKind): Partial<CircuitElement> {
  switch (kind) {
    case "battery": return { value: 9 };
    case "resistor": return { value: 330 };
    case "led": return { colour: "red" };
    case "switch": return { closed: true };
    case "wire": return {};
  }
}

type Preset = { id: string; name: string; summary: string; build: () => CircuitElement[] };

const PRESETS: Preset[] = [
  { id: "led", name: "LED + resistor", summary: "The first circuit every engineer builds. Measure the voltage across the resistor and the LED, then the current.", build: () => [
    { id: uid("battery"), kind: "battery", a: node(0, 0), b: node(0, 3), value: 9 },
    { id: uid("switch"), kind: "switch", a: node(0, 0), b: node(2, 0), closed: true },
    { id: uid("resistor"), kind: "resistor", a: node(2, 0), b: node(4, 0), value: 330 },
    { id: uid("led"), kind: "led", a: node(4, 0), b: node(4, 3), colour: "red" },
    { id: uid("wire"), kind: "wire", a: node(4, 3), b: node(0, 3) },
  ] },
  { id: "divider", name: "Voltage divider", summary: "Two resistors split the battery voltage. Predict the middle voltage first, then measure it.", build: () => [
    { id: uid("battery"), kind: "battery", a: node(0, 0), b: node(0, 3), value: 6 },
    { id: uid("resistor"), kind: "resistor", a: node(0, 0), b: node(3, 0), value: 2000 },
    { id: uid("resistor"), kind: "resistor", a: node(3, 0), b: node(3, 3), value: 1000 },
    { id: uid("wire"), kind: "wire", a: node(3, 3), b: node(0, 3) },
  ] },
  { id: "parallel", name: "Parallel LEDs", summary: "Two LEDs, each with its own resistor. Compare the current in each branch with the battery current.", build: () => [
    { id: uid("battery"), kind: "battery", a: node(0, 0), b: node(0, 3), value: 5 },
    { id: uid("resistor"), kind: "resistor", a: node(0, 0), b: node(3, 0), value: 150 },
    { id: uid("led"), kind: "led", a: node(3, 0), b: node(3, 3), colour: "red" },
    { id: uid("wire"), kind: "wire", a: node(0, 0), b: node(0, 1) },
    { id: uid("resistor"), kind: "resistor", a: node(0, 1), b: node(5, 1), value: 220 },
    { id: uid("led"), kind: "led", a: node(5, 1), b: node(5, 3), colour: "green" },
    { id: uid("wire"), kind: "wire", a: node(5, 3), b: node(3, 3) },
    { id: uid("wire"), kind: "wire", a: node(3, 3), b: node(0, 3) },
  ] },
  { id: "fault", name: "Fault-finding challenge", summary: "This LED circuit should work, but it doesn’t. One wire is broken inside its insulation, so it looks fine. Use continuity or voltage readings to find it, then replace it.", build: () => {
    const wires: CircuitElement[] = [
      { id: uid("wire"), kind: "wire", a: node(0, 0), b: node(2, 0) },
      { id: uid("wire"), kind: "wire", a: node(4, 0), b: node(6, 0) },
      { id: uid("wire"), kind: "wire", a: node(6, 3), b: node(3, 3) },
      { id: uid("wire"), kind: "wire", a: node(3, 3), b: node(0, 3) },
    ];
    wires[Math.floor(Math.random() * wires.length)].broken = true;
    return [
      { id: uid("battery"), kind: "battery", a: node(0, 0), b: node(0, 3), value: 6 },
      wires[0],
      { id: uid("resistor"), kind: "resistor", a: node(2, 0), b: node(4, 0), value: 220 },
      wires[1],
      { id: uid("led"), kind: "led", a: node(6, 0), b: node(6, 3), colour: "yellow" },
      wires[2], wires[3],
    ];
  } },
];

/** Applies a change, then burns out any over-driven LED (which can change the rest of the circuit). */
function settle(elements: CircuitElement[]) {
  const events: string[] = [];
  let next = elements;
  for (let pass = 0; pass < 5; pass++) {
    const solution = solveCircuit(next);
    const burnt = next.filter((e) => e.kind === "led" && !e.broken && solution.elements[e.id]?.overCurrent);
    if (!burnt.length) break;
    events.push(`${burnt.length === 1 ? "An LED" : `${burnt.length} LEDs`} burnt out from too much current. Real LEDs are destroyed this way. Add a resistor, then replace it.`);
    next = next.map((e) => burnt.some((b) => b.id === e.id) ? { ...e, broken: true } : e);
  }
  return { elements: next, events };
}

function parseStored(raw: string | null): CircuitElement[] | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    return Array.isArray(data) && data.every((e) => e && typeof e.id === "string" && typeof e.a === "string" && typeof e.b === "string" && ["battery", "resistor", "led", "switch", "wire"].includes(e.kind)) ? data : null;
  } catch { return null; }
}

function beep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 2400;
    gain.gain.value = 0.05;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.18);
    osc.onended = () => void ctx.close();
  } catch {}
}

function Symbol({ element, on, glow }: { element: CircuitElement; on: boolean; glow: number }) {
  const stroke = "#0e3462";
  switch (element.kind) {
    case "battery": return <g><rect x={-14} y={-22} width={28} height={44} fill="#ffffff" /><line x1={-6} y1={-20} x2={-6} y2={20} stroke={stroke} strokeWidth={3} /><line x1={6} y1={-11} x2={6} y2={11} stroke={stroke} strokeWidth={6} /><text x={-12} y={-26} className="bench-sym-text">+</text></g>;
    case "resistor": return <g><rect x={-26} y={-9} width={52} height={18} rx={3} fill="#e8d3a9" stroke="#8a6d3b" strokeWidth={1.5} /></g>;
    case "led": {
      const colour = element.colour ?? "red";
      return <g>
        {on ? <circle r={18 + glow * 10} fill={LED_FILL[colour]} opacity={0.25 + glow * 0.35} /> : null}
        <rect x={-16} y={-16} width={32} height={32} fill="#ffffff" opacity={0.9} />
        <path d="M-10,-12 L10,0 L-10,12 Z" fill={on ? LED_FILL[colour] : "#ffffff"} stroke={stroke} strokeWidth={2} />
        <line x1={10} y1={-12} x2={10} y2={12} stroke={stroke} strokeWidth={2.5} />
        {element.broken ? <path d="M-14,-14 L14,14 M14,-14 L-14,14" stroke="#c0392b" strokeWidth={3} /> : null}
      </g>;
    }
    case "switch": return <g><rect x={-22} y={-18} width={44} height={26} fill="#ffffff" /><circle cx={-16} cy={0} r={3.5} fill={stroke} /><circle cx={16} cy={0} r={3.5} fill={stroke} /><line x1={-16} y1={0} x2={element.closed ? 16 : 12} y2={element.closed ? 0 : -16} stroke={stroke} strokeWidth={3} strokeLinecap="round" /></g>;
    case "wire": return null;
  }
}

function label(element: CircuitElement) {
  switch (element.kind) {
    case "battery": return `${element.value} V battery`;
    case "resistor": return `${formatSI(element.value ?? 0, "Ω")} resistor`;
    case "led": return `${element.colour} LED${element.broken ? " (burnt out)" : ""}`;
    case "switch": return `switch (${element.closed ? "closed" : "open"})`;
    case "wire": return "wire";
  }
}

export function CircuitBench() {
  const [raw, setRaw] = useStoredValue("stembuild-circuit-bench-v1");
  const stored = useMemo(() => parseStored(raw), [raw]);
  const [initial] = useState(() => PRESETS[0].build());
  const elements = stored ?? initial;
  const [tool, setTool] = useState<Tool>({ kind: "probe" });
  const [pending, setPending] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("V");
  const [red, setRed] = useState<string | null>(null);
  const [black, setBlack] = useState<string | null>(null);
  const [ammeterTarget, setAmmeterTarget] = useState<string | null>(null);
  const [events, setEvents] = useState<string[]>([]);
  const [presetId, setPresetId] = useState("led");

  const solution = useMemo(() => solveCircuit(elements), [elements]);
  const usedNodes = useMemo(() => new Set(elements.flatMap((e) => [e.a, e.b])), [elements]);
  // A point hidden under a component's body can't be used, like a breadboard hole under a part.
  const coveredNodes = useMemo(() => new Set(elements.filter((e) => e.kind !== "wire").flatMap((e) => {
    const pa = position(e.a), pb = position(e.b);
    return NODES.filter((id) => { const p = position(id); return Math.hypot(p.x - (pa.x + pb.x) / 2, p.y - (pa.y + pb.y) / 2) < 28 && id !== e.a && id !== e.b; });
  })), [elements]);
  const selectedElement = elements.find((e) => e.id === selected) ?? null;

  function commit(next: CircuitElement[]) {
    const result = settle(next);
    setRaw(JSON.stringify(result.elements));
    if (result.events.length) setEvents((current) => [...result.events, ...current].slice(0, 4));
  }

  function loadPreset(id: string) {
    const preset = PRESETS.find((p) => p.id === id)!;
    setPresetId(id);
    setEvents([]); setSelected(null); setRed(null); setBlack(null); setAmmeterTarget(null);
    commit(preset.build());
  }

  function update(id: string, patch: Partial<CircuitElement>) {
    commit(elements.map((e) => e.id === id ? { ...e, ...patch } : e));
  }

  function clickNode(id: string) {
    if (tool.kind === "place") {
      if (!pending) { setPending(id); return; }
      if (pending === id) { setPending(null); return; }
      const element = { id: uid(tool.element), kind: tool.element, a: pending, b: id, ...defaults(tool.element) } as CircuitElement;
      commit([...elements, element]);
      setPending(null);
      setSelected(element.id);
      return;
    }
    if (tool.kind === "probe" && mode !== "A") {
      if (!red || (red && black)) { setRed(id); setBlack(null); }
      else { setBlack(id); if (mode === "continuity" && Number.isFinite(measureResistance(elements, red, id)) && measureResistance(elements, red, id) < 50) beep(); }
    }
  }

  function clickElement(id: string) {
    if (tool.kind === "probe" && mode === "A") { setAmmeterTarget(id); return; }
    if (tool.kind === "select" || tool.kind === "probe") { setSelected(id); setTool({ kind: "select" }); }
  }

  // ---- Meter reading ----
  let reading = "", unit = "", note = "";
  if (mode === "V") {
    unit = "V DC";
    if (!red || !black) { reading = "- - -"; note = "Click a point for the red (+) probe, then a point for the black (COM) probe."; }
    else if (!usedNodes.has(red) || !usedNodes.has(black)) { reading = "0.000"; note = "A probe is touching an empty point."; }
    else { const v = (solution.voltages[red] ?? 0) - (solution.voltages[black] ?? 0); reading = Math.abs(v) < 0.0005 ? "0.000" : v.toFixed(Math.abs(v) >= 10 ? 2 : 3); note = `Red at ${position(red).label}, black at ${position(black).label}.`; }
  } else if (mode === "A") {
    unit = "mA";
    const target = elements.find((e) => e.id === ammeterTarget);
    if (!target) { reading = "- - -"; note = "Click a component to measure the current through it."; }
    else { const amps = Math.abs(solution.elements[target.id]?.current ?? 0); reading = amps >= 1 ? amps.toFixed(2) : (amps * 1000).toFixed(amps * 1000 >= 100 ? 1 : 2); unit = amps >= 1 ? "A" : "mA"; note = `Current through the ${label(target)}. A real ammeter must be wired in series: break the circuit and put the meter in the gap.`; }
  } else {
    unit = mode === "Ω" ? "Ω" : "continuity";
    if (!red || !black) { reading = "- - -"; note = "Place both probes. Resistance and continuity are measured with the power OFF."; }
    else {
      const ohms = measureResistance(elements, red, black);
      if (mode === "Ω") { reading = Number.isFinite(ohms) ? (ohms >= 1e6 ? `${(ohms / 1e6).toFixed(2)} M` : ohms >= 1e3 ? `${(ohms / 1e3).toFixed(2)} k` : ohms.toFixed(1)) : "OL"; note = Number.isFinite(ohms) ? "Battery disconnected for this reading. On a real bench, switch the power off first or the reading will be wrong." : "OL = open loop: no connection between the probes (or more than 100 MΩ)."; }
      else { const connected = Number.isFinite(ohms) && ohms < 50; reading = connected ? "BEEP" : "OL"; note = connected ? `Connected (${ohms.toFixed(1)} Ω): current can flow between the probes.` : "No continuity: there is a break between the probes."; }
    }
  }

  const faultFixed = presetId === "fault" && !elements.some((e) => e.kind === "wire" && e.broken) && elements.some((e) => e.kind === "led" && solution.elements[e.id]?.ledOn);

  return <div className="bench">
    <div className="bench-toolbar card">
      <div className="bench-toolbar-row">
        <label className="field bench-preset"><span>Circuit</span><select className="select" value={presetId} onChange={(event) => loadPreset(event.target.value)}>{PRESETS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}<option value="custom" disabled>Your own changes are saved automatically</option></select></label>
        <button type="button" className="btn" onClick={() => loadPreset(presetId)}>Reset circuit</button>
        <button type="button" className="btn" onClick={() => { commit([]); setSelected(null); setRed(null); setBlack(null); setPresetId("led"); }}>Empty bench</button>
      </div>
      <p className="small muted" style={{ margin: "8px 0 0" }}>{PRESETS.find((p) => p.id === presetId)?.summary}</p>
      <div className="bench-palette" role="group" aria-label="Tools">
        <button type="button" className={tool.kind === "probe" ? "chip active" : "chip"} aria-pressed={tool.kind === "probe"} onClick={() => { setTool({ kind: "probe" }); setPending(null); }}>🔍 Measure</button>
        <button type="button" className={tool.kind === "select" ? "chip active" : "chip"} aria-pressed={tool.kind === "select"} onClick={() => { setTool({ kind: "select" }); setPending(null); }}>Select / edit</button>
        {(["wire", "resistor", "led", "battery", "switch"] as ElementKind[]).map((kind) => <button key={kind} type="button" className={tool.kind === "place" && tool.element === kind ? "chip active" : "chip"} aria-pressed={tool.kind === "place" && tool.element === kind} onClick={() => { setTool({ kind: "place", element: kind }); setPending(null); }}>+ {kind === "led" ? "LED" : kind}</button>)}
      </div>
      {tool.kind === "place" ? <p className="small bench-hint" role="status">{pending ? `Now click the second point for the ${tool.element}.` : `Click two points to place a ${tool.element}.`}{tool.element === "battery" || tool.element === "led" ? " The first point is + (anode for an LED)." : ""}</p> : null}
    </div>

    {events.map((event, index) => <div className="error" role="alert" key={index}>{event}</div>)}
    {solution.warnings.filter((w) => !w.includes("burn out")).map((warning) => <div className="error" role="alert" key={warning}>{warning}</div>)}
    {faultFixed ? <div className="notice" role="status" style={{ background: "var(--logo-teal-wash)", borderColor: "var(--logo-success)" }}><strong>Fault found and fixed!</strong> That is exactly how technicians find broken cables: test continuity section by section.</div> : null}

    <div className="bench-layout">
      <div className="card bench-board">
        <svg viewBox={`0 0 ${OX * 2 + (COLS - 1) * GAP} ${OY * 2 + (ROWS - 1) * GAP}`} role="group" aria-label="Circuit board">
          {NODES.map((id) => { const p = position(id); return <circle key={`dot-${id}`} cx={p.x} cy={p.y} r={3} fill="#c2d9ed" />; })}
          {elements.map((element) => {
            const pa = position(element.a), pb = position(element.b);
            const mx = (pa.x + pb.x) / 2, my = (pa.y + pb.y) / 2;
            const angle = Math.atan2(pb.y - pa.y, pb.x - pa.x) * 180 / Math.PI;
            const result = solution.elements[element.id];
            const amps = Math.abs(result?.current ?? 0);
            const flowing = amps > 0.0005;
            const ledOn = element.kind === "led" && Boolean(result?.ledOn);
            const glow = ledOn ? Math.min(1, amps / 0.02) : 0;
            const forward = (result?.current ?? 0) >= 0;
            const isSelected = selected === element.id || ammeterTarget === element.id;
            return <g key={element.id} className={`bench-element${isSelected ? " selected" : ""}`} role="button" tabIndex={0} aria-label={`${label(element)} from ${pa.label} to ${pb.label}`} onClick={() => clickElement(element.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); clickElement(element.id); } }}>
              <line x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} className="bench-hit" />
              <line x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} className="bench-wire" />
              {flowing ? <line x1={forward ? pa.x : pb.x} y1={forward ? pa.y : pb.y} x2={forward ? pb.x : pa.x} y2={forward ? pb.y : pa.y} className="bench-flow" style={{ animationDuration: `${Math.max(0.25, Math.min(3, 0.02 / amps))}s` }} /> : null}
              <g transform={`translate(${mx},${my}) rotate(${angle})`}><Symbol element={element} on={ledOn} glow={glow} /></g>
              {element.kind === "resistor" ? <text x={mx} y={my - 16} className="bench-value" textAnchor="middle">{formatSI(element.value ?? 0, "Ω")}</text> : null}
              {element.kind === "battery" ? <text x={mx + 18} y={my - 16} className="bench-value">{element.value} V</text> : null}
            </g>;
          })}
          {NODES.filter((id) => !coveredNodes.has(id) || id === red || id === black).map((id) => {
            const p = position(id);
            return <g key={id} className={`bench-node${pending === id ? " pending" : ""}${usedNodes.has(id) ? " used" : ""}`} role="button" tabIndex={0} aria-label={`Point ${p.label}${id === red ? ", red probe" : ""}${id === black ? ", black probe" : ""}`} onClick={() => clickNode(id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); clickNode(id); } }}>
              <circle cx={p.x} cy={p.y} r={16} className="bench-node-hit" />
              <circle cx={p.x} cy={p.y} r={usedNodes.has(id) ? 5 : 4} className="bench-node-dot" />
            </g>;
          })}
          {/* Probe tips sit on top but never take clicks, so the point underneath stays usable. */}
          {[[red, "#d32f2f", "+"], [black, "#1b1b1b", "COM"]].map(([id, colour, text]) => {
            if (!id) return null;
            const p = position(id);
            return <g key={text} pointerEvents="none" aria-hidden="true"><circle cx={p.x} cy={p.y} r={10} fill="none" stroke={colour!} strokeWidth={3} /><text x={p.x + 12} y={p.y - 10} className="bench-probe-label" fill={colour!}>{text}</text></g>;
          })}
        </svg>
      </div>

      <aside className="bench-side">
        <div className="meter" aria-label="Digital multimeter">
          <div className="meter-brand">STEMBuild DMM</div>
          <div className="meter-lcd" role="status" aria-live="polite"><span className="meter-reading">{reading}</span><span className="meter-unit">{unit}</span></div>
          <div className="meter-dial" role="radiogroup" aria-label="Meter mode">
            {(["V", "A", "Ω", "continuity"] as Mode[]).map((m) => <button key={m} type="button" role="radio" aria-checked={mode === m} className={mode === m ? "active" : ""} onClick={() => { setMode(m); setTool({ kind: "probe" }); }}>{m === "V" ? "V⎓" : m === "A" ? "A⎓" : m === "Ω" ? "Ω" : "•))"}</button>)}
          </div>
          <p className="meter-note">{note}</p>
          {red || black || ammeterTarget ? <button type="button" className="kit-clear meter-clear" onClick={() => { setRed(null); setBlack(null); setAmmeterTarget(null); }}>Remove probes</button> : null}
        </div>

        {selectedElement ? <div className="card bench-props">
          <div className="calc-head"><h3>{label(selectedElement)}</h3><button type="button" className="kit-clear" onClick={() => setSelected(null)}>Close</button></div>
          <p className="small muted">{position(selectedElement.a).label} → {position(selectedElement.b).label} · {formatSI(Math.abs(solution.elements[selectedElement.id]?.current ?? 0), "A")} · {formatSI(Math.abs(solution.elements[selectedElement.id]?.voltage ?? 0), "V")} across</p>
          {selectedElement.kind === "resistor" ? <label className="field"><span>Resistance</span><select className="select" value={selectedElement.value} onChange={(event) => update(selectedElement.id, { value: Number(event.target.value) })}>{RESISTOR_VALUES.map((v) => <option key={v} value={v}>{formatSI(v, "Ω")}</option>)}</select></label> : null}
          {selectedElement.kind === "battery" ? <label className="field"><span>Voltage</span><select className="select" value={selectedElement.value} onChange={(event) => update(selectedElement.id, { value: Number(event.target.value) })}>{BATTERY_VALUES.map((v) => <option key={v} value={v}>{v} V</option>)}</select></label> : null}
          {selectedElement.kind === "led" ? <label className="field"><span>Colour</span><select className="select" value={selectedElement.colour} onChange={(event) => update(selectedElement.id, { colour: event.target.value as LedColour })}>{(Object.keys(LED_FORWARD_VOLTS) as LedColour[]).map((c) => <option key={c} value={c}>{c} (Vf ≈ {LED_FORWARD_VOLTS[c]} V)</option>)}</select></label> : null}
          <div className="inline" style={{ marginTop: 12 }}>
            {selectedElement.kind === "switch" ? <button type="button" className="btn btn-primary" onClick={() => update(selectedElement.id, { closed: !selectedElement.closed })}>{selectedElement.closed ? "Open switch" : "Close switch"}</button> : null}
            {selectedElement.kind === "battery" || selectedElement.kind === "led" ? <button type="button" className="btn" onClick={() => update(selectedElement.id, { a: selectedElement.b, b: selectedElement.a })}>Flip direction</button> : null}
            {/* Every wire offers replacement, so a hidden fault can only be found by measuring. */}
            {selectedElement.kind === "wire" ? <button type="button" className="btn" onClick={() => update(selectedElement.id, { broken: false })}>Replace this wire</button> : null}
            {selectedElement.kind === "led" && selectedElement.broken ? <button type="button" className="btn btn-primary" onClick={() => update(selectedElement.id, { broken: false })}>Replace the LED</button> : null}
            <button type="button" className="btn" onClick={() => { commit(elements.filter((e) => e.id !== selectedElement.id)); setSelected(null); }}>Remove</button>
          </div>
        </div> : <div className="card card-muted small"><strong>Tip:</strong> a real engineer predicts the reading before measuring. Write your prediction down, then check it with the meter.</div>}
      </aside>
    </div>
  </div>;
}
