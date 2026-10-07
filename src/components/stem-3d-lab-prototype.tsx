"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { componentVisualFor } from "@/lib/component-visuals";
import {
  connectionForTerminals,
  lab3dProject,
  lab3dProjects,
  labReadiness,
  type Lab3DProject,
} from "@/lib/lab3d";

function partImage(slug: string) {
  return componentVisualFor(slug)?.src ?? null;
}

function storageKey(project: Lab3DProject) {
  return `stembuild-3d-lab-v02-${project.slug}`;
}

export function Stem3DLabPrototype() {
  const [projectSlug, setProjectSlug] = useState<Lab3DProject["slug"]>("led-blink");
  const project = useMemo(() => lab3dProject(projectSlug), [projectSlug]);

  const [placed, setPlaced] = useState<string[]>([]);
  const [connected, setConnected] = useState<string[]>([]);
  const [code, setCode] = useState(project.defaultSketch);
  const [running, setRunning] = useState(false);
  const [ledOn, setLedOn] = useState(false);
  const [buttonPressed, setButtonPressed] = useState(false);
  const [angle, setAngle] = useState(0);
  const [tilt, setTilt] = useState(48);
  const [exploded, setExploded] = useState(false);
  const [pendingTerminal, setPendingTerminal] = useState<string | null>(null);
  const [message, setMessage] = useState("Start by placing the real-world parts onto their matching snap zones.");
  const [hydrated, setHydrated] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);

  const readiness = useMemo(() => labReadiness(project, placed, connected, code), [project, placed, connected, code]);

  useEffect(() => {
    setHydrated(false);
    setRunning(false);
    setLedOn(false);
    setButtonPressed(false);
    setPendingTerminal(null);
    setPlaced([]);
    setConnected([]);
    setCode(project.defaultSketch);
    setMessage(`Loaded ${project.shortTitle}. Assemble the parts first.`);

    try {
      const saved = JSON.parse(window.localStorage.getItem(storageKey(project)) ?? "null") as null | {
        placed?: string[];
        connected?: string[];
        code?: string;
      };
      if (saved) {
        if (Array.isArray(saved.placed)) setPlaced(saved.placed.filter((id) => project.parts.some((part) => part.id === id)));
        if (Array.isArray(saved.connected)) setConnected(saved.connected.filter((id) => project.connections.some((wire) => wire.id === id)));
        if (typeof saved.code === "string" && saved.code.trim()) setCode(saved.code);
        setMessage("Saved work restored on this device.");
      }
    } catch {}
    setHydrated(true);
  }, [project]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(storageKey(project), JSON.stringify({ placed, connected, code }));
    } catch {}
  }, [hydrated, project, placed, connected, code]);

  useEffect(() => {
    if (!running || !readiness.ready) {
      setLedOn(false);
      return;
    }

    if (project.inputMode === "button") {
      setLedOn(buttonPressed);
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
  }, [
    running,
    readiness.ready,
    readiness.sketch.highDelayMs,
    readiness.sketch.lowDelayMs,
    project.inputMode,
    buttonPressed,
  ]);

  function placePart(id: string) {
    setPlaced((current) => current.includes(id) ? current : [...current, id]);
    const part = project.parts.find((item) => item.id === id);
    if (part) setMessage(`${part.label} snapped into position.`);
  }

  function removePart(id: string) {
    const terminalIds = new Set(project.terminals.filter((terminal) => terminal.partId === id).map((terminal) => terminal.id));
    setPlaced((current) => current.filter((item) => item !== id));
    setConnected((current) => current.filter((connectionId) => {
      const wire = project.connections.find((item) => item.id === connectionId);
      return wire ? !terminalIds.has(wire.fromTerminal) && !terminalIds.has(wire.toTerminal) : false;
    }));
    setRunning(false);
    setPendingTerminal(null);
    setMessage("Part removed. Any wires attached to it were removed too.");
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>, expectedId: string) {
    event.preventDefault();
    const id = event.dataTransfer.getData("text/plain");
    if (id !== expectedId) {
      const expected = project.parts.find((part) => part.id === expectedId)?.label;
      setMessage(`That part does not fit this snap zone. This position is for ${expected}.`);
      return;
    }
    placePart(id);
  }

  function connect(id: string) {
    if (placed.length !== project.parts.length) {
      setMessage("Place all required parts before wiring them.");
      return;
    }
    setConnected((current) => current.includes(id) ? current : [...current, id]);
    const wire = project.connections.find((item) => item.id === id);
    if (wire) setMessage(`Connected ${wire.from} → ${wire.to}.`);
  }

  function tapTerminal(id: string) {
    const terminal = project.terminals.find((item) => item.id === id);
    if (!terminal || !placed.includes(terminal.partId)) return;

    if (!pendingTerminal) {
      setPendingTerminal(id);
      setMessage(`${terminal.label} selected. Tap the destination terminal.`);
      return;
    }

    if (pendingTerminal === id) {
      setPendingTerminal(null);
      setMessage("Wire selection cancelled.");
      return;
    }

    const wire = connectionForTerminals(project, pendingTerminal, id);
    if (!wire) {
      const first = project.terminals.find((item) => item.id === pendingTerminal)?.label ?? pendingTerminal;
      setPendingTerminal(null);
      setMessage(`${first} cannot connect to ${terminal.label} in this project. Try the reviewed wiring path.`);
      return;
    }

    connect(wire.id);
    setPendingTerminal(null);
  }

  function undoWire() {
    setConnected((current) => {
      if (!current.length) return current;
      const last = current[current.length - 1];
      const wire = project.connections.find((item) => item.id === last);
      if (wire) setMessage(`Removed ${wire.from} → ${wire.to}.`);
      return current.slice(0, -1);
    });
    setRunning(false);
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
    setMessage(project.inputMode === "button"
      ? "Simulation running. Press and hold the virtual button to test the input."
      : "Simulation running. The virtual LED is following the Arduino-style sketch.");
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
    anchor.download = project.downloadName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setMessage(`Downloaded ${project.downloadName}.`);
  }

  function reset() {
    setRunning(false);
    setPlaced([]);
    setConnected([]);
    setCode(project.defaultSketch);
    setExploded(false);
    setButtonPressed(false);
    setPendingTerminal(null);
    try { window.localStorage.removeItem(storageKey(project)); } catch {}
    setMessage("Workbench reset. Build it again from the parts tray.");
  }

  function autoAssemble() {
    setPlaced(project.parts.map((part) => part.id));
    setMessage("Demo assembly complete. Now wire the circuit by tapping terminals or using the reviewed connection list.");
  }

  async function openFullscreen() {
    try {
      if (stageRef.current?.requestFullscreen) {
        await stageRef.current.requestFullscreen();
      } else {
        setMessage("Fullscreen is not supported by this browser.");
      }
    } catch {
      setMessage("Your browser did not allow fullscreen mode.");
    }
  }

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior:"smooth", block:"start" });
  }

  const progress = Math.round(((placed.length + connected.length + (readiness.sketch.ok ? 1 : 0)) / (project.parts.length + project.connections.length + 1)) * 100);

  return <div className="lab3d-shell">
    <div className="lab3d-project-switcher">
      <div>
        <div className="eyebrow">CHOOSE A 3D PROJECT</div>
        <h2>{project.title}</h2>
        <p className="small muted">{project.description}</p>
      </div>
      <div className="lab3d-project-buttons">
        {lab3dProjects.map((item) => <button
          key={item.slug}
          type="button"
          className={item.slug === project.slug ? "btn btn-primary" : "btn"}
          onClick={() => setProjectSlug(item.slug)}
        >{item.shortTitle}</button>)}
      </div>
    </div>

    <nav className="lab3d-mobile-steps" aria-label="3D Lab steps">
      <button type="button" onClick={()=>scrollTo("lab-assemble")}>1 Assemble</button>
      <button type="button" onClick={()=>scrollTo("lab-wire")}>2 Wire</button>
      <button type="button" onClick={()=>scrollTo("lab-code")}>3 Program</button>
      <button type="button" onClick={()=>scrollTo("lab-run")}>4 Run</button>
    </nav>

    <section className="lab3d-statusbar">
      <div><span className="lab3d-live-dot" /> Interactive lab v0.2</div>
      <div className="lab3d-progress"><span style={{width:`${progress}%`}} /></div>
      <div>{progress}% ready · saved locally</div>
    </section>

    <div className="lab3d-grid">
      <aside id="lab-assemble" className="lab3d-panel lab3d-parts-panel">
        <div className="eyebrow">1 · ASSEMBLE</div>
        <h2>Parts tray</h2>
        <p className="small muted">Drag on desktop or tap Place on a phone. Parts snap only into their correct zones.</p>

        <div className="lab3d-parts-list">
          {project.parts.map((part) => {
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
              <button type="button" className="lab3d-mini-btn" onClick={() => isPlaced ? removePart(part.id) : placePart(part.id)}>
                {isPlaced ? "Remove" : "Place"}
              </button>
            </div>;
          })}
        </div>

        <div className="lab3d-panel-actions">
          <button type="button" className="btn" onClick={autoAssemble}>Auto assemble demo</button>
          <button type="button" className="btn" onClick={reset}>Reset project</button>
        </div>
      </aside>

      <section className="lab3d-workbench-column">
        <div className="lab3d-toolbar">
          <div>
            <strong>3D workbench</strong>
            <span>Tap labelled terminals to make a real project connection</span>
          </div>
          <div className="lab3d-view-controls">
            <label>Rotate <input type="range" min="-28" max="28" value={angle} onChange={(event)=>setAngle(Number(event.target.value))}/></label>
            <label>Tilt <input type="range" min="24" max="62" value={tilt} onChange={(event)=>setTilt(Number(event.target.value))}/></label>
            <button type="button" className={exploded ? "lab3d-mini-btn active" : "lab3d-mini-btn"} onClick={()=>setExploded((value)=>!value)}>Exploded</button>
            <button type="button" className="lab3d-mini-btn" onClick={openFullscreen}>Fullscreen</button>
          </div>
        </div>

        <div className="lab3d-stage-wrap" ref={stageRef}>
          <div
            className={exploded ? "lab3d-plane exploded" : "lab3d-plane"}
            style={{transform:`perspective(1000px) rotateX(${tilt}deg) rotateZ(${angle}deg)`}}
          >
            <div className="lab3d-grid-lines" aria-hidden="true" />
            <div className="lab3d-table-label">STEMBuild Workbench · {project.shortTitle}</div>

            {project.parts.map((part, index) => {
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
                  ["--explode-x" as string]: `${(index - (project.parts.length - 1) / 2) * 16}px`,
                  ["--explode-y" as string]: `${index % 2 === 0 ? -20 : 20}px`,
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

            {project.terminals.map((terminal) => placed.includes(terminal.partId) ? <button
              key={terminal.id}
              type="button"
              className={pendingTerminal === terminal.id ? "lab3d-terminal selected" : "lab3d-terminal"}
              style={{left:`${terminal.left}%`,top:`${terminal.top}%`}}
              onClick={()=>tapTerminal(terminal.id)}
              aria-label={`Connect ${terminal.label}`}
            >{terminal.label}</button> : null)}

            <svg className="lab3d-wires" viewBox="0 0 1000 620" preserveAspectRatio="none" aria-hidden="true">
              {project.connections.filter((wire)=>connected.includes(wire.id)).map((wire)=>
                <path key={wire.id} d={wire.path} className={`wire ${wire.wireClass}`}/>
              )}
            </svg>
          </div>
          <div className="lab3d-stage-help">Tap one terminal, then its destination. Use Fullscreen on a phone for a larger workbench.</div>
        </div>

        <div className="lab3d-message" role="status">{message}</div>

        <div id="lab-wire" className="lab3d-wire-panel">
          <div className="lab3d-wire-header">
            <div><div className="eyebrow">2 · WIRE</div><strong>Reviewed connections</strong></div>
            <button type="button" className="lab3d-mini-btn" onClick={undoWire} disabled={!connected.length}>Undo last wire</button>
          </div>
          <div className="lab3d-wire-list">
            {project.connections.map((wire, index) => {
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

      <aside id="lab-code" className="lab3d-panel lab3d-code-panel">
        <div className="eyebrow">3 · PROGRAM</div>
        <h2>Arduino sketch</h2>
        <p className="small muted">Edit normal Arduino-style source. Your saved/exported .ino remains exactly this text.</p>

        <textarea className="lab3d-code-editor" value={code} onChange={(event)=>{setCode(event.target.value);setRunning(false);}} spellCheck={false} aria-label="Arduino sketch editor"/>

        <div className="lab3d-code-checks">
          <div className={readiness.sketch.ok ? "lab3d-check ok" : "lab3d-check"}><span>{readiness.sketch.ok ? "✓" : "!"}</span><div><strong>Code mapping</strong><small>{readiness.sketch.ok ? "Code matches the reviewed pin map" : readiness.sketch.messages[0]}</small></div></div>
          <div className={readiness.missingConnections.length === 0 ? "lab3d-check ok" : "lab3d-check"}><span>{readiness.missingConnections.length === 0 ? "✓" : "!"}</span><div><strong>Wiring</strong><small>{readiness.missingConnections.length === 0 ? "All required paths connected" : `${readiness.missingConnections.length} connection(s) missing`}</small></div></div>
          <div className={placed.length === project.parts.length ? "lab3d-check ok" : "lab3d-check"}><span>{placed.length === project.parts.length ? "✓" : "!"}</span><div><strong>Assembly</strong><small>{placed.length}/{project.parts.length} parts placed</small></div></div>
        </div>

        <div id="lab-run" className="lab3d-run-section">
          <div className="eyebrow">4 · RUN</div>
          <div className="lab3d-run-controls">
            <button type="button" className="btn btn-primary" onClick={runSimulation}>{running ? "Running…" : "▶ Run simulation"}</button>
            <button type="button" className="btn" onClick={()=>setRunning(false)}>■ Stop</button>
          </div>

          {project.inputMode === "button" ? <button
            type="button"
            className={buttonPressed ? "lab3d-virtual-button pressed" : "lab3d-virtual-button"}
            disabled={!running || !readiness.ready}
            onPointerDown={()=>setButtonPressed(true)}
            onPointerUp={()=>setButtonPressed(false)}
            onPointerCancel={()=>setButtonPressed(false)}
            onPointerLeave={()=>setButtonPressed(false)}
          ><span>{buttonPressed ? "Button pressed" : "Press and hold virtual button"}</span><small>D2 reads {buttonPressed ? "LOW" : "HIGH"}</small></button> : null}

          <div className={running && readiness.ready ? "lab3d-sim-card running" : "lab3d-sim-card"}>
            <div><span className={ledOn ? "sim-led on" : "sim-led"} /><strong>Virtual LED</strong></div>
            <span>{running && readiness.ready ? (ledOn ? "D8 HIGH" : "D8 LOW") : "Stopped"}</span>
          </div>

          {running && readiness.ready ? <div className="lab3d-success">
            <strong>Simulation running successfully ✓</strong>
            <span>{project.inputMode === "button" ? "The virtual input and output are responding to the mapped Arduino code." : "The LED state is responding to the mapped Arduino code and timing."}</span>
          </div> : null}
        </div>

        <div className="lab3d-export">
          <div className="eyebrow">TAKE IT TO THE REAL WORLD</div>
          <p className="small">Use the same source on the physical Arduino Uno with the same reviewed wiring.</p>
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
        <h2>What v0.2 proves</h2>
      </div>
      <div className="lab3d-parity-grid">
        <div><strong>✓ More than one project</strong><span>LED Blink and Push-Button Light share the same lab engine.</span></div>
        <div><strong>✓ Direct wiring interaction</strong><span>Learners can tap virtual terminals instead of only pressing a Connect button.</span></div>
        <div><strong>✓ Save & resume</strong><span>Assembly, wiring and code are stored locally on the learner's device.</span></div>
        <div className="prototype"><strong>Next: true firmware + CAD</strong><span>The next engine layer is real AVR compilation/emulation and verified GLB/CAD parts.</span></div>
      </div>
    </section>
  </div>;
}
