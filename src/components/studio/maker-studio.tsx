"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { compileUnoFirmware, startUnoStudio, type StudioSnapshot, type UnoStudioSimulation } from "@/lib/avr-browser-engine";
import { buildNets, connectionsOf, IDLE_BOARD, simulate, type PartView, type PlacedPart, type StudioDoc, type Warning } from "@/lib/studio/circuit";
import { LED_COLOURS, PART_BY_TYPE, PART_CATEGORIES, PART_DEFINITIONS, PWM_PINS, RESISTOR_VALUES, UNO, UNO_PINS, isGround, pinPosition, type PartType } from "@/lib/studio/parts";
import { CHALLENGES, LEARNING_OUTCOMES, type Challenge, type Check, type Harness } from "@/lib/studio/challenges";
import { recordChallengeAttempt } from "@/lib/studio-actions";
import { STUDIO_EXAMPLES, EMPTY_DOC } from "@/lib/studio/examples";
import { formatSI } from "@/lib/electronics";
import { useStoredValue } from "@/lib/use-stored-value";
import { PartArt } from "@/components/studio/part-art";
import { LogicAnalyzer, type AnalyzerSnapshot } from "@/components/studio/logic-analyzer";
import { CodeEditor } from "@/components/studio/code-editor";
import { SerialChart } from "@/components/serial-chart";
import { appendEdges, CPU_HZ, type PinHistory } from "@/lib/studio/analyzer";
import { parseCompilerErrors } from "@/lib/studio/compile-errors";
import { decodeBuild, encodeBuild, MAX_SHARE_CHARS, SHARE_PREFIX } from "@/lib/studio/share";
import { parseSerialLine, seriesNames, type SerialPoint } from "@/lib/serial-capture";

const ANALYZER_KEEP_CYCLES = 2.5 * CPU_HZ; // 2.5 s of history per pin
const MAX_EDGES_PER_PIN = 8000;

const STORAGE_KEY = "stembuild-maker-studio-v1";
const CANVAS = { w: 1180, h: 780 };
const WIRE_COLOURS: Record<string, string> = { red: "#d32f2f", black: "#1f2933", blue: "#1f6fd1", green: "#2e8b57", yellow: "#d4a800", orange: "#ef7d1a", white: "#c9d1db" };
type Selection = { kind: "part" | "wire"; id: string } | null;
type RunState = "idle" | "compiling" | "running" | "error";
type Tab = "code" | "serial" | "challenges" | "part";

function parseDoc(raw: string | null): StudioDoc | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    if (data?.version !== 1 || !Array.isArray(data.parts) || !Array.isArray(data.wires) || typeof data.code !== "string") return null;
    const parts = data.parts.filter((p: PlacedPart) => p && typeof p.id === "string" && p.type in PART_BY_TYPE && Number.isFinite(p.x) && Number.isFinite(p.y));
    return { version: 1, parts: parts.map((p: PlacedPart) => ({ ...p, props: p.props ?? {} })), wires: data.wires.filter((w: { a?: unknown; b?: unknown }) => typeof w?.a === "string" && typeof w?.b === "string"), code: data.code };
  } catch { return null; }
}

/** A copy of the analyzer history for rendering, capped per pin (keeping the level before the cap). */
function analyzerSnapshot(history: Map<number, PinHistory>, now: number): AnalyzerSnapshot {
  return {
    now,
    pins: [...history].map(([pin, h]) => {
      if (h.edges.length <= MAX_EDGES_PER_PIN) return { pin, history: { base: h.base, edges: h.edges.slice() } };
      const cut = h.edges.length - MAX_EDGES_PER_PIN;
      return { pin, history: { base: h.edges[cut - 1].high, edges: h.edges.slice(cut) } };
    }),
  };
}

let counter = 0;
const uid = (prefix: string) => `${prefix}${Date.now().toString(36)}${(counter++).toString(36)}`;

function endpointDirection(endpoint: string, parts: PlacedPart[]) {
  const [owner, pinId] = endpoint.split(":");
  if (owner === "uno") return UNO_PINS.find((p) => p.id === pinId)!.y < UNO.y + 40 ? { x: 0, y: -1 } : { x: 0, y: 1 };
  const part = parts.find((p) => p.id === owner);
  if (!part) return { x: 0, y: 1 };
  const def = PART_BY_TYPE[part.type], pin = def.pins.find((p) => p.id === pinId)!;
  if (pin.x <= 0) return { x: -1, y: 0 };
  if (pin.x >= def.width) return { x: 1, y: 0 };
  return pin.y <= 0 ? { x: 0, y: -1 } : { x: 0, y: 1 };
}

function wirePath(a: { x: number; y: number }, b: { x: number; y: number }, da: { x: number; y: number }, db: { x: number; y: number }) {
  const reach = Math.min(110, Math.max(40, Math.hypot(b.x - a.x, b.y - a.y) / 3));
  return `M${a.x},${a.y} C${a.x + da.x * reach},${a.y + da.y * reach} ${b.x + db.x * reach},${b.y + db.y * reach} ${b.x},${b.y}`;
}

function autoColour(a: string, b: string, chosen: string) {
  const pins = [a, b].filter((e) => e.startsWith("uno:")).map((e) => e.slice(4));
  if (pins.some(isGround)) return "black";
  if (pins.includes("5V") || pins.includes("3V3")) return "red";
  return chosen;
}

function freeSpot(parts: PlacedPart[], type: PartType) {
  const def = PART_BY_TYPE[type];
  for (let row = 0; row < 6; row++) for (let col = 0; col < 5; col++) {
    const x = 500 + col * 135, y = 40 + row * 125;
    const clash = parts.some((p) => Math.abs(p.x - x) < 110 && Math.abs(p.y - y) < 100);
    if (!clash && y + def.height < CANVAS.h - 10) return { x, y };
  }
  return { x: 520, y: 60 };
}

