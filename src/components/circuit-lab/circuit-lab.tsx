"use client";

// Live circuit simulator: draw components between grid points and watch current flow.
// Wires are coloured by voltage (green +, grey 0 V, red −) and yellow dots move with the current.
import { useEffect, useMemo, useRef, useState } from "react";
import { LED_HEX, createState, isDynamic, si, step, terminals, type ElementReading, type LedColour, type SimElement, type SimKind, type StepResult } from "@/lib/circuit-sim/engine";
import { SIM_EXAMPLES } from "@/lib/circuit-sim/examples";
import { useStoredValue } from "@/lib/use-stored-value";
import { GroundSymbol, PartSymbol } from "@/components/circuit-lab/symbols";

const G = 20, W = 960, H = 580;
const STORAGE_KEY = "stembuild-circuit-sim-v1";
const DEFAULT_EXAMPLE = "led-resistor";

const PALETTE: { kind: SimKind; label: string; hint: string }[] = [
  { kind: "wire", label: "Wire", hint: "Connects two points with no resistance." },
  { kind: "battery", label: "Battery", hint: "DC source. The long plate is +." },
  { kind: "resistor", label: "Resistor", hint: "Limits current: I = V ÷ R." },
  { kind: "led", label: "LED", hint: "Lights when current flows from the triangle to the bar. Needs a resistor." },
  { kind: "lamp", label: "Lamp", hint: "Glows with the power it receives." },
  { kind: "switch", label: "Switch", hint: "Click it to open or close." },
  { kind: "button", label: "Push button", hint: "Conducts only while you hold it." },
  { kind: "capacitor", label: "Capacitor", hint: "Stores charge; takes time to charge and discharge." },
  { kind: "diode", label: "Diode", hint: "One-way valve for current." },
  { kind: "npn", label: "NPN transistor", hint: "A small base current switches a bigger collector current." },
  { kind: "motor", label: "Motor", hint: "Spins with the current; reverses when the current reverses." },
  { kind: "buzzer", label: "Buzzer", hint: "Sounds when enough current flows." },
  { kind: "ac", label: "AC source", hint: "Alternating voltage, like mains but low voltage." },
  { kind: "voltmeter", label: "Voltmeter", hint: "Reads the voltage between its ends." },
  { kind: "ammeter", label: "Ammeter", hint: "Reads the current flowing through it." },
  { kind: "ground", label: "Ground", hint: "The 0 V reference point." },
];
const NAME = Object.fromEntries(PALETTE.map((p) => [p.kind, p.label])) as Record<SimKind, string>;
const RESISTORS = [10, 47, 100, 220, 330, 470, 1000, 2200, 4700, 10000, 47000, 100000, 1000000];
const CAPACITORS = [1e-6, 10e-6, 47e-6, 100e-6, 470e-6, 1000e-6, 4700e-6];

type Doc = { version: 1; example?: string; elements: SimElement[] };
type Drag = { mode: "move" | "end1" | "end2"; id: string; from: { x: number; y: number }; original: SimElement; moved: boolean; pointerX: number; pointerY: number };

function parseDoc(raw: string | null): Doc | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    if (data?.version !== 1 || !Array.isArray(data.elements)) return null;
    const kinds = new Set(PALETTE.map((p) => p.kind));
    const elements = data.elements.filter((e: SimElement) => e && typeof e.id === "string" && kinds.has(e.kind) && [e.x1, e.y1, e.x2, e.y2].every(Number.isFinite));
    return { version: 1, example: typeof data.example === "string" ? data.example : undefined, elements };
  } catch { return null; }
}

function defaults(kind: SimKind): Partial<SimElement> {
  switch (kind) {
    case "battery": return { value: 9 };
    case "ac": return { value: 6, freq: 50 };
    case "resistor": return { value: 1000 };
    case "capacitor": return { value: 100e-6 };
    case "led": return { colour: "red" };
    case "npn": return { value: 100 };
    case "switch": return { closed: false };
    default: return {};
  }
}

/** Voltage → colour: grey at 0 V, green when positive, red when negative (Falstad's convention). */
function voltColour(v: number, range: number) {
  const t = Math.max(-1, Math.min(1, v / (range || 1)));
  const grey = [125, 135, 146], end = t >= 0 ? [26, 168, 90] : [217, 58, 58], k = Math.abs(t);
  return `rgb(${grey.map((g, i) => Math.round(g + (end[i] - g) * k)).join(",")})`;
}

