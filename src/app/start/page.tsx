import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import { BoardPicker } from "@/components/learn/component-lab";
import { RoadmapProgress } from "@/components/learn/roadmap-progress";
import { componentCatalog } from "@/lib/build-catalog";
import { COMPONENT_GUIDES } from "@/lib/learn/guides";
import { CAREER_ROLES, ROADMAP } from "@/lib/learn/roadmap";

export const metadata: Metadata = {
  title: "Start here: learn electronics and embedded systems",
  description: "A step-by-step roadmap from your first LED to embedded-engineering skills: how every component works, how to wire it to Arduino, ESP32 or Raspberry Pi Pico, and the code.",
};

const NAMES = Object.fromEntries(componentCatalog.map((c) => [c.slug, c.name]));
const STUDIO_READY = COMPONENT_GUIDES.filter((g) => g.studio).map((g) => g.slug);
const CORE_COUNT = ROADMAP.reduce((n, s) => n + s.core.length, 0);

const LESSON_STEPS = [
  ["Understand it", "What the part does, how it works inside, and the numbers that matter."],
  ["Wire it", "A diagram and table for your board, with dividers and level shifters added where 5 V meets 3.3 V."],
  ["Program it", "Working Arduino C++ or MicroPython code, with your board's pins already filled in."],
  ["Avoid mistakes", "The faults beginners actually hit, and how to recognise them."],
  ["Check yourself", "One question that proves you understood the key idea and marks the part as learned."],
];

export default function StartPage() {
  const roleName = Object.fromEntries(ROADMAP.map((s, i) => [s.id, `${i + 1}. ${s.title}`]));
  return <div>
    <PublicHeader />
    <main>
      <section className="sample-hero start-hero">
        <div className="container">
          <div className="eyebrow">Start here</div>
          <h1>From your first LED to embedded engineer</h1>
          <p className="lead">Six stages and {CORE_COUNT} core components, in the order engineers learn them. Every component has a lesson: how it works, how to wire it to your board, the code, common mistakes and a quick check.</p>
          <div className="inline" style={{ marginTop: 18 }}>
            <a className="btn btn-primary" href="#roadmap">See the roadmap</a>
            <Link className="btn" href="/studio">No parts? Use Maker Studio</Link>
          </div>
        </div>
      </section>

      <div className="container section stack">
        <section className="card" aria-labelledby="board-heading">
          <div className="eyebrow">Before you begin</div>
          <h2 id="board-heading" style={{ marginTop: 8 }}>Which board do you have?</h2>
          <p className="small muted">Every wiring diagram and code sample will match it. Not sure? Start with the Arduino Uno: it is 5 V, forgiving, and the one Maker Studio simulates. You can change this at any time.</p>
          <BoardPicker />
        </section>

        <section aria-labelledby="lesson-heading">
          <h2 id="lesson-heading">How every component lesson works</h2>
          <ol className="lesson-steps">{LESSON_STEPS.map(([title, text], i) => <li key={title} className="card"><span className="roadmap-number" aria-hidden="true">{i + 1}</span><h3>{title}</h3><p className="small muted">{text}</p></li>)}</ol>
        </section>

        <section id="roadmap" aria-labelledby="roadmap-heading">
          <h2 id="roadmap-heading">The roadmap</h2>
          <p className="muted">Work through the core components in order; each stage ends with a project that proves the skills. Parts marked <small className="sim-key">sim</small> can also be tried in Maker Studio without hardware.</p>
          <RoadmapProgress names={NAMES} studioReady={STUDIO_READY} />
        </section>

        <section aria-labelledby="career-heading">
          <h2 id="career-heading">Where this leads</h2>
          <p className="muted">These are real roles that use these skills every day. The stages listed are where each role&apos;s core skills are built.</p>
          <div className="career-grid">{CAREER_ROLES.map((role) => <div key={role.title} className="card">
            <h3>{role.title}</h3>
            <p className="small muted">{role.what}</p>
            <p className="small"><strong>Focus on:</strong> {role.stages.map((s) => roleName[s]).join(" · ")}</p>
          </div>)}</div>
        </section>

        <section className="card" aria-labelledby="portfolio-heading">
          <div className="eyebrow">Getting hired</div>
          <h2 id="portfolio-heading" style={{ marginTop: 8 }}>Show what you can build, not just what you studied</h2>
          <div className="career-grid">
            <div><h3>Keep a build log</h3><p className="small muted">For each project, save a photo, the wiring diagram, the code and one thing that went wrong and how you found it. Debugging stories are what interviewers ask about.</p></div>
            <div><h3>Share working circuits</h3><p className="small muted">Maker Studio&apos;s Share link lets anyone open and run your circuit. Put links in your CV or portfolio.</p></div>
            <div><h3>Read the datasheet</h3><p className="small muted">Every guide gives the key numbers. Get used to checking them in the manufacturer&apos;s datasheet: it is the most valued habit in hardware work.</p></div>
            <div><h3>Finish the stage projects</h3><p className="small muted">Six projects, from a push-button light to a livestock tracker, cover the skills employers expect from a junior embedded developer.</p></div>
          </div>
          <div className="inline" style={{ marginTop: 16 }}>
            <Link className="btn" href="/components">Browse all {componentCatalog.length} components</Link>
            <Link className="btn" href="/tools">Virtual lab instruments</Link>
            <Link className="btn" href="/projects">All projects</Link>
          </div>
        </section>
      </div>
    </main>
    <PublicFooter />
  </div>;
}