/** A starting sketch from the current wiring: pin constants, pinMode() and a loop that reports inputs. */
function starterCode(doc: StudioDoc) {
  const nets = buildNets(doc);
  const consts: string[] = [], setup: string[] = [], loop: string[] = [];
  const count: Partial<Record<PartType, number>> = {};
  const pinOf = (text: string) => text.match(/\b(D(\d+)|A(\d))\b/);
  for (const part of doc.parts) {
    const conn = connectionsOf(doc, nets, part.id);
    const n = (count[part.type] = (count[part.type] ?? 0) + 1);
    const name = `${part.type.replace(/-/g, "_").toUpperCase()}${n > 1 ? n : ""}`;
    const add = (suffix: string, conText: string | undefined, mode: string) => {
      const match = conText ? pinOf(conText) : null;
      if (!match) return null;
      const pin = match[2] ?? `A${match[3]}`;
      consts.push(`const int ${name}${suffix} = ${pin};`);
      if (mode) setup.push(`  pinMode(${name}${suffix}, ${mode});`);
      return `${name}${suffix}`;
    };
    switch (part.type) {
      case "led": { const c = add("_PIN", conn.anode, "OUTPUT"); if (c) loop.push(`  digitalWrite(${c}, HIGH);   // or analogWrite(${c}, 0..255) on a ~ pin`); break; }
      case "button": { const c = add("_PIN", conn.a || conn.b, "INPUT_PULLUP"); if (c) loop.push(`  bool ${name.toLowerCase()}Pressed = digitalRead(${c}) == LOW;`); break; }
      case "potentiometer": case "light-sensor": case "temp-sensor": {
        const c = add("_PIN", conn.wiper ?? conn.ao ?? conn.out, "");
        if (c) loop.push(`  Serial.print("${name.toLowerCase()}:"); Serial.println(analogRead(${c}));`);
        break;
      }
      case "pir": { const c = add("_PIN", conn.out, "INPUT"); if (c) loop.push(`  bool motion = digitalRead(${c}) == HIGH;`); break; }
      case "buzzer": { const c = add("_PIN", conn.plus, ""); if (c) loop.push(`  tone(${c}, 440, 100);`); break; }
      case "ultrasonic": { add("_TRIG", conn.trig, "OUTPUT"); add("_ECHO", conn.echo, "INPUT"); break; }
      case "servo": { add("_PIN", conn.signal, ""); break; }
      case "motor-driver": { add("_IN1", conn.in1, "OUTPUT"); add("_IN2", conn.in2, "OUTPUT"); add("_EN", conn.en, "OUTPUT"); break; }
      default: break;
    }
  }
  return `// Starter sketch generated from your wiring. Edit it to make your project do something.
${consts.join("\n")}

void setup() {
  Serial.begin(9600);
${setup.join("\n")}
}

void loop() {
${loop.join("\n")}
  delay(200);
}
`;
}