/** How fast dots move for a given current: logarithmic, so both mA and A are visible. */
function dotSpeed(amps: number) {
  const a = Math.abs(amps);
  if (a < 1e-6) return 0;
  return Math.sign(amps) * Math.min(160, 32 * Math.log10(1 + a * 1e4));
}

function reading(el: SimElement, r: ElementReading | undefined) {
  if (!r) return "";
  if (el.kind === "voltmeter") return si(r.voltage, "V");
  if (el.kind === "ammeter") return si(r.current, "A");
  return "";
}

export function CircuitLab() {
  const [raw, setRaw] = useStoredValue(STORAGE_KEY);
  const fallback = useMemo<Doc>(() => ({ version: 1, example: DEFAULT_EXAMPLE, elements: structuredClone(SIM_EXAMPLES.find((e) => e.id === DEFAULT_EXAMPLE)!.elements) }), []);
  const doc = useMemo(() => parseDoc(raw) ?? fallback, [raw, fallback]);
  const [preview, setPreview] = useState<SimElement[] | null>(null);
  const elements = preview ?? doc.elements;
  const [tool, setTool] = useState<SimKind | "select">("select");
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState<SimElement | null>(null);
  const [running, setRunning] = useState(true);
  const [speedExp, setSpeedExp] = useState(0);           // simulation speed = 10^speedExp (−2 … 0)
  const [pressed, setPressed] = useState<Set<string>>(new Set());
  const [past, setPast] = useState<SimElement[][]>([]);
  // What the last frame computed: drawn from state, never read from refs during render.
  const [view, setView] = useState<{ result: StepResult | null; phase: Record<string, number>; spin: Record<string, number> }>({ result: null, phase: {}, spin: {} });
  const svgRef = useRef<SVGSVGElement>(null);
  const sim = useRef(createState());
  const result = useRef<StepResult | null>(null);
  const phase = useRef(new Map<string, number>());
  const spin = useRef(new Map<string, number>());
  const drag = useRef<Drag | null>(null);
  const live = useRef({ elements, pressed, speed: 1 });
  const example = SIM_EXAMPLES.find((e) => e.id === doc.example);
  useEffect(() => { live.current = { elements, pressed, speed: 10 ** speedExp }; }, [elements, pressed, speedExp]);

  function save(next: SimElement[], exampleId = doc.example) {
    setPast((p) => [...p, doc.elements].slice(-40));
    setRaw(JSON.stringify({ version: 1, example: exampleId, elements: next } satisfies Doc));
  }

  function loadExample(id: string) {
    const ex = SIM_EXAMPLES.find((e) => e.id === id);
    if (!ex) return;
    save(structuredClone(ex.elements), id);
    sim.current = createState();
    phase.current.clear();
    setSelected(null);
    setSpeedExp(Math.log10(ex.speed ?? 1));
    setRunning(true);
  }

  function publish() { setView({ result: result.current, phase: Object.fromEntries(phase.current), spin: Object.fromEntries(spin.current) }); }
  function reset() { sim.current = createState(); phase.current.clear(); result.current = step(live.current.elements, sim.current, 0, live.current.pressed); publish(); }

  // Simulation and animation loop.
  useEffect(() => {
    let raf = 0, last = 0;
    const frame = (t: number) => {
      const realDt = last ? Math.min(0.05, (t - last) / 1000) : 0;
      last = t;
      const { elements: els, pressed: held, speed } = live.current;
      if (running && realDt > 0) {
        const simDt = realDt * speed;
        const steps = isDynamic(els) ? Math.min(60, Math.max(1, Math.ceil(simDt / 5e-4))) : 1;
        for (let i = 0; i < steps; i++) result.current = step(els, sim.current, simDt / steps, held);
        for (const el of els) {
          const r = result.current?.readings.get(el.id);
          if (!r) continue;
          phase.current.set(el.id, ((phase.current.get(el.id) ?? 0) + dotSpeed(r.current) * realDt) % 16);
          if (el.kind === "motor") spin.current.set(el.id, ((spin.current.get(el.id) ?? 0) + (r.level ?? 0) * 900 * realDt) % 360);
        }
      } else if (!result.current) {
        result.current = step(els, sim.current, 0, held);
      }
      setView({ result: result.current, phase: Object.fromEntries(phase.current), spin: Object.fromEntries(spin.current) });
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  // ---------- Pointer handling ----------
  function gridPoint(event: { clientX: number; clientY: number }) {
    const m = svgRef.current?.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(m.inverse());
    return { x: Math.max(1, Math.min(W / G - 1, Math.round(p.x / G))), y: Math.max(1, Math.min(H / G - 1, Math.round(p.y / G))) };
  }

  function newId(kind: SimKind) { return `${kind}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`; }

  function onCanvasDown(event: React.PointerEvent<SVGSVGElement>) {
    if (tool === "select") { if (event.target === svgRef.current || (event.target as Element).classList.contains("cl-bg")) setSelected(null); return; }
    const p = gridPoint(event);
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* pointer already released */ }
    setDraft({ id: newId(tool), kind: tool, x1: p.x, y1: p.y, x2: p.x, y2: p.y, ...defaults(tool) });
  }

  function onCanvasMove(event: React.PointerEvent<SVGSVGElement>) {
    const p = gridPoint(event);
    if (draft) { if (p.x !== draft.x2 || p.y !== draft.y2) setDraft({ ...draft, x2: p.x, y2: p.y }); return; }
    const d = drag.current;
    if (!d) return;
    if (!d.moved && Math.hypot(event.clientX - d.pointerX, event.clientY - d.pointerY) < 5) return;
    if (!d.moved) { d.moved = true; if (pressed.has(d.id)) setPressed((s) => { const n = new Set(s); n.delete(d.id); return n; }); }
    const dx = p.x - d.from.x, dy = p.y - d.from.y, o = d.original;
    const moved = d.mode === "move" ? { ...o, x1: o.x1 + dx, y1: o.y1 + dy, x2: o.x2 + dx, y2: o.y2 + dy } : d.mode === "end1" ? { ...o, x1: p.x, y1: p.y } : { ...o, x2: p.x, y2: p.y };
    setPreview(doc.elements.map((e) => (e.id === d.id ? moved : e)));
  }

  function onCanvasUp() {
    if (draft) {
      let el = draft;
      if (el.kind === "ground") el = { ...el, x2: el.x1, y2: el.y1 + 1 };
      else if (el.x1 === el.x2 && el.y1 === el.y2) el = { ...el, x2: el.x1 + (el.kind === "wire" ? 2 : 4) };   // a click places a default-length part
      setDraft(null);
      save([...doc.elements, el]);
      setSelected(el.id);
      return;
    }
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (pressed.has(d.id)) setPressed((s) => { const n = new Set(s); n.delete(d.id); return n; });
    if (d.moved && preview) { save(preview); setPreview(null); return; }
    setPreview(null);
    if (!d.moved && d.original.kind === "switch") save(doc.elements.map((e) => (e.id === d.id ? { ...e, closed: !e.closed } : e)));
  }

  function onElementDown(event: React.PointerEvent, el: SimElement, mode: Drag["mode"] = "move") {
    if (tool !== "select") return;
    event.stopPropagation();
    try { svgRef.current?.setPointerCapture(event.pointerId); } catch { /* pointer already released */ }
    setSelected(el.id);
    drag.current = { mode, id: el.id, from: gridPoint(event), original: el, moved: false, pointerX: event.clientX, pointerY: event.clientY };
    if (el.kind === "button" && mode === "move") setPressed((s) => new Set(s).add(el.id));
  }

  function update(id: string, patch: Partial<SimElement>) { save(doc.elements.map((e) => (e.id === id ? { ...e, ...patch } : e))); }
  function remove(id: string) { save(doc.elements.filter((e) => e.id !== id)); setSelected(null); }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.key === "Escape") { setTool("select"); setDraft(null); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ---------- Drawing ----------
  const r = view.result;
  const sourceVolts = Math.max(5, ...elements.filter((e) => e.kind === "battery" || e.kind === "ac").map((e) => Math.abs(e.value ?? 0)));
  const v = (n: string) => r?.voltages.get(n) ?? 0;
  const connections = new Map<string, number>();
  for (const e of elements) for (const n of terminals(e)) connections.set(n, (connections.get(n) ?? 0) + 1);
  const sel = elements.find((e) => e.id === selected) ?? null;
  const selReading = sel ? r?.readings.get(sel.id) : undefined;
  const drawn = draft ? [...elements, draft] : elements;

  return <section className="circuit-lab" aria-label="Live circuit simulator">
    <div className="cl-toolbar">
      <label className="cl-field">Example circuit
        <select className="select" value={doc.example ?? ""} onChange={(e) => loadExample(e.target.value)}>
          <option value="" disabled>Your own circuit</option>
          {(["Basics", "Intermediate", "Advanced"] as const).map((level) => <optgroup key={level} label={level}>
            {SIM_EXAMPLES.filter((e) => e.level === level).map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
          </optgroup>)}
        </select>
      </label>
      <div className="cl-actions">
        <button type="button" className={running ? "btn" : "btn btn-primary"} onClick={() => setRunning((x) => !x)}>{running ? "Pause" : "Run"}</button>
        <button type="button" className="btn" onClick={reset} title="Discharge capacitors and replace burnt LEDs">Reset</button>
        <button type="button" className="btn" disabled={!past.length} onClick={() => { const prev = past.at(-1)!; setPast(past.slice(0, -1)); setRaw(JSON.stringify({ version: 1, example: doc.example, elements: prev })); }}>Undo</button>
        <button type="button" className="btn" onClick={() => { save([], undefined); setSelected(null); reset(); }}>Clear</button>
        <label className="cl-speed">Speed <input type="range" min={-2} max={0} step={0.1} value={speedExp} onChange={(e) => setSpeedExp(Number(e.target.value))} aria-label="Simulation speed" /><span>{(10 ** speedExp).toFixed(speedExp < -1 ? 2 : 1)}×</span></label>
      </div>
    </div>

    <div className="cl-layout">
      <aside className="cl-palette" aria-label="Components">
        <button type="button" className={tool === "select" ? "cl-tool active" : "cl-tool"} aria-pressed={tool === "select"} onClick={() => setTool("select")}><strong>Select / move</strong><span>Drag parts and their ends</span></button>
        {PALETTE.map((p) => <button key={p.kind} type="button" className={tool === p.kind ? "cl-tool active" : "cl-tool"} aria-pressed={tool === p.kind} title={p.hint} onClick={() => setTool(tool === p.kind ? "select" : p.kind)}>
          <svg viewBox="-4 -22 88 44" aria-hidden="true"><PartSymbol el={{ id: "icon", kind: p.kind, x1: 0, y1: 0, x2: 4, y2: 0, ...defaults(p.kind) }} len={80} pressed={false} spin={30} colourA="#7d8792" colourB="#7d8792" />{p.kind === "ground" ? <GroundSymbol x={40} y={-10} /> : null}</svg>
          <strong>{p.label}</strong>
        </button>)}
      </aside>

      <div className="cl-stage">
        <p className="cl-hint" aria-live="polite">{tool === "select" ? "Drag a part to move it, or drag the dot at either end to stretch it. Click switches to flip them; hold push buttons." : `${NAME[tool]}: press on a grid point and drag to where it should end. A single click places a standard-size part. Esc to stop.`}</p>
        <div className="cl-canvas-wrap">
          <svg ref={svgRef} className={tool === "select" ? "cl-canvas" : "cl-canvas drawing"} viewBox={`0 0 ${W} ${H}`} role="application" aria-label="Circuit drawing area"
            onPointerDown={onCanvasDown} onPointerMove={onCanvasMove} onPointerUp={onCanvasUp} onPointerCancel={() => { drag.current = null; setPreview(null); setDraft(null); }}>
            <defs><pattern id="cl-grid" width={G} height={G} patternUnits="userSpaceOnUse"><circle cx={0} cy={0} r={1.1} fill="#cfd8e3" /></pattern></defs>
            <rect className="cl-bg" width={W} height={H} fill="url(#cl-grid)" />
            {drawn.map((el) => {
              const [a, b] = terminals(el);
              const x1 = el.x1 * G, y1 = el.y1 * G, x2 = el.x2 * G, y2 = el.y2 * G;
              const len = Math.hypot(x2 - x1, y2 - y1), angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
              const rd = r?.readings.get(el.id);
              const isSel = el.id === selected, isDraft = el === draft;
              const label = reading(el, rd);
              const value = el.kind === "resistor" ? si(el.value ?? 1000, "Ω") : el.kind === "battery" ? `${el.value ?? 9} V` : el.kind === "capacitor" ? si(el.value ?? 1e-4, "F") : el.kind === "ac" ? `${el.value ?? 6} V ${el.freq ?? 50} Hz` : "";
              const nx = len ? -(y2 - y1) / len : 0, ny = len ? (x2 - x1) / len : -1;
              const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
              const dots = rd && !isDraft && Math.abs(rd.current) > 1e-6 && el.kind !== "voltmeter" && el.kind !== "ground" ? (() => {
                const off = view.phase[el.id] ?? 0;
                const out: React.ReactElement[] = [];
                for (let s = ((off % 16) + 16) % 16; s < len; s += 16) out.push(<circle key={s} cx={s} cy={0} r={2.6} className="cl-dot" />);
                return out;
              })() : null;
              return <g key={el.id} className={isDraft ? "cl-el draft" : isSel ? "cl-el selected" : "cl-el"} data-kind={el.kind} data-id={el.id}>
                {el.kind === "ground" ? <GroundSymbol x={x1} y={y1} /> : <g transform={`translate(${x1} ${y1}) rotate(${angle})`}>
                  {isSel ? <line x1={0} y1={0} x2={len} y2={0} stroke="#0172e5" strokeWidth={14} opacity={0.15} strokeLinecap="round" /> : null}
                  <PartSymbol el={el} len={len} angle={angle} reading={rd} pressed={pressed.has(el.id)} spin={view.spin[el.id] ?? 0} colourA={voltColour(v(a), sourceVolts)} colourB={voltColour(v(b), sourceVolts)} />
                  {dots}
                  <line x1={0} y1={0} x2={len} y2={0} stroke="transparent" strokeWidth={18} style={{ cursor: tool === "select" ? (el.kind === "switch" || el.kind === "button" ? "pointer" : "grab") : "crosshair" }}
                    onPointerDown={(event) => onElementDown(event, el)} />
                </g>}
                {el.kind === "ground" ? <rect x={x1 - 12} y={y1 - 4} width={24} height={28} fill="transparent" onPointerDown={(event) => onElementDown(event, el)} /> : null}
                {value || label ? (() => {
                  // Beside the part; flipped to the other side if it would run off the canvas edge.
                  const side = mx - nx * 26 < 90 || mx - nx * 26 > W - 90 ? -1 : 1;
                  const ox = -nx * 26 * side, oy = -ny * 26 * side;
                  return <text x={mx + ox} y={my + oy + 4} textAnchor={ox > 13 ? "start" : ox < -13 ? "end" : "middle"} className={label ? "cl-label meter" : "cl-label"}>{label || value}</text>;
                })() : null}
                {isSel && !isDraft && el.kind !== "ground" ? <>
                  <circle cx={x1} cy={y1} r={7} className="cl-handle" onPointerDown={(event) => onElementDown(event, el, "end1")} />
                  <circle cx={x2} cy={y2} r={7} className="cl-handle" onPointerDown={(event) => onElementDown(event, el, "end2")} />
                </> : null}
              </g>;
            })}
            {[...connections].map(([n, count]) => { const [x, y] = n.split(",").map(Number); return <circle key={n} cx={x * G} cy={y * G} r={count > 1 ? 3.2 : 4} className={count > 1 ? "cl-post" : "cl-post open"} pointerEvents="none" />; })}
          </svg>
        </div>

        {r?.warnings.length ? <ul className="cl-warnings" role="alert">{r.warnings.map((w) => <li key={w}>{w}</li>)}</ul> : null}
        {example ? <div className="cl-try"><strong>{example.title}.</strong> {example.summary} <em>Try this:</em> {example.tryThis}</div> : null}
      </div>

      <aside className="cl-inspector" aria-label="Selected component">
        {sel ? <>
          <h3>{NAME[sel.kind]}</h3>
          <dl className="cl-readings">
            {sel.kind !== "ground" ? <><div><dt>Voltage</dt><dd>{si(selReading?.voltage ?? 0, "V")}</dd></div>
              <div><dt>Current</dt><dd>{si(selReading?.current ?? 0, "A")}</dd></div>
              <div><dt>Power</dt><dd>{si(selReading?.power ?? 0, "W")}</dd></div></> : null}
            {sel.kind === "npn" ? <><div><dt>Base current</dt><dd>{si(selReading?.base ?? 0, "A")}</dd></div><div><dt>State</dt><dd>{selReading?.state ?? "off"}</dd></div></> : null}
            {sel.kind === "led" ? <div><dt>State</dt><dd>{selReading?.burnt ? "Burnt out" : selReading?.state === "on" ? `On, ${Math.round((selReading.level ?? 0) * 100)}% bright` : "Off"}</dd></div> : null}
            {sel.kind === "capacitor" ? <div><dt>Charge</dt><dd>{si(Math.abs((selReading?.voltage ?? 0) * (sel.value ?? 1e-4)), "C")}</dd></div> : null}
          </dl>
          {sel.kind === "battery" || sel.kind === "ac" ? <label className="cl-field">{sel.kind === "ac" ? "Peak voltage" : "Voltage"} <input className="input" type="number" min={0.5} max={48} step={0.5} value={sel.value ?? 9} onChange={(e) => update(sel.id, { value: Math.max(0.5, Math.min(48, Number(e.target.value) || 0.5)) })} /></label> : null}
          {sel.kind === "ac" ? <label className="cl-field">Frequency (Hz) <input className="input" type="number" min={1} max={1000} value={sel.freq ?? 50} onChange={(e) => update(sel.id, { freq: Math.max(1, Math.min(1000, Number(e.target.value) || 1)) })} /></label> : null}
          {sel.kind === "resistor" ? <label className="cl-field">Resistance
            <select className="select" value={RESISTORS.includes(sel.value ?? 1000) ? sel.value ?? 1000 : ""} onChange={(e) => update(sel.id, { value: Number(e.target.value) })}>{RESISTORS.map((o) => <option key={o} value={o}>{si(o, "Ω")}</option>)}</select></label> : null}
          {sel.kind === "capacitor" ? <label className="cl-field">Capacitance
            <select className="select" value={sel.value ?? 100e-6} onChange={(e) => update(sel.id, { value: Number(e.target.value) })}>{CAPACITORS.map((o) => <option key={o} value={o}>{si(o, "F")}</option>)}</select></label> : null}
          {sel.kind === "led" ? <label className="cl-field">Colour
            <select className="select" value={sel.colour ?? "red"} onChange={(e) => update(sel.id, { colour: e.target.value as LedColour })}>{(Object.keys(LED_HEX) as LedColour[]).map((c) => <option key={c} value={c}>{c}</option>)}</select></label> : null}
          {sel.kind === "npn" ? <label className="cl-field">Gain β <input className="input" type="number" min={10} max={500} value={sel.value ?? 100} onChange={(e) => update(sel.id, { value: Math.max(10, Math.min(500, Number(e.target.value) || 100)) })} /></label> : null}
          {sel.kind === "switch" ? <button type="button" className="btn" onClick={() => update(sel.id, { closed: !sel.closed })}>{sel.closed ? "Open the switch" : "Close the switch"}</button> : null}
          <div className="cl-inspector-actions">
            {sel.kind !== "ground" ? <button type="button" className="btn" onClick={() => update(sel.id, { x1: sel.x2, y1: sel.y2, x2: sel.x1, y2: sel.y1 })}>Flip direction</button> : null}
            <button type="button" className="btn" onClick={() => remove(sel.id)}>Delete</button>
          </div>
          <p className="small muted">{PALETTE.find((p) => p.kind === sel.kind)?.hint}</p>
        </> : <>
          <h3>How to build</h3>
          <ol className="small">
            <li>Pick a part on the left.</li>
            <li>Press on a grid point and drag to where it should end. Parts connect where their ends meet.</li>
            <li>Close the loop with wires back to the battery.</li>
            <li>Watch the dots: they show current. Green wires are at a higher voltage, grey at 0 V.</li>
            <li>Click any part to see its voltage, current and power, and to change its value.</li>
          </ol>
          <p className="small muted">A hollow dot marks an end that is not connected to anything yet.</p>
        </>}
      </aside>
    </div>

    <details className="cl-table">
      <summary>Readings for every part</summary>
      <div className="table-wrap"><table><thead><tr><th scope="col">Part</th><th scope="col">Voltage</th><th scope="col">Current</th><th scope="col">Power</th></tr></thead>
        <tbody>{elements.filter((e) => e.kind !== "wire" && e.kind !== "ground").map((e) => { const x = r?.readings.get(e.id); return <tr key={e.id} data-id={e.id}><th scope="row">{NAME[e.kind]}{x?.burnt ? " (burnt)" : ""}</th><td>{si(x?.voltage ?? 0, "V")}</td><td>{si(x?.current ?? 0, "A")}</td><td>{si(x?.power ?? 0, "W")}</td></tr>; })}</tbody></table></div>
    </details>
    <p className="small muted">The simulator solves the real circuit equations at every step (nodal analysis with time steps for capacitors). LEDs, diodes and transistors use simplified models, so values are close to, but not exactly, what a meter shows on a real bench.</p>
  </section>;
}
