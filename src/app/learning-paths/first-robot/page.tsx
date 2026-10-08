import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import { ComponentVisualCard } from "@/components/component-visual-card";

export const metadata: Metadata = {
  title: "First Robot Learning Path",
  description: "A guided STEMBuild progression from a first LED circuit to a complete obstacle-avoiding robot.",
};

const stages = [
  { title:"My First LED Circuit", href:"/learn/arduino-led-blink", visual:"led", why:"Learn polarity, current limiting, breadboard wiring and your first digital output.", unlock:"You can make a safe output work." },
  { title:"Push-Button Light", href:"/build/button-light", visual:"push-button", why:"Add a real input and learn that code can respond to the physical world.", unlock:"You can read an input and make a decision." },
  { title:"Automatic Light Detector", href:"/build/light-detector", visual:"ldr", why:"Move from simple HIGH/LOW signals to changing analog sensor values.", unlock:"You can measure and calibrate a sensor." },
  { title:"Smart Environment Monitor", href:"/build/smart-environment-monitor", visual:"dht11-dht22", why:"Read digital sensor data, validate it and turn measurements into useful status information.", unlock:"You can collect and interpret real data." },
  { title:"Ultrasonic Distance Lab", href:"/build/ultrasonic-distance-lab", visual:"hc-sr04", why:"Learn distance measurement by timing pulses before the sensor is attached to a moving robot.", unlock:"You can measure the space around a robot." },
  { title:"Servo Sweep Lab", href:"/build/servo-sweep-lab", visual:"servo", why:"Learn safe actuator power and position control so the robot can look left and right.", unlock:"You can control a position actuator." },
  { title:"L298N Motor Driver Test", href:"/build/motor-driver-test", visual:"l298n", why:"Control one DC motor through a driver before combining two motors on a chassis.", unlock:"You can separate motor power from controller logic." },
  { title:"Bluetooth-Controlled Car", href:"/build/bluetooth-car", visual:"dc-motor", why:"Combine two motors, a driver and wireless commands into a complete manually controlled robot.", unlock:"You can integrate multiple subsystems." },
  { title:"Obstacle-Avoiding Robot", href:"/build/obstacle-robot", visual:"hc-sr04", why:"Combine sensing, servo scanning, motor control and decision logic into an autonomous robot.", unlock:"You can build, test and troubleshoot a complete robot system." },
];

export default function FirstRobotLearningPathPage() {
  return <div>
    <PublicHeader />
    <main>
      <section className="learning-path-hero">
        <div className="container">
          <div className="eyebrow">STEMBUILD GUIDED PATH</div>
          <h1>From your first LED<br/><span>to a working robot.</span></h1>
          <p className="lead">Nine practical builds. Each one teaches a skill needed by the next, so beginners do not have to jump from a simple circuit straight into a complicated robot.</p>
          <div className="inline" style={{marginTop:18}}>
            <Link className="btn btn-primary" href="/learn/arduino-led-blink">Start the interactive LED lesson</Link>
            <Link className="btn" href="/build/first-led">Open the normal LED build</Link>
            <Link className="btn" href="/components">Check my components</Link>
          </div>
        </div>
      </section>

      <section className="container section">
        <div className="card">
          <div className="eyebrow">HOW TO USE THIS PATH</div>
          <div className="grid grid-3" style={{marginTop:16}}>
            <div><h3>Build, do not rush</h3><p className="small muted">Finish the real test for one stage before adding the next subsystem.</p></div>
            <div><h3>Troubleshooting counts</h3><p className="small muted">A project that fails and is carefully diagnosed can teach more than blindly copying a circuit.</p></div>
            <div><h3>Evidence stays honest</h3><p className="small muted">Clicking through this path never marks a practical complete. Teacher-reviewed evidence remains the assessment route.</p></div>
          </div>
        </div>

        <div className="section-title" style={{marginTop:34}}>
          <div><div className="eyebrow">9 STAGES</div><h2>Build one capability at a time.</h2></div>
        </div>

        <div className="learning-path-grid">
          {stages.map((stage,index)=><article className="learning-path-stage" key={stage.href}>
            <div className="learning-path-stage-number">{index+1}</div>
            <ComponentVisualCard slug={stage.visual} compact />
            <div className="stage-copy">
              <h3>{stage.title}</h3>
              <p>{stage.why}</p>
              <div className="small" style={{marginTop:7}}><strong>Unlock:</strong> {stage.unlock}</div>
            </div>
            <Link className="btn stage-action" href={stage.href}>{index===0 ? "Start here" : "Open build"} →</Link>
          </article>)}
        </div>

        <div className="notice" style={{marginTop:24}}>
          <strong>Hardware note:</strong> STEMBuild shows exact pin-by-pin wiring only where a board-specific guide has been reviewed. When a selected board does not yet have a reviewed guide, the platform keeps the general build sequence but does not guess GPIO pins.
        </div>
      </section>
    </main>
    <PublicFooter />
  </div>;
}
