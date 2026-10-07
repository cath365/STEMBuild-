"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { compileUnoFirmware, startUnoFirmwareSimulation, type AVRSimulation } from "@/lib/avr-browser-engine";
import { Stem3DWebGLWorkbench } from "@/components/stem-3d-webgl-workbench";
import {
  connectionForTerminals,
  lab3dProject,
  lab3dProjects,
  labReadiness,
  parseLabProjectBackup,
  supportsFastSketch,
  type Lab3DProject,
} from "@/lib/lab3d";

function partImage(slug: string) {
  return ["arduino-uno", "breadboard", "resistor-330", "led", "push-button"].includes(slug)
    ? `/circuit-models/${slug}.svg`
    : null;
}

function storageKey(project: Lab3DProject) {
  return `stembuild-3d-lab-v03-${project.slug}`;
}

type EngineMode = "fast" | "firmware";

export function Stem3DLabPrototype({ active = true }: { active?: boolean }) {
  const [projectSlug, setProjectSlug] = useState<Lab3DProject["slug"]>("led-blink");
  useEffect(() => {
    try {
      const previous = localStorage.getItem("stembuild-3d-lab-last-project-v1");
      if (previous === "led-blink" || previous === "button-light") setProjectSlug(previous);
    } catch { /* A blocked storage provider leaves the default sample usable. */ }
  }, []);
  function chooseProject(slug: Lab3DProject["slug"]) {
    setProjectSlug(slug);
    try { localStorage.setItem("stembuild-3d-lab-last-project-v1",slug); } catch {}
  }
  // A separate session per project prevents cross-project saves and stale runs.
  return <LabProjectSession key={projectSlug} projectSlug={projectSlug} onProjectChange={chooseProject} active={active} />;
}

