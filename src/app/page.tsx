import Link from "next/link";
import { Brand } from "@/components/brand";

export default function Home() {
  return <>
    <header className="container landing-header"><Brand/><Link className="btn" href="/login">Sign in</Link></header>
    <main>
      <section className="container hero">
        <div><div className="eyebrow">Robotics • IoT • Embedded systems</div><h1>Measure what learners can actually build.</h1><p className="lead">STEMBuild connects hands-on electronics, microcontroller programming and robotics projects with evidence, troubleshooting records, teacher rubrics and learning analytics.</p><div className="actions"><Link className="btn btn-primary" href="/login">Open MVP</Link><a className="btn" href="#how">How it works</a></div></div>
        <div className="card"><div className="eyebrow">The education gap</div><div className="problem-list" style={{marginTop:18}}>{["A quiz can show recall, not whether a circuit was wired correctly.","Teachers need evidence of debugging, sensor integration and safe hardware work.","Different boards need different pins and code without duplicating the entire lesson.","Practical progress should be visible separately from quiz scores."].map((x,i)=><div className="problem-item" key={x}><span className="problem-icon">{i+1}</span><span>{x}</span></div>)}</div></div>
      </section>
      <section id="how" className="container section"><div className="section-title"><div><div className="eyebrow">MVP workflow</div><h2>From physical build to measurable learning data</h2></div></div><div className="grid grid-4">{[
        ["1. Learn","Follow short theory, safety notes, wiring and board-specific code."],
        ["2. Build","Complete the physical task and record the actual microcontroller used."],
        ["3. Evidence","Upload private evidence and document troubleshooting attempts."],
        ["4. Assess","Teacher scores a rubric; analytics separate quiz knowledge from practical skill."],
      ].map(([t,d])=><div className="card card-muted" key={t}><h3>{t}</h3><p className="muted">{d}</p></div>)}</div></section>
      <section className="container section"><div className="grid grid-2"><div className="card"><div className="eyebrow">Hardware abstraction</div><h2 style={{marginTop:8}}>One lesson, multiple boards.</h2><p className="lead">Arduino Uno, Nano, ESP32, BBC micro:bit, Raspberry Pi Pico and STM32 can each have their own wiring, components and starter code while sharing one learning objective and assessment.</p></div><div className="card"><div className="eyebrow">Independent project</div><h2 style={{marginTop:8}}>Clean ownership boundary.</h2><p className="lead">This MVP contains only STEMBuild-owned code and synthetic DEMO data. It does not use employer branding, private student information or third-party curriculum content.</p></div></div></section>
    </main>
    <footer className="container footer">STEMBuild: Robotics & IoT — independent MVP.</footer>
  </>;
}
