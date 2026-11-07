"use client";

import { useState } from "react";
import {
  BAND_COLOURS, DIGIT_COLOURS, MULTIPLIER_COLOURS, TOLERANCE_COLOURS, bandsFromResistor, batteryLife, capacitorFromCode, formatSI,
  ledResistor, parallelResistance, parseSI, resistorFromBands, rcTiming, seriesResistance, solveOhm, timer555, voltageDivider, type BandColour,
} from "@/lib/electronics";
import { LED_FORWARD_VOLTS, type LedColour } from "@/lib/dc-circuit";

function Field({ label, value, onChange, hint, placeholder }: { label: string; value: string; onChange: (value: string) => void; hint?: string; placeholder?: string }) {
  const invalid = value.trim() !== "" && Number.isNaN(parseSI(value));
  return <label className="field calc-field">
    <span>{label}</span>
    <input className="input" inputMode="decimal" value={value} placeholder={placeholder} aria-invalid={invalid} onChange={(event) => onChange(event.target.value)} />
    {invalid ? <small className="calc-invalid">Use a number like 4.7k, 330 or 100n</small> : hint ? <small className="muted">{hint}</small> : null}
  </label>;
}

function Result({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return <div className={strong ? "calc-result strong" : "calc-result"}><span>{label}</span><strong>{value}</strong></div>;
}

function Card({ id, title, level, children, explain }: { id: string; title: string; level: string; children: React.ReactNode; explain: string }) {
  return <section className="card calc-card" id={id} aria-labelledby={`${id}-title`}>
    <div className="calc-head"><h2 id={`${id}-title`}>{title}</h2><span className="badge">{level}</span></div>
    {children}
    <details className="calc-explain"><summary>How it works</summary><p>{explain}</p></details>
  </section>;
}

const num = (text: string) => { const value = parseSI(text); return Number.isFinite(value) ? value : undefined; };

export function ResistorGraphic({ bands, label }: { bands: BandColour[]; label: string }) {
  const positions = bands.length === 4 ? [62, 84, 106, 150] : [58, 76, 94, 112, 152];
  return <svg className="resistor-graphic" viewBox="0 0 220 60" role="img" aria-label={label}>
    <line x1="0" y1="30" x2="220" y2="30" stroke="#9aa5b1" strokeWidth="4" />
    <rect x="40" y="12" width="140" height="36" rx="16" fill="#e8d3a9" stroke="#b89b6a" />
    {bands.map((band, index) => <rect key={index} x={positions[index]} y="12" width="10" height="36" fill={BAND_COLOURS[band].hex} stroke={band === "white" ? "#cfcfcf" : "none"} />)}
  </svg>;
}

function OhmsLaw() {
  const [v, setV] = useState("9");
  const [i, setI] = useState("");
  const [r, setR] = useState("450");
  const [p, setP] = useState("");
  const entries = { volts: num(v), amps: num(i), ohms: num(r), watts: num(p) };
  const given = Object.values(entries).filter((value) => value !== undefined).length;
  let solved: ReturnType<typeof solveOhm> | null = null;
  try { if (given === 2) solved = solveOhm(entries); } catch {}
  return <Card id="ohms-law" title="Ohm’s law & power" level="Basic" explain="V = I × R and P = V × I. Fill in any two boxes and STEMBuild works out the other two. Current is in amps: type 20m for 20 mA.">
    <div className="calc-grid">
      <Field label="Voltage V (volts)" value={v} onChange={setV} />
      <Field label="Current I (amps)" value={i} onChange={setI} hint="20m = 20 mA" />
      <Field label="Resistance R (ohms)" value={r} onChange={setR} hint="4.7k, 330, 1M" />
      <Field label="Power P (watts)" value={p} onChange={setP} />
    </div>
    {solved ? <div className="calc-results" role="status">
      <Result label="Voltage" value={formatSI(solved.volts, "V")} />
      <Result label="Current" value={formatSI(solved.amps, "A")} strong />
      <Result label="Resistance" value={formatSI(solved.ohms, "Ω")} />
      <Result label="Power" value={formatSI(solved.watts, "W")} strong />
    </div> : <p className="small muted" role="status">{given > 2 ? "Clear one box: give exactly two values." : "Enter exactly two values."}</p>}
  </Card>;
}

function ColourCode() {
  const [count, setCount] = useState<4 | 5>(4);
  const [bands, setBands] = useState<BandColour[]>(["yellow", "violet", "red", "gold"]);
  const [reverse, setReverse] = useState("330");
  const digits = count - 2;
  let value: ReturnType<typeof resistorFromBands> | null = null;
  try { value = resistorFromBands(bands); } catch {}
  const reverseBands = Number.isFinite(parseSI(reverse)) ? bandsFromResistor(parseSI(reverse), count) : null;
  function switchCount(next: 4 | 5) {
    setCount(next);
    if (value) setBands(bandsFromResistor(value.ohms, next) ?? bands);
  }
  const slots = [...Array.from({ length: digits }, (_, index) => ({ label: `Digit ${index + 1}`, options: DIGIT_COLOURS })), { label: "Multiplier", options: MULTIPLIER_COLOURS }, { label: "Tolerance", options: TOLERANCE_COLOURS }];
  return <Card id="colour-code" title="Resistor colour code" level="Basic" explain="Read from the end with bands closest together. The first bands are digits, the next is the multiplier (number of zeros) and the last, usually gold or brown, is the tolerance. Yellow-violet-red-gold = 4, 7, ×100 = 4,700 Ω ±5%.">
    <div className="inline" role="group" aria-label="Number of bands">{([4, 5] as const).map((n) => <button key={n} type="button" className={count === n ? "chip active" : "chip"} aria-pressed={count === n} onClick={() => switchCount(n)}>{n} bands</button>)}</div>
    <ResistorGraphic bands={bands} label={value ? `Resistor reading ${formatSI(value.ohms, "Ω")}` : "Resistor"} />
    <div className="calc-grid bands">
      {slots.map((slot, index) => <label className="field calc-field" key={slot.label}><span>{slot.label}</span>
        <select className="select" value={bands[index]} onChange={(event) => setBands(bands.map((band, i) => i === index ? event.target.value as BandColour : band))}>
          {slot.options.map((colour) => <option key={colour} value={colour}>{colour}</option>)}
        </select></label>)}
    </div>
    {value ? <div className="calc-results" role="status"><Result label="Value" value={formatSI(value.ohms, "Ω")} strong /><Result label="Tolerance" value={`±${value.tolerance}%`} /><Result label="Real range" value={`${formatSI(value.min, "Ω")} – ${formatSI(value.max, "Ω")}`} /></div> : null}
    <hr />
    <Field label="Or type a value to see its bands" value={reverse} onChange={setReverse} hint="e.g. 220, 4.7k, 10k" />
    {reverseBands ? <div className="calc-reverse"><ResistorGraphic bands={reverseBands} label={`Bands for ${reverse}`} /><span>{reverseBands.join(" · ")}</span></div> : <p className="small muted">Enter a value between 0.1 Ω and 999 GΩ.</p>}
  </Card>;
}

function LedCalc() {
  const [supply, setSupply] = useState("5");
  const [colour, setColour] = useState<LedColour>("red");
  const [current, setCurrent] = useState("20m");
  const result = num(supply) !== undefined && num(current) ? ledResistor(num(supply)!, LED_FORWARD_VOLTS[colour], num(current)!) : null;
  const bands = result ? bandsFromResistor(result.standard) : null;
  return <Card id="led-resistor" title="LED resistor" level="Basic" explain="The resistor takes the voltage the LED doesn’t use: R = (Vsupply − Vf) ÷ I. STEMBuild rounds UP to the next standard (E12) value so the LED gets slightly less current, which is the safe direction.">
    <div className="calc-grid">
      <Field label="Supply voltage (V)" value={supply} onChange={setSupply} hint="Arduino pin = 5, ESP32 = 3.3" />
      <label className="field calc-field"><span>LED colour</span><select className="select" value={colour} onChange={(event) => setColour(event.target.value as LedColour)}>{(Object.keys(LED_FORWARD_VOLTS) as LedColour[]).map((c) => <option key={c} value={c}>{c} (≈{LED_FORWARD_VOLTS[c]} V)</option>)}</select></label>
      <Field label="LED current (A)" value={current} onChange={setCurrent} hint="10m–20m is typical" />
    </div>
    {result ? <div className="calc-results" role="status">
      <Result label="Exact" value={formatSI(result.exact, "Ω")} />
      <Result label="Use standard" value={formatSI(result.standard, "Ω")} strong />
      <Result label="Actual current" value={formatSI(result.actualCurrent, "A")} />
      <Result label="Resistor rating" value={`${result.ratingWatts} W or more`} />
    </div> : <p className="small muted" role="status">The supply must be higher than the LED’s forward voltage ({LED_FORWARD_VOLTS[colour]} V).</p>}
    {bands ? <ResistorGraphic bands={bands} label={`Colour bands for ${result ? formatSI(result.standard, "Ω") : ""}`} /> : null}
  </Card>;
}

function DividerCalc() {
  const [vin, setVin] = useState("5");
  const [r1, setR1] = useState("10k");
  const [r2, setR2] = useState("10k");
  const ok = num(vin) !== undefined && num(r1) && num(r2);
  const result = ok ? voltageDivider(num(vin)!, num(r1)!, num(r2)!) : null;
  return <Card id="divider" title="Voltage divider" level="Basic" explain="Two resistors in series split a voltage: Vout = Vin × R2 ÷ (R1 + R2). This is how an LDR or potentiometer turns into a voltage that analogRead() can measure (0–1023 on a 5 V Arduino).">
    <div className="calc-grid">
      <Field label="Vin (V)" value={vin} onChange={setVin} />
      <Field label="R1, top (Ω)" value={r1} onChange={setR1} />
      <Field label="R2, bottom (Ω)" value={r2} onChange={setR2} />
    </div>
    {result ? <div className="calc-results" role="status">
      <Result label="Vout" value={formatSI(result.vout, "V")} strong />
      <Result label="Current" value={formatSI(result.current, "A")} />
      <Result label="analogRead() on Uno" value={String(Math.round(Math.min(result.vout, 5) / 5 * 1023))} />
    </div> : null}
  </Card>;
}

function SeriesParallel() {
  const [list, setList] = useState("220, 330, 1k");
  const values = list.split(/[,;\s]+/).filter(Boolean).map(parseSI);
  const valid = values.length > 0 && values.every((value) => Number.isFinite(value) && value > 0);
  return <Card id="series-parallel" title="Series & parallel resistors" level="Basic" explain="In series, resistances add up. In parallel, the total is always smaller than the smallest resistor: 1/R = 1/R1 + 1/R2 + …">
    <Field label="Resistor values, separated by commas" value={list} onChange={setList} />
    {valid ? <div className="calc-results" role="status"><Result label="Series total" value={formatSI(seriesResistance(values), "Ω")} strong /><Result label="Parallel total" value={formatSI(parallelResistance(values), "Ω")} strong /></div> : <p className="small muted">Enter values like 220, 330, 1k.</p>}
  </Card>;
}

function RcCalc() {
  const [r, setR] = useState("10k");
  const [c, setC] = useState("100u");
  const result = num(r) && num(c) ? rcTiming(num(r)!, num(c)!) : null;
  return <Card id="rc" title="RC time constant" level="Intermediate" explain="τ = R × C is the time for a capacitor to charge to 63%. After 5τ it is effectively full. The same R and C form a filter whose cut-off frequency is 1 ÷ (2πRC).">
    <div className="calc-grid"><Field label="Resistance (Ω)" value={r} onChange={setR} /><Field label="Capacitance (F)" value={c} onChange={setC} hint="100u = 100 µF, 100n = 100 nF" /></div>
    {result ? <div className="calc-results" role="status"><Result label="τ (63%)" value={formatSI(result.tau, "s")} strong /><Result label="Full charge (5τ)" value={formatSI(result.fullCharge, "s")} /><Result label="Filter cut-off" value={formatSI(result.cutoffHz, "Hz")} /></div> : null}
  </Card>;
}

function Timer555() {
  const [r1, setR1] = useState("1k");
  const [r2, setR2] = useState("10k");
  const [c, setC] = useState("10u");
  const result = num(r1) && num(r2) && num(c) ? timer555(num(r1)!, num(r2)!, num(c)!) : null;
  return <Card id="timer-555" title="555 timer (astable)" level="Intermediate" explain="The classic 555 chip blinks an LED without any code. Frequency = 1.44 ÷ ((R1 + 2·R2) × C). The output is HIGH while C charges through R1 + R2 and LOW while it discharges through R2, so the duty cycle is always above 50%.">
    <div className="calc-grid"><Field label="R1 (Ω)" value={r1} onChange={setR1} /><Field label="R2 (Ω)" value={r2} onChange={setR2} /><Field label="C (F)" value={c} onChange={setC} /></div>
    {result ? <div className="calc-results" role="status"><Result label="Frequency" value={formatSI(result.frequency, "Hz")} strong /><Result label="Duty cycle" value={`${(result.duty * 100).toFixed(1)}%`} /><Result label="HIGH time" value={formatSI(result.high, "s")} /><Result label="LOW time" value={formatSI(result.low, "s")} /></div> : null}
  </Card>;
}

function CapacitorCode() {
  const [code, setCode] = useState("104");
  const result = capacitorFromCode(code);
  return <Card id="capacitor-code" title="Capacitor code" level="Basic" explain="Small ceramic capacitors print a 3-digit code in picofarads: two digits then the number of zeros. 104 = 10 followed by 4 zeros = 100,000 pF = 100 nF. A letter after it is the tolerance (J = ±5%, K = ±10%).">
    <Field label="Code printed on the capacitor" value={code} onChange={setCode} hint="e.g. 104, 223, 473K" />
    {result ? <div className="calc-results" role="status"><Result label="Capacitance" value={formatSI(result.farads, "F")} strong /><Result label="In picofarads" value={`${Number((result.farads * 1e12).toPrecision(6)).toLocaleString("en")} pF`} />{result.tolerance ? <Result label="Tolerance" value={result.tolerance} /> : null}</div> : <p className="small muted">Enter three digits, optionally followed by a tolerance letter.</p>}
  </Card>;
}

function BatteryCalc() {
  const [capacity, setCapacity] = useState("2000");
  const [load, setLoad] = useState("45");
  const c = Number(capacity), l = Number(load);
  const result = c > 0 && l > 0 ? batteryLife(c, l) : null;
  return <Card id="battery" title="Battery life" level="Intermediate" explain="Runtime ≈ capacity (mAh) ÷ load (mA). STEMBuild uses only 80% of the label capacity because batteries never deliver it all: voltage sags before empty, and cold and regulators waste some.">
    <div className="calc-grid"><Field label="Battery capacity (mAh)" value={capacity} onChange={setCapacity} hint="AA ≈ 2000, 18650 ≈ 2600, 9 V ≈ 500" /><Field label="Average current draw (mA)" value={load} onChange={setLoad} hint="Uno ≈ 45 mA idle" /></div>
    {result ? <div className="calc-results" role="status"><Result label="Runtime" value={result.hours >= 48 ? `${(result.hours / 24).toFixed(1)} days` : `${result.hours.toFixed(1)} hours`} strong /></div> : null}
  </Card>;
}

export function EngineeringCalculators() {
  const sections = [["ohms-law", "Ohm’s law"], ["colour-code", "Colour code"], ["led-resistor", "LED resistor"], ["divider", "Voltage divider"], ["series-parallel", "Series/parallel"], ["capacitor-code", "Capacitor code"], ["rc", "RC timing"], ["timer-555", "555 timer"], ["battery", "Battery life"]];
  return <div className="stack">
    <nav className="project-area-chips" aria-label="Jump to a calculator">{sections.map(([id, name]) => <a key={id} className="chip" href={`#${id}`}>{name}</a>)}</nav>
    <div className="calc-layout">
      <OhmsLaw /><ColourCode /><LedCalc /><DividerCalc /><SeriesParallel /><CapacitorCode /><RcCalc /><Timer555 /><BatteryCalc />
    </div>
  </div>;
}
