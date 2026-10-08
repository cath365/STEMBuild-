"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { RobotArena } from "@/components/robot-arena";
import { RobotCADWorkspace } from "@/components/robot-cad-workspace";
import { CircuitStudio } from "@/components/circuit-studio";
import Link from "next/link";

type LabMode = "circuit" | "robot" | "cad";
const modes: {
  id: LabMode;
  title: string;
  description: string;
  tag: string;
  anchor: string;
}[] = [
  {
    id: "circuit",
    title: "Circuit Builder",
    description: "Place Arduino parts, connect reviewed wires, edit a sketch and test it.",
    tag: "Start here",
    anchor: "workbench",
  },
  {
    id: "robot",
    title: "Robot Builder",
    description: "Assemble the obstacle-avoiding robot and test it against movable blocks.",
    tag: "Build & test",
    anchor: "robot-arena",
  },
  {
    id: "cad",
    title: "CAD Workspace",
    description: "Position 3D robot parts, check their fit and export an assembly.",
    tag: "3D design",
    anchor: "robot-cad",
  },
];

function modeFromHash(hash: string): LabMode | null {
  if (hash === "#robot-arena" || hash === "#robotics") return "robot";
  if (hash === "#robot-cad" || hash === "#cad") return "cad";
  if (hash === "#workbench" || hash === "#circuit") return "circuit";
  return null;
}

export function LabModeSelector() {
  const [mode, setMode] = useState<LabMode>("circuit");
  const [focused, setFocused] = useState(false);
  const tabs = useRef<Partial<Record<LabMode, HTMLButtonElement | null>>>({});

  useEffect(() => {
    const followHash = () => {
      const destination = modeFromHash(window.location.hash);
      if (destination) setMode(destination);
    };
    followHash();
    window.addEventListener("hashchange", followHash);
    return () => window.removeEventListener("hashchange", followHash);
  }, []);

  function chooseMode(next: LabMode) {
    setMode(next);
    setFocused(true);
    const anchor = modes.find((item) => item.id === next)?.anchor ?? "workbench";
    window.history.replaceState(null, "", `#${anchor}`);
  }

  useEffect(() => {
    if (!focused) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [focused]);

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const last = modes.length - 1;
    const target = event.key === "Home" ? 0
      : event.key === "End" ? last
      : event.key === "ArrowRight" ? (index + 1) % modes.length
      : (index + last) % modes.length;
    const next = modes[target].id;
    chooseMode(next);
    tabs.current[next]?.focus();
  }

  return (
    <div className={focused ? "lab-modes lab-focus" : "lab-modes"} role={focused ? "dialog" : undefined} aria-modal={focused || undefined} aria-label={focused ? "STEMBuild full workspace" : undefined} onKeyDown={event => {
      if (!focused) return;
      if (event.key === "Escape") { event.preventDefault(); setFocused(false); tabs.current[mode]?.focus(); }
      if (event.key === "Tab") {
        const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button,select,input,textarea,a[href],[tabindex="0"]')).filter(node => node.getClientRects().length && !node.hasAttribute('disabled') && node.tabIndex >= 0);
        const first = controls[0], last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    }}>
      <div className="lab-focus-bar"><strong>STEMBuild Workbench</strong><button className="btn" onClick={() => setFocused(!focused)}>{focused ? "Back to lab page" : "Open full workspace"}</button></div>
      <div className="lab-modes-heading">
        <p className="eyebrow">CHOOSE YOUR WORKSPACE</p>
        <h2>One lab. Three ways to build.</h2>
        <p>Choose a workspace below. You can switch at any time without losing the assembly or code already entered on this page.</p>
        <p className="lab-saved-notice">Projects now save automatically in this browser and restore after a restart. For another computer or protection from cleared browser data, download a project backup from the workspace. This is not account-based cloud storage yet.</p>
      </div>

      <div className="lab-modes-tabs" role="tablist" aria-label="3D Lab workspaces">
        {modes.map((item, index) => (
          <button
            key={item.id}
            ref={(node) => { tabs.current[item.id] = node; }}
            type="button"
            role="tab"
            id={`lab-tab-${item.id}`}
            aria-controls={`lab-panel-${item.id}`}
            aria-selected={mode === item.id}
            tabIndex={mode === item.id ? 0 : -1}
            onClick={() => chooseMode(item.id)}
            onKeyDown={(event) => handleTabKeyDown(event, index)}
            className={mode === item.id ? "lab-mode-tab selected" : "lab-mode-tab"}
          >
            <span className="lab-mode-top"><span>{String(index + 1).padStart(2, "0")}</span><span className="lab-mode-tag">{item.tag}</span></span>
            <strong>{item.title}</strong>
            <span className="lab-mode-description">{item.description}</span>
          </button>
        ))}
      </div>

      <div id="lab-panel-circuit" role="tabpanel" aria-labelledby="lab-tab-circuit" tabIndex={0} className="lab-mode-panel" hidden={mode !== "circuit"}>
        <div className="bb-workshop-choices">
          <div>
            <p className="eyebrow">CIRCUIT BUILDER · FREE WORKSPACE</p>
            <p>Build freely on the breadboard below. <Link href="/learn/arduino-led-blink">New to electronics? Start the complete Learn → Build → Remember LED journey.</Link> For step-by-step Arduino lessons and full AVR firmware simulation, use the guided circuit page.</p>
          </div>
          <Link className="btn" href="/3d-lab/guided">Open guided circuit lessons →</Link>
        </div>
        <CircuitStudio active={mode === "circuit"} />
      </div>
      <div id="lab-panel-robot" role="tabpanel" aria-labelledby="lab-tab-robot" tabIndex={0} className="lab-mode-panel" hidden={mode !== "robot"}>
        <RobotArena active={mode === "robot"} />
      </div>
      <div id="lab-panel-cad" role="tabpanel" aria-labelledby="lab-tab-cad" tabIndex={0} className="lab-mode-panel" hidden={mode !== "cad"}>
        <RobotCADWorkspace active={mode === "cad"} />
      </div>
    </div>
  );
}
