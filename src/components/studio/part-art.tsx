// SVG artwork for Maker Studio parts, drawn at the part's own size (origin at its top-left).
import type { PartView, PlacedPart } from "@/lib/studio/circuit";
import { PART_BY_TYPE } from "@/lib/studio/parts";
import { BAND_COLOURS, bandsFromResistor, formatSI } from "@/lib/electronics";

const PCB_BLUE = "#1d4f91", PCB_GREEN = "#1f6f4a", PCB_EDGE = "#0e2a4f", SILK = "#e8f0f8";

function Label({ x, y, children, anchor = "middle", fill = SILK, size = 9 }: { x: number; y: number; children: React.ReactNode; anchor?: "start" | "middle" | "end"; fill?: string; size?: number }) {
  return <text x={x} y={y} textAnchor={anchor} fontSize={size} fontFamily="var(--ds-mono)" fill={fill}>{children}</text>;
}

function Board({ w, h, colour = PCB_BLUE, title }: { w: number; h: number; colour?: string; title?: string }) {
  return <g>
    <rect x={0} y={0} width={w} height={h - 8} rx={5} fill={colour} stroke={PCB_EDGE} strokeWidth={1.5} />
    <circle cx={7} cy={7} r={2.5} fill="#0b1f3a" /><circle cx={w - 7} cy={7} r={2.5} fill="#0b1f3a" />
    {title ? <Label x={w / 2} y={h - 14} size={8.5}>{title}</Label> : null}
  </g>;
}

