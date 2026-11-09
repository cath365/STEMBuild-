"use client";

// Robot Builder garage: choose a robot, assemble it with guided steps, wire it with the next
// connection highlighted, then test it in an arena that matches the robot.
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { RobotArena } from "@/components/robot-arena";
import { KIT_BY_ID, LINE_START, ROBOT_KITS, TRACK, canJoin, checkKitWiring, pinName, stepLightSeeker, stepLineFollower, stepRemote, type DriveFrame, type KitId, type Pose, type RemoteCommand, type RobotKit } from "@/lib/robot-kits";
import { useStoredValue } from "@/lib/use-stored-value";

type Choice = "obstacle" | KitId;
type Saved = { placed: string[]; wires: { a: string; b: string }[] };
const CHOICE_KEY = "stembuild-robot-kit-choice-v1";
const LESSON: Record<string, string> = { uno: "arduino-uno", driver: "l298n", motorL: "dc-motor", battery: "battery-pack", irL: "line-sensor", ldrL: "ldr", bt: "hc05", chassis: "robot-chassis", wheels: "robot-wheels" };

const CHOICES: { id: Choice; title: string; level: string; summary: string; image: string }[] = [
  { id: "obstacle", title: "Obstacle-avoiding robot", level: "Beginner", summary: "An ultrasonic sensor spots blocks; the robot turns before it hits them.", image: "/images/cad/hcsr04.webp" },
  ...ROBOT_KITS.map((k) => ({ id: k.id, title: k.title, level: k.level, summary: k.summary, image: k.parts.find((p) => ["irL", "ldrL", "bt"].includes(p.id))!.image })),
];

export function RobotGarage({ active = true }: { active?: boolean }) {
  const [raw, setRaw] = useStoredValue(CHOICE_KEY);
  const choice: Choice = raw && CHOICES.some((c) => c.id === raw) ? (raw as Choice) : "obstacle";
  return <div className="robot-garage">
    <div className="rk-choices" role="radiogroup" aria-label="Choose a robot to build">
      {CHOICES.map((c) => <button key={c.id} type="button" role="radio" aria-checked={choice === c.id} className="rk-choice" onClick={() => setRaw(c.id)}>
        <Image src={c.image} alt="" width={72} height={54} unoptimized />
        <span><strong>{c.title}</strong><small>{c.level}</small><em>{c.summary}</em></span>
      </button>)}
    </div>
    {choice === "obstacle" ? <RobotArena active={active} /> : <KitWorkshop key={choice} kit={KIT_BY_ID[choice]} active={active} />}
  </div>;
}

function parseSaved(raw: string | null, kit: RobotKit): Saved {
  try {
    const data = raw ? JSON.parse(raw) : null;
    const partIds = new Set(kit.parts.map((p) => p.id));
    const pins = new Set(kit.parts.flatMap((p) => p.pins.map((pin) => `${p.id}:${pin}`)));
    return {
      placed: Array.isArray(data?.placed) ? data.placed.filter((id: unknown) => typeof id === "string" && partIds.has(id)) : [],
      wires: Array.isArray(data?.wires) ? data.wires.filter((w: { a?: unknown; b?: unknown }) => typeof w?.a === "string" && typeof w?.b === "string" && pins.has(w.a) && pins.has(w.b)) : [],
    };
  } catch { return { placed: [], wires: [] }; }
}

function startPose(kit: RobotKit): Pose {
  return kit.arena === "line" ? { ...LINE_START } : { x: 0, z: 60, heading: Math.PI };
}