export function MakerStudio() {
  const [raw, setRaw] = useStoredValue(STORAGE_KEY);
  const doc = useMemo(() => parseDoc(raw) ?? STUDIO_EXAMPLES[0].doc, [raw]);
  const docRef = useRef(doc);
  useEffect(() => { docRef.current = doc; }, [doc]);
  const save = (next: StudioDoc) => { docRef.current = next; setRaw(JSON.stringify(next)); };

  const svgRef = useRef<SVGSVGElement>(null);
  const [selection, setSelection] = useState<Selection>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [drag, setDrag] = useState<{ id: string; dx: number; dy: number; x: number; y: number } | null>(null);
  const [wireColour, setWireColour] = useState("blue");
  const [tab, setTab] = useState<Tab>("code");
  const [runState, setRunState] = useState<RunState>("idle");
  const [runMessage, setRunMessage] = useState("Press Run to compile your code and start the simulation.");
  const [pressed, setPressed] = useState<Set<string>>(new Set());
  const [live, setLive] = useState<{ views: Record<string, PartView>; warnings: Warning[]; snapshot: StudioSnapshot | null }>({ views: {}, warnings: [], snapshot: null });
  const [serial, setSerial] = useState("");
  const [soundOn, setSoundOn] = useState(false);
  const [results, setResults] = useState<Record<string, Check[] | "running">>({});
  const [activeChallenge, setActiveChallenge] = useState<string | null>(null);
  const [saveNote, setSaveNote] = useState<Record<string, string>>({});
  const [analyzer, setAnalyzer] = useState<AnalyzerSnapshot>({ now: 0, pins: [] });
  const [showAnalyzer, setShowAnalyzer] = useState(false);
  const [serialView, setSerialView] = useState<"text" | "plot">("text");
  const [plot, setPlot] = useState<SerialPoint[]>([]);
  const [shareNote, setShareNote] = useState("");
  const historyRef = useRef(new Map<number, PinHistory>());
  const analyzerOpenRef = useRef(false);
  useEffect(() => { analyzerOpenRef.current = showAnalyzer; }, [showAnalyzer]);
  const plotRef = useRef<SerialPoint[]>([]);
  const lineBufferRef = useRef("");

  const simRef = useRef<UnoStudioSimulation | null>(null);
  const snapRef = useRef<StudioSnapshot | null>(null);
  const pressedRef = useRef(new Set<string>());
  const lockedPins = useRef(new Set<number>());
  const burntRef = useRef(new Set<string>());
  const anglesRef = useRef<Record<string, number>>({});
  const viewsRef = useRef<Record<string, PartView>>({});
  const serialRef = useRef("");
  const waitersRef = useRef<{ cycles: number; resolve: () => void }[]>([]);
  const lastPaint = useRef(0);
  const audioRef = useRef<{ ctx: AudioContext; osc: OscillatorNode; gain: GainNode } | null>(null);
  const soundRef = useRef(false);
  useEffect(() => { soundRef.current = soundOn; }, [soundOn]);

  const running = runState === "running";
  const diagnostics = useMemo(() => (runState === "error" ? parseCompilerErrors(runMessage, doc.code) : []), [runState, runMessage, doc.code]);
  const wiredPins = useMemo(() => [...new Set(doc.wires.flatMap((w) => [w.a, w.b]).map((e) => e.match(/^uno:D(\d+)$/)?.[1]).filter(Boolean).map(Number))], [doc.wires]);
  const idle = useMemo(() => simulate(doc, buildNets(doc, pressed), IDLE_BOARD), [doc, pressed]);
  const views = running ? live.views : idle.views;
  const warnings = running ? live.warnings : idle.warnings.filter((w) => w.level !== "info" || doc.wires.length > 0);
  const selectedPart = selection?.kind === "part" ? doc.parts.find((p) => p.id === selection.id) ?? null : null;
  const selectedWire = selection?.kind === "wire" ? doc.wires.find((w) => w.id === selection.id) ?? null : null;

  // ---------- Simulation ----------

  function updateSound(frameViews: Record<string, PartView>) {
    const frequency = Math.max(0, ...Object.values(frameViews).map((v) => v.frequency ?? 0));
    if (!soundRef.current || frequency <= 0) { audioRef.current?.gain.gain.setTargetAtTime(0, audioRef.current.ctx.currentTime, 0.01); return; }
    if (!audioRef.current) {
      const ctx = new AudioContext(); const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.type = "square"; gain.gain.value = 0; osc.connect(gain).connect(ctx.destination); osc.start();
      audioRef.current = { ctx, osc, gain };
    }
    audioRef.current.osc.frequency.setTargetAtTime(frequency, audioRef.current.ctx.currentTime, 0.005);
    audioRef.current.gain.gain.setTargetAtTime(0.04, audioRef.current.ctx.currentTime, 0.01);
  }

  function onFrame(snapshot: StudioSnapshot) {
    const sim = simRef.current;
    if (!sim) return;
    snapRef.current = snapshot;
    const current = docRef.current;
    const result = simulate(current, buildNets(current, pressedRef.current), snapshot, { angles: anglesRef.current, burnt: burntRef.current });
    for (const [pin, level] of Object.entries(result.digitalInputs)) if (!lockedPins.current.has(Number(pin))) sim.setDigital(Number(pin), level);
    result.analogVolts.forEach((volts, channel) => sim.setAnalog(channel, volts));
    sim.setUltrasonic(result.ultrasonic);
    burntRef.current = new Set(result.burnt);
    for (const [id, view] of Object.entries(result.views)) if (view.angle !== undefined) anglesRef.current[id] = view.angle;
    viewsRef.current = result.views;
    appendEdges(historyRef.current, sim.drainEdges(), snapshot.cycles, ANALYZER_KEEP_CYCLES, sim.levels());
    waitersRef.current = waitersRef.current.filter((w) => { if (snapshot.cycles >= w.cycles) { w.resolve(); return false; } return true; });
    updateSound(result.views);
    // Repaint about 16 times per emulated second (60 ms of chip time).
    if (snapshot.cycles - lastPaint.current > 60 * 16_000 || snapshot.cycles < lastPaint.current) { lastPaint.current = snapshot.cycles; setLive({ views: result.views, warnings: result.warnings, snapshot }); if (analyzerOpenRef.current) setAnalyzer(analyzerSnapshot(historyRef.current, snapshot.cycles)); }
  }

  function stop(message = "Stopped. Edit your circuit or code, then press Run.") {
    simRef.current?.stop();
    simRef.current = null;
    waitersRef.current.forEach((w) => w.resolve());
    waitersRef.current = [];
    lockedPins.current.clear();
    burntRef.current = new Set();
    anglesRef.current = {};
    historyRef.current = new Map();
    audioRef.current?.gain.gain.setTargetAtTime(0, audioRef.current.ctx.currentTime, 0.01);
    setLive({ views: {}, warnings: [], snapshot: null });
    setRunState("idle");
    setRunMessage(message);
  }

  async function run() {
    stop("Compiling…");
    setRunState("compiling");
    setRunMessage("Compiling your sketch for the ATmega328P…");
    serialRef.current = ""; setSerial("");
    plotRef.current = []; setPlot([]); lineBufferRef.current = "";
    try {
      const firmware = await compileUnoFirmware(docRef.current.code);
      if (!firmware.fitsTarget) { setRunState("error"); setRunMessage(`The program is ${firmware.flashBytes} bytes: too big for the Uno’s 32 KB flash.`); return false; }
      simRef.current = await startUnoStudio(firmware.hex, {
        onFrame,
        onSerial: (text) => {
          serialRef.current = (serialRef.current + text).slice(-8000);
          setSerial(serialRef.current);
          // Serial plotter: timestamp each complete numeric line with emulated time.
          const lines = (lineBufferRef.current + text).split(/\r?\n/);
          lineBufferRef.current = lines.pop() ?? "";
          const t = (simRef.current?.cycles() ?? 0) / 16_000;
          const points = lines.map((line) => parseSerialLine(line)).filter((v): v is Record<string, number> => Boolean(v)).map((values) => ({ t, values }));
          if (points.length) { plotRef.current = [...plotRef.current, ...points].slice(-800); setPlot(plotRef.current); }
        },
      });
      setRunState("running");
      setRunMessage(`Running · ${firmware.flashBytes} bytes of flash · compiled in ${(firmware.compileMs / 1000).toFixed(1)} s`);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setRunState("error");
      setRunMessage(/failed to fetch|network|import/i.test(message) ? "The compiler could not be downloaded. The first compile needs an internet connection." : message.replace(/^Browser AVR compilation failed\.\s*/, ""));
      return false;
    }
  }

  useEffect(() => () => { simRef.current?.stop(); void audioRef.current?.ctx.close(); }, []);

  // ---------- Interaction with inputs ----------

  function setButton(id: string, down: boolean) {
    const next = new Set(pressedRef.current);
    if (down) next.add(id); else next.delete(id);
    pressedRef.current = next;
    setPressed(next);
  }

  function setProp(id: string, key: string, value: string | number | boolean) {
    const current = docRef.current;
    save({ ...current, parts: current.parts.map((p) => (p.id === id ? { ...p, props: { ...p.props, [key]: value } } : p)) });
  }

  // ---------- Test bench ----------

  function wait(ms: number) {
    const sim = simRef.current;
    if (!sim) return Promise.resolve();
    return new Promise<void>((resolve) => waitersRef.current.push({ cycles: sim.cycles() + ms * 16_000, resolve }));
  }

  function bounce(id: string, press: boolean) {
    const sim = simRef.current;
    const current = docRef.current;
    const conn = connectionsOf(current, buildNets(current), id);
    const match = `${conn.a ?? ""},${conn.b ?? ""}`.match(/\bD(\d+)\b/);
    if (!sim || !match) { setButton(id, press); return wait(10); }
    const pin = Number(match[1]);
    const levelWhen = (isPressed: boolean) => {
      const set = new Set(pressedRef.current);
      if (isPressed) set.add(id); else set.delete(id);
      return simulate(current, buildNets(current, set), snapRef.current ?? { ...IDLE_BOARD, cycles: 0 }).digitalInputs[pin] ?? false;
    };
    const target = levelWhen(press), other = levelWhen(!press);
    const times = [0, 180, 420, 900, 1500, 2300, 3000];
    lockedPins.current.add(pin);
    times.forEach((t, i) => sim.scheduleMicros(t, () => {
      sim.setDigital(pin, i % 2 === 0 ? target : other);
      if (i === times.length - 1) { setButton(id, press); lockedPins.current.delete(pin); }
    }));
    return wait(10);
  }

  async function runChallenge(challenge: Challenge) {
    setActiveChallenge(challenge.id);
    setResults((r) => ({ ...r, [challenge.id]: "running" }));
    if (!simRef.current) { const ok = await run(); if (!ok) { setResults((r) => ({ ...r, [challenge.id]: [{ label: "Your code compiles", passed: false, detail: "Fix the error shown above the code editor, then try again." }] })); return; } }
    await wait(300);
    const current = docRef.current;
    const harness: Harness = {
      find(type, pin) {
        const nets = buildNets(docRef.current);
        const candidates = docRef.current.parts.filter((p) => p.type === type);
        if (!pin) return candidates[0]?.id ?? null;
        return candidates.find((p) => Object.values(connectionsOf(docRef.current, nets, p.id)).some((c) => new RegExp(`\\b${pin}\\b`).test(c)))?.id ?? null;
      },
      press: (id) => setButton(id, true),
      release: (id) => setButton(id, false),
      bouncePress: (id) => bounce(id, true),
      bounceRelease: (id) => bounce(id, false),
      setProp,
      wait,
      // Infinity once stopped, so sampling loops end instead of spinning.
      now: () => (simRef.current ? simRef.current.cycles() / 16_000 : Infinity),
      view: (id) => viewsRef.current[id] ?? {},
      serial: () => serialRef.current,
      code: current.code,
    };
    const checks = await challenge.run(harness);
    setResults((r) => ({ ...r, [challenge.id]: checks }));
    // Signed-in learners get the attempt saved to their progress for their teacher.
    try {
      const outcome = await recordChallengeAttempt(challenge.id, checks.map(({ label, passed }) => ({ label, passed })));
      setSaveNote((n) => ({ ...n, [challenge.id]: outcome.saved ? "Saved to your progress." : outcome.reason === "signed-out" ? "Sign in as a student to save this result to your progress." : outcome.reason === "rate-limited" ? "Not saved: too many attempts this hour." : "" }));
    } catch {
      setSaveNote((n) => ({ ...n, [challenge.id]: "Result not saved (offline?). It is still shown here." }));
    }
  }

  function loadStarter(challenge: Challenge) {
    if (!challenge.starter) return;
    if (docRef.current.parts.length && !window.confirm("Replace your current build with the broken build for this challenge? Export first if you want to keep yours.")) return;
    stop("Broken build loaded. Run it, observe what goes wrong, then fix the wiring or the code.");
    save(structuredClone(challenge.starter));
    setSelection(null);
  }

  // ---------- Editing ----------

  function toSvg(event: { clientX: number; clientY: number }) {
    const svg = svgRef.current;
    const matrix = svg?.getScreenCTM();
    if (!svg || !matrix) return { x: 0, y: 0 };
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return { x: point.x, y: point.y };
  }

  function addPart(type: PartType) {
    const current = docRef.current;
    const spot = freeSpot(current.parts, type);
    const part: PlacedPart = { id: uid("p"), type, ...spot, props: { ...(PART_BY_TYPE[type].defaults ?? {}) } };
    save({ ...current, parts: [...current.parts, part] });
    setSelection({ kind: "part", id: part.id });
    setTab("part");
  }

  function clickPin(endpoint: string) {
    if (!pending) { setPending(endpoint); setSelection(null); return; }
    if (pending === endpoint) { setPending(null); return; }
    const current = docRef.current;
    const exists = current.wires.some((w) => (w.a === pending && w.b === endpoint) || (w.a === endpoint && w.b === pending));
    if (!exists) save({ ...current, wires: [...current.wires, { id: uid("w"), a: pending, b: endpoint, colour: autoColour(pending, endpoint, wireColour) }] });
    setPending(null);
    setCursor(null);
  }

  function removeSelection() {
    const current = docRef.current;
    if (selection?.kind === "part") save({ ...current, parts: current.parts.filter((p) => p.id !== selection.id), wires: current.wires.filter((w) => !w.a.startsWith(`${selection.id}:`) && !w.b.startsWith(`${selection.id}:`)) });
    if (selection?.kind === "wire") save({ ...current, wires: current.wires.filter((w) => w.id !== selection.id) });
    setSelection(null);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return;
    if (event.key === "Escape") { setPending(null); setCursor(null); setSelection(null); }
    if ((event.key === "Delete" || event.key === "Backspace") && selection) { event.preventDefault(); removeSelection(); }
  }

  function loadExample(id: string) {
    const example = id === "empty" ? { doc: EMPTY_DOC } : STUDIO_EXAMPLES.find((e) => e.id === id);
    if (!example) return;
    if (docRef.current.parts.length && !window.confirm("Replace your current build with this example? Export it first if you want to keep it.")) return;
    stop();
    save(structuredClone(example.doc));
    setSelection(null);
    setTab("code");
  }

  function exportDoc() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(docRef.current, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url; link.download = "stembuild-studio-project.json"; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function shareBuild() {
    const encoded = await encodeBuild(docRef.current);
    if (encoded.length > MAX_SHARE_CHARS) { setShareNote("This build is too large for a link. Use Export instead."); return; }
    const url = `${window.location.origin}/studio${SHARE_PREFIX}${encoded}`;
    try { await navigator.clipboard.writeText(url); setShareNote("Link copied. Anyone who opens it gets a copy of this circuit and code."); }
    catch { window.prompt("Copy this link to share your build:", url); }
  }

  // Opening a shared link: offer to load the build it carries, then tidy the address bar.
  useEffect(() => {
    if (!window.location.hash.startsWith(SHARE_PREFIX)) return;
    const encoded = window.location.hash.slice(SHARE_PREFIX.length);
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    void decodeBuild(encoded).then((data) => {
      const shared = data ? parseDoc(JSON.stringify(data)) : null;
      if (!shared) { window.alert("That shared build link is damaged or incomplete."); return; }
      if (window.confirm(`Open this circuit (${shared.parts.length} parts) with its code? It replaces the build in your workbench. Export yours first if you want to keep it.`)) save(shared);
    });
    // Runs once on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function importDoc(file: File) {
    const parsed = parseDoc(await file.text());
    if (!parsed) { window.alert("That file is not a STEMBuild Maker Studio project."); return; }
    stop(); save(parsed); setSelection(null);
  }

  const partsForDraw = doc.parts.map((p) => (drag?.id === p.id ? { ...p, x: drag.x, y: drag.y } : p));
  const pendingPos = pending ? pinPosition(pending, partsForDraw) : null;
  const inputParts = doc.parts.filter((p) => ["button", "switch", "potentiometer", "light-sensor", "temp-sensor", "ultrasonic", "pir"].includes(p.type));
  const partLabel = (p: PlacedPart) => `${PART_BY_TYPE[p.type].name}${doc.parts.filter((q) => q.type === p.type).length > 1 ? ` ${doc.parts.filter((q) => q.type === p.type).indexOf(p) + 1}` : ""}`;

  return <div className="studio" onKeyDown={onKeyDown}>
    <div className="studio-toolbar">
      <div className="studio-run">
        {running
          ? <button type="button" className="btn" onClick={() => stop()}>■ Stop</button>
          : <button type="button" className="btn btn-primary" disabled={runState === "compiling"} onClick={() => void run()}>{runState === "compiling" ? "Compiling…" : "▶ Run"}</button>}
        <span className={`studio-status ${runState}`} role="status">{runMessage}</span>
      </div>
      <div className="studio-file">
        <label className="studio-select"><span className="sr-only">Load an example</span>
          <select className="select" value="" onChange={(event) => loadExample(event.target.value)}>
            <option value="" disabled>Examples…</option>
            {STUDIO_EXAMPLES.map((e) => <option key={e.id} value={e.id}>{e.level} · {e.name}</option>)}
            <option value="empty">Start with an empty bench</option>
          </select>
        </label>
        <button type="button" className="btn" onClick={() => void shareBuild()}>Share link</button>
        <button type="button" className="btn" onClick={exportDoc}>Export</button>
        <label className="btn studio-import">Import<input type="file" accept="application/json,.json" onChange={(event) => { const f = event.target.files?.[0]; if (f) void importDoc(f); event.target.value = ""; }} /></label>
        <label className="studio-sound"><input type="checkbox" checked={soundOn} onChange={(event) => setSoundOn(event.target.checked)} /> Sound</label>
      </div>
    </div>
    {shareNote ? <p className="studio-share-note small" role="status">{shareNote} <button type="button" className="kit-clear" onClick={() => setShareNote("")}>Dismiss</button></p> : null}

    <div className="studio-layout">
      <aside className="studio-palette" aria-label="Parts">
        {PART_CATEGORIES.map((category) => <div key={category}>
          <h3>{category}</h3>
          <ul>{PART_DEFINITIONS.filter((d) => d.category === category).map((d) => <li key={d.type}>
            <button type="button" onClick={() => addPart(d.type)} title={d.summary}>
              <svg viewBox={`-4 -12 ${d.width + 8} ${d.height + 16}`} aria-hidden="true"><PartArt part={{ id: "palette", type: d.type, x: 0, y: 0, props: { ...(d.defaults ?? {}) } }} /></svg>
              <span>{d.name}</span>
            </button>
          </li>)}</ul>
        </div>)}
      </aside>

      <div className="studio-center">
        <div className="studio-canvas-wrap">
          <svg
            ref={svgRef}
            className={`studio-canvas${pending ? " wiring" : ""}`}
            viewBox={`0 0 ${CANVAS.w} ${CANVAS.h}`}
            role="application"
            aria-label="Maker Studio workbench. Add parts from the list, then click two pins to connect them with a wire."
            tabIndex={0}
            onPointerMove={(event) => {
              const point = toSvg(event);
              if (pending) setCursor(point);
              if (drag) setDrag({ ...drag, x: Math.round(point.x - drag.dx), y: Math.round(point.y - drag.dy) });
            }}
            onPointerUp={() => {
              if (drag) { const current = docRef.current; save({ ...current, parts: current.parts.map((p) => (p.id === drag.id ? { ...p, x: Math.max(0, Math.min(CANVAS.w - 60, drag.x)), y: Math.max(0, Math.min(CANVAS.h - 60, drag.y)) } : p)) }); setDrag(null); }
            }}
            onPointerDown={(event) => { if (event.target === svgRef.current) { setSelection(null); setPending(null); } }}
          >
            <defs>
              <pattern id="studio-grid" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#d5dde6" /></pattern>
            </defs>
            <rect width={CANVAS.w} height={CANVAS.h} fill="url(#studio-grid)" pointerEvents="none" />

            {/* Arduino Uno */}
            <g className="studio-uno" pointerEvents="none">
              <rect x={UNO.x} y={UNO.y} width={UNO.width} height={UNO.height} rx={10} fill="#0e7c8c" stroke="#095a66" strokeWidth={2} />
              <rect x={UNO.x - 14} y={UNO.y + 40} width={46} height={52} rx={3} fill="#c7ccd3" stroke="#6b7380" />
              <rect x={UNO.x - 8} y={UNO.y + 180} width={40} height={44} rx={4} fill="#1b1b1b" />
              <rect x={UNO.x + 150} y={UNO.y + 105} width={170} height={52} rx={3} fill="#1b1b1b" />
              <text x={UNO.x + 235} y={UNO.y + 136} textAnchor="middle" fontSize={11} fill="#c7ccd3" fontFamily="var(--ds-mono)">ATmega328P</text>
              <text x={UNO.x + 70} y={UNO.y + 150} fontSize={22} fontWeight={700} fill="#ffffff" fontFamily="var(--ds-font)">UNO</text>
              <circle cx={UNO.x + 120} cy={UNO.y + 60} r={6} fill={(live.snapshot?.duty[13] ?? 0) > 0.05 ? "#ffb020" : "#5b4a1e"} />
              <text x={UNO.x + 132} y={UNO.y + 64} fontSize={10} fill="#e8f0f8" fontFamily="var(--ds-mono)">L</text>
              <circle cx={UNO.x + 120} cy={UNO.y + 82} r={5} fill={running ? "#30d158" : "#1f4f2f"} />
              <text x={UNO.x + 132} y={UNO.y + 86} fontSize={10} fill="#e8f0f8" fontFamily="var(--ds-mono)">ON</text>
              <rect x={UNO.x + 124} y={UNO.y + 6} width={268} height={20} rx={2} fill="#1b1b1b" />
              <rect x={UNO.x + 142} y={UNO.y + UNO.height - 26} width={220} height={20} rx={2} fill="#1b1b1b" />
              {UNO_PINS.map((pin) => <text key={`l-${pin.id}`} x={pin.x} y={pin.y < UNO.y + 40 ? pin.y + 22 : pin.y - 14} textAnchor="middle" fontSize={8} fill="#e8f0f8" fontFamily="var(--ds-mono)">{pin.label}{PWM_PINS.has(pin.id) ? "~" : ""}</text>)}
            </g>

            {/* Wires */}
            {doc.wires.map((wire) => {
              const a = pinPosition(wire.a, partsForDraw), b = pinPosition(wire.b, partsForDraw);
              if (!a || !b) return null;
              const d = wirePath(a, b, endpointDirection(wire.a, partsForDraw), endpointDirection(wire.b, partsForDraw));
              const isSelected = selectedWire?.id === wire.id;
              return <g key={wire.id} className="studio-wire" onPointerDown={(event) => { event.stopPropagation(); setSelection({ kind: "wire", id: wire.id }); setTab("part"); }}>
                <path d={d} stroke="transparent" strokeWidth={14} fill="none" />
                {isSelected ? <path d={d} stroke="#0172e5" strokeWidth={8} fill="none" opacity={0.35} /> : null}
                <path d={d} stroke={WIRE_COLOURS[wire.colour] ?? WIRE_COLOURS.blue} strokeWidth={3.5} fill="none" strokeLinecap="round" />
              </g>;
            })}

            {/* Parts */}
            {partsForDraw.map((part) => {
              const def = PART_BY_TYPE[part.type];
              const isSelected = selectedPart?.id === part.id;
              const interactive = running && (part.type === "button" || part.type === "switch");
              const view = views[part.id];
              return <g key={part.id} transform={`translate(${part.x} ${part.y})`} className={`studio-part${isSelected ? " selected" : ""}`}
                data-part={part.id} data-brightness={view?.brightness?.toFixed(2)} data-angle={view?.angle} data-frequency={view?.frequency ? Math.round(view.frequency) : undefined} data-burnt={view?.burnt ? "true" : undefined}>
                <g
                  className={interactive ? "studio-part-body interactive" : "studio-part-body"}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    setSelection({ kind: "part", id: part.id });
                    if (part.type === "button" && running) { setButton(part.id, true); (event.currentTarget as Element).setPointerCapture?.(event.pointerId); return; }
                    if (part.type === "switch" && running) { setProp(part.id, "position", part.props.position === "b" ? "a" : "b"); return; }
                    if (!running) { const point = toSvg(event); setDrag({ id: part.id, dx: point.x - part.x, dy: point.y - part.y, x: part.x, y: part.y }); }
                  }}
                  onPointerUp={() => { if (part.type === "button" && pressedRef.current.has(part.id)) setButton(part.id, false); }}
                  onDoubleClick={() => { if (part.type === "switch" && !running) setProp(part.id, "position", part.props.position === "b" ? "a" : "b"); }}
                >
                  {isSelected ? <rect x={-8} y={-14} width={def.width + 16} height={def.height + 20} rx={8} fill="none" stroke="#0172e5" strokeDasharray="4 4" /> : null}
                  <rect x={0} y={0} width={def.width} height={def.height} fill="transparent" />
                  <PartArt part={part} view={views[part.id]} pressed={pressed.has(part.id)} />
                </g>
              </g>;
            })}

            {/* Pins (on top so they are always clickable) */}
            {UNO_PINS.map((pin) => {
              const endpoint = `uno:${pin.id}`;
              return <g key={endpoint} className={`studio-pin${pending === endpoint ? " pending" : ""}`} role="button" tabIndex={0} aria-label={`Arduino pin ${pin.label}`}
                onPointerDown={(event) => { event.stopPropagation(); clickPin(endpoint); }}
                onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); clickPin(endpoint); } }}>
                <circle cx={pin.x} cy={pin.y} r={9} className="studio-pin-hit" />
                <rect x={pin.x - 4} y={pin.y - 4} width={8} height={8} rx={1.5} className="studio-pin-dot" />
              </g>;
            })}
            {partsForDraw.map((part) => PART_BY_TYPE[part.type].pins.map((pin) => {
              const endpoint = `${part.id}:${pin.id}`;
              const x = part.x + pin.x, y = part.y + pin.y;
              return <g key={endpoint} className={`studio-pin part${pending === endpoint ? " pending" : ""}`} role="button" tabIndex={0} aria-label={`${PART_BY_TYPE[part.type].name} pin ${pin.label || pin.id}`}
                onPointerDown={(event) => { event.stopPropagation(); clickPin(endpoint); }}
                onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); clickPin(endpoint); } }}>
                <circle cx={x} cy={y} r={8} className="studio-pin-hit" />
                <circle cx={x} cy={y} r={3.5} className="studio-pin-dot" />
                {pin.label && pin.y >= PART_BY_TYPE[part.type].height ? <text x={x} y={y + 14} textAnchor="middle" className="studio-pin-label">{pin.label}</text> : null}
              </g>;
            }))}

            {pending && pendingPos && cursor ? <path d={wirePath(pendingPos, cursor, endpointDirection(pending, partsForDraw), { x: 0, y: 0 })} stroke={WIRE_COLOURS[wireColour]} strokeWidth={3} strokeDasharray="6 5" fill="none" pointerEvents="none" /> : null}
          </svg>
          <div className="studio-hint" aria-live="polite">{pending ? "Now click the pin to connect to. Esc cancels." : running ? "Running: press buttons on the board, and use the controls below for sensors." : "Drag parts to arrange them. Click a pin, then another pin, to add a wire."}</div>
        </div>

        <div className="studio-wirebar">
          <span>Wire colour</span>
          {Object.entries(WIRE_COLOURS).map(([name, hex]) => <button key={name} type="button" className={wireColour === name ? "active" : ""} style={{ background: hex }} aria-label={`${name} wire`} aria-pressed={wireColour === name} onClick={() => setWireColour(name)} />)}
          <span className="small muted">5V wires turn red and GND wires black automatically.</span>
          <button type="button" className={showAnalyzer ? "btn btn-primary studio-analyzer-toggle" : "btn studio-analyzer-toggle"} aria-pressed={showAnalyzer} onClick={() => setShowAnalyzer((v) => !v)}>Logic analyzer</button>
        </div>
        {showAnalyzer ? <LogicAnalyzer snapshot={analyzer} wiredPins={wiredPins} running={running} /> : null}

        {inputParts.length ? <div className="studio-controls" aria-label="Inputs and sensors">
          {inputParts.map((p) => <div key={p.id} className="studio-control">
            <strong>{partLabel(p)}</strong>
            {p.type === "button" ? <button type="button" className={pressed.has(p.id) ? "btn btn-primary" : "btn"} onPointerDown={() => setButton(p.id, true)} onPointerUp={() => setButton(p.id, false)} onPointerLeave={() => { if (pressedRef.current.has(p.id)) setButton(p.id, false); }}>{pressed.has(p.id) ? "Pressed" : "Hold to press"}</button> : null}
            {p.type === "switch" ? <button type="button" className="btn" onClick={() => setProp(p.id, "position", p.props.position === "b" ? "a" : "b")}>C ↔ {p.props.position === "b" ? "B" : "A"}</button> : null}
            {p.type === "potentiometer" ? <label><input type="range" min={0} max={1} step={0.01} value={Number(p.props.position ?? 0.5)} onChange={(e) => setProp(p.id, "position", Number(e.target.value))} /><span>{Math.round(Number(p.props.position ?? 0.5) * 100)}%</span></label> : null}
            {p.type === "light-sensor" ? <label><input type="range" min={0} max={1} step={0.01} value={Number(p.props.light ?? 0.6)} onChange={(e) => setProp(p.id, "light", Number(e.target.value))} /><span>{Math.round(Number(p.props.light ?? 0.6) * 1000)} lux</span></label> : null}
            {p.type === "temp-sensor" ? <label><input type="range" min={-10} max={60} step={1} value={Number(p.props.celsius ?? 24)} onChange={(e) => setProp(p.id, "celsius", Number(e.target.value))} /><span>{Number(p.props.celsius ?? 24)} °C</span></label> : null}
            {p.type === "ultrasonic" ? <label><input type="range" min={2} max={400} step={1} value={Number(p.props.distance ?? 60)} onChange={(e) => setProp(p.id, "distance", Number(e.target.value))} /><span>{Number(p.props.distance ?? 60)} cm</span></label> : null}
            {p.type === "pir" ? <button type="button" className={p.props.motion ? "btn btn-primary" : "btn"} onClick={() => setProp(p.id, "motion", !p.props.motion)}>{p.props.motion ? "Motion detected" : "No motion"}</button> : null}
          </div>)}
        </div> : null}

        <div className="studio-checks" aria-live="polite">
          <h3>Bench check</h3>
          {warnings.length ? <ul>{warnings.map((w) => <li key={w.message} className={`studio-warning ${w.level}`}>
            {w.partId ? <button type="button" className="kit-clear" onClick={() => { setSelection({ kind: "part", id: w.partId! }); setTab("part"); }}>{w.message}</button> : w.message}
          </li>)}</ul> : <p className="small muted">{doc.wires.length ? "No wiring problems found." : "Add parts and wires to start building."}</p>}
        </div>
      </div>

      <aside className="studio-side">
        <div className="studio-tabs" role="tablist">
          {(["code", "serial", "challenges", "part"] as Tab[]).map((t) => <button key={t} type="button" role="tab" aria-selected={tab === t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>{t === "code" ? "Code" : t === "serial" ? "Serial monitor" : t === "challenges" ? "Challenges" : "Inspector"}</button>)}
        </div>

        {tab === "code" ? <div className="studio-panel">
          {runState === "error" ? (diagnostics.length
            ? <details className="studio-error-details"><summary>Your code did not compile. Click a message to jump to the line.</summary><pre className="studio-error">{runMessage}</pre></details>
            : <pre className="studio-error" role="alert">{runMessage}</pre>) : null}
          <CodeEditor value={doc.code} diagnostics={diagnostics} onChange={(code) => save({ ...docRef.current, code })} />
          <div className="inline" style={{ marginTop: 10 }}>
            <button type="button" className="btn" onClick={() => { if (window.confirm("Replace your code with a starter sketch generated from your wiring?")) save({ ...docRef.current, code: starterCode(docRef.current) }); }}>Generate starter code from wiring</button>
          </div>
        </div> : null}

        {tab === "serial" ? <div className="studio-panel">
          <div className="studio-segment" role="group" aria-label="Serial view">
            <button type="button" aria-pressed={serialView === "text"} className={serialView === "text" ? "chip active" : "chip"} onClick={() => setSerialView("text")}>Monitor</button>
            <button type="button" aria-pressed={serialView === "plot"} className={serialView === "plot" ? "chip active" : "chip"} onClick={() => setSerialView("plot")}>Plotter</button>
          </div>
          {serialView === "text"
            ? <div className="hw-log studio-serial" tabIndex={0} aria-label="Serial output">{serial || <span className="muted">Serial.print() output appears here while the simulation runs.</span>}</div>
            : seriesNames(plot).length
              ? <SerialChart points={plot} series={seriesNames(plot)} windowMs={20_000} label="Values printed by your sketch" />
              : <p className="small muted">Print numbers to graph them, for example <code>Serial.print(&quot;temp:&quot;); Serial.println(t);</code></p>}
          <button type="button" className="kit-clear" onClick={() => { serialRef.current = ""; setSerial(""); plotRef.current = []; setPlot([]); }}>Clear</button>
        </div> : null}

        {tab === "challenges" ? <div className="studio-panel studio-challenges">
          <p className="small muted">Design the circuit and write the code yourself. The test bench drives your inputs and measures your outputs, the way an engineer tests a real product.</p>
          {CHALLENGES.map((challenge) => {
            const result = results[challenge.id];
            const passed = Array.isArray(result) && result.every((c) => c.passed);
            return <details key={challenge.id} className="studio-challenge" open={activeChallenge === challenge.id}>
              <summary><span className={`badge ${passed ? "badge-green" : ""}`}>{passed ? "Passed" : challenge.level}</span> {challenge.title}</summary>
              <p>{challenge.brief}</p>
              <p className="small muted">Skills: {challenge.concepts.join(" · ")}</p>
              <ul className="studio-criteria">{challenge.criteria.map((c) => <li key={c}>{c}</li>)}</ul>
              <div className="studio-outcomes">{challenge.outcomes.map((o) => <span key={o} className="badge" title={LEARNING_OUTCOMES[o]}>{o}</span>)}<span className="small muted">{challenge.outcomes.map((o) => LEARNING_OUTCOMES[o]).join("; ")}</span></div>
              <div className="inline">
                {challenge.starter ? <button type="button" className="btn" onClick={() => loadStarter(challenge)}>Load the broken build</button> : null}
                <button type="button" className="btn btn-primary" disabled={result === "running"} onClick={() => void runChallenge(challenge)}>{result === "running" ? "Testing…" : "Run the test bench"}</button>
              </div>
              {saveNote[challenge.id] ? <p className="small muted" role="status">{saveNote[challenge.id]}</p> : null}
              {Array.isArray(result) ? <ul className="studio-results">{result.map((check) => <li key={check.label} className={check.passed ? "pass" : "fail"}>
                <span aria-hidden="true">{check.passed ? "✓" : "✗"}</span><span><strong>{check.label}</strong>{check.detail ? <small>{check.detail}</small> : null}</span>
              </li>)}</ul> : null}
            </details>;
          })}
        </div> : null}

        {tab === "part" ? <div className="studio-panel">
          {selectedPart ? <PartInspector part={selectedPart} doc={doc} onProp={(k, v) => setProp(selectedPart.id, k, v)} onDelete={removeSelection} /> : selectedWire ? <div className="stack" style={{ gap: 12 }}>
            <h3>Wire</h3>
            <p className="small muted">{selectedWire.a.replace("uno:", "Arduino ")} → {selectedWire.b.replace("uno:", "Arduino ")}</p>
            <div className="studio-wirebar">{Object.entries(WIRE_COLOURS).map(([name, hex]) => <button key={name} type="button" className={selectedWire.colour === name ? "active" : ""} style={{ background: hex }} aria-label={`${name} wire`} onClick={() => save({ ...docRef.current, wires: docRef.current.wires.map((w) => (w.id === selectedWire.id ? { ...w, colour: name } : w)) })} />)}</div>
            <button type="button" className="btn" onClick={removeSelection}>Delete wire</button>
          </div> : <p className="small muted">Select a part or a wire on the workbench to see its pins, settings and connections.</p>}
        </div> : null}
      </aside>
    </div>
  </div>;
}

