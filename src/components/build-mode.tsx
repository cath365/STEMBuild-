"use client";

import Link from "next/link";
import { useMemo, useRef } from "react";
import type { BuildProject, LearningLevel, StemComponent } from "@/lib/build-catalog";
import { useOwnedComponents } from "@/lib/my-components";
import { useStoredValue } from "@/lib/use-stored-value";
import { ComponentVisualCard } from "@/components/component-visual-card";
import { VerifiedBuildGuidePanel } from "@/components/verified-build-guide-panel";
import { guideBoards, guideFor } from "@/lib/verified-build-guides";

type Props = {
  project: BuildProject;
  components: StemComponent[];
};

const levels: LearningLevel[] = ["Beginner", "Intermediate", "Advanced"];

type SavedBuild = { board?: string; level?: LearningLevel; step?: number; checkedParts?: string[] };

function parseSaved(raw: string | null): SavedBuild {
  try {
    const parsed = JSON.parse(raw ?? "{}");
    return parsed && typeof parsed === "object" ? parsed as SavedBuild : {};
  } catch {
    return {};
  }
}

export function BuildMode({ project, components }: Props) {
  const stepRef = useRef<HTMLElement>(null);
  // The device-local checklist is the source of truth, so progress survives reloads and other tabs.
  const [raw, setRaw] = useStoredValue(`stembuild-build-checklist-${project.slug}`);
  const [owned] = useOwnedComponents();
  const saved = useMemo(() => parseSaved(raw), [raw]);

  const board = saved.board && project.boards.includes(saved.board) ? saved.board : project.boards[0] ?? "";
  const level = saved.level && levels.includes(saved.level) ? saved.level : project.level;
  const step = typeof saved.step === "number" ? Math.max(0, Math.min(7, saved.step)) : 0;
  // Before the learner ticks anything here, start from the parts already ticked in My Components.
  const checkedParts = Array.isArray(saved.checkedParts)
    ? saved.checkedParts
    : [...project.required, ...(project.optional ?? [])].filter((slug) => owned.includes(slug));

  function update(patch: SavedBuild) {
    setRaw(JSON.stringify({ board, level, step, checkedParts, ...patch }));
  }
  const setBoard = (value: string) => update({ board: value });
  const setLevel = (value: LearningLevel) => update({ level: value });
  const setStep = (value: number) => update({ step: value });

  const required = useMemo(() => project.required.map((slug) => components.find((item) => item.slug === slug)).filter((item): item is StemComponent => Boolean(item)), [project.required, components]);
  const optional = useMemo(() => (project.optional ?? []).map((slug) => components.find((item) => item.slug === slug)).filter((item): item is StemComponent => Boolean(item)), [project.optional, components]);
  const missingCount = required.filter((item) => !checkedParts.includes(item.slug)).length;
  const exactGuide = guideFor(project.slug, board);
  const exactGuideBoards = guideBoards(project.slug);

  function goToStep(index: number) {
    setStep(index);
    // Bring the step heading back into view when the learner has scrolled past it (common on phones).
    const card = stepRef.current;
    if (card && card.getBoundingClientRect().top < 0) {
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      card.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    }
  }

  function togglePart(slug: string) {
    update({ checkedParts: checkedParts.includes(slug) ? checkedParts.filter((item) => item !== slug) : [...checkedParts, slug] });
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
      body: <><p className="muted">Tick only the parts physically in front of you. This checklist is saved on this device and is not assessment evidence.</p><div className="build-parts">{required.map((item) => <label className="build-part" key={item.slug}><ComponentVisualCard slug={item.slug} compact /><input type="checkbox" checked={checkedParts.includes(item.slug)} onChange={() => togglePart(item.slug)}/><span><strong>{item.name}</strong><small>{item.summary}</small><Link className="text-link" href={`/components/${item.slug}`} onClick={(event) => event.stopPropagation()}>See this part →</Link></span></label>)}</div>{optional.length ? <><h3 style={{marginTop:20}}>Optional upgrades</h3><div className="build-parts">{optional.map((item) => <label className="build-part optional" key={item.slug}><ComponentVisualCard slug={item.slug} compact /><input type="checkbox" checked={checkedParts.includes(item.slug)} onChange={() => togglePart(item.slug)}/><span><strong>{item.name}</strong><small>{item.summary}</small><Link className="text-link" href={`/components/${item.slug}`} onClick={(event) => event.stopPropagation()}>See this part →</Link></span></label>)}</div></> : null}<p className={missingCount ? "notice" : "badge badge-green"} style={{marginTop:16}}>{missingCount ? `You still need to confirm ${missingCount} required part${missingCount === 1 ? "" : "s"}.` : "Required parts confirmed."}</p></>,
    },
    {
      title: "Safety before power",
      body: <><div className="notice"><strong>Board check:</strong> {boardNote}</div><ul className="list"><li>Disconnect power before changing wiring.</li><li>Confirm VCC, GND and signal pins from the exact module in your hand.</li><li>Do not power motors, servos, solenoids or other high-current loads directly from GPIO.</li><li>Keep beginner projects low-voltage DC. Do not use mains wiring.</li><li>If a part becomes hot, smells unusual or behaves unexpectedly, disconnect power and inspect it.</li></ul></>,
    },
    {
      title: exactGuide ? "Follow the reviewed wiring" : "Build one section at a time",
      body: exactGuide ? <VerifiedBuildGuidePanel guide={exactGuide} /> : <><div className="notice"><strong>No reviewed pin-by-pin guide for {board} yet.</strong> STEMBuild will not invent GPIO mappings. {exactGuideBoards.length ? <>A reviewed guide is currently available for: <strong>{exactGuideBoards.join(", ")}</strong>.</> : <>Use the safe build sequence below while a board-specific guide is prepared.</>}</div><p>Do not wire the whole project at once. Use this order:</p><ol className="build-sequence"><li><strong>Power and ground</strong><span>Verify voltage and common ground where required.</span></li><li><strong>One input or sensor</strong><span>Read/print its value before adding outputs.</span></li><li><strong>One output or actuator</strong><span>Test it independently and safely.</span></li><li><strong>Combine the logic</strong><span>Only combine subsystems after each works alone.</span></li></ol><p className="small muted">Exact GPIO mappings can differ by board and module revision. If the guide for your board is not reviewed yet, use the exact manufacturer/module documentation or ask a teacher before applying power.</p>{project.slug === "smart-environment-monitor" ? <Link className="btn btn-primary" href="/showcase/smart-environment-monitor">Open the Smart Environment Monitor sample →</Link> : null}</>,
    },
    {
      title: "Code and run the first test",
      body: <><div className="eyebrow">First test</div><h3 style={{marginTop:8}}>{project.firstTest}</h3><p>Watch the real result before adding more features. If the result is different from what you expected, record what happened instead of pretending the step passed.</p><div className="inline">{project.skills.map((skill) => <span className="badge" key={skill}>{skill}</span>)}</div><div className="card card-muted" style={{marginTop:18}}><strong>Board connected by USB?</strong><p className="small muted">Open the Live Hardware Monitor to see your board’s serial output and graph its readings in real time while you test.</p><Link className="text-link" href="/hardware-monitor" target="_blank">Open the Live Hardware Monitor →</Link></div></>,
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
      <div><h2>Set up your build</h2><p className="muted">Choose the board in your hands and how much guidance you want. Your progress is saved on this device.</p>{project.slug === "first-led" ? <Link className="text-link" href="/3d-lab">Try this project in the 3D Lab →</Link> : null}</div>
      <div className="build-setup-controls">
        <label className="field"><span>Your board</span><select className="select" value={board} onChange={(event) => setBoard(event.target.value)}>{project.boards.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="field"><span>Your experience</span><select className="select" value={level} onChange={(event) => setLevel(event.target.value as LearningLevel)}>{levels.map((item) => <option key={item}>{item}</option>)}</select></label>
      </div>
    </section>

    <div className="build-progress" aria-label="Build steps">{steps.map((item, index) => <button key={item.title} type="button" aria-current={step === index ? "step" : undefined} className={step === index ? "active" : step > index ? "done" : ""} onClick={() => goToStep(index)}><span>{step > index ? "✓" : index + 1}</span><small>{item.title}</small></button>)}</div>

    <section className="card build-step" ref={stepRef}>
      <div className="eyebrow">Step {step + 1} of {steps.length}</div>
      <h2>{steps[step].title}</h2>
      <div className="build-step-body">{steps[step].body}</div>
      <div className="build-step-nav">
        <button className="btn" type="button" disabled={step === 0} onClick={() => goToStep(Math.max(0, step - 1))}>← Previous</button>
        {step < steps.length - 1 ? <button className="btn btn-primary" type="button" onClick={() => goToStep(Math.min(steps.length - 1, step + 1))}>Next step →</button> : <Link className="btn btn-primary" href="/projects">Choose another project</Link>}
      </div>
    </section>
  </div>;
}