function LabProjectSession({projectSlug,onProjectChange,active}: {projectSlug:Lab3DProject["slug"];onProjectChange:(slug:Lab3DProject["slug"])=>void;active:boolean}) {
  const project = useMemo(() => lab3dProject(projectSlug), [projectSlug]);

  const [placed, setPlaced] = useState<string[]>([]);
  const [connected, setConnected] = useState<string[]>([]);
  const [code, setCode] = useState(project.defaultSketch);
  const [running, setRunning] = useState(false);
  const [ledOn, setLedOn] = useState(false);
  const [buttonPressed, setButtonPressed] = useState(false);
  const [pendingTerminal, setPendingTerminal] = useState<string | null>(null);
  const [message, setMessage] = useState("Start by placing the real-world parts onto their matching snap zones.");
  const [hydratedProject, setHydratedProject] = useState<string | null>(null);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [engineMode, setEngineMode] = useState<EngineMode>("fast");
  const [webglEnabled, setWebglEnabled] = useState(false);
  const [firmwareStatus, setFirmwareStatus] = useState<"idle"|"compiling"|"starting"|"running"|"error">("idle");
  const [firmwareError, setFirmwareError] = useState("");
  const [firmwareMeta, setFirmwareMeta] = useState<{flashBytes:number;compileMs:number}|null>(null);
  const avrRef = useRef<AVRSimulation | null>(null);
  const runVersion = useRef(0);

  const readiness = useMemo(() => labReadiness(project, placed, connected, code), [project, placed, connected, code]);

  function stopSimulation(nextMessage?: string) {
    runVersion.current += 1;
    avrRef.current?.stop();
    avrRef.current = null;
    setRunning(false);
    setLedOn(false);
    setFirmwareStatus("idle");
    if (nextMessage) setMessage(nextMessage);
  }

  // A hidden workspace must not keep WebGL or AVR execution running in the background.
  // Part placement, wiring and edited code remain mounted and unchanged.
  useEffect(() => {
    if (active) return;
    runVersion.current += 1;
    avrRef.current?.stop();
    avrRef.current = null;
    setRunning(false);
    setLedOn(false);
    setFirmwareStatus("idle");
    setWebglEnabled(false);
  }, [active]);

  useEffect(() => {
    let cancelled = false;
    // Hydrate after the server-compatible first render, then enable saving.
    Promise.resolve().then(() => {
      if (cancelled) return;
      try {
        const saved = JSON.parse(window.localStorage.getItem(storageKey(project)) ?? "null") as null | {placed?:string[];connected?:string[];code?:string};
        if (saved) {
          const parts = Array.isArray(saved.placed) ? [...new Set(saved.placed.filter(id=>project.parts.some(p=>p.id===id)))] : [];
          const terminalIds = new Set(project.terminals.filter(t=>parts.includes(t.partId)).map(t=>t.id));
          const wires = Array.isArray(saved.connected) ? [...new Set(saved.connected.filter(id=>project.connections.some(w=>w.id===id && terminalIds.has(w.fromTerminal) && terminalIds.has(w.toTerminal))))] : [];
          setPlaced(parts);
          setConnected(wires);
          if (typeof saved.code === "string" && saved.code.trim()) setCode(saved.code);
          setMessage("Saved work restored on this device.");
        }
      } catch { setStorageAvailable(false); }
      setHydratedProject(project.slug);
    });
    return () => {
      cancelled = true;
      runVersion.current += 1;
      avrRef.current?.stop();
      avrRef.current = null;
    };
  }, [project]);

  useEffect(() => {
    if (hydratedProject !== project.slug) return;
    try {
      window.localStorage.setItem(storageKey(project), JSON.stringify({ placed, connected, code }));
    } catch { queueMicrotask(()=>setStorageAvailable(false)); }
  }, [hydratedProject, project, placed, connected, code]);

  useEffect(() => {
    if (engineMode !== "fast" || !running || !readiness.ready) return;
    if (project.inputMode === "button") return;

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
    return () => { cancelled = true; clearTimeout(timer); };
  }, [engineMode, running, readiness.ready, readiness.sketch.highDelayMs, readiness.sketch.lowDelayMs, project.inputMode, buttonPressed]);

  useEffect(() => {
    if (engineMode === "firmware") avrRef.current?.setButtonPressed(buttonPressed);
  }, [buttonPressed, engineMode]);

  function placePart(id: string) {
    setPlaced((current) => current.includes(id) ? current : [...current, id]);
    const part = project.parts.find((item) => item.id === id);
    if (part) {
      setMessage(webglEnabled
        ? `${part.label} placed in the 3D workbench.`
        : `${part.label} placed in the lightweight preview. Tap Launch 3D Workbench when you want the rotatable 3D view.`);
    }
  }

  function removePart(id: string) {
    const terminalIds = new Set(project.terminals.filter((terminal) => terminal.partId === id).map((terminal) => terminal.id));
    setPlaced((current) => current.filter((item) => item !== id));
    setConnected((current) => current.filter((connectionId) => {
      const wire = project.connections.find((item) => item.id === connectionId);
      return wire ? !terminalIds.has(wire.fromTerminal) && !terminalIds.has(wire.toTerminal) : false;
    }));
    stopSimulation();
    setPendingTerminal(null);
    setMessage("Part removed. Attached wires were removed too.");
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
      setMessage(`${first} cannot connect to ${terminal.label} in this reviewed project.`);
      return;
    }
    connect(wire.id);
    setPendingTerminal(null);
  }

  function undoWire() {
    setConnected((current) => current.slice(0, -1));
    stopSimulation();
    setMessage("Last wire removed.");
  }

  function readinessProblem() {
    return readiness.missingParts[0] ? `Missing part: ${readiness.missingParts[0]}` :
      readiness.missingConnections[0] ? `Missing wire: ${readiness.missingConnections[0]}` :
      readiness.sketch.messages[0] ?? "The project is not ready.";
  }

  function runFastSimulation() {
    if (!readiness.ready) {
      stopSimulation(readinessProblem());
      return;
    }
    if (!supportsFastSketch(project, code)) {
      stopSimulation("This edited sketch needs Full Firmware Mode. Fast Simulation supports the starter code with numeric blink delay changes only.");
      return;
    }
    stopSimulation();
    setButtonPressed(false);
    setRunning(true);
    setMessage(project.inputMode === "button"
      ? "Fast simulation running. Press and hold the virtual button."
      : "Fast simulation running. The LED follows the mapped Arduino-style sketch.");
  }

  async function runFirmwareSimulation() {
    if (!readiness.ready) {
      stopSimulation(readinessProblem());
      return;
    }
    stopSimulation();
    const version = runVersion.current;
    setFirmwareError("");
    setFirmwareMeta(null);
    setFirmwareStatus("compiling");
    setMessage("Compiling your Arduino source to real ATmega328P firmware in the browser…");

    try {
      const compiled = await compileUnoFirmware(code);
      if (version !== runVersion.current) return;
      if (!compiled.fitsTarget) throw new Error(`Firmware uses ${compiled.flashBytes} bytes and exceeds the Uno application flash limit.`);
      setFirmwareMeta({flashBytes:compiled.flashBytes,compileMs:compiled.compileMs});
      setFirmwareStatus("starting");
      setMessage("Compilation passed. Starting the ATmega328P emulator…");

      const simulation = await startUnoFirmwareSimulation(compiled.hex, {
        buttonProject: project.inputMode === "button",
        onLedChange: (on) => { if (version === runVersion.current) setLedOn(on); },
      });
      if (version !== runVersion.current) { simulation.stop(); return; }
      avrRef.current = simulation;
      simulation.setButtonPressed(buttonPressed);
      setRunning(true);
      setFirmwareStatus("running");
      setMessage("Full Firmware Mode is running the compiled AVR machine code.");
    } catch (cause) {
      if (version !== runVersion.current) return;
      avrRef.current?.stop();
      avrRef.current = null;
      setRunning(false);
      setLedOn(false);
      setFirmwareStatus("error");
      const text = cause instanceof Error ? cause.message : String(cause);
      setFirmwareError(text);
      setMessage("Full Firmware Mode could not start. Fast Simulation remains available.");
    }
  }

  function runSimulation() {
    return engineMode === "firmware" ? runFirmwareSimulation() : runFastSimulation();
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setMessage("Arduino sketch copied.");
    } catch { setMessage("Copy is unavailable in this browser. Use Download .ino or select the sketch text."); }
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

  function saveNow() {
    try {
      localStorage.setItem(storageKey(project), JSON.stringify({placed,connected,code}));
      setStorageAvailable(true);
      setMessage("Circuit project saved. It will reopen in this browser after restarting the computer.");
    } catch { setStorageAvailable(false); setMessage("Browser saving failed. Download a project backup."); }
  }

  function downloadProjectBackup() {
    const backup={version:1,slug:project.slug,placed,connected,code};
    const blob=new Blob([JSON.stringify(backup,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const link=document.createElement("a");link.href=url;link.download=`stembuild-${project.slug}-project.json`;
    link.click();URL.revokeObjectURL(url);
    setMessage("Circuit project backup downloaded.");
  }

  async function importProjectBackup(file:File) {
    try {
      if(file.size>100_000)throw Error("Circuit project backup is too large.");
      const backup=parseLabProjectBackup(JSON.parse(await file.text()));
      if(backup.slug!==project.slug)throw Error(`Select the ${lab3dProject(backup.slug).shortTitle} project above before importing this backup.`);
      stopSimulation();
      setPlaced(backup.placed);setConnected(backup.connected);setCode(backup.code);setPendingTerminal(null);
      setMessage("Saved circuit parts, wires and Arduino code restored.");
    } catch(cause) {
      setMessage(cause instanceof Error?cause.message:"Could not import this circuit project.");
    }
  }

  function reset() {
    stopSimulation();
    setPlaced([]);
    setConnected([]);
    setCode(project.defaultSketch);
    setButtonPressed(false);
    setPendingTerminal(null);
    setFirmwareError("");
    setFirmwareMeta(null);
    try { window.localStorage.removeItem(storageKey(project)); } catch {}
    setMessage("Workbench reset.");
  }

  function autoAssemble() {
    setPlaced(project.parts.map((part) => part.id));
    setMessage("Assembly complete. Wire the project by tapping blue pin nodes in the WebGL scene or using the connection list.");
  }

  const displayedLed = engineMode === "fast" && project.inputMode === "button" ? running && readiness.ready && buttonPressed : ledOn;
  const progress = Math.round(((placed.length + connected.length + (readiness.sketch.ok ? 1 : 0)) / (project.parts.length + project.connections.length + 1)) * 100);

  return <div className="lab3d-shell">
    <div className="lab3d-project-switcher">
      <div>
        <div className="eyebrow">CHOOSE A 3D PROJECT</div>
        <h2>{project.title}</h2>
        <p className="small muted">{project.description}</p>
      </div>
      <div className="lab3d-project-buttons">
        {lab3dProjects.map((item) => <button key={item.slug} type="button" className={item.slug === project.slug ? "btn btn-primary" : "btn"} onClick={() => onProjectChange(item.slug)}>{item.shortTitle}</button>)}
      </div>
    </div>

    <nav className="lab3d-mobile-steps" aria-label="3D Lab steps">
      <button type="button" onClick={()=>document.getElementById("lab-assemble")?.scrollIntoView({behavior:"smooth"})}>1 Assemble</button>
      <button type="button" onClick={()=>document.getElementById("lab-wire")?.scrollIntoView({behavior:"smooth"})}>2 Wire</button>
      <button type="button" onClick={()=>document.getElementById("lab-code")?.scrollIntoView({behavior:"smooth"})}>3 Program</button>
      <button type="button" onClick={()=>document.getElementById("lab-run")?.scrollIntoView({behavior:"smooth"})}>4 Run</button>
    </nav>

    <section className="lab3d-statusbar">
      <div><span className="lab3d-live-dot" /> 3D Lab real-engine preview</div>
      <div className="lab3d-progress"><span style={{width:`${progress}%`}} /></div>
      <div>{progress}% assembled and mapped · {storageAvailable ? "saved on this device" : "saving unavailable — download your sketch"}</div>
    </section>

    {webglEnabled ? (
      <div className="lab3d-webgl-launch-wrap">
        <div className="lab3d-webgl-launch-actions">
          <div>
            <div className="eyebrow">3D WORKBENCH ACTIVE</div>
            <strong>WebGL loads only after you ask for it.</strong>
          </div>
          <button type="button" className="btn" onClick={()=>setWebglEnabled(false)}>Close 3D view</button>
        </div>
        <Stem3DWebGLWorkbench project={project} placed={placed} connected={connected} ledOn={displayedLed} pendingTerminal={pendingTerminal} onTerminalSelect={tapTerminal} onUseLightweight={()=>setWebglEnabled(false)} />
      </div>
    ) : (
      <section className="lab3d-safe-launch">
        <div>
          <div className="eyebrow">SAFE MOBILE START</div>
          <h2>Open the page first. Launch 3D only when you are ready.</h2>
          <p className="muted">The 3D engine is no longer downloaded automatically when this page opens. This keeps the lab usable on slower phones, embedded browsers and unstable networks. You can still assemble, wire, edit code and use Fast Simulation below.</p>
          <div className="inline" style={{marginTop:12}}>
            <button type="button" className="btn btn-primary" onClick={()=>setWebglEnabled(true)}>Launch 3D Workbench</button>
            <button type="button" className="btn" onClick={()=>document.getElementById("lab-assemble")?.scrollIntoView({behavior:"smooth"})}>Use lightweight mode</button>
          </div>
        </div>
        <div className="lab3d-safe-status">
          <span>✓ Page loads without Three.js</span>
          <span>✓ Placed parts stay visible before 3D launch</span>
          <span>✓ Full Firmware Mode stays opt-in</span>
        </div>

        <div className="lab3d-light-preview">
          <div className="lab3d-light-preview-head">
            <div>
              <div className="eyebrow">LIGHTWEIGHT ASSEMBLY PREVIEW</div>
              <strong>{placed.length ? `${placed.length}/${project.parts.length} parts visible` : "Place a part to see it here"}</strong>
            </div>
            {placed.length ? <button type="button" className="lab3d-mini-btn" onClick={()=>setWebglEnabled(true)}>Open these parts in 3D</button> : null}
          </div>

          <div className="lab3d-light-preview-stage" aria-label="Placed component preview">
            <div className="lab3d-light-grid" aria-hidden="true" />
            {project.parts.map((part) => {
              const isPlaced = placed.includes(part.id);
              const visual = partImage(part.componentSlug);
              return <div
                key={part.id}
                className={isPlaced ? "lab3d-light-part placed" : "lab3d-light-part"}
                style={{
                  left:`${part.target.left}%`,
                  top:`${part.target.top}%`,
                  width:`${part.target.width}%`,
                  height:`${part.target.height}%`,
                }}
              >
                {isPlaced ? <>
                  {visual ? <img src={visual} alt={part.label} /> : <div className="lab3d-light-part-fallback">{part.label}</div>}
                  <span>{part.label}</span>
                </> : <small>{part.label}</small>}
              </div>;
            })}

            <svg className="lab3d-light-wires" viewBox="0 0 1000 620" preserveAspectRatio="none" aria-hidden="true">
              {project.connections.filter((wire)=>connected.includes(wire.id)).map((wire)=>
                <path key={wire.id} d={wire.path} className={`wire ${wire.wireClass}`}/>
              )}
            </svg>
          </div>

          <p className="small muted">This preview is intentionally lightweight for phones. It uses circuit illustrations rather than photos and shows every part as soon as you press Place. Launch 3D only when you want rotation, zoom and clickable 3D pin nodes.</p>
        </div>
      </section>
    )}

    <div className="lab3d-grid lab3d-grid-controls">
      <aside id="lab-assemble" className="lab3d-panel lab3d-parts-panel">
        <div className="eyebrow">1 · ASSEMBLE</div>
        <h2>Parts tray</h2>
        <p className="small muted">Tap Place to add a part to the preview. Launch 3D for rotation and pin selection.</p>
        <div className="lab3d-parts-list">
          {project.parts.map((part) => {
            const visual = partImage(part.componentSlug);
            const isPlaced = placed.includes(part.id);
            return <div key={part.id} className={isPlaced ? "lab3d-part-card placed" : "lab3d-part-card"}>
              <div className="lab3d-part-thumb">{visual ? <img src={visual} alt="" /> : <span>3D</span>}</div>
              <div><strong>{part.label}</strong><small>{part.hint}</small></div>
              <button type="button" className="lab3d-mini-btn" onClick={() => isPlaced ? removePart(part.id) : placePart(part.id)}>{isPlaced ? "Remove" : "Place"}</button>
            </div>;
          })}
        </div>
        <div className="lab3d-panel-actions">
          <button type="button" className="btn" onClick={autoAssemble}>Auto assemble demo</button>
          <button type="button" className="btn" onClick={reset}>Reset project</button>
        </div>
        <div className="lab-project-save">
          <strong>Continue after a computer restart</strong>
          <p className="small muted">Your parts, wiring and sketch autosave in this browser. Use a project backup if you change devices or clear browser data.</p>
          <div className="lab3d-panel-actions">
            <button type="button" className="btn" onClick={saveNow}>Save project</button>
            <button type="button" className="btn" onClick={downloadProjectBackup}>Download project backup</button>
            <label className="btn">Import project backup<input type="file" accept="application/json,.json" onChange={async e=>{const file=e.target.files?.[0];if(file)await importProjectBackup(file);e.target.value="";}} /></label>
          </div>
        </div>
      </aside>

      <section className="lab3d-workbench-column">
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
        <p className="small muted">The exported .ino remains your text. Full Firmware Mode mirrors standard Arduino .ino preprocessing by adding Arduino.h only when the browser compiler needs it.</p>
        <textarea className="lab3d-code-editor" value={code} onChange={(event)=>{setCode(event.target.value);stopSimulation();}} spellCheck={false} aria-label="Arduino sketch editor"/>

        <div className="lab3d-code-checks">
          <div className={readiness.sketch.ok ? "lab3d-check ok" : "lab3d-check"}><span>{readiness.sketch.ok ? "✓" : "!"}</span><div><strong>Code mapping</strong><small>{readiness.sketch.ok ? "Code matches the reviewed pin map" : readiness.sketch.messages[0]}</small></div></div>
          <div className={readiness.missingConnections.length === 0 ? "lab3d-check ok" : "lab3d-check"}><span>{readiness.missingConnections.length === 0 ? "✓" : "!"}</span><div><strong>Wiring</strong><small>{readiness.missingConnections.length === 0 ? "All required paths connected" : `${readiness.missingConnections.length} connection(s) missing`}</small></div></div>
          <div className={placed.length === project.parts.length ? "lab3d-check ok" : "lab3d-check"}><span>{placed.length === project.parts.length ? "✓" : "!"}</span><div><strong>Assembly</strong><small>{placed.length}/{project.parts.length} parts placed</small></div></div>
        </div>

        <div className="lab3d-engine-choice">
          <button type="button" className={engineMode==="fast"?"active":""} onClick={()=>{stopSimulation();setEngineMode("fast");}}>
            <strong>Fast Simulation</strong><span>Starter sketch · low-data preview</span>
          </button>
          <button type="button" className={engineMode==="firmware"?"active":""} onClick={()=>{stopSimulation();setEngineMode("firmware");}}>
            <strong>Full Firmware Mode</strong><span>Real AVR-GCC → Intel HEX → ATmega328P emulation</span>
          </button>
        </div>
        {engineMode==="fast" ? <p className="small muted">Fast mode previews the starter logic and numeric blink delays. For other code changes, use Full Firmware Mode to execute your program.</p> : null}
        {engineMode==="firmware" ? <div className="lab3d-firmware-note"><strong>Data notice:</strong> first use downloads a large browser compiler/toolchain (roughly 55 MB upstream assets). Choose Fast Simulation on limited data.</div> : null}

        <div id="lab-run" className="lab3d-run-section">
          <div className="eyebrow">4 · RUN</div>
          <div className="lab3d-run-controls">
            <button type="button" className="btn btn-primary" onClick={runSimulation} disabled={firmwareStatus==="compiling"||firmwareStatus==="starting"}>
              {firmwareStatus==="compiling" ? "Compiling real firmware…" : firmwareStatus==="starting" ? "Starting AVR emulator…" : running ? "Running…" : engineMode==="firmware" ? "▶ Compile & run firmware" : "▶ Run simulation"}
            </button>
            <button type="button" className="btn" onClick={()=>stopSimulation("Simulation stopped.")}>■ Stop</button>
          </div>

          {project.inputMode === "button" ? <button type="button" className={buttonPressed ? "lab3d-virtual-button pressed" : "lab3d-virtual-button"} disabled={!running || !readiness.ready} onPointerDown={()=>setButtonPressed(true)} onPointerUp={()=>setButtonPressed(false)} onPointerCancel={()=>setButtonPressed(false)} onPointerLeave={()=>setButtonPressed(false)} onKeyDown={(e)=>{if(e.key===" "||e.key==="Enter"){e.preventDefault();setButtonPressed(true);}}} onKeyUp={(e)=>{if(e.key===" "||e.key==="Enter"){e.preventDefault();setButtonPressed(false);}}} onBlur={()=>setButtonPressed(false)} aria-pressed={buttonPressed}>
            <span>{buttonPressed ? "Button pressed" : "Press and hold virtual button"}</span><small>D2 reads {buttonPressed ? "LOW" : "HIGH"}</small>
          </button> : null}

          <div className={running && readiness.ready ? "lab3d-sim-card running" : "lab3d-sim-card"}>
            <div><span className={displayedLed ? "sim-led on" : "sim-led"} /><strong>Virtual LED</strong></div>
            <span>{running && readiness.ready ? (displayedLed ? "D8 HIGH" : "D8 LOW") : "Stopped"}</span>
          </div>

          {firmwareMeta && engineMode==="firmware" ? <div className="lab3d-firmware-result"><strong>Real firmware compiled ✓</strong><span>{firmwareMeta.flashBytes.toLocaleString()} flash bytes · {(firmwareMeta.compileMs/1000).toFixed(1)} s compile</span></div> : null}
          {firmwareError ? <div className="notice"><strong>Full Firmware Mode error:</strong> {firmwareError}</div> : null}
        </div>

        <div className="lab3d-export">
          <div className="eyebrow">TAKE IT TO THE REAL WORLD</div>
          <p className="small">Copy/download the same Arduino sketch and use the same reviewed wiring on the physical Uno. Simulation success does not replace physical validation.</p>
          <div className="inline"><button type="button" className="btn" onClick={copyCode}>Copy code</button><button type="button" className="btn" onClick={downloadSketch}>Download .ino</button></div>
        </div>
      </aside>
    </div>

    <section className="lab3d-parity">
      <div><div className="eyebrow">REAL ENGINE LAYER</div><h2>What changed</h2></div>
      <div className="lab3d-parity-grid">
        <div><strong>✓ True WebGL</strong><span>Three.js renders dimensioned 3D parts, orbit/zoom, 3D wires and clickable pin nodes.</span></div>
        <div><strong>✓ glTF/CAD path</strong><span>The Uno and breadboard load as reusable glTF assets; smaller parts use dimensioned procedural CAD geometry.</span></div>
        <div><strong>✓ Real AVR compilation</strong><span>Full Firmware Mode compiles Arduino source into Intel HEX with AVR-GCC/WebAssembly.</span></div>
        <div><strong>✓ ATmega328P execution</strong><span>AVR8js executes the compiled machine code; D8 output and D2 input drive the virtual hardware.</span></div>
      </div>
    </section>
  </div>;
}
