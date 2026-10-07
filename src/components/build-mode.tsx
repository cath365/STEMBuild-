"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { BuildProject, LearningLevel, StemComponent } from "@/lib/build-catalog";

type Props = {
  project: BuildProject;
  components: StemComponent[];
};

const levels: LearningLevel[] = ["Beginner", "Intermediate", "Advanced"];

export function BuildMode({ project, components }: Props) {
  const [board, setBoard] = useState(project.boards[0] ?? "");
  const [level, setLevel] = useState<LearningLevel>(project.level);
  const [step, setStep] = useState(0);
  const [checkedParts, setCheckedParts] = useState<string[]>([]);

  const storageKey = `stembuild-build-checklist-${project.slug}`;

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { board?: string; level?: LearningLevel; step?: number; checkedParts?: string[] };
      if (parsed.board && project.boards.includes(parsed.board)) setBoard(parsed.board);
      if (parsed.level && levels.includes(parsed.level)) setLevel(parsed.level);
      if (typeof parsed.step === "number") setStep(Math.max(0, Math.min(7, parsed.step)));
      if (Array.isArray(parsed.checkedParts)) setCheckedParts(parsed.checkedParts);
    } catch {}
  }, [project.boards, storageKey]);

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ board, level, step, checkedParts }));
    } catch {}
  }, [board, level, step, checkedParts, storageKey]);

  const required = useMemo(() => project.required.map((slug) => components.find((item) => item.slug === slug)).filter((item): item is StemComponent => Boolean(item)), [project.required, components]);
  const optional = useMemo(() => (project.optional ?? []).map((slug) => components.find((item) => item.slug === slug)).filter((item): item is StemComponent => Boolean(item)), [project.optional, components]);
  const missingCount = required.filter((item) => !checkedParts.includes(item.slug)).length;

  function togglePart(slug: string) {
    setCheckedParts((current) => current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug]);
  }

  const boardNote = board === "ESP32" ? "ESP32 GPIO is 3.3 V. Do not feed 5 V signals directly into GPIO."
    : board === "Raspberry Pi Pico" ? "Pico GPIO is 3.3 V. Check signal voltage before connecting modules."
    : board === "BBC micro:bit" ? "Keep external circuits within micro:bit voltage and current limits."
    : board.includes("Arduino") ? "Confirm whether your exact Arduino board uses 5 V or 3.3 V logic before wiring modules."
    : "Check the exact board voltage and pinout before connecting modules.";

  const guidance = level === "Beginner"
    ? "STEMBuild will keep the build in small steps. Test one subsystem before adding the next."
    : level === "Intermediate"
      ? "You get the build sequence and checks, but you should explain your wiring and code choices."
      : "Use the requirements as constraints. Plan the implementation, justify decisions and document tests.";

  const steps = [
    {
      title: "Understand the goal",
      body: <><p>{project.summary}</p><div className="notice"><strong>Expected result:</strong> {project.outcome}</div><p className="small muted">{guidance}</p><div className="card card-muted"><strong>No hardware yet?</strong><p className="small muted">You can use Build Mode to understand the parts, safety, sequence and troubleshooting first. Do not treat planning or simulation as proof of a physical practical skill; complete the real build when hardware is available.</p><Link className="text-link" href="/components">Explore the components first →</Link></div></>,
    },
    {
      title: "Check your components",
      body: <><p className="muted">Tick only the parts physically in front of you. This checklist is saved on this device and is not assessment evidence.</p><div className="build-parts">{required.map((item) => <label className="build-part" key={item.slug}><input type="checkbox" checked={checkedParts.includes(item.slug)} onChange={() => togglePart(item.slug)}/><span><strong>{item.name}</strong><small>{item.summary}</small></span></label>)}</div>{optional.length ? <><h3 style={{marginTop:20}}>Optional upgrades</h3><div className="build-parts">{optional.map((item) => <label className="build-part optional" key={item.slug}><input type="checkbox" checked={checkedParts.includes(item.slug)} onChange={() => togglePart(item.slug)}/><span><strong>{item.name}</strong><small>{item.summary}</small></span></label>)}</div></> : null}<p className={missingCount ? "notice" : "badge badge-green"} style={{marginTop:16}}>{missingCount ? `You still need to confirm ${missingCount} required part${missingCount === 1 ? "" : "s"}.` : "Required parts confirmed."}</p></>,
    },
    {
      title: "Safety before power",
      body: <><div className="notice"><strong>Board check:</strong> {boardNote}</div><ul className="list"><li>Disconnect power before changing wiring.</li><li>Confirm VCC, GND and signal pins from the exact module in your hand.</li><li>Do not power motors, servos, solenoids or other high-current loads directly from GPIO.</li><li>Keep beginner projects low-voltage DC. Do not use mains wiring.</li><li>If a part becomes hot, smells unusual or behaves unexpectedly, disconnect power and inspect it.</li></ul></>,
    },
    {
      title: "Build one section at a time",
      body: <><p>Do not wire the whole project at once. Use this order:</p><ol className="build-sequence"><li><strong>Power and ground</strong><span>Verify voltage and common ground where required.</span></li><li><strong>One input or sensor</strong><span>Read/print its value before adding outputs.</span></li><li><strong>One output or actuator</strong><span>Test it independently and safely.</span></li><li><strong>Combine the logic</strong><span>Only combine subsystems after each works alone.</span></li></ol><p className="small muted">Exact GPIO mappings can differ by board and module revision. STEMBuild should never encourage you to guess a pin. Use the board-specific lesson or verified pinout for your hardware.</p>{project.slug === "smart-environment-monitor" ? <Link className="btn btn-primary" href="/showcase/smart-environment-monitor">Open the verified sample wiring →</Link> : null}</>,
    },
    {
      title: "Code and run the first test",
      body: <><div className="eyebrow">FIRST TEST</div><h3 style={{marginTop:8}}>{project.firstTest}</h3><p>Watch the real result before adding more features. If the result is different from what you expected, record what happened instead of pretending the step passed.</p><div className="inline">{project.skills.map((skill) => <span className="badge" key={skill}>{skill}</span>)}</div></>,
    },
    {
      title: "Troubleshoot",
      body: <><p>Change one thing at a time. Start with the simplest causes:</p><ol className="build-sequence">{project.troubleshoot.map((item, index) => <li key={item}><strong>{index + 1}. Check {item}</strong><span>Observe the result before moving to another possibility.</span></li>)}</ol><div className="notice"><strong>Useful troubleshooting record:</strong> Problem → What I checked → What I changed → What happened.</div></>,
    },
    {
      title: "Show what really happened",
      body: <><p>When the build works—or if it still has a fault—capture honest evidence.</p><ul className="list"><li>A clear photo or short video of the physical build.</li><li>The board and components actually used.</li><li>Observed readings, movement or output.</li><li>Relevant code.</li><li>At least one test or troubleshooting step.</li></ul><p className="small muted">A local Build Mode checklist does not mark a practical skill complete. Formal STEMBuild completion still requires the signed-in evidence/teacher-review workflow.</p><Link className="btn" href="/login">Sign in to submit assessed evidence</Link></>,
    },
    {
      title: "Improve your build",
      body: <><p>The first working version is not the end. Choose one improvement and explain why it helps.</p><div className="project-match-grid">{project.improve.map((item) => <div className="card card-muted" key={item}><strong>{item}</strong><p className="small muted">Plan → change one thing → test → compare the result.</p></div>)}</div><div className="notice" style={{marginTop:18}}><strong>Build complete?</strong> Celebrate the working result, then write down one thing you now understand better than when you started.</div></>,
    },
  ];

  return <div className="build-mode">
    <section className="card build-setup">
      <div><div className="eyebrow">Build setup</div><h2>{project.title}</h2><p className="muted">Choose the board in your hands and how much guidance you want.</p></div>
      <div className="build-setup-controls">
        <label className="field"><span>Your board</span><select className="select" value={board} onChange={(event) => setBoard(event.target.value)}>{project.boards.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="field"><span>Your experience</span><select className="select" value={level} onChange={(event) => setLevel(event.target.value as LearningLevel)}>{levels.map((item) => <option key={item}>{item}</option>)}</select></label>
      </div>
    </section>

    <div className="build-progress" aria-label="Build steps">{steps.map((item, index) => <button key={item.title} type="button" aria-current={step === index ? "step" : undefined} className={step === index ? "active" : step > index ? "done" : ""} onClick={() => setStep(index)}><span>{step > index ? "✓" : index + 1}</span><small>{item.title}</small></button>)}</div>

    <section className="card build-step">
      <div className="eyebrow">STEP {step + 1} OF {steps.length}</div>
      <h2>{steps[step].title}</h2>
      <div className="build-step-body">{steps[step].body}</div>
      <div className="build-step-nav">
        <button className="btn" type="button" disabled={step === 0} onClick={() => setStep((value) => Math.max(0, value - 1))}>← Previous</button>
        {step < steps.length - 1 ? <button className="btn btn-primary" type="button" onClick={() => setStep((value) => Math.min(steps.length - 1, value + 1))}>Next step →</button> : <Link className="btn btn-primary" href="/projects">Choose another project</Link>}
      </div>
    </section>
  </div>;
}