function PartInspector({ part, doc, onProp, onDelete }: { part: PlacedPart; doc: StudioDoc; onProp: (key: string, value: string | number | boolean) => void; onDelete: () => void }) {
  const def = PART_BY_TYPE[part.type];
  const connections = connectionsOf(doc, buildNets(doc), part.id);
  return <div className="stack" style={{ gap: 12 }}>
    <h3>{def.name}</h3>
    <p className="small">{def.summary}</p>
    <p className="small muted"><strong>Wiring:</strong> {def.wiring}</p>
    {part.type === "led" ? <label className="field"><span>Colour</span><select className="select" value={String(part.props.colour ?? "red")} onChange={(e) => onProp("colour", e.target.value)}>{Object.keys(LED_COLOURS).map((c) => <option key={c}>{c}</option>)}</select></label> : null}
    {part.type === "resistor" ? <label className="field"><span>Resistance</span><select className="select" value={Number(part.props.ohms ?? 220)} onChange={(e) => onProp("ohms", Number(e.target.value))}>{RESISTOR_VALUES.map((v) => <option key={v} value={v}>{formatSI(v, "Ω")}</option>)}</select></label> : null}
    <table className="studio-pins-table">
      <thead><tr><th>Pin</th><th>Connected to</th></tr></thead>
      <tbody>{def.pins.map((pin) => <tr key={pin.id}><td>{pin.label || pin.id}</td><td>{connections[pin.id] || <span className="muted">not connected</span>}</td></tr>)}</tbody>
    </table>
    <button type="button" className="btn" onClick={onDelete}>Remove part</button>
  </div>;
}
