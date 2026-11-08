import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import { HardwareMonitor } from "@/components/hardware-monitor";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = {
  title: "Live Hardware Monitor",
  description: "Connect a real Arduino, ESP32 or Pico over USB and see its serial output and sensor readings live in the browser.",
};

const starterSketch = `// Prints a real analog reading twice a second.
// Wire a potentiometer or LDR divider to A0, upload, then press "Connect board".
void setup() {
  Serial.begin(9600);
  Serial.println("STEMBuild monitor ready");
}

void loop() {
  int raw = analogRead(A0);
  float volts = raw * (5.0 / 1023.0);
  Serial.print("raw:");
  Serial.print(raw);
  Serial.print(",volts:");
  Serial.println(volts, 2);
  delay(500);
}`;

export default function HardwareMonitorPage() {
  return <div>
    <PublicHeader />
    <main>
      <PageHeader
        crumbs={[{ label: "Home", href: "/" }, { label: "Virtual lab", href: "/tools" }, { label: "Live hardware monitor" }]}
        title="Live hardware monitor"
        description="Connect an Arduino, ESP32, Raspberry Pi Pico or micro:bit by USB and watch its serial output and sensor readings live. Works in Chrome and Edge; readings stay in your browser."
      />
      <section className="container section stack">
        <HardwareMonitor />
        <div className="grid grid-2">
          <div className="card">
            <div className="eyebrow">Starter sketch</div>
            <h2 style={{ fontSize: 24, marginTop: 8 }}>Print readings the monitor can graph</h2>
            <p className="muted">Use <code>name:value</code> pairs separated by commas, one line per reading. This is the same format as the Arduino Serial Plotter.</p>
            <pre className="code">{starterSketch}</pre>
          </div>
          <div className="card">
            <div className="eyebrow">If it doesn’t connect</div>
            <h2 style={{ fontSize: 24, marginTop: 8 }}>Troubleshoot one thing at a time</h2>
            <ol className="list">
              <li><strong>No board in the list?</strong> Try a different USB cable: many cheap cables are charge-only. Clone boards with a CH340 chip may need its driver on Windows.</li>
              <li><strong>“Port is busy”?</strong> Close the Arduino IDE Serial Monitor/Plotter. Only one app can use the port at a time.</li>
              <li><strong>Strange characters?</strong> The baud rate must match <code>Serial.begin()</code> in your sketch.</li>
              <li><strong>Text but no graph?</strong> Print numbers, e.g. <code>temp:24.5,humidity:61</code> or <code>24.5 61</code>.</li>
              <li><strong>Board resets when you connect?</strong> That’s normal for an Uno: opening the port restarts the sketch.</li>
            </ol>
            <div className="inline" style={{ marginTop: 16 }}><Link className="btn" href="/projects">Pick a project to build</Link><Link className="btn" href="/3d-lab">Practise in the 3D Lab first</Link></div>
          </div>
        </div>
      </section>
    </main>
    <PublicFooter />
  </div>;
}
