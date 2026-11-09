// Schematic symbols for the live circuit simulator. Each is drawn along +x from 0 to `len`
// (the caller rotates the group to match the component's direction), body centred at len / 2.
import { LED_HEX, type ElementReading, type SimElement } from "@/lib/circuit-sim/engine";

export const BODY: Partial<Record<SimElement["kind"], number>> = {
  resistor: 32, battery: 14, ac: 30, led: 22, diode: 18, lamp: 28, motor: 30, buzzer: 28, switch: 30, button: 28,
  capacitor: 10, voltmeter: 30, ammeter: 30, npn: 30,
};

const INK = "#1f2a37";

export function PartSymbol({ el, len, reading, pressed, spin, colourA, colourB, angle = 0 }: {
  el: SimElement; len: number; reading?: ElementReading; pressed: boolean; spin: number; colourA: string; colourB: string;
  /** The group's rotation, so letters inside symbols can be turned back upright. */
  angle?: number;
}) {
  const c = len / 2;
  const upright = (x: number, y: number) => `rotate(${-angle} ${x} ${y})`;
  // A white LED's light is invisible on a white page, so it glows warm white.
  const glow = (hex: string) => (hex === LED_HEX.white ? "#ffe08a" : hex);
  const body = BODY[el.kind] ?? 0;
  const leads = body ? <>
    <line x1={0} y1={0} x2={c - body / 2} y2={0} stroke={colourA} strokeWidth={3} strokeLinecap="round" />
    <line x1={c + body / 2} y1={0} x2={len} y2={0} stroke={colourB} strokeWidth={3} strokeLinecap="round" />
  </> : null;
  const level = Math.abs(reading?.level ?? 0);

  switch (el.kind) {
    case "wire":
      return <line x1={0} y1={0} x2={len} y2={0} stroke={colourA} strokeWidth={3} strokeLinecap="round" />;
    case "resistor": {
      const pts = Array.from({ length: 9 }, (_, i) => `${c - 16 + i * 4},${i === 0 || i === 8 ? 0 : i % 2 ? -7 : 7}`).join(" ");
      return <g>{leads}<polyline points={pts} fill="none" stroke={INK} strokeWidth={2.2} strokeLinejoin="round" /></g>;
    }
    case "battery":
      return <g>{leads}
        <line x1={c - 5} y1={-7} x2={c - 5} y2={7} stroke={INK} strokeWidth={4} />
        <line x1={c + 5} y1={-15} x2={c + 5} y2={15} stroke={INK} strokeWidth={2.2} />
        <text x={c + 14} y={-10} fontSize={12} fontWeight={700} fill="#c62828" transform={upright(c + 17, -14)}>+</text>
      </g>;
    case "ac":
      return <g>{leads}<circle cx={c} cy={0} r={15} fill="#fff" stroke={INK} strokeWidth={2} />
        <path d={`M${c - 9} 0 q4.5 -10 9 0 t9 0`} fill="none" stroke={INK} strokeWidth={2} /></g>;
    case "led": case "diode": {
      const burnt = reading?.burnt;
      const hex = el.kind === "led" ? (burnt ? "#3b3b3b" : LED_HEX[el.colour ?? "red"]) : INK;
      return <g>{leads}
        {el.kind === "led" && level > 0.02 && !burnt ? <circle cx={c} cy={0} r={14 + level * 16} fill={glow(hex)} opacity={0.2 + level * 0.4} /> : null}
        <path d={`M${c - 9} -10 L${c - 9} 10 L${c + 8} 0 Z`} fill={el.kind === "led" ? (level > 0.02 && !burnt ? glow(hex) : "#fff") : INK} stroke={el.kind === "led" ? (burnt ? "#222" : hex === "#f5f7fa" ? "#9aa5b1" : hex) : INK} strokeWidth={2} />
        <line x1={c + 9} y1={-10} x2={c + 9} y2={10} stroke={INK} strokeWidth={2.6} />
        {el.kind === "led" ? <g stroke={burnt ? "#e65100" : INK} strokeWidth={1.4} fill="none">
          {burnt ? <path d={`M${c - 4} -20 l5 6 l-4 3 l6 7`} strokeWidth={2} /> : <><path d={`M${c - 1} -13 l6 -8 m-4 0 h4 v4`} /><path d={`M${c + 5} -11 l6 -8 m-4 0 h4 v4`} /></>}
        </g> : null}
      </g>;
    }
    case "lamp":
      return <g>{leads}
        {level > 0.02 ? <circle cx={c} cy={0} r={16 + level * 18} fill="#ffd54f" opacity={0.2 + level * 0.45} /> : null}
        <circle cx={c} cy={0} r={13} fill={level > 0.02 ? `rgba(255,213,79,${0.4 + level * 0.6})` : "#fff"} stroke={INK} strokeWidth={2} />
        <path d={`M${c - 9} -9 L${c + 9} 9 M${c + 9} -9 L${c - 9} 9`} stroke={INK} strokeWidth={1.6} />
      </g>;
    case "motor":
      return <g>{leads}<circle cx={c} cy={0} r={15} fill="#fff" stroke={INK} strokeWidth={2} />
        <g transform={`rotate(${spin} ${c} 0)`}><line x1={c} y1={-11} x2={c} y2={11} stroke="#1a73e8" strokeWidth={2.5} /></g>
        <text x={c} y={4} textAnchor="middle" fontSize={11} fontWeight={700} fill={INK} transform={upright(c, 0)}>M</text></g>;
    case "buzzer":
      return <g>{leads}<path d={`M${c - 14} 6 a14 14 0 0 1 28 0 Z`} fill="#1f2a37" />
        {level > 0 ? <g stroke="#1a73e8" fill="none" strokeWidth={1.8} className="cl-waves"><path d={`M${c - 8} -14 q8 -8 16 0`} /><path d={`M${c - 12} -20 q12 -10 24 0`} /></g> : null}</g>;
    case "switch": {
      const closed = el.closed;
      return <g>{leads}
        <circle cx={c - 15} cy={0} r={3} fill={INK} /><circle cx={c + 15} cy={0} r={3} fill={INK} />
        <line x1={c - 15} y1={0} x2={closed ? c + 15 : c + 11} y2={closed ? 0 : -14} stroke={INK} strokeWidth={2.6} strokeLinecap="round" />
      </g>;
    }
    case "button":
      return <g>{leads}
        <circle cx={c - 12} cy={0} r={3} fill={INK} /><circle cx={c + 12} cy={0} r={3} fill={INK} />
        <line x1={c - 15} y1={pressed ? -2 : -9} x2={c + 15} y2={pressed ? -2 : -9} stroke={pressed ? "#c2410c" : INK} strokeWidth={2.6} />
        <line x1={c} y1={pressed ? -2 : -9} x2={c} y2={-18} stroke={INK} strokeWidth={2} />
      </g>;
    case "capacitor":
      return <g>{leads}
        <line x1={c - 5} y1={-14} x2={c - 5} y2={14} stroke={INK} strokeWidth={3} />
        <line x1={c + 5} y1={-14} x2={c + 5} y2={14} stroke={INK} strokeWidth={3} />
      </g>;
    case "voltmeter": case "ammeter":
      return <g>{leads}<circle cx={c} cy={0} r={15} fill="#fff" stroke={el.kind === "voltmeter" ? "#7b1fa2" : "#00838f"} strokeWidth={2} />
        <text x={c} y={5} textAnchor="middle" fontSize={13} fontWeight={700} fill={el.kind === "voltmeter" ? "#7b1fa2" : "#00838f"} transform={upright(c, 0)}>{el.kind === "voltmeter" ? "V" : "A"}</text></g>;
    case "npn":
      return <g>
        <line x1={0} y1={0} x2={c - 14} y2={0} stroke={colourA} strokeWidth={3} strokeLinecap="round" />
        <line x1={c + 14} y1={0} x2={len} y2={0} stroke={colourB} strokeWidth={3} strokeLinecap="round" />
        <circle cx={c} cy={12} r={20} fill="#fff" stroke={INK} strokeWidth={1.6} />
        <line x1={c - 12} y1={18} x2={c + 12} y2={18} stroke={INK} strokeWidth={3} />
        <line x1={c} y1={18} x2={c} y2={40} stroke={INK} strokeWidth={3} />
        <line x1={c - 14} y1={0} x2={c - 6} y2={18} stroke={INK} strokeWidth={2.2} />
        <line x1={c + 6} y1={18} x2={c + 14} y2={0} stroke={INK} strokeWidth={2.2} />
        <path d={`M${c + 14} 0 l-7 2 l3 6 Z`} fill={INK} />
      </g>;
    case "ground":
      return null;
  }
}

/** Ground drawn at its node, pointing down the screen. */
export function GroundSymbol({ x, y }: { x: number; y: number }) {
  return <g stroke={INK} strokeWidth={2.2} strokeLinecap="round">
    <line x1={x} y1={y} x2={x} y2={y + 10} />
    <line x1={x - 11} y1={y + 10} x2={x + 11} y2={y + 10} />
    <line x1={x - 7} y1={y + 15} x2={x + 7} y2={y + 15} />
    <line x1={x - 3} y1={y + 20} x2={x + 3} y2={y + 20} />
  </g>;
}
