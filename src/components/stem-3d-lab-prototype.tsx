"use client";

import { useEffect, useMemo, useState } from "react";
import { componentVisualFor } from "@/lib/component-visuals";
import { defaultLedSketch, labReadiness, ledLabConnections, ledLabParts } from "@/lib/lab3d";

function partImage(slug: string) {
  return componentVisualFor(slug)?.src ?? null;
}

export function Stem3DLabPrototype() {
  const [placed, setPlaced] = useState<string[]>([]);
  const [connected, setConnected] = useState<string[]>([]);
  const [code, setCode] = useState(defaultLedSketch);
  const [running, setRunning] = useState(false);
  const [ledOn, setLedOn] = useState(false);
  const [angle, setAngle] = useState(0);
  const [tilt, setTilt] = useState(48);
  const [exploded, setExploded] = useState(false);
  const [message, setMessage] = useState("Start by placing the four real-world parts onto their matching snap zones.");

  const readiness = useMemo(() => labReadiness(placed, connected, code), [placed, connected, code]);

  useEffect(() => {
    if (!running || !readiness.ready) {
      setLedOn(false);
      return;
    }

    let timer: ReturnType<typeof setTimeout>;
    let cancelled = false;

    const low = () => {
      if (cancelled) return;
      setLedOn(false);
      timer = setTimeout(high, readiness.sketch.lowDelayMs);
    };
    const high = () => {
      if (cancelled) return;
      setLedOn(true);
      timer = setTimeout(low, readiness.sketch.highDelayMs);
    };

    high();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [running, readiness.ready, readiness.sketch.highDelayMs, readiness.sketch.lowDelayMs]);

  function placePart(id: string) {
    setPlaced((current) => current.includes(id) ? current : [...current, id]);
    const part = ledLabParts.find((item) => item.id === id);
    if (part) setMessage(`${part.label} snapped into position.`);
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>, expectedId: string) {
    event.preventDefault();
    const id = event.dataTransfer.getData("text/plain");
    if (id !== expectedId) {
      const expected = ledLabParts.find((part) => part.id === expectedId)?.label;
      setMessage(`That part does not fit this snap zone. This position is for ${expected}.`);
      return;
    }
    placePart(id);
  }

  function connect(id: string) {
    if (placed.length !== ledLabParts.length) {
      setMessage("Place all four parts before wiring them.");
      return;
    }
    setConnected((current) => current.includes(id) ? current : [...current, id]);
    const wire = ledLabConnections.find((item) => item.id === id);
    if (wire) setMessage(`Connected ${wire.from} → ${wire.to}.`);
  }

  function runSimulation() {
    if (!readiness.ready) {
      setRunning(false);
      const firstProblem =
        readiness.missingParts[0] ? `Missing part: ${readiness.missingParts[0]}` :
        readiness.missingConnections[0] ? `Missing wire: ${readiness.missingConnections[0]}` :
        readiness.sketch.messages[0] ?? "The project is not ready.";
      setMessage(firstProblem);
      return;
    }
    setRunning(true);
    setMessage("Simulation running. The virtual LED is following the Arduino-style sketch.");
  }

  async function copyCode() {
    await navigator.clipboard.writeText(code);
    setMessage("Arduino sketch copied. The exported source is the same text shown in the editor.");
  }

  function downloadSketch() {
    const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "stembuild-led-lab.ino";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setMessage("Downloaded stembuild-led-lab.ino.");
  }

  function reset() {
    setRunning(false);
    setPlaced([]);
    setConnected([]);
    setCode(defaultLedSketch);
    setExploded(false);
    setMessage("Workbench reset. Build it again from the parts tray.");
  }

  function autoAssemble() {
    setPlaced(ledLabParts.map((part) => part.id));
    setMessage("Demo assembly complete. Now connect the three electrical paths.");
  }

  const progress = Math.round(((placed.length + connected.length + (readiness.sketch.ok ? 1 : 0)) / (ledLabParts.length + ledLabConnections.length + 1)) * 100);

  return <div className="lab3d-shell">
    <section className="lab3d-statusbar">
      <div><span className="lab3d-live-dot" /> Interactive prototype</div>
      <div className="lab3d-progress"><span style={{width:`${progress}%`}} /></div>
      <div>{progress}% ready</div>
    </section>

    <div className="lab3d-grid">
      <aside className="lab3d-panel lab3d-parts-panel">
        <div className="eyebrow">1 · ASSEMBLE</div>
        <h2>Parts tray</h2>
        <p className="small muted">Drag each real component reference onto the matching snap zone.</p>

        <div className="lab3d-parts-list">
          {ledLabParts.map((part) => {
            const visual = partImage(part.componentSlug);
            const isPlaced = placed.includes(part.id);
            return <div
              key={part.id}
              className={isPlaced ? "lab3d-part-card placed" : "lab3d-part-card"}
              draggable={!isPlaced}
              onDragStart={(event) => event.dataTransfer.setData("text/plain", part.id)}
            >
              <div className="lab3d-part-thumb">
                {visual ? <img src={visual} alt="" draggable={false}/> : <span>3D</span>}
              </div>
              <div>
                <strong>{part.label}</strong>
                <small>{part.hint}</small>
              </div>
              <button type="button" className="lab3d-mini-btn" disabled={isPlaced} onClick={() => placePart(part.id)}>
                {isPlaced ? "Placed ✓" : "Place"}
              </button>
            </div>;
          })}
        </div>

        <div className="lab3d-panel-actions">
          <button type="button" className="btn" onClick={autoAssemble}>Auto assemble demo</button>
          <button type="button" className="btn" onClick={reset}>Reset</button>
        </div>
      </aside>

      <section className="lab3d-workbench-column">
        <div className="lab3d-toolbar">
          <div>
            <strong>3D workbench</strong>
            <span>Prototype geometry + verified component textures</span>
          </div>
          <div className="lab3d-view-controls">
            <label>Rotate <input type="range" min="-28" max="28" value={angle} onChange={(event)=>setAngle(Number(event.target.value))}/></label>
            <label>Tilt <input type="range" min="24" max="62" value={tilt} onChange={(event)=>setTilt(Number(event.target.value))}/></label>
            <button type="button" className={exploded ? "lab3d-mini-btn active" : "lab3d-mini-btn"} onClick={()=>setExploded((value)=>!value)}>Exploded view</button>
          </div>
        </div>

        <div className="lab3d-stage-wrap">
          <div
            className={exploded ? "lab3d-plane exploded" : "lab3d-plane"}
            style={{transform:`perspective(1000px) rotateX(${tilt}deg) rotateZ(${angle}deg)`}}
          >
            <div className="lab3d-grid-lines" aria-hidden="true" />
            <div className="lab3d-table-label">STEMBuild Workbench · Arduino Uno LED</div>

            {ledLabParts.map((part, index) => {
              const isPlaced = placed.includes(part.id);
              const visual = partImage(part.componentSlug);
              return <div
                key={part.id}
                className={isPlaced ? `lab3d-snap-zone filled part-${part.id}` : "lab3d-snap-zone"}
                style={{
                  left:`${part.target.left}%`,
                  top:`${part.target.top}%`,
                  width:`${part.target.width}%`,
                  height:`${part.target.height}%`,
                  ["--explode-x" as string]: `${(index - 1.5) * 18}px`,
                  ["--explode-y" as string]: `${index % 2 === 0 ? -22 : 22}px`,
                }}
                onDragOver={(event)=>event.preventDefault()}
                onDrop={(event)=>handleDrop(event, part.id)}
              >
                {!isPlaced ? <><span className="lab3d-snap-plus">+</span><small>{part.label}</small></> :
                  <>
                    {visual ? <img src={visual} alt={part.label} draggable={false}/> : <div className="lab3d-model-placeholder">{part.label}</div>}
                    <span className="lab3d-part-tag">{part.label}</span>
                    {part.id === "led" ? <span className={ledOn ? "lab3d-led-glow on" : "lab3d-led-glow"} aria-label={ledOn ? "LED on" : "LED off"} /> : null}
                  </>}
              </div>;
            })}

            <svg className="lab3d-wires" viewBox="0 0 1000 620" preserveAspectRatio="none" aria-hidden="true">
              {connected.includes("d8-resistor") ? <path d="M 335 250 C 430 250, 480 335, 610 345" className="wire wire-blue"/> : null}
              {connected.includes("resistor-led") ? <path d="M 665 345 C 710 345, 745 305, 790 300" className="wire wire-red"/> : null}
              {connected.includes("led-ground") ? <path d="M 820 350 C 730 455, 465 470, 335 390" className="wire wire-black"/> : null}
            </svg>
          </div>
          <div className="lab3d-stage-help">Drag parts into the dashed zones. Use Rotate/Tilt to inspect the assembled circuit.</div>
        </div>

        <div className="lab3d-message" role="status">{message}</div>

        <div className="lab3d-wire-panel">
          <div className="eyebrow">2 · WIRE</div>
          <div className="lab3d-wire-list">
            {ledLabConnections.map((wire, index) => {
              const done = connected.includes(wire.id);
              return <div key={wire.id} className={done ? "lab3d-wire-row done" : "lab3d-wire-row"}>
                <span className="lab3d-wire-number">{index+1}</span>
                <div><strong>{wire.from} → {wire.to}</strong><small>{wire.purpose}</small></div>
                <button type="button" className="lab3d-mini-btn" onClick={()=>connect(wire.id)} disabled={done}>{done ? "Connected ✓" : "Connect"}</button>
              </div>;
            })}
          </div>
        </div>
      </section>

      <aside className="lab3d-panel lab3d-code-panel">
        <div className="eyebrow">3 · PROGRAM & RUN</div>
        <h2>Arduino sketch</h2>
        <p className="small muted">Edit normal Arduino-style source. This proof-of-concept interprets the LED behavior; the exported .ino stays unchanged.</p>

        <textarea className="lab3d-code-editor" value={code} onChange={(event)=>{setCode(event.target.value);setRunning(false);}} spellCheck={false} aria-label="Arduino sketch editor"/>

        <div className="lab3d-code-checks">
          <div className={readiness.sketch.ok ? "lab3d-check ok" : "lab3d-check"}><span>{readiness.sketch.ok ? "✓" : "!"}</span><div><strong>Code mapping</strong><small>{readiness.sketch.ok ? "D8 + OUTPUT + HIGH/LOW recognised" : readiness.sketch.messages[0]}</small></div></div>
          <div className={readiness.missingConnections.length === 0 ? "lab3d-check ok" : "lab3d-check"}><span>{readiness.missingConnections.length === 0 ? "✓" : "!"}</span><div><strong>Wiring</strong><small>{readiness.missingConnections.length === 0 ? "All required paths connected" : `${readiness.missingConnections.length} connection(s) missing`}</small></div></div>
          <div className={placed.length === ledLabParts.length ? "lab3d-check ok" : "lab3d-check"}><span>{placed.length === ledLabParts.length ? "✓" : "!"}</span><div><strong>Assembly</strong><small>{placed.length}/{ledLabParts.length} parts placed</small></div></div>
        </div>

        <div className="lab3d-run-controls">
          <button type="button" className="btn btn-primary" onClick={runSimulation}>{running ? "Running…" : "▶ Run simulation"}</button>
          <button type="button" className="btn" onClick={()=>setRunning(false)}>■ Stop</button>
        </div>

        <div className={running && readiness.ready ? "lab3d-sim-card running" : "lab3d-sim-card"}>
          <div><span className={ledOn ? "sim-led on" : "sim-led"} /><strong>Virtual LED</strong></div>
          <span>{running && readiness.ready ? (ledOn ? "D8 HIGH" : "D8 LOW") : "Stopped"}</span>
        </div>

        <div className="lab3d-export">
          <div className="eyebrow">TAKE IT TO THE REAL WORLD</div>
          <p className="small">Use the same source on the physical Arduino Uno with the same D8 wiring.</p>
          <div className="inline">
            <button type="button" className="btn" onClick={copyCode}>Copy code</button>
            <button type="button" className="btn" onClick={downloadSketch}>Download .ino</button>
          </div>
        </div>
      </aside>
    </div>

    <section className="lab3d-parity">
      <div>
        <div className="eyebrow">SIMULATION-TO-HARDWARE PARITY</div>
        <h2>What this prototype proves</h2>
      </div>
      <div className="lab3d-parity-grid">
        <div><strong>✓ Same parts</strong><span>Real component references are attached to the virtual project definition.</span></div>
        <div><strong>✓ Same wiring</strong><span>D8 → resistor → LED → GND is validated before Run.</span></div>
        <div><strong>✓ Same source</strong><span>The .ino export is exactly the text edited in the browser.</span></div>
        <div className="prototype"><strong>Next: real firmware engine</strong><span>This POC uses a narrow educational interpreter. AVR compilation/emulation is the next engine layer.</span></div>
      </div>
    </section>
  </div>;
}