function KitWorkshop({ kit, active }: { kit: RobotKit; active: boolean }) {
  const [raw, setRaw] = useStoredValue(`stembuild-robot-kit-${kit.id}-v1`);
  const saved = useMemo(() => parseSaved(raw, kit), [raw, kit]);
  const save = (next: Saved) => setRaw(JSON.stringify(next));
  const [selected, setSelected] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const remaining = kit.parts.filter((p) => !saved.placed.includes(p.id));
  const nextPart = remaining[0] ?? null;
  const target = selected && !saved.placed.includes(selected) ? selected : nextPart?.id ?? null;
  const wiring = checkKitWiring(kit, saved.wires);
  const assembled = remaining.length === 0;
  const ready = assembled && wiring.ok;
  const nextWire = assembled ? wiring.next : null;

  function place(id: string) {
    if (saved.placed.includes(id)) return;
    save({ ...saved, placed: [...saved.placed, id] });
    setSelected(null);
    const part = kit.parts.find((p) => p.id === id)!;
    setMessage(`${part.name} fitted.${remaining.length === 1 ? " All parts are on. Now connect the wires." : ""}`);
  }

  function clickPin(endpoint: string) {
    if (!pending) { setPending(endpoint); setMessage(`Now choose where ${pinName(kit, endpoint)} connects to.`); return; }
    if (pending === endpoint) { setPending(null); setMessage(""); return; }
    const a = pending;
    setPending(null);
    if (!canJoin(kit, a, endpoint)) {
      setMessage(`${pinName(kit, a)} and ${pinName(kit, endpoint)} must not be joined: on a real robot that would ${/5V|VCC|\+/.test(a + endpoint) && /GND|−/.test(a + endpoint) ? "short the power supply" : "send the signal to the wrong place"}.${nextWire ? ` Try the highlighted pins: ${pinName(kit, nextWire.a)} → ${pinName(kit, nextWire.b)}.` : ""}`);
      return;
    }
    if (saved.wires.some((w) => (w.a === a && w.b === endpoint) || (w.a === endpoint && w.b === a))) { setMessage("Those two are already connected."); return; }
    save({ ...saved, wires: [...saved.wires, { a, b: endpoint }] });
    const reason = kit.connections.find((c) => (c.a === a && c.b === endpoint) || (c.a === endpoint && c.b === a))?.why;
    setMessage(`Connected ${pinName(kit, a)} → ${pinName(kit, endpoint)}.${reason ? ` ${reason}` : ""}`);
  }

  const center = (id: string) => { const p = kit.parts.find((q) => q.id === id)!; return { x: p.x, y: p.y }; };
  const pinActive = (endpoint: string) => nextWire && (nextWire.a === endpoint || nextWire.b === endpoint);

  return <section className="robot-lab rk-workshop" id={`robot-kit-${kit.id}`} aria-label={kit.title}>
    <div className="eyebrow">Robotics · {kit.level}</div>
    <h2>{kit.title}</h2>
    <p>{kit.summary} <span className="muted">You will learn: {kit.learn.join(" · ")}.</span></p>

    <ol className="rk-progress" aria-label="Build progress">
      <li data-done={assembled}>1. Assemble <strong>{kit.parts.length - remaining.length}/{kit.parts.length}</strong></li>
      <li data-done={wiring.ok}>2. Wire <strong>{kit.connections.length - wiring.missing.length}/{kit.connections.length}</strong></li>
      <li data-done={ready}>3. Test it in the arena</li>
    </ol>
    {message ? <p className="rk-message" role="status">{message}</p> : null}

    <div className="rk-grid">
      <div className="card rk-build">
        <h3>1. Put it together</h3>
        {nextPart ? <p className="small">Next: <strong>{kit.parts.find((p) => p.id === target)!.name}</strong>. Click the glowing spot on the chassis, or use the button.</p> : <p className="small">Every part is in place. ✓</p>}
        <div className="rk-tray">{kit.parts.map((p) => <button key={p.id} type="button" className={saved.placed.includes(p.id) ? "rk-part placed" : target === p.id ? "rk-part next" : "rk-part"} disabled={saved.placed.includes(p.id)} aria-pressed={target === p.id} onClick={() => setSelected(p.id)}>
          <Image src={p.image} alt="" width={48} height={36} unoptimized /><span>{p.name}</span>
        </button>)}</div>
        <div className="inline">
          {target ? <button type="button" className="btn btn-primary" onClick={() => place(target)}>Fit the {kit.parts.find((p) => p.id === target)!.name.toLowerCase()}</button> : null}
          {remaining.length > 1 ? <button type="button" className="btn" onClick={() => { save({ ...saved, placed: kit.parts.map((p) => p.id) }); setMessage("All parts fitted for you. Now connect the wires."); }}>Fit all parts for me</button> : null}
        </div>
        <svg className="rk-assembly" viewBox="0 0 400 300" role="group" aria-label={`${kit.title} assembly`}>
          <rect width={400} height={300} rx={12} fill="#edf3f8" />
          {kit.parts.map((p) => {
            const isPlaced = saved.placed.includes(p.id);
            return <g key={p.id}>
              {isPlaced ? <image href={p.image} x={p.x - p.w / 2} y={p.y - p.h / 2} width={p.w} height={p.h} opacity={p.id === "chassis" ? 0.55 : 1} preserveAspectRatio="xMidYMid meet" />
                : <rect x={p.x - p.w / 2} y={p.y - p.h / 2} width={p.w} height={p.h} rx={6} className={target === p.id ? "rk-zone next" : "rk-zone"} role="button" tabIndex={0} aria-label={`Fit ${p.name} here`}
                  onClick={() => (target === p.id ? place(p.id) : setMessage(`That spot is for the ${p.name.toLowerCase()}.`))}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (target === p.id) place(p.id); } }} />}
              {!isPlaced && p.id !== "chassis" ? <text x={p.x} y={p.y + 4} textAnchor="middle" className="rk-zone-label">{p.name}</text> : null}
            </g>;
          })}
          {saved.wires.map((w, i) => { const a = center(w.a.split(":")[0]), b = center(w.b.split(":")[0]); return <path key={i} d={`M${a.x} ${a.y} Q${(a.x + b.x) / 2} ${Math.min(a.y, b.y) - 30} ${b.x} ${b.y}`} fill="none" stroke={/GND|−/.test(w.a + w.b) ? "#1f2937" : /5V|VCC|VS|\+/.test(w.a + w.b) ? "#d93025" : "#1a73e8"} strokeWidth={1.8} opacity={0.75} />; })}
        </svg>
      </div>

      <div className="card rk-wire">
        <h3>2. Connect the wires</h3>
        {!assembled ? <p className="small muted">Fit every part first; then the pins appear here.</p> : wiring.ok ? <p className="small">All {kit.connections.length} connections are correct. ✓</p> : <>
          <p className="small">Next: connect <strong>{pinName(kit, nextWire!.a)}</strong> to <strong>{pinName(kit, nextWire!.b)}</strong>. <span className="muted">{nextWire!.why}</span></p>
          <div className="inline">
            <button type="button" className="btn btn-primary" onClick={() => { save({ ...saved, wires: [...saved.wires, { a: nextWire!.a, b: nextWire!.b }] }); setMessage(`Connected for you: ${pinName(kit, nextWire!.a)} → ${pinName(kit, nextWire!.b)}. ${nextWire!.why}`); }}>Connect this one for me</button>
            <button type="button" className="btn" onClick={() => { save({ ...saved, wires: [...saved.wires, ...wiring.missing.map((c) => ({ a: c.a, b: c.b }))] }); setMessage("All wires connected for you. Read the list below to see why each one is there."); }}>Wire everything for me</button>
          </div>
        </>}
        {assembled ? <div className="rk-pins">
          {kit.parts.filter((p) => p.pins.length).map((p) => <div key={p.id}><strong>{p.name}</strong><div>
            {p.pins.map((pin) => { const endpoint = `${p.id}:${pin}`; return <button key={pin} type="button" className={pinActive(endpoint) ? "rk-pin next" : pending === endpoint ? "rk-pin pending" : "rk-pin"} aria-pressed={pending === endpoint} aria-label={pinName(kit, endpoint)} onClick={() => clickPin(endpoint)}>{pin}</button>; })}
          </div></div>)}
        </div> : null}
        {saved.wires.length ? <details className="rk-wire-list"><summary>{saved.wires.length} wires · why each one is there</summary><ol>{saved.wires.map((w, i) => {
          const why = kit.connections.find((c) => (c.a === w.a && c.b === w.b) || (c.a === w.b && c.b === w.a))?.why ?? "Joins pins that belong to the same circuit.";
          return <li key={i}>{pinName(kit, w.a)} → {pinName(kit, w.b)} <span className="muted">· {why}</span> <button type="button" className="kit-clear" onClick={() => save({ ...saved, wires: saved.wires.filter((_, n) => n !== i) })}>Remove</button></li>;
        })}</ol></details> : null}
        <button type="button" className="btn rk-reset" onClick={() => { save({ placed: [], wires: [] }); setPending(null); setMessage("Kit taken apart. Start again from step 1."); }}>Take it apart and start again</button>
      </div>
    </div>

    <KitArena kit={kit} ready={ready} active={active} />

    <div className="card rk-code">
      <h3>4. Build the real one</h3>
      <p className="small muted">This is the Arduino sketch for the robot you just wired, with the same pins. Upload it to your Uno, lift the wheels off the table for the first test, then put it on the floor.</p>
      <div className="inline">
        <button type="button" className="btn" onClick={() => { const url = URL.createObjectURL(new Blob([kit.sketch], { type: "text/plain" })); const a = document.createElement("a"); a.href = url; a.download = `stembuild-${kit.id}.ino`; a.click(); URL.revokeObjectURL(url); }}>Download {kit.id}.ino</button>
        {kit.parts.filter((p) => LESSON[p.id]).map((p) => <Link key={p.id} className="text-link small" href={`/components/${LESSON[p.id]}`}>{p.name} lesson</Link>)}
      </div>
      <details><summary>View the code</summary><pre className="robot-code">{kit.sketch}</pre></details>
    </div>
  </section>;
}