export function PartArt({ part, view, pressed }: { part: PlacedPart; view?: PartView; pressed?: boolean }) {
  const def = PART_BY_TYPE[part.type];
  const { width: w, height: h } = def;
  const p = part.props;
  switch (part.type) {
    case "led": {
      const colour = view?.colour ?? "#ff3b30";
      const b = view?.brightness ?? 0;
      return <g>
        <line x1={14} y1={48} x2={14} y2={h} stroke="#9aa5b1" strokeWidth={2} />
        <line x1={30} y1={48} x2={30} y2={h - 6} stroke="#9aa5b1" strokeWidth={2} />
        {b > 0.02 ? <circle cx={22} cy={24} r={20 + b * 14} fill={colour} opacity={0.18 + b * 0.32} /> : null}
        <path d="M6 48 V24 a16 16 0 0 1 32 0 V48 Z" fill={view?.burnt ? "#3b3b3b" : colour} opacity={view?.burnt ? 1 : 0.35 + b * 0.65} stroke="rgba(0,0,0,.35)" />
        <rect x={4} y={44} width={36} height={6} rx={2} fill={view?.burnt ? "#2b2b2b" : colour} opacity={0.8} />
        {b > 0.3 ? <ellipse cx={16} cy={18} rx={4} ry={7} fill="#ffffff" opacity={0.55} /> : null}
        {view?.burnt ? <path d="M12 16 l8 10 l-4 4 l10 10" stroke="#ffb020" strokeWidth={2} fill="none" /> : null}
      </g>;
    }
    case "rgb-led": {
      const c = view?.channels ?? { r: 0, g: 0, b: 0 };
      const mix = `rgb(${Math.round(255 * c.r)},${Math.round(255 * c.g)},${Math.round(255 * c.b)})`;
      const glow = Math.max(c.r, c.g, c.b);
      return <g>
        {[11, 25, 39, 53].map((x, i) => <line key={x} x1={x} y1={52} x2={x} y2={i === 1 ? h : h - 4} stroke="#9aa5b1" strokeWidth={2} />)}
        {glow > 0.02 ? <circle cx={32} cy={26} r={22 + glow * 14} fill={mix} opacity={0.25 + glow * 0.3} /> : null}
        <path d="M12 52 V26 a20 20 0 0 1 40 0 V52 Z" fill={glow > 0.02 ? mix : "#e8eef5"} stroke="rgba(0,0,0,.3)" opacity={0.9} />
      </g>;
    }
    case "seven-segment": {
      const s = view?.segments ?? {};
      const seg = (id: string, d: string) => <path key={id} d={d} fill={(s[id] ?? 0) > 0.05 ? "#ff3b30" : "#3a1d1d"} opacity={(s[id] ?? 0) > 0.05 ? 0.4 + 0.6 * (s[id] ?? 0) : 1} />;
      return <g>
        <rect x={4} y={8} width={w - 8} height={h - 16} rx={4} fill="#151515" stroke="#000" />
        <g transform="translate(26 20) skewX(-6)">
          {seg("a", "M6 0 h32 l-4 6 h-24 z")}{seg("b", "M40 2 v38 l-6 -4 v-30 z")}{seg("c", "M40 46 v38 l-6 -4 v-30 z")}
          {seg("d", "M6 86 h32 l-4 -6 h-24 z")}{seg("e", "M4 46 v38 l6 -4 v-30 z")}{seg("f", "M4 2 v38 l6 -4 v-30 z")}{seg("g", "M8 43 h28 l-4 4 h-20 z")}
          <circle cx={50} cy={84} r={3.5} fill={(s.dp ?? 0) > 0.05 ? "#ff3b30" : "#3a1d1d"} />
        </g>
      </g>;
    }
    case "buzzer": {
      const sounding = (view?.frequency ?? 0) > 0;
      return <g>
        <line x1={22} y1={50} x2={22} y2={h} stroke="#9aa5b1" strokeWidth={2} /><line x1={38} y1={50} x2={38} y2={h} stroke="#9aa5b1" strokeWidth={2} />
        <circle cx={30} cy={28} r={24} fill="#1b1b1b" /><circle cx={30} cy={28} r={6} fill="#333" />
        <Label x={20} y={14} fill="#bbb">+</Label>
        {sounding ? <g className="studio-waves" stroke="#0172e5" fill="none" strokeWidth={2}><path d="M58 16 q8 12 0 24" /><path d="M64 10 q12 18 0 36" /></g> : null}
        {sounding ? <Label x={30} y={66} fill="#0e3462" size={8}>{Math.round(view!.frequency!)} Hz</Label> : null}
      </g>;
    }
    case "button":
      return <g>
        <line x1={14} y1={44} x2={14} y2={h} stroke="#9aa5b1" strokeWidth={2} /><line x1={42} y1={44} x2={42} y2={h} stroke="#9aa5b1" strokeWidth={2} />
        <rect x={4} y={6} width={48} height={42} rx={4} fill="#2a2f36" stroke="#111" />
        <circle cx={28} cy={27} r={pressed ? 12 : 13} fill={pressed ? "#c2410c" : "#ef5a1f"} stroke="#7a2a07" strokeWidth={pressed ? 3 : 1} />
      </g>;
    case "switch": {
      const right = p.position === "b";
      return <g>
        <Board w={w} h={h + 8} colour="#2a2f36" />
        <rect x={14} y={14} width={44} height={16} rx={3} fill="#111" />
        <rect x={right ? 38 : 16} y={11} width={18} height={22} rx={2} fill="#d9dee5" stroke="#8a95a3" />
        <Label x={14} y={44} fill="#9aa5b1">A</Label><Label x={58} y={44} fill="#9aa5b1">B</Label>
      </g>;
    }
    case "potentiometer": {
      const angle = -135 + Number(p.position ?? 0.5) * 270;
      return <g>
        {[16, 38, 60].map((x) => <line key={x} x1={x} y1={52} x2={x} y2={h} stroke="#9aa5b1" strokeWidth={2} />)}
        <rect x={4} y={10} width={68} height={46} rx={6} fill="#1f5fa0" stroke={PCB_EDGE} />
        <circle cx={38} cy={33} r={18} fill="#d9dee5" stroke="#8a95a3" />
        <line x1={38} y1={33} x2={38} y2={18} stroke="#0e3462" strokeWidth={3} strokeLinecap="round" transform={`rotate(${angle} 38 33)`} />
      </g>;
    }
    case "light-sensor": {
      const light = Number(p.light ?? 0.6);
      return <g>
        <Board w={w} h={h} colour={PCB_BLUE} title="LDR" />
        <circle cx={w / 2} cy={22} r={11} fill="#c8a25a" stroke="#6b5426" />
        <path d={`M${w / 2 - 6} 16 h4 v4 h4 v4 h4`} stroke="#6b3d12" strokeWidth={1.5} fill="none" />
        <circle cx={w - 14} cy={14} r={4} fill={view?.powered ? "#30d158" : "#334"} />
        <rect x={6} y={34} width={(w - 12) * light} height={4} rx={2} fill="#ffd60a" />
      </g>;
    }
    case "temp-sensor":
      return <g>
        {[10, 28, 46].map((x) => <line key={x} x1={x} y1={40} x2={x} y2={h} stroke="#9aa5b1" strokeWidth={2} />)}
        <path d="M6 40 V18 a22 22 0 0 1 44 0 V40 Z" fill="#1b1b1b" />
        <Label x={28} y={30} fill="#bbb" size={8}>TMP36</Label>
        <Label x={28} y={14} fill="#ffd60a" size={8}>{Number(p.celsius ?? 24)}°C</Label>
      </g>;
    case "ultrasonic":
      return <g>
        <Board w={w} h={h} colour={PCB_BLUE} title="HC-SR04" />
        {[30, 86].map((cx) => <g key={cx}><circle cx={cx} cy={24} r={17} fill="#c7ccd3" stroke="#6b7380" /><circle cx={cx} cy={24} r={11} fill="#2a2f36" /></g>)}
        <Label x={w / 2} y={28} fill={SILK} size={8}>{Number(p.distance ?? 60)} cm</Label>
      </g>;
    case "pir":
      return <g>
        <Board w={w} h={h} colour={PCB_GREEN} title="PIR" />
        <path d="M13 40 a22 22 0 0 1 44 0 Z" fill={p.motion ? "#fff6d6" : "#f2f2f2"} stroke="#c6c6c6" />
        <circle cx={w - 10} cy={10} r={4} fill={p.motion && view?.powered ? "#ff3b30" : "#334"} />
      </g>;
    case "servo": {
      const angle = view?.angle ?? 90;
      return <g>
        <rect x={10} y={14} width={68} height={44} rx={4} fill="#2f6fe0" stroke="#1d4f91" />
        <circle cx={58} cy={36} r={11} fill="#f4f4f4" stroke="#aaa" />
        <g transform={`rotate(${angle - 90} 58 36)`} className="studio-servo-horn">
          <path d="M58 36 L58 6" stroke="#f4f4f4" strokeWidth={9} strokeLinecap="round" />
          <circle cx={58} cy={36} r={4} fill="#c7ccd3" />
        </g>
        <Label x={30} y={40} fill="#e8f0f8" size={8}>SG90</Label>
        <Label x={58} y={70} fill="#0e3462" size={8}>{angle}°</Label>
        {[22, 44, 66].map((x, i) => <line key={x} x1={x} y1={58} x2={x} y2={h} stroke={["#5b3a29", "#d32f2f", "#ef7d1a"][i]} strokeWidth={3} />)}
      </g>;
    }
    case "motor-driver": {
      const speed = view?.speed ?? 0, dir = view?.direction ?? 0;
      return <g>
        <Board w={w} h={h} colour="#b8282e" title="H-bridge" />
        <rect x={10} y={14} width={34} height={30} rx={3} fill="#151515" />
        <g transform="translate(86 32)">
          <circle r={22} fill="#c7ccd3" stroke="#6b7380" />
          <g className={speed > 0.02 ? (dir < 0 ? "studio-spin reverse" : "studio-spin") : undefined} style={{ animationDuration: `${Math.max(0.15, 1.2 - speed)}s` }}>
            {[0, 120, 240].map((a) => <path key={a} d="M0 0 L0 -18" stroke="#374151" strokeWidth={5} strokeLinecap="round" transform={`rotate(${a})`} />)}
          </g>
          <circle r={4} fill="#374151" />
        </g>
        <Label x={27} y={58} size={8}>{dir === 0 ? "stop" : `${dir > 0 ? "fwd" : "rev"} ${Math.round(speed * 100)}%`}</Label>
      </g>;
    }
    case "resistor": {
      const ohms = Number(p.ohms ?? 220);
      const bands = bandsFromResistor(ohms) ?? [];
      return <g>
        <line x1={0} y1={12} x2={w} y2={12} stroke="#9aa5b1" strokeWidth={2} />
        <rect x={24} y={3} width={48} height={18} rx={8} fill="#e8d3a9" stroke="#b89b6a" />
        {bands.map((band, i) => <rect key={i} x={30 + i * 9 + (i === 3 ? 6 : 0)} y={3} width={5} height={18} fill={BAND_COLOURS[band].hex} />)}
        <Label x={48} y={-3} fill="#45566b" size={9}>{formatSI(ohms, "Ω")}</Label>
      </g>;
    }
  }
}
