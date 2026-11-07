"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { CIRCUITS, TIMEBASES, VOLTS_PER_DIV, measure, simulateScope, type Generator, type ScopeCircuit, type Waveform } from "@/lib/scope";
import { formatSI } from "@/lib/electronics";
import { SERIES_COLORS } from "@/components/serial-chart";

const DIVS_X = 10, DIVS_Y = 8, W = 600, H = 480;
const CH1 = SERIES_COLORS[0], CH2 = SERIES_COLORS[1];
const FREQUENCIES = [10, 50, 100, 200, 500, 1000, 2000, 5000, 10_000, 20_000];
const RESISTORS = [100, 220, 470, 1000, 2200, 4700, 10_000, 22_000, 47_000, 100_000];
const CAPACITORS = [1e-9, 10e-9, 100e-9, 470e-9, 1e-6, 4.7e-6, 10e-6, 47e-6, 100e-6, 470e-6, 1000e-6];

type Channel = { on: boolean; voltsPerDiv: number; position: number };

function MeasureRow({ name, colour, values }: { name: string; colour: string; values: ReturnType<typeof measure> }) {
  return <tr><th scope="row"><span className="serial-line-key" style={{ background: colour, display: "inline-block", marginRight: 8, verticalAlign: "middle" }} />{name}</th>
    <td>{formatSI(values.vpp, "V")}</td><td>{formatSI(values.max, "V")}</td><td>{formatSI(values.min, "V")}</td><td>{formatSI(values.mean, "V")}</td><td>{formatSI(values.rms, "V")}</td><td>{values.frequency ? formatSI(values.frequency, "Hz") : "—"}</td></tr>;
}