function KitArena({ kit, ready, active }: { kit: RobotKit; ready: boolean; active: boolean }) {
  const [running, setRunning] = useState(false);
  const [frame, setFrame] = useState<DriveFrame>({ pose: startPose(kit), left: 0, right: 0, status: "Waiting to start", readings: {} });
  const [light, setLight] = useState({ x: 55, z: -55 });
  const [command, setCommand] = useState<RemoteCommand>("S");
  const [log, setLog] = useState<string[]>([]);
  const loop = useRef({ pose: startPose(kit), travelled: 0, light, command });
  const draggingLight = useRef(false);
  useEffect(() => { loop.current.light = light; loop.current.command = command; }, [light, command]);
  const [wasActive, setWasActive] = useState(active);
  if (wasActive !== active) { setWasActive(active); if (!active) setRunning(false); }
  if (running && !ready) setRunning(false);

  useEffect(() => {
    if (!running) return;
    let raf = 0, last = 0;
    const tick = (t: number) => {
      const dt = last ? Math.min(0.05, (t - last) / 1000) : 0;
      last = t;
      if (dt > 0) {
        const s = loop.current;
        let next: DriveFrame;
        if (kit.arena === "line") { const f = stepLineFollower(s.pose, dt, s.travelled); s.travelled = f.travelled; next = f; }
        else if (kit.arena === "light") next = stepLightSeeker(s.pose, s.light, dt);
        else next = stepRemote(s.pose, s.command, dt);
        s.pose = next.pose;
        setFrame(next);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, kit]);

  function send(c: RemoteCommand) { setCommand(c); setLog((l) => [c, ...l].slice(0, 8)); }
  function reset() { setRunning(false); loop.current.pose = startPose(kit); loop.current.travelled = 0; setFrame({ pose: startPose(kit), left: 0, right: 0, status: "Back at the start", readings: {} }); if (kit.arena === "remote") send("S"); }
  function arenaPoint(e: React.PointerEvent<SVGSVGElement>) { const m = e.currentTarget.getScreenCTM(); if (!m) return null; const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse()); return { x: Math.max(-88, Math.min(88, p.x)), z: Math.max(-88, Math.min(88, p.y)) }; }

  const { pose } = frame;
  const sensorX = kit.arena === "line" ? 3 : 4, sensorY = kit.arena === "line" ? 10 : 9;
  const sensorOn = (key: string) => (frame.readings[key] ?? "").startsWith("HIGH");

  return <div className="card rk-arena-card">
    <h3>3. Test it</h3>
    {!ready ? <p className="small muted">Finish steps 1 and 2 to switch the robot on.</p> : null}
    <div className="inline">
      <button type="button" className="btn btn-primary" disabled={!ready || running} onClick={() => setRunning(true)}>Start robot</button>
      <button type="button" className="btn" disabled={!running} onClick={() => setRunning(false)}>Stop robot</button>
      <button type="button" className="btn" onClick={reset}>Reset robot</button>
    </div>
    <div className="rk-arena-layout">
      <svg className="rk-arena" viewBox="-100 -100 200 200" role="img" aria-label={`${kit.title} test arena`} tabIndex={kit.arena === "remote" ? 0 : -1}
        onKeyDown={(e) => { if (kit.arena !== "remote" || !running) return; const map: Record<string, RemoteCommand> = { ArrowUp: "F", ArrowDown: "B", ArrowLeft: "L", ArrowRight: "R", " ": "S" }; const c = map[e.key]; if (c) { e.preventDefault(); send(c); } }}
        onPointerMove={(e) => { if (!draggingLight.current) return; const p = arenaPoint(e); if (p) setLight(p); }}
        onPointerUp={() => { draggingLight.current = false; }}>
        <rect x={-99} y={-99} width={198} height={198} fill={kit.arena === "line" ? "#f4f1ea" : "#edf2f7"} stroke="#64748b" />
        {kit.arena === "line" ? <ellipse cx={0} cy={0} rx={TRACK.rx} ry={TRACK.rz} fill="none" stroke="#111" strokeWidth={TRACK.halfWidth * 2} /> : null}
        {kit.arena === "light" ? <g style={{ cursor: "grab" }} onPointerDown={(e) => { draggingLight.current = true; e.currentTarget.ownerSVGElement?.setPointerCapture(e.pointerId); }}>
          <circle cx={light.x} cy={light.z} r={26} fill="#ffd54f" opacity={0.25} /><circle cx={light.x} cy={light.z} r={9} fill="#ffb300" stroke="#e65100" />
          <text x={light.x} y={light.z + 20} textAnchor="middle" fontSize={7} fill="#7a4b00">drag the lamp</text>
        </g> : null}
        <g transform={`translate(${pose.x} ${pose.z}) rotate(${(-pose.heading * 180) / Math.PI})`} data-robot-position={`${pose.x.toFixed(1)},${pose.z.toFixed(1)}`} className="rk-robot">
          <rect x={-8} y={-12} width={16} height={24} rx={3} fill="#1d4f91" stroke="#0e2a4f" />
          {[-10, 10].map((x) => <rect key={x} x={x - 2} y={-5} width={4} height={10} rx={1} fill="#26303a" />)}
          <path d="M-4 6 L0 11 L4 6" fill="#e8f0f8" />
          {kit.arena !== "remote" ? [1, -1].map((side) => <circle key={side} cx={side * sensorX} cy={sensorY} r={1.8} fill={kit.arena === "line" ? (sensorOn(side === 1 ? "Left sensor (D2)" : "Right sensor (D3)") ? "#ff3b30" : "#30d158") : "#ffd54f"} stroke="#111" strokeWidth={0.4} />) : <rect x={-4} y={4} width={8} height={4} fill="#00838f" />}
        </g>
      </svg>
      <div className="rk-telemetry" aria-live="polite">
        <p><strong>{running ? frame.status : ready ? "Ready: press Start robot" : "Not wired yet"}</strong></p>
        <dl>
          <div><dt>Left motor</dt><dd>{frame.left > 0 ? "forward" : frame.left < 0 ? "reverse" : "stopped"}</dd></div>
          <div><dt>Right motor</dt><dd>{frame.right > 0 ? "forward" : frame.right < 0 ? "reverse" : "stopped"}</dd></div>
          {Object.entries(frame.readings).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
          {kit.arena === "line" ? <div><dt>Laps</dt><dd>{frame.laps ?? 0}</dd></div> : null}
        </dl>
        {kit.arena === "remote" ? <div className="rk-remote" aria-label="Phone remote">
          <p className="small muted">Phone app: tap a button to send its letter over Bluetooth (or use the arrow keys on the arena).</p>
          <div className="rk-pad">
            <span /><button type="button" className="btn" disabled={!running} onClick={() => send("F")}>F ▲</button><span />
            <button type="button" className="btn" disabled={!running} onClick={() => send("L")}>◀ L</button><button type="button" className="btn" disabled={!running} onClick={() => send("S")}>S ■</button><button type="button" className="btn" disabled={!running} onClick={() => send("R")}>R ▶</button>
            <span /><button type="button" className="btn" disabled={!running} onClick={() => send("B")}>B ▼</button><span />
          </div>
          <p className="small">Received on D10: <code>{log.join(" ") || "nothing yet"}</code></p>
        </div> : null}
        {kit.arena === "light" ? <p className="small muted">Drag the lamp anywhere. The robot compares its two light readings and turns toward the brighter side.</p> : null}
        {kit.arena === "line" ? <p className="small muted">Red sensor dot = it sees the black line. Watch how the robot turns toward whichever sensor sees the line.</p> : null}
      </div>
    </div>
  </div>;
}
