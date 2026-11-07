"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SerialChart } from "@/components/serial-chart";
import { useIsClient } from "@/lib/use-stored-value";
import { BAUD_RATES, buildCapture, captureToCsv, captureToPoints, formatReading, parseSerialLine, seriesNames, summarize, type SerialCapture, type SerialPoint } from "@/lib/serial-capture";

// Minimal Web Serial typings (not yet part of TypeScript's DOM lib).
type SerialPortLike = {
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
  getInfo?(): { usbVendorId?: number; usbProductId?: number };
};
type SerialLike = {
  requestPort(): Promise<SerialPortLike>;
  addEventListener(type: "disconnect", listener: (event: Event & { target: unknown }) => void): void;
  removeEventListener(type: "disconnect", listener: (event: Event & { target: unknown }) => void): void;
};

const LIVE_WINDOW_MS = 30_000;
const MAX_LIVE_POINTS = 3000;
const MAX_LOG_LINES = 300;
const MAX_RECORD_POINTS = 20_000;
const FLUSH_MS = 100;

// Common USB-serial bridges, so the learner sees a recognisable name instead of a number.
const USB_VENDORS: Record<number, string> = { 0x2341: "Arduino", 0x2a03: "Arduino", 0x1a86: "CH340 USB-serial", 0x10c4: "CP210x USB-serial", 0x0403: "FTDI USB-serial", 0x303a: "Espressif ESP32", 0x2e8a: "Raspberry Pi Pico", 0x0d28: "BBC micro:bit", 0x0483: "STM32" };

type Status = "idle" | "connecting" | "connected" | "simulating" | "error";

function getSerial() {
  return typeof navigator === "undefined" ? undefined : (navigator as Navigator & { serial?: SerialLike }).serial;
}

function friendlyError(error: unknown) {
  const name = error instanceof DOMException ? error.name : "";
  const message = error instanceof Error ? error.message : String(error);
  if (/lost|disconnected/i.test(message)) return "The board was unplugged or reset. Reconnect the USB cable and press Connect.";
  if (name === "NetworkError" || /already open|failed to open/i.test(message)) return "The port is busy. Close the Arduino IDE Serial Monitor (or any other app using the board) and try again.";
  if (name === "SecurityError") return "The browser blocked serial access on this page. Use Chrome or Edge on a secure (https) connection.";
  if (name === "BreakError" || name === "FramingError" || name === "ParityError") return "Garbled data was received. Check that the baud rate matches Serial.begin() in your sketch.";
  return `The connection stopped: ${message}`;
}

type Props = {
  /** When set, the monitor records a capture and submits it in a hidden input with this name. */
  evidenceInputName?: string;
};

