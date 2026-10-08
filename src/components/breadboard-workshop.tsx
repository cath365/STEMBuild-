"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  addBoardWire, BOARD_STORAGE_KEY, breadboardHoleIds, canPlaceComponent,
  closestBreadboardHole, createBreadboard, demoBreadboard,
  evaluateBreadboard, holePositions, holes, parseBreadboard,
  type BoardComponent, type BreadboardDocument,
} from "@/lib/breadboard-workshop";
import { Breadboard3DPreview } from "@/components/breadboard-3d-preview";

type Tool = "wire" | "led" | "resistor";
type Part = "led" | "resistor";
type Drag = { part: Part; startX: number; startY: number; x: number; y: number };
const railColors: Record<string, string> = { P: "#db4343", N: "#2876bc" };
const wirePalette: Record<string, string> = { D8: "#e04838", GND: "#2b3a4d" };

function downloadText(content: string, name: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 100);
}

function pointInSvg(event: ReactPointerEvent<SVGSVGElement>) {
  const rect = event.currentTarget.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) / rect.width * 820,
    y: (event.clientY - rect.top) / rect.height * 496,
  };
}

function PartVisual({ part, name, lit, dragging, onStart }: {
  part: BoardComponent; name: Part; lit: boolean; dragging: Drag | null;
  onStart: (event: ReactPointerEvent<SVGGElement>, part: Part) => void;
}) {
  if (!part) return null;
  const a = holePositions.get(part.a)!;
  const b = holePositions.get(part.b)!;
  const cx = (a.x + b.x) / 2;
  const cy = (a.y + b.y) / 2;
  const angle = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
  const length = Math.hypot(b.x - a.x, b.y - a.y);
  const isLed = name === "led";
  const dx = dragging?.part === name ? dragging.x - dragging.startX : 0;
  const dy = dragging?.part === name ? dragging.y - dragging.startY : 0;
  return (
    <g transform={`translate(${dx} ${dy})`}>
      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#88939c" strokeWidth="5" strokeLinecap="round" />
      <g transform={`translate(${cx} ${cy}) rotate(${angle})`}
        onPointerDown={event => onStart(event, name)}
        className="bb-draggable"
        role="img" aria-label={isLed ? "Move placed LED by dragging" : "Move placed resistor by dragging"}>
        {isLed ? <>
          <circle r="15" stroke="#b41d2c" strokeWidth="3" fill={lit ? "#ff313e" : "#d63d49"} />
          <circle r="8" fill={lit ? "#fff1bf" : "#ff8e90"} opacity=".72" />
          {lit ? <circle r="22" fill="none" stroke="#f83d43" strokeWidth="6" opacity=".3" /> : null}
          <path d="M-17,-20 L-7,-20 L-12,-25 Z" fill="#a91d2c" />
        </> : <>
          <rect x="-25" y="-9" width="50" height="18" rx="6" fill="#e8d4ab" stroke="#a78d60" strokeWidth="2" />
          {[-13, -7, 0, 10].map((band,index) => <rect key={index} x={band} y="-9" width="4" height="18"
            fill={["#e37a23", "#e37a23", "#783b2b", "#d4a235"][index]} />)}
        </>}
        <rect x={-Math.max(length * .18, 23)} y="-20" width={Math.max(length * .36, 46)} height="40"
          fill="transparent" />
        <title>{isLed ? "LED: drag to move both leads to new holes" : "330 Ω resistor: drag to move both leads"}</title>
      </g>
      <text x={cx} y={cy + 34} textAnchor="middle" className="bb-part-name">{isLed ? "LED (+ → −)" : "330 Ω"}</text>
      <circle cx={a.x} cy={a.y} r="4" fill={isLed ? "#e43d48" : "#bb984d"} />
      <circle cx={b.x} cy={b.y} r="4" fill="#8c96a0" />
    </g>
  );
}

