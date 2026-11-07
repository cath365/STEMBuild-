"use client";

import { useEffect, useRef, useState } from "react";
import { compileUnoFirmware, startUnoBoard, type UnoBoardSimulation } from "@/lib/avr-browser-engine";
import { parseSerialLine, seriesNames, type SerialPoint } from "@/lib/serial-capture";
import { SerialChart } from "@/components/serial-chart";
import { useStoredValue } from "@/lib/use-stored-value";

const EXAMPLES: { id: string; name: string; code: string }[] = [
  { id: "blink", name: "Blink (D13 + D8)", code: `// Blink: the "Hello, world" of electronics.
void setup() {
  pinMode(13, OUTPUT);   // the built-in "L" LED
  pinMode(8, OUTPUT);
}

void loop() {
  digitalWrite(13, HIGH);
  digitalWrite(8, LOW);
  delay(500);
  digitalWrite(13, LOW);
  digitalWrite(8, HIGH);
  delay(500);
}
` },
  { id: "button", name: "Push button → LED", code: `// Press button D2: the LED on D8 lights. INPUT_PULLUP means pressed = LOW.
void setup() {
  pinMode(2, INPUT_PULLUP);
  pinMode(8, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  bool pressed = digitalRead(2) == LOW;
  digitalWrite(8, pressed ? HIGH : LOW);
  Serial.print("button:");
  Serial.println(pressed ? 1 : 0);
  delay(100);
}
` },
  { id: "fade", name: "Fade with PWM", code: `// analogWrite() makes PWM: the pin switches very fast and the LED looks dimmer.
void setup() {
  pinMode(9, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  for (int level = 0; level <= 255; level += 5) {
    analogWrite(9, level);
    Serial.print("pwm:");
    Serial.println(level);
    delay(30);
  }
  for (int level = 255; level >= 0; level -= 5) {
    analogWrite(9, level);
    delay(30);
  }
}
` },
  { id: "pot", name: "Potentiometer → brightness", code: `// Turn the A0 potentiometer: analogRead gives 0-1023, map() scales it to 0-255.
void setup() {
  pinMode(9, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  int raw = analogRead(A0);
  int brightness = map(raw, 0, 1023, 0, 255);
  analogWrite(9, brightness);
  Serial.print("raw:");
  Serial.print(raw);
  Serial.print(",volts:");
  Serial.println(raw * 5.0 / 1023.0);
  delay(200);
}
` },
  { id: "sensors", name: "Light + temperature plotter", code: `// A1 = light sensor (LDR divider), A2 = TMP36 temperature sensor.
// TMP36: 0.5 V at 0 °C and +10 mV per °C.
void setup() {
  pinMode(13, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  int light = analogRead(A1);
  float volts = analogRead(A2) * 5.0 / 1023.0;
  float tempC = (volts - 0.5) * 100.0;
  digitalWrite(13, light < 300 ? HIGH : LOW);   // night light
  Serial.print("light:");
  Serial.print(light);
  Serial.print(",tempC:");
  Serial.println(tempC);
  delay(250);
}
` },
  { id: "traffic", name: "Traffic light + crossing button", code: `// Red D10, amber D9, green D8. Press D2 to request the pedestrian crossing.
void setup() {
  pinMode(8, OUTPUT);
  pinMode(9, OUTPUT);
  pinMode(10, OUTPUT);
  pinMode(2, INPUT_PULLUP);
  Serial.begin(9600);
}

void light(int red, int amber, int green) {
  digitalWrite(10, red);
  digitalWrite(9, amber);
  digitalWrite(8, green);
}

void loop() {
  light(LOW, LOW, HIGH);
  Serial.println("GREEN - press D2 to cross");
  while (digitalRead(2) == HIGH) { delay(10); }
  light(LOW, HIGH, LOW);
  Serial.println("AMBER");
  delay(1500);
  light(HIGH, LOW, LOW);
  Serial.println("RED - walk now");
  delay(3000);
}
` },
];

const PWM_PINS = new Set([3, 5, 6, 9, 10, 11]);
const LED_PINS: Record<number, string> = { 13: "#f6b14a", 8: "#30d158", 9: "#ffd60a", 10: "#ff3b30" };

type Status = { kind: "idle" | "compiling" | "running" | "error"; message: string };