export function HardwareMonitor({ evidenceInputName }: Props) {
  const evidenceMode = Boolean(evidenceInputName);
  const isClient = useIsClient();
  const supported = isClient ? Boolean(getSerial()) && window.isSecureContext : null;
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [baudRate, setBaudRate] = useState<number>(9600);
  const [device, setDevice] = useState("");
  const [paused, setPaused] = useState(false);
  const [view, setView] = useState<{ points: SerialPoint[]; log: string[]; lines: number }>({ points: [], log: [], lines: 0 });
  const [recording, setRecording] = useState(false);
  const [recordedCount, setRecordedCount] = useState(0);
  const [capture, setCapture] = useState<SerialCapture | null>(null);
  const [command, setCommand] = useState("");

  const portRef = useRef<SerialPortLike | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const simTimerRef = useRef<number | undefined>(undefined);
  const pointsRef = useRef<SerialPoint[]>([]);
  const logRef = useRef<string[]>([]);
  const linesRef = useRef(0);
  const pausedRef = useRef(false);
  const recordRef = useRef<{ points: SerialPoint[]; startedAt: Date; lines: number; log: string[] } | null>(null);
  const flushTimerRef = useRef<number | undefined>(undefined);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { pausedRef.current = paused; }, [paused]);

  const scheduleFlush = useCallback(() => {
    if (flushTimerRef.current !== undefined) return;
    flushTimerRef.current = window.setTimeout(() => {
      flushTimerRef.current = undefined;
      setView({ points: pointsRef.current.slice(), log: logRef.current.slice(), lines: linesRef.current });
      if (recordRef.current) setRecordedCount(recordRef.current.points.length);
    }, FLUSH_MS);
  }, []);

  const handleLine = useCallback((raw: string) => {
    const line = raw.replace(/\t/g, "  ").replace(/\p{Cc}/gu, "").trimEnd();
    if (!line) return;
    const values = parseSerialLine(raw);
    const point = values ? { t: performance.now(), values } : null;
    // Recording continues while the display is paused.
    const record = recordRef.current;
    if (record) {
      record.lines++;
      record.log.push(line);
      if (record.log.length > 60) record.log.shift();
      if (point && record.points.length < MAX_RECORD_POINTS) record.points.push(point);
    }
    if (!pausedRef.current) {
      linesRef.current++;
      logRef.current.push(line);
      if (logRef.current.length > MAX_LOG_LINES) logRef.current.splice(0, logRef.current.length - MAX_LOG_LINES);
      if (point) {
        pointsRef.current.push(point);
        if (pointsRef.current.length > MAX_LIVE_POINTS) pointsRef.current.splice(0, pointsRef.current.length - MAX_LIVE_POINTS);
      }
    }
    scheduleFlush();
  }, [scheduleFlush]);

  const resetBuffers = useCallback(() => {
    pointsRef.current = [];
    logRef.current = [];
    linesRef.current = 0;
    recordRef.current = null;
    setRecording(false);
    setRecordedCount(0);
    setView({ points: [], log: [], lines: 0 });
  }, []);

  const stopSimulation = useCallback(() => {
    window.clearInterval(simTimerRef.current);
    simTimerRef.current = undefined;
  }, []);

  const disconnect = useCallback(async () => {
    stopSimulation();
    const reader = readerRef.current;
    readerRef.current = null;
    try { await reader?.cancel(); } catch {}
    const port = portRef.current;
    portRef.current = null;
    try { await port?.close(); } catch {}
    setStatus((current) => current === "error" ? current : "idle");
  }, [stopSimulation]);

  // A board unplugged mid-session fires "disconnect" on navigator.serial.
  useEffect(() => {
    const serial = getSerial();
    if (!serial) return;
    const onDisconnect = (event: Event & { target: unknown }) => {
      if (event.target !== portRef.current) return;
      setError("The board was unplugged. Reconnect the USB cable and press Connect.");
      setStatus("error");
      void disconnect();
    };
    serial.addEventListener("disconnect", onDisconnect);
    return () => serial.removeEventListener("disconnect", onDisconnect);
  }, [disconnect]);

  useEffect(() => () => { void disconnect(); window.clearTimeout(flushTimerRef.current); }, [disconnect]);

  async function readLoop(port: SerialPortLike) {
    const decoder = new TextDecoder();
    let buffer = "";
    while (port.readable && portRef.current === port) {
      const reader = port.readable.getReader();
      readerRef.current = reader;
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split(/\r?\n|\r/);
          buffer = lines.pop() ?? "";
          if (buffer.length > 1000) { lines.push(buffer); buffer = ""; }
          for (const line of lines) handleLine(line);
        }
      } catch (readError) {
        // Framing/parity errors are recoverable: the loop gets a fresh reader. Anything else ends the session.
        if (!(readError instanceof DOMException && ["BreakError", "FramingError", "ParityError", "BufferOverrunError"].includes(readError.name))) {
          if (portRef.current === port) {
            setError(friendlyError(readError));
            setStatus("error");
            reader.releaseLock();
            void disconnect();
            return;
          }
          break;
        }
        setError(friendlyError(readError));
      } finally {
        reader.releaseLock();
      }
      if (readerRef.current === null) break;
    }
  }

  async function connect() {
    const serial = getSerial();
    if (!serial) return;
    setError("");
    let port: SerialPortLike;
    try {
      port = await serial.requestPort();
    } catch {
      return; // The learner closed the port picker.
    }
    setStatus("connecting");
    try {
      await port.open({ baudRate });
    } catch (openError) {
      setError(friendlyError(openError));
      setStatus("error");
      return;
    }
    resetBuffers();
    setCapture(null);
    portRef.current = port;
    const info = port.getInfo?.() ?? {};
    setDevice(info.usbVendorId !== undefined ? USB_VENDORS[info.usbVendorId] ?? `USB device ${info.usbVendorId.toString(16).padStart(4, "0")}` : "Serial device");
    setStatus("connected");
    void readLoop(port);
  }

  function simulate() {
    setError("");
    resetBuffers();
    setCapture(null);
    setDevice("Simulated signal");
    setStatus("simulating");
    const started = performance.now();
    simTimerRef.current = window.setInterval(() => {
      const s = (performance.now() - started) / 1000;
      const temp = 24 + Math.sin(s / 6) * 1.5 + (Math.random() - 0.5) * 0.3;
      const hum = 58 + Math.cos(s / 9) * 4 + (Math.random() - 0.5) * 0.8;
      handleLine(`temp:${temp.toFixed(2)},humidity:${hum.toFixed(1)}`);
    }, 200);
  }

  async function send() {
    const port = portRef.current;
    if (!port?.writable || !command) return;
    const writer = port.writable.getWriter();
    try {
      await writer.write(new TextEncoder().encode(`${command}\n`));
      logRef.current.push(`→ ${command}`);
      scheduleFlush();
      setCommand("");
    } catch (writeError) {
      setError(friendlyError(writeError));
    } finally {
      writer.releaseLock();
    }
  }

  // Clears what is on screen only; an in-progress recording keeps its readings.
  function clearView() {
    pointsRef.current = [];
    logRef.current = [];
    linesRef.current = 0;
    setView({ points: [], log: [], lines: 0 });
  }

  function startRecording() {
    setCapture(null);
    recordRef.current = { points: [], startedAt: new Date(), lines: 0, log: [] };
    setRecordedCount(0);
    setRecording(true);
  }

  function stopRecording() {
    const record = recordRef.current;
    recordRef.current = null;
    setRecording(false);
    if (!record || record.points.length < 2) {
      setError("Not enough numeric readings were recorded. Make sure your sketch prints numbers with Serial.println() and record for a few seconds.");
      return;
    }
    setError("");
    setCapture(buildCapture(record.points, { baudRate, startedAt: record.startedAt, totalLines: record.lines, log: record.log }));
  }

  function downloadCsv() {
    if (!capture) return;
    const url = URL.createObjectURL(new Blob([captureToCsv(capture)], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `stembuild-readings-${capture.startedAt.slice(0, 19).replaceAll(":", "-")}.csv`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  useEffect(() => {
    const end = logEndRef.current;
    if (end?.parentElement) end.parentElement.scrollTop = end.parentElement.scrollHeight;
  }, [view.log]);

  const live = status === "connected" || status === "simulating";
  const names = seriesNames(view.points);
  const simulated = status === "simulating" || (device === "Simulated signal" && !live);
  const capturePoints = capture ? captureToPoints(capture) : [];
  const captureSummary = capture ? summarize(capturePoints, capture.series) : [];

  return <section className="hw-monitor" aria-label="Live hardware monitor">
    {evidenceInputName ? <input type="hidden" name={evidenceInputName} value={capture && !simulated ? JSON.stringify(capture) : ""} /> : null}

    <div className="hw-toolbar">
      <label className="field hw-baud"><span>Baud rate</span><select className="select" value={baudRate} disabled={live} onChange={(event) => setBaudRate(Number(event.target.value))}>{BAUD_RATES.map((rate) => <option key={rate} value={rate}>{rate}</option>)}</select></label>
      {live
        ? <button type="button" className="btn" onClick={() => void disconnect()}>Disconnect</button>
        : <button type="button" className="btn btn-primary" disabled={!supported || status === "connecting"} onClick={() => void connect()}>{status === "connecting" ? "Connecting…" : "Connect board"}</button>}
      {!evidenceMode && !live ? <button type="button" className="btn" onClick={simulate}>Try a simulated signal</button> : null}
      {live ? <button type="button" className="btn" aria-pressed={paused} onClick={() => setPaused((value) => !value)}>{paused ? "Resume" : "Pause"}</button> : null}
      {live || view.lines ? <button type="button" className="kit-clear" onClick={clearView}>Clear graph &amp; log</button> : null}
      <span className={`hw-status hw-status-${status}`} role="status"><span className="hw-dot" aria-hidden="true" />{status === "connected" ? `Connected · ${device} · ${baudRate} baud` : status === "simulating" ? "Simulated signal · not real hardware" : status === "connecting" ? "Opening port…" : status === "error" ? "Disconnected" : "Not connected"}</span>
    </div>

    {supported === false ? <div className="notice"><strong>This browser can’t talk to USB boards.</strong> Open STEMBuild in <strong>Chrome</strong> or <strong>Edge</strong> on a Windows, macOS, Linux or ChromeOS computer to connect a real board. {evidenceMode ? "You can still submit your photo evidence and notes below." : "You can still try the simulated signal."}</div> : null}
    {error ? <div className="error" role="alert">{error}</div> : null}

    <div className="hw-grid">
      <div className="card hw-chart-card">
        <div className="hw-card-head"><h3>Live graph</h3><span className="small muted">{names.length ? `Last ${LIVE_WINDOW_MS / 1000} s · ${view.points.length} readings` : ""}</span></div>
        {names.length
          ? <SerialChart points={view.points} series={names} windowMs={LIVE_WINDOW_MS} label="Live readings from the connected board" />
          : <div className="hw-empty"><strong>{live ? "Waiting for numbers…" : "No readings yet"}</strong><span>{live ? "Text is shown in the serial log. Print values like temp:24.5,humidity:61 to graph them." : "Connect a board running a sketch that uses Serial.println()."}</span></div>}
      </div>
      <div className="card hw-log-card">
        <div className="hw-card-head"><h3>Serial monitor</h3><span className="small muted">{view.lines} lines</span></div>
        <div className="hw-log" tabIndex={0} aria-label="Serial output" aria-live="off">{view.log.length ? view.log.map((line, index) => <div key={index} className={line.startsWith("→ ") ? "hw-log-sent" : undefined}>{line}</div>) : <span className="muted">Output from Serial.print() appears here.</span>}<div ref={logEndRef} /></div>
        {/* Not a <form>: this monitor can sit inside the practical-evidence form. */}
        <div className="hw-send"><label className="sr-only" htmlFor="hw-command">Send to board</label><input id="hw-command" className="input" value={command} onChange={(event) => setCommand(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void send(); } }} placeholder={status === "connected" ? "Send a command, e.g. F or LED ON" : "Connect a board to send commands"} disabled={status !== "connected"} maxLength={120} /><button type="button" className="btn" disabled={status !== "connected" || !command} onClick={() => void send()}>Send</button></div>
      </div>
    </div>

    <div className="card hw-capture">
      <div className="hw-card-head">
        <div><h3>{evidenceMode ? "Attach real readings to this submission" : "Record a capture"}</h3><p className="small muted">{evidenceMode ? "Record while your build is running, for example cover the sensor, warm it, or move an object closer. Your teacher sees exactly what your board sent." : "Record a window of readings to review them and download them as a CSV file."}</p></div>
        <div className="inline">
          {recording ? <button type="button" className="btn btn-primary" onClick={stopRecording}>■ Stop recording ({recordedCount})</button>
            : <button type="button" className="btn" disabled={!live || (evidenceMode && simulated)} onClick={startRecording}>● {capture ? "Record again" : "Start recording"}</button>}
          {capture ? <button type="button" className="btn" onClick={downloadCsv}>Download CSV</button> : null}
          {capture && evidenceMode ? <button type="button" className="kit-clear" onClick={() => setCapture(null)}>Remove capture</button> : null}
        </div>
      </div>
      {capture ? <>
        <div className="inline" style={{ marginTop: 6 }}>
          {simulated ? <span className="badge badge-yellow">Simulated · not evidence</span> : <span className="badge badge-green">{evidenceMode ? "Will be attached when you submit" : "Captured from real hardware"}</span>}
          <span className="badge">{(capture.durationMs / 1000).toFixed(1)} s</span>
          <span className="badge">{capture.samples.length} samples stored</span>
          <span className="badge">{capture.baudRate} baud</span>
        </div>
        <SerialCaptureSummary capture={capture} summary={captureSummary} points={capturePoints} />
      </> : null}
    </div>
  </section>;
}

export function SerialCaptureSummary({ capture, summary, points }: { capture: SerialCapture; summary: ReturnType<typeof summarize>; points: SerialPoint[] }) {
  return <div className="hw-capture-body">
    <SerialChart points={points} series={capture.series} label="Recorded readings" />
    <div className="table-wrap" style={{ marginTop: 12 }}>
      <table className="hw-summary-table">
        <caption>Recorded readings summary</caption>
        <thead><tr><th>Signal</th><th>Readings</th><th>Min</th><th>Average</th><th>Max</th><th>Last</th></tr></thead>
        <tbody>{summary.map((row) => <tr key={row.name}><td>{row.name}</td><td>{row.count}</td><td>{formatReading(row.min)}</td><td>{formatReading(row.mean)}</td><td>{formatReading(row.max)}</td><td>{formatReading(row.latest)}</td></tr>)}</tbody>
      </table>
    </div>
    <details className="hw-raw"><summary>Raw serial lines ({capture.logExcerpt.length} most recent)</summary><pre className="code">{capture.logExcerpt.join("\n")}</pre></details>
  </div>;
}