export function Oscilloscope() {
  const [generator, setGenerator] = useState<Generator>({ waveform: "square", frequency: 100, amplitude: 5, offset: 0, duty: 0.5 });
  const [circuit, setCircuit] = useState<ScopeCircuit>("rc-lowpass");
  const [ohms, setOhms] = useState(1000);
  const [farads, setFarads] = useState(1e-6);
  const [timebase, setTimebase] = useState(2e-3);
  const [ch1, setCh1] = useState<Channel>({ on: true, voltsPerDiv: 2, position: 0 });
  const [ch2, setCh2] = useState<Channel>({ on: true, voltsPerDiv: 2, position: 0 });
  const [trigger, setTrigger] = useState(0);
  const [hover, setHover] = useState<number | null>(null);

  const settings = useDeferredValue({ generator, circuit, ohms, farads, timebase, trigger });
  const trace = useMemo(() => simulateScope({ generator: settings.generator, circuit: settings.circuit, ohms: settings.ohms, farads: settings.farads, loadOhms: settings.ohms * 10, windowSeconds: settings.timebase * DIVS_X, triggerLevel: settings.trigger }), [settings]);
  const m1 = useMemo(() => measure(trace.ch1, trace.t), [trace]);
  const m2 = useMemo(() => measure(trace.ch2, trace.t), [trace]);

  // Use the same (deferred) timebase the trace was simulated with, so the x-scale always matches it.
  const windowSeconds = settings.timebase * DIVS_X;
  const x = (t: number) => (t / windowSeconds) * W;
  const y = (volts: number, channel: Channel) => H / 2 - ((volts / channel.voltsPerDiv) + channel.position) * (H / DIVS_Y);
  const path = (values: number[], channel: Channel) => values.map((v, i) => `${i ? "L" : "M"}${x(trace.t[i]).toFixed(1)},${Math.min(H + 40, Math.max(-40, y(v, channel))).toFixed(1)}`).join("");

  function autoset() {
    const period = 1 / generator.frequency;
    const ideal = (2.5 * period) / DIVS_X;
    setTimebase(TIMEBASES.find((tb) => tb >= ideal) ?? TIMEBASES[TIMEBASES.length - 1]);
    const span = generator.waveform === "pwm" ? generator.amplitude : 2 * generator.amplitude + Math.abs(generator.offset) * 2;
    const vdiv = VOLTS_PER_DIV.find((v) => v * 6 >= span) ?? 5;
    setCh1({ on: true, voltsPerDiv: vdiv, position: generator.waveform === "pwm" ? -2 : 0 });
    setCh2({ on: true, voltsPerDiv: vdiv, position: generator.waveform === "pwm" ? -2 : 0 });
    setTrigger(generator.waveform === "pwm" ? generator.amplitude / 2 : generator.offset);
  }

  const hoverIndex = hover === null ? null : Math.min(trace.t.length - 1, Math.max(0, Math.round((hover / W) * (trace.t.length - 1))));
  const circuitInfo = CIRCUITS.find((c) => c.id === circuit)!;
  const usesRC = circuit !== "direct" && circuit !== "half-wave";
  const tau = ohms * farads;

  return <div className="scope-layout">
    <div className="card scope-screen-card">
      <div className="scope-screen-head">
        <span><span className="serial-key" style={{ background: CH1 }} /> CH1 {ch1.voltsPerDiv} V/div</span>
        <span><span className="serial-key" style={{ background: CH2 }} /> CH2 {ch2.voltsPerDiv} V/div</span>
        <span>{formatSI(timebase, "s")}/div</span>
        <span>Trig ↑ {trigger} V</span>
      </div>
      <div className="scope-screen" onPointerMove={(event) => { const rect = event.currentTarget.getBoundingClientRect(); setHover(((event.clientX - rect.left) / rect.width) * W); }} onPointerLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Oscilloscope. CH1 ${formatSI(m1.vpp, "V")} peak to peak${m1.frequency ? ` at ${formatSI(m1.frequency, "Hz")}` : ""}. CH2 ${formatSI(m2.vpp, "V")} peak to peak, average ${formatSI(m2.mean, "V")}.`}>
          <rect width={W} height={H} fill="#fcfcfb" />
          {Array.from({ length: DIVS_X + 1 }, (_, i) => <line key={`v${i}`} x1={(i * W) / DIVS_X} x2={(i * W) / DIVS_X} y1={0} y2={H} className={i === DIVS_X / 2 ? "scope-axis" : "scope-grid"} />)}
          {Array.from({ length: DIVS_Y + 1 }, (_, i) => <line key={`h${i}`} y1={(i * H) / DIVS_Y} y2={(i * H) / DIVS_Y} x1={0} x2={W} className={i === DIVS_Y / 2 ? "scope-axis" : "scope-grid"} />)}
          {ch1.on ? <line x1={0} x2={10} y1={y(0, ch1)} y2={y(0, ch1)} stroke={CH1} strokeWidth={3} /> : null}
          {ch2.on ? <line x1={W - 10} x2={W} y1={y(0, ch2)} y2={y(0, ch2)} stroke={CH2} strokeWidth={3} /> : null}
          {ch1.on ? <path d={path(trace.ch1, ch1)} fill="none" stroke={CH1} strokeWidth={2} strokeLinejoin="round" /> : null}
          {ch2.on ? <path d={path(trace.ch2, ch2)} fill="none" stroke={CH2} strokeWidth={2} strokeLinejoin="round" /> : null}
          {hoverIndex !== null ? <g>
            <line x1={x(trace.t[hoverIndex])} x2={x(trace.t[hoverIndex])} y1={0} y2={H} className="serial-crosshair" />
            {ch1.on ? <circle cx={x(trace.t[hoverIndex])} cy={y(trace.ch1[hoverIndex], ch1)} r={4} fill={CH1} stroke="#ffffff" strokeWidth={2} /> : null}
            {ch2.on ? <circle cx={x(trace.t[hoverIndex])} cy={y(trace.ch2[hoverIndex], ch2)} r={4} fill={CH2} stroke="#ffffff" strokeWidth={2} /> : null}
          </g> : null}
        </svg>
        {hoverIndex !== null ? <div className="serial-tooltip" style={{ left: `${Math.min(70, Math.max(0, (hover! / W) * 100 + (hover! > W / 2 ? -30 : 2)))}%`, top: 12 }}>
          <div className="serial-tooltip-time">t = {formatSI(trace.t[hoverIndex], "s")}</div>
          {ch1.on ? <div className="serial-tooltip-row"><span className="serial-line-key" style={{ background: CH1 }} /><strong>{formatSI(trace.ch1[hoverIndex], "V")}</strong><span>CH1 input</span></div> : null}
          {ch2.on ? <div className="serial-tooltip-row"><span className="serial-line-key" style={{ background: CH2 }} /><strong>{formatSI(trace.ch2[hoverIndex], "V")}</strong><span>CH2 output</span></div> : null}
        </div> : null}
      </div>
      <div className="table-wrap" style={{ marginTop: 12 }}>
        <table className="hw-summary-table">
          <caption>Automatic measurements</caption>
          <thead><tr><th>Channel</th><th>Vpp</th><th>Max</th><th>Min</th><th>Average</th><th>RMS</th><th>Frequency</th></tr></thead>
          <tbody><MeasureRow name="CH1 · generator" colour={CH1} values={m1} /><MeasureRow name="CH2 · circuit output" colour={CH2} values={m2} /></tbody>
        </table>
      </div>
    </div>

    <div className="scope-controls">
      <div className="card">
        <h3>Signal generator <span className="muted small">→ CH1</span></h3>
        <div className="project-area-chips" role="group" aria-label="Waveform" style={{ marginTop: 10 }}>{(["sine", "square", "triangle", "pwm"] as Waveform[]).map((w) => <button key={w} type="button" className={generator.waveform === w ? "chip active" : "chip"} aria-pressed={generator.waveform === w} onClick={() => setGenerator({ ...generator, waveform: w })}>{w === "pwm" ? "PWM" : w}</button>)}</div>
        <div className="calc-grid" style={{ marginTop: 10 }}>
          <label className="field calc-field"><span>Frequency</span><select className="select" value={generator.frequency} onChange={(event) => setGenerator({ ...generator, frequency: Number(event.target.value) })}>{FREQUENCIES.map((f) => <option key={f} value={f}>{formatSI(f, "Hz")}</option>)}</select></label>
          <label className="field calc-field"><span>{generator.waveform === "pwm" ? "High level" : "Amplitude"}: {generator.amplitude} V</span><input type="range" min={0.5} max={10} step={0.5} value={generator.amplitude} onChange={(event) => setGenerator({ ...generator, amplitude: Number(event.target.value) })} /></label>
          {generator.waveform === "pwm"
            ? <label className="field calc-field"><span>Duty cycle: {Math.round(generator.duty * 100)}% (analogWrite {Math.round(generator.duty * 255)})</span><input type="range" min={0} max={1} step={0.05} value={generator.duty} onChange={(event) => setGenerator({ ...generator, duty: Number(event.target.value) })} /></label>
            : <label className="field calc-field"><span>DC offset: {generator.offset} V</span><input type="range" min={-5} max={5} step={0.5} value={generator.offset} onChange={(event) => setGenerator({ ...generator, offset: Number(event.target.value) })} /></label>}
        </div>
      </div>
      <div className="card">
        <h3>Circuit under test <span className="muted small">→ CH2</span></h3>
        <label className="field calc-field" style={{ marginTop: 10 }}><span>Circuit</span><select className="select" value={circuit} onChange={(event) => setCircuit(event.target.value as ScopeCircuit)}>{CIRCUITS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <p className="small muted">{circuitInfo.summary}</p>
        {usesRC ? <div className="calc-grid">
          <label className="field calc-field"><span>R{circuit === "half-wave-smoothed" ? " (load = 10 × R)" : ""}</span><select className="select" value={ohms} onChange={(event) => setOhms(Number(event.target.value))}>{RESISTORS.map((r) => <option key={r} value={r}>{formatSI(r, "Ω")}</option>)}</select></label>
          <label className="field calc-field"><span>C</span><select className="select" value={farads} onChange={(event) => setFarads(Number(event.target.value))}>{CAPACITORS.map((c) => <option key={c} value={c}>{formatSI(c, "F")}</option>)}</select></label>
        </div> : null}
        {usesRC ? <p className="small muted">τ = RC = {formatSI(tau, "s")} · cut-off ≈ {formatSI(1 / (2 * Math.PI * tau), "Hz")}</p> : null}
      </div>
      <div className="card">
        <div className="calc-head"><h3>Scope controls</h3><button type="button" className="btn btn-primary" onClick={autoset}>Auto-set</button></div>
        <div className="calc-grid" style={{ marginTop: 10 }}>
          <label className="field calc-field"><span>Time / div</span><select className="select" value={timebase} onChange={(event) => setTimebase(Number(event.target.value))}>{TIMEBASES.map((tb) => <option key={tb} value={tb}>{formatSI(tb, "s")}</option>)}</select></label>
          <label className="field calc-field"><span>Trigger level: {trigger} V</span><input type="range" min={-10} max={10} step={0.5} value={trigger} onChange={(event) => setTrigger(Number(event.target.value))} /></label>
          {([["CH1", ch1, setCh1], ["CH2", ch2, setCh2]] as const).map(([name, channel, set]) => <fieldset className="scope-channel" key={name}>
            <legend><label><input type="checkbox" checked={channel.on} onChange={(event) => set({ ...channel, on: event.target.checked })} /> {name}</label></legend>
            <label className="field calc-field"><span>Volts / div</span><select className="select" value={channel.voltsPerDiv} onChange={(event) => set({ ...channel, voltsPerDiv: Number(event.target.value) })}>{VOLTS_PER_DIV.map((v) => <option key={v} value={v}>{v} V</option>)}</select></label>
            <label className="field calc-field"><span>Position: {channel.position} div</span><input type="range" min={-4} max={4} step={0.5} value={channel.position} onChange={(event) => set({ ...channel, position: Number(event.target.value) })} /></label>
          </fieldset>)}
        </div>
      </div>
    </div>
  </div>;
}