export function VirtualArduino() {
  const [stored, setStored] = useStoredValue("stembuild-virtual-arduino-code-v1");
  const [exampleId, setExampleId] = useState("blink");
  const code = stored ?? EXAMPLES[0].code;
  const [status, setStatus] = useState<Status>({ kind: "idle", message: "Press Compile & run. The first compile downloads the compiler (about once per device)." });
  const [duty, setDuty] = useState<number[]>(new Array(14).fill(0));
  const [buttons, setButtons] = useState<Record<number, boolean>>({ 2: false, 3: false });
  const [analog, setAnalog] = useState<number[]>([2.5, 2.5, 0.75, 0, 0, 0]);
  const [log, setLog] = useState<string[]>([]);
  const [points, setPoints] = useState<SerialPoint[]>([]);
  const simRef = useRef<UnoBoardSimulation | null>(null);
  const lineBuffer = useRef("");
  const lastFrame = useRef(0);
  const startedAt = useRef(0);

  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => simRef.current?.stop(), []);
  useEffect(() => { const el = logRef.current; if (el) el.scrollTop = el.scrollHeight; }, [log]);

  function stop(message = "Stopped.") {
    simRef.current?.stop();
    simRef.current = null;
    setDuty(new Array(14).fill(0));
    setStatus({ kind: "idle", message });
  }

  async function run() {
    stop("Compiling…");
    setStatus({ kind: "compiling", message: "Compiling your sketch to ATmega328P machine code…" });
    setLog([]); setPoints([]); lineBuffer.current = "";
    try {
      const firmware = await compileUnoFirmware(code);
      if (!firmware.fitsTarget) { setStatus({ kind: "error", message: `The program is ${firmware.flashBytes} bytes: too big for the Uno’s 32 KB flash.` }); return; }
      startedAt.current = performance.now();
      simRef.current = await startUnoBoard(firmware.hex, {
        analogVolts: analog,
        inputs: { 2: !buttons[2], 3: !buttons[3] },
        onFrame: (state) => {
          const now = performance.now();
          if (now - lastFrame.current < 50) return;
          lastFrame.current = now;
          setDuty(state.duty);
        },
        onSerial: (text) => {
          const lines = (lineBuffer.current + text).split(/\r?\n/);
          lineBuffer.current = lines.pop() ?? "";
          if (!lines.length) return;
          setLog((current) => [...current, ...lines].slice(-200));
          const parsed = lines.map((line) => parseSerialLine(line)).filter((values): values is Record<string, number> => Boolean(values));
          if (parsed.length) setPoints((current) => [...current, ...parsed.map((values) => ({ t: performance.now() - startedAt.current, values }))].slice(-600));
        },
      });
      setStatus({ kind: "running", message: `Running on a simulated 16 MHz ATmega328P · ${firmware.flashBytes} bytes of flash used · compiled in ${(firmware.compileMs / 1000).toFixed(1)} s` });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus({ kind: "error", message: /failed to fetch|network|import/i.test(message) ? "The compiler could not be downloaded. The first compile needs an internet connection." : message.replace(/^Browser AVR compilation failed\.\s*/, "") });
    }
  }

  function press(pin: number, pressed: boolean) {
    setButtons((current) => ({ ...current, [pin]: pressed }));
    simRef.current?.setDigitalInput(pin, !pressed); // INPUT_PULLUP wiring: pressed connects the pin to GND
  }

  function setVoltage(channel: number, volts: number) {
    setAnalog((current) => current.map((v, i) => i === channel ? volts : v));
    simRef.current?.setAnalogVoltage(channel, volts);
  }

  const running = status.kind === "running";
  const names = seriesNames(points);
  const lux = Math.round((analog[1] / 5) * 1000);
  const tempC = Math.round((analog[2] - 0.5) * 100);

  return <div className="varduino">
    <div className="varduino-grid">
      <div className="card varduino-editor">
        <div className="hw-toolbar">
          <label className="field" style={{ minWidth: 220 }}><span className="small muted" style={{ fontWeight: 700 }}>Example sketch</span><select className="select" value={exampleId} onChange={(event) => { const example = EXAMPLES.find((e) => e.id === event.target.value)!; setExampleId(example.id); setStored(example.code); }}>{EXAMPLES.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select></label>
          {running ? <button type="button" className="btn" onClick={() => stop()}>■ Stop</button> : <button type="button" className="btn btn-primary" disabled={status.kind === "compiling"} onClick={() => void run()}>{status.kind === "compiling" ? "Compiling…" : "▶ Compile & run"}</button>}
        </div>
        <label className="sr-only" htmlFor="varduino-code">Arduino sketch</label>
        <textarea id="varduino-code" className="varduino-code" spellCheck={false} value={code} onChange={(event) => setStored(event.target.value)} />
        <div className={`varduino-status ${status.kind}`} role="status">{status.message}</div>
      </div>

      <div className="card varduino-board" aria-label="Virtual Arduino Uno">
        <div className="varduino-board-head"><strong>Arduino Uno (virtual)</strong><span className={running ? "hw-status hw-status-connected" : "hw-status"}><span className="hw-dot" />{running ? "Running" : "Not running"}</span></div>
        <div className="varduino-pins" role="list" aria-label="Digital pins">
          {Array.from({ length: 14 }, (_, i) => 13 - i).map((pin) => {
            const level = duty[pin] ?? 0;
            const colour = LED_PINS[pin] ?? "#0172e5";
            return <div key={pin} className="varduino-pin" role="listitem" aria-label={`D${pin} ${level > 0.98 ? "HIGH" : level < 0.02 ? "LOW" : `PWM ${Math.round(level * 100)}%`}`}>
              <span className="varduino-led" style={{ background: level > 0.01 ? colour : "#e3eaf2", opacity: level > 0.01 ? 0.25 + 0.75 * level : 1, boxShadow: level > 0.3 ? `0 0 ${6 + 10 * level}px ${colour}` : "none" }} />
              <span className="varduino-pin-name">{pin === 13 ? "13 L" : pin}{PWM_PINS.has(pin) ? "~" : ""}</span>
              <span className="varduino-pin-value">{level > 0.98 ? "H" : level < 0.02 ? "L" : `${Math.round(level * 100)}%`}</span>
            </div>;
          })}
        </div>
        <p className="small muted" style={{ margin: "6px 0 12px" }}>LEDs attached: D13 (built-in L), D8 green, D9 yellow, D10 red. Pins marked ~ support analogWrite() PWM.</p>
        <div className="varduino-inputs">
          {[2, 3].map((pin) => <button key={pin} type="button" className={buttons[pin] ? "varduino-button pressed" : "varduino-button"} aria-pressed={buttons[pin]}
            onPointerDown={() => press(pin, true)} onPointerUp={() => press(pin, false)} onPointerLeave={() => { if (buttons[pin]) press(pin, false); }}
            onKeyDown={(event) => { if ((event.key === " " || event.key === "Enter") && !buttons[pin]) { event.preventDefault(); press(pin, true); } }}
            onKeyUp={(event) => { if (event.key === " " || event.key === "Enter") press(pin, false); }}>
            <span className="varduino-button-cap" aria-hidden="true" />Button D{pin}</button>)}
        </div>
        <div className="varduino-analog">
          <label className="field calc-field"><span>A0 potentiometer: {analog[0].toFixed(2)} V → analogRead ≈ {Math.round(analog[0] / 5 * 1023)}</span><input type="range" min={0} max={5} step={0.05} value={analog[0]} onChange={(event) => setVoltage(0, Number(event.target.value))} /></label>
          <label className="field calc-field"><span>A1 light sensor: ~{lux} lux ({analog[1].toFixed(2)} V)</span><input type="range" min={0} max={5} step={0.05} value={analog[1]} onChange={(event) => setVoltage(1, Number(event.target.value))} /></label>
          <label className="field calc-field"><span>A2 TMP36 temperature: {tempC} °C ({analog[2].toFixed(2)} V)</span><input type="range" min={0.1} max={1.75} step={0.01} value={analog[2]} onChange={(event) => setVoltage(2, Number(event.target.value))} /></label>
        </div>
      </div>
    </div>

    <div className="hw-grid" style={{ marginTop: 16 }}>
      <div className="card hw-chart-card">
        <div className="hw-card-head"><h3>Serial plotter</h3><span className="small muted">{names.length ? `${points.length} readings` : ""}</span></div>
        {names.length ? <SerialChart points={points} series={names} windowMs={20_000} label="Values printed by the virtual Arduino" /> : <div className="hw-empty"><strong>No numbers yet</strong><span>Print values like <code>Serial.println(&quot;temp:24.5&quot;)</code> to graph them.</span></div>}
      </div>
      <div className="card hw-log-card">
        <div className="hw-card-head"><h3>Serial monitor · 9600 baud</h3><button type="button" className="kit-clear" onClick={() => { setLog([]); setPoints([]); }}>Clear</button></div>
        <div className="hw-log" ref={logRef} tabIndex={0} aria-label="Serial output">{log.length ? log.map((line, index) => <div key={index}>{line}</div>) : <span className="muted">Serial.print() output appears here.</span>}</div>
      </div>
    </div>
  </div>;
}
