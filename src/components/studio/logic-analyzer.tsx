"use client";

import { useMemo, useState } from "react";
import { CPU_HZ, formatDuration, formatFrequency, levelAt, measure, segments, type PinHistory } from "@/lib/studio/analyzer";
import { PWM_PINS } from "@/lib/studio/parts";

export type AnalyzerSnapshot = { now: number; pins: { pin: number; history: PinHistory }[] };

// 50 ms default: shows at least two cycles of a 50 Hz servo signal, so its frequency is measurable.
const WINDOWS_MS = [1, 5, 20, 50, 100, 500, 2000];

/** Logic analyzer: one row per digital pin, showing its level over the last N ms of emulated time. */
export function LogicAnalyzer({ snapshot, wiredPins, running }: { snapshot: AnalyzerSnapshot; wiredPins: number[]; running: boolean }) {
  const [windowMs, setWindowMs] = useState(50);
  const [frozen, setFrozen] = useState<AnalyzerSnapshot | null>(null);
  const [cursor, setCursor] = useState<number | null>(null);
  const [extra, setExtra] = useState<number[]>([]);
  const view = frozen ?? snapshot;
  const to = view.now, from = Math.max(0, to - (windowMs * CPU_HZ) / 1000);

  const active = useMemo(() => new Set(view.pins.filter((p) => p.history.edges.length > 0).map((p) => p.pin)), [view]);
  const shown = [...new Set([...wiredPins, ...active, ...extra])].filter((pin) => pin >= 0 && pin <= 13).sort((a, b) => b - a);
  const historyOf = (pin: number) => view.pins.find((p) => p.pin === pin)?.history ?? { base: false, edges: [] };
  const cursorCycle = cursor === null ? null : from + cursor * (to - from);

  return <section className="analyzer" aria-label="Logic analyzer">
    <div className="analyzer-head">
      <h3>Logic analyzer</h3>
      <div className="analyzer-controls">
        <label className="studio-select"><span className="sr-only">Time window</span>
          <select className="select" value={windowMs} onChange={(e) => setWindowMs(Number(e.target.value))}>{WINDOWS_MS.map((ms) => <option key={ms} value={ms}>Last {ms >= 1000 ? `${ms / 1000} s` : `${ms} ms`}</option>)}</select>
        </label>
        <button type="button" className="btn" aria-pressed={Boolean(frozen)} onClick={() => setFrozen(frozen ? null : snapshot)} disabled={!running && !frozen}>{frozen ? "Resume" : "Freeze"}</button>
        <label className="studio-select"><span className="sr-only">Add a pin</span>
          <select className="select" value="" onChange={(e) => { const pin = Number(e.target.value); if (!Number.isNaN(pin)) setExtra((x) => [...new Set([...x, pin])]); }}>
            <option value="" disabled>Add pin…</option>
            {Array.from({ length: 14 }, (_, i) => 13 - i).filter((pin) => !shown.includes(pin)).map((pin) => <option key={pin} value={pin}>D{pin}</option>)}
          </select>
        </label>
      </div>
    </div>
    {!running && !frozen ? <p className="small muted">Run your sketch to capture signals. Wired pins appear automatically.</p> : null}
    {shown.length === 0 ? <p className="small muted">Wire a part to a digital pin, or add a pin, to see its signal.</p> : <div className="analyzer-rows" onPointerLeave={() => setCursor(null)}>
      {shown.map((pin) => {
        const history = historyOf(pin);
        const segs = segments(history, from, to);
        const m = measure(history, from, to);
        const span = Math.max(1, to - from);
        const path = segs.map((s, i) => {
          const x1 = ((s.from - from) / span) * 1000, x2 = ((s.to - from) / span) * 1000, y = s.high ? 4 : 26;
          return `${i ? "L" : "M"}${x1.toFixed(1)},${y} L${x2.toFixed(1)},${y}`;
        }).join(" ");
        return <div className="analyzer-row" key={pin}>
          <span className="analyzer-pin">D{pin}{PWM_PINS.has(`D${pin}`) ? "~" : ""}</span>
          <svg viewBox="0 0 1000 30" preserveAspectRatio="none" role="img" aria-label={`D${pin}: ${m.frequencyHz ? formatFrequency(m.frequencyHz) : "no repeating signal"}, ${Math.round(m.duty * 100)}% high`}
            onPointerMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); setCursor(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))); }}>
            <line x1={0} x2={1000} y1={26} y2={26} className="analyzer-base" vectorEffect="non-scaling-stroke" />
            <path d={path} className="analyzer-wave" vectorEffect="non-scaling-stroke" />
            {cursor !== null ? <line x1={cursor * 1000} x2={cursor * 1000} y1={0} y2={30} className="analyzer-cursor" vectorEffect="non-scaling-stroke" /> : null}
          </svg>
          <span className="analyzer-measure">
            {cursorCycle !== null ? <strong>{levelAt(history, cursorCycle) ? "HIGH" : "LOW"}</strong> : m.frequencyHz ? <strong>{formatFrequency(m.frequencyHz)}</strong> : <strong>{levelAt(history, to) ? "HIGH" : "LOW"}</strong>}
            <small>{m.edges > 0 ? `${Math.round(m.duty * 100)}% high${m.highUs !== null ? ` · pulse ${formatDuration(m.highUs)}` : ""}` : "steady"}</small>
          </span>
        </div>;
      })}
      <div className="analyzer-axis"><span>−{windowMs >= 1000 ? `${windowMs / 1000} s` : `${windowMs} ms`}</span>{cursorCycle !== null ? <span>{formatDuration(((to - cursorCycle) * 1e6) / CPU_HZ)} ago</span> : null}<span>{frozen ? "frozen" : "now"}</span></div>
    </div>}
  </section>;
}