export function BreadboardWorkshop({ active = true }: { active?: boolean }) {
  const [doc, setDoc] = useState<BreadboardDocument>(createBreadboard);
  const [hydrated, setHydrated] = useState(false);
  const [storageReady, setStorageReady] = useState(true);
  const [tool, setTool] = useState<Tool>("wire");
  const [first, setFirst] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [lit, setLit] = useState(false);
  const [show3D, setShow3D] = useState(false);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [message, setMessage] = useState("Choose LED or resistor, tap two empty holes, then connect jumper wires.");
  const dragRef = useRef<Drag | null>(null);
  const result = useMemo(() => evaluateBreadboard(doc), [doc]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(BOARD_STORAGE_KEY);
      if (saved) {
        setDoc(parseBreadboard(JSON.parse(saved)));
        setMessage("Saved breadboard circuit and code restored from this browser.");
      }
    } catch {
      setStorageReady(false);
      setMessage("Saved breadboard work could not be restored. Autosave is paused to protect the previous data. Download a backup.");
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || !storageReady) return;
    try { window.localStorage.setItem(BOARD_STORAGE_KEY, JSON.stringify(doc)); }
    catch { setStorageReady(false); setMessage("Browser storage is unavailable. Download a project backup."); }
  }, [doc, hydrated, storageReady]);

  useEffect(() => {
    if (!running || !active || !result.ready) { setLit(false); return; }
    let on = true;
    let timeout: ReturnType<typeof setTimeout>;
    function tick() {
      setLit(on);
      timeout = setTimeout(() => { on = !on; tick(); }, on ? result.sketch.highDelayMs : result.sketch.lowDelayMs);
    }
    tick();
    return () => clearTimeout(timeout);
  }, [running, active, result]);

  useEffect(() => {
    if (!active) { setRunning(false); setShow3D(false); }
  }, [active]);

  function update(next: BreadboardDocument, text: string) {
    setDoc(next);
    setRunning(false);
    setFirst(null);
    setMessage(text);
  }

  function choose(next: Tool) {
    setTool(next);
    setFirst(null);
    setMessage(next === "wire" ? "Tap the first jumper terminal, then tap the destination. Use a free hole in each connected strip."
      : `Tap the first ${next === "led" ? "LED anode (+)" : "resistor lead"} hole, then the second hole.`);
  }

  function tapHole(id: string) {
    if (dragRef.current) return;
    if (!first) {
      if (tool !== "wire" && !breadboardHoleIds.has(id)) { setMessage("Components must sit inside breadboard holes, not Arduino pins."); return; }
      setFirst(id);
      setMessage(`${id} selected. Choose the second ${tool === "wire" ? "jumper terminal" : "component hole"}.`);
      return;
    }
    if (id === first) { setFirst(null); setMessage("Selection cancelled. Choose another hole."); return; }
    if (tool === "wire") {
      try {
        const next = addBoardWire(doc, first, id);
        update(next, `Jumper wire connected: ${first} → ${id}. The board's five-hole strips share electrical connections.`);
      } catch (error) {
        setFirst(null);
        setMessage(error instanceof Error ? error.message : "Could not connect this jumper.");
      }
      return;
    }
    const problem = canPlaceComponent(doc, tool, first, id);
    if (problem) { setFirst(null); setMessage(problem); return; }
    const which = tool === "led" ? "LED" : "330 Ω resistor";
    update({ ...doc, [tool]: { a: first, b: id } }, `${which} inserted into ${first} and ${id}. Drag its body to reposition both leads.`);
    setTool("wire");
  }

  function startDrag(event: ReactPointerEvent<SVGGElement>, part: Part) {
    if (!doc[part]) return;
    event.preventDefault();
    event.stopPropagation();
    const svg = event.currentTarget.ownerSVGElement;
    if (!svg) return;
    svg.setPointerCapture(event.pointerId);
    const rect = svg.getBoundingClientRect();
    const pointer = { x: (event.clientX - rect.left) / rect.width * 820, y: (event.clientY - rect.top) / rect.height * 496 };
    const next = { part, startX: pointer.x, startY: pointer.y, ...pointer };
    dragRef.current = next;
    setDrag(next);
    setFirst(null);
  }

  function finishDrag(event: ReactPointerEvent<SVGSVGElement>) {
    const moving = dragRef.current;
    if (!moving) return;
    const pointer = pointInSvg(event);
    dragRef.current = null;
    setDrag(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    const part = doc[moving.part];
    if (!part) return;
    const delta = { x: pointer.x - moving.startX, y: pointer.y - moving.startY };
    if (Math.hypot(delta.x, delta.y) < 7) return;
    const a = holePositions.get(part.a)!;
    const b = holePositions.get(part.b)!;
    const nextA = closestBreadboardHole(a.x + delta.x, a.y + delta.y);
    const nextB = closestBreadboardHole(b.x + delta.x, b.y + delta.y);
    if (!nextA || !nextB) { setMessage("Component returned to its old holes. Release both leads close to valid breadboard holes."); return; }
    const problem = canPlaceComponent(doc, moving.part, nextA, nextB);
    if (problem) { setMessage(problem); return; }
    update({ ...doc, [moving.part]: { a: nextA, b: nextB } }, `${moving.part === "led" ? "LED" : "Resistor"} moved to ${nextA} / ${nextB}.`);
  }

  function removePart(part: Part) {
    if (!doc[part]) return;
    update({ ...doc, [part]: null }, `${part === "led" ? "LED" : "Resistor"} removed. Its occupied holes are free again.`);
  }

  function clearProject() {
    if (!window.confirm("Clear this breadboard and its saved code? Download a backup first if needed.")) return;
    update(createBreadboard(), "New empty breadboard ready.");
    setTool("wire");
    setShow3D(false);
  }

  function saveNow() {
    try {
      window.localStorage.setItem(BOARD_STORAGE_KEY, JSON.stringify(doc));
      setStorageReady(true);
      setMessage("Breadboard saved on this computer. Open the same browser to continue.");
    } catch { setStorageReady(false); setMessage("Could not save to this browser. Download a backup."); }
  }

  async function importBackup(file: File) {
    try {
      if (file.size > 100_000) throw Error("Breadboard backup is too large.");
      const next = parseBreadboard(JSON.parse(await file.text()));
      setStorageReady(true);
      update(next, "Breadboard components, jumper wires and code imported. Changes will autosave.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to load breadboard backup."); }
  }

  function exportBackup() {
    downloadText(JSON.stringify(doc, null, 2), "stembuild-breadboard-project.json", "application/json");
    setMessage("Breadboard backup downloaded.");
  }

  const instructions = tool === "wire" ? "Connect a jumper" : tool === "led" ? "Insert LED" : "Insert resistor";
  return <section className="bb-shell" aria-label="Free-build interactive breadboard">
    <div className="bb-heading">
      <div><p className="eyebrow">FREE BUILD · HOLE-LEVEL CIRCUIT WORKSHOP</p>
        <h2>Build on a real breadboard layout.</h2>
        <p className="muted">Snap an LED and 330 Ω resistor into holes, connect actual Arduino terminals and test a wiring-aware blink circuit. Drag parts to move them. A 3D assembly preview is available on demand.</p>
      </div>
      <span className="bb-stage-badge">BREADBOARD LAB · BETA</span>
    </div>
    <div className="bb-layout">
      <div className="bb-main">
        <div className="bb-toolbar" role="group" aria-label="Breadboard building tools">
          <button type="button" className={tool === "led" ? "active" : ""} aria-pressed={tool === "led"} onClick={() => choose("led")}>＋ Place LED</button>
          <button type="button" className={tool === "resistor" ? "active" : ""} aria-pressed={tool === "resistor"} onClick={() => choose("resistor")}>＋ Place 330 Ω resistor</button>
          <button type="button" className={tool === "wire" ? "active" : ""} aria-pressed={tool === "wire"} onClick={() => choose("wire")}>〰 Connect jumper wire</button>
        </div>
        <div className="bb-status" role="status"><strong>{instructions}</strong> · {message}</div>
        <div className="bb-board-scroll" tabIndex={0} aria-label="Scroll to explore all breadboard holes">
          <svg viewBox="0 0 820 496" className="bb-board" role="group" aria-label="Breadboard with Arduino Uno and individually selectable holes"
            onPointerMove={event => {
              if (!dragRef.current) return;
              const next = { ...dragRef.current, ...pointInSvg(event) };
              dragRef.current = next;
              setDrag(next);
            }}
            onPointerUp={finishDrag}
            onPointerCancel={event => { dragRef.current = null; setDrag(null); if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}>
            <rect x="10" y="12" width="800" height="469" rx="19" fill="#e8eef2" />
            <rect x="176" y="27" width="526" height="425" rx="16" fill="#fafafa" stroke="#a5b1bd" strokeWidth="4" />
            <rect x="183" y="117" width="510" height="2" fill="#dae0e5" />
            <rect x="182" y="272" width="515" height="16" rx="6" fill="#dce2e6" />
            <line x1="192" y1="43" x2="677" y2="43" stroke="#d85854" strokeWidth="3" />
            <line x1="192" y1="112" x2="677" y2="112" stroke="#4381b7" strokeWidth="3" />
            <text x="180" y="64" className="bb-rail-label" fill="#c23535">+</text>
            <text x="180" y="95" className="bb-rail-label" fill="#2d69b2">−</text>
            {["A","B","C","D","E","F","G","H","I","J"].map(row => {
              const y = holes.find(hole => hole.id === `${row}1`)!.y;
              return <text key={row} x="182" y={y + 4} className="bb-row-label">{row}</text>;
            })}
            {Array.from({length:20},(_,index) => <text key={index} x={200+index*25} y="441" textAnchor="middle" className="bb-row-label">{index+1}</text>)}
            <rect x="29" y="154" width="115" height="192" rx="10" fill="#1d6b89" stroke="#124960" strokeWidth="4" />
            <rect x="46" y="174" width="79" height="47" rx="5" fill="#2c85a4" />
            <text x="84" y="191" textAnchor="middle" fill="#fff" fontWeight="800" fontSize="12">ARDUINO</text>
            <text x="84" y="207" textAnchor="middle" fill="#fff" fontWeight="800" fontSize="12">UNO</text>
            <rect x="43" y="310" width="50" height="20" rx="3" fill="#a1b2bd" />
            {doc.wires.map(wire => {
              const from = holePositions.get(wire.from)!;
              const to = holePositions.get(wire.to)!;
              const color = wirePalette[wire.from] ?? wirePalette[wire.to] ?? "#399e8a";
              const bow = Math.min(32, Math.abs(to.x-from.x)*.12 + 16);
              return <path key={wire.id} d={`M ${from.x} ${from.y} Q ${(from.x+to.x)/2} ${Math.min(from.y,to.y)-bow} ${to.x} ${to.y}`}
                fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" opacity=".9" pointerEvents="none" />;
            })}
            <PartVisual part={doc.resistor} name="resistor" lit={false} dragging={drag} onStart={startDrag} />
            <PartVisual part={doc.led} name="led" lit={running && lit && result.ready} dragging={drag} onStart={startDrag} />
            {holes.map(hole => {
              const isArduino = hole.id === "D8" || hole.id === "GND";
              const usedByPart = [doc.led?.a, doc.led?.b, doc.resistor?.a, doc.resistor?.b].includes(hole.id);
              const usedByWire = doc.wires.some(wire => wire.from === hole.id || wire.to === hole.id);
              const marked = first === hole.id;
              return <g key={hole.id}>
                <circle
                  cx={hole.x} cy={hole.y}
                  r={isArduino ? 9.5 : 7.5}
                  fill={marked ? "#f6ca45" : usedByPart ? "#f7c98a" : usedByWire ? "#94ddd4" : isArduino ? "#e1f4fa" : "#25384a"}
                  stroke={marked ? "#de8610" : isArduino ? "#0f4561" : "#b8c6cc"}
                  strokeWidth={marked ? 3 : 1.5}
                  role="button" tabIndex={0} aria-label={isArduino ? `Arduino ${hole.id}` : `Hole ${hole.id}`}
                  className="bb-hole"
                  onClick={() => tapHole(hole.id)}
                  onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); tapHole(hole.id); } }}
                />
                <title>{isArduino ? `Arduino ${hole.id}` : `Breadboard hole ${hole.id}`}</title>
                {isArduino ? <text x="110" y={hole.y+5} textAnchor="end" fontSize="12" fontWeight="800" fill="#fff" pointerEvents="none">{hole.id}</text> : null}
              </g>;
            })}
            <text x="440" y="469" textAnchor="middle" fill="#40566b" fontWeight="800" fontSize="11">A–E share columns · F–J share columns · each power rail is continuous</text>
          </svg>
        </div>
        <div className="bb-help-row"><span>● Empty hole</span><span>● Occupied by a component</span><span>● Jumper wire plugged in</span></div>
        <div className="bb-action-row">
          <button type="button" className="btn" onClick={() => { update(demoBreadboard(), "Example loaded: realistic resistor, LED and jumper wiring. Press Run blink preview."); setTool("wire"); }}>Load working example</button>
          <button type="button" className="btn" onClick={() => { setFirst(null); setMessage("Connection selection cancelled."); }} disabled={!first}>Cancel pin selection</button>
          <button type="button" className="btn" onClick={clearProject}>Start empty board</button>
        </div>
        <div className="bb-action-row">
          <button type="button" className="btn" onClick={() => setShow3D(true)} disabled={show3D}>View this assembly in 3D</button>
          <button type="button" className="btn" onClick={() => setShow3D(false)} disabled={!show3D}>Close 3D preview</button>
          <span className="small muted">3D is optional to save phone data and battery.</span>
        </div>
        {show3D ? <Breadboard3DPreview document={doc} ledOn={running && lit && result.ready} onClose={() => setShow3D(false)} /> : null}
      </div>
      <aside className="bb-sidebar">
        <div className="bb-card">
          <h3>1 · Components</h3>
          <p>{doc.led ? `LED: ${doc.led.a} (+) → ${doc.led.b} (−)` : "LED not placed"}</p>
          <p>{doc.resistor ? `330 Ω resistor: ${doc.resistor.a} ↔ ${doc.resistor.b}` : "Resistor not placed"}</p>
          <div className="bb-action-row">
            <button type="button" className="btn" disabled={!doc.led} onClick={() => removePart("led")}>Remove LED</button>
            <button type="button" className="btn" disabled={!doc.resistor} onClick={() => removePart("resistor")}>Remove resistor</button>
          </div>
          <p className="small muted">Drag the body of any placed component, then release it near free holes. Repositioning is also possible by choosing its Place tool.</p>
        </div>
        <div className="bb-card">
          <h3>2 · Jumper wires ({doc.wires.length})</h3>
          {doc.wires.length === 0 ? <p className="muted">Select Connect jumper wire, then tap two terminals.</p>
            : <ol className="bb-wire-list">{doc.wires.map(wire => <li key={wire.id}>
                <span>{wire.from} → {wire.to}</span>
                <button type="button" onClick={() => update({ ...doc, wires: doc.wires.filter(item => item.id !== wire.id) }, `Wire ${wire.from} → ${wire.to} removed.`)}>Remove</button>
              </li>)}</ol>}
          <p className="small muted">Each plugged wire and component lead uses one physical hole. Choose another hole in the same five-hole strip to share a connection.</p>
        </div>
        <div className="bb-card">
          <h3>3 · Program the Uno</h3>
          <label htmlFor="free-build-code">Arduino blink sketch</label>
          <textarea id="free-build-code" aria-label="Free build Arduino sketch" spellCheck={false} rows={10} value={doc.code}
            onChange={event => { const code = event.target.value.slice(0,50_000); update({ ...doc, code }, "Arduino code updated. Recheck the circuit before simulating."); }} />
          <div className="bb-action-row">
            <button type="button" className="btn" onClick={() => downloadText(doc.code, "stembuild-free-breadboard.ino", "text/plain")}>Download .ino</button>
            <button type="button" className="btn" onClick={async () => {
              try { await navigator.clipboard.writeText(doc.code); setMessage("Sketch copied to clipboard."); }
              catch { setMessage("Clipboard not available. Select the code manually or download the .ino."); }
            }}>Copy code</button>
          </div>
          <p className="small muted">Only the reviewed Arduino Uno D8 blink example and numeric delay changes run in this fast topology preview. Other code is downloadable but not executed here.</p>
        </div>
        <div className="bb-card">
          <h3>4 · Check and run</h3>
          <p role="status" className={result.ready ? "bb-feedback ready" : "bb-feedback"}>{result.message}</p>
          <div className="bb-run-row">
            <button type="button" className="btn btn-primary" onClick={() => { if (result.ready) { setRunning(true); setMessage("Wiring-aware LED blink preview started."); } }} disabled={!result.ready || running}>Run blink preview</button>
            <button type="button" className="btn" onClick={() => { setRunning(false); setMessage("Blink preview stopped."); }}>Stop preview</button>
          </div>
          <p className="bb-output"><span className={running && lit ? "bb-output-led on" : "bb-output-led"} /> {running ? lit ? "LED ON · D8 HIGH" : "LED OFF · D8 LOW" : "LED OFF · simulation stopped"}</p>
          <p className="small muted">This checks conductive paths and LED polarity, not electrical load, pin current, breadboard tolerances or arbitrary firmware. Inspect wiring and power before using real hardware.</p>
        </div>
        <div className="bb-card">
          <h3>Keep your work</h3>
          <p>{storageReady ? "Autosaved in this browser" : "Autosave unavailable — export a backup"}</p>
          <div className="bb-save-actions">
            <button className="btn" type="button" onClick={saveNow} disabled={!hydrated}>Save project</button>
            <button className="btn" type="button" onClick={exportBackup}>Download project backup</button>
            <label className="btn">Import project backup<input type="file" accept="application/json,.json" onChange={async event => { const file = event.target.files?.[0]; if (file) await importBackup(file); event.target.value = ""; }} /></label>
          </div>
          <p className="small muted">Work reopens after restarting in the same browser unless its data is cleared. Cloud sync comes later.</p>
        </div>
      </aside>
    </div>
  </section>;
}
