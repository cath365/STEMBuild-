"use client";

import { useRef } from "react";
import type { Diagnostic } from "@/lib/studio/compile-errors";

const LINE_HEIGHT = 20.8; // 13px × 1.6, kept in sync with .studio-code

/** Sketch editor with line numbers and compiler diagnostics that jump to the faulty line. */
export function CodeEditor({ value, onChange, diagnostics }: { value: string; onChange: (value: string) => void; diagnostics: Diagnostic[] }) {
  const textRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const lines = value.split("\n").length;
  const marks = new Map<number, Diagnostic["severity"]>();
  for (const d of diagnostics) if (!marks.has(d.line) || d.severity === "error") marks.set(d.line, d.severity);

  function jumpTo(line: number) {
    const el = textRef.current;
    if (!el) return;
    const starts = [0];
    for (let i = 0; i < el.value.length; i++) if (el.value[i] === "\n") starts.push(i + 1);
    const start = starts[line - 1] ?? 0, end = (starts[line] ?? el.value.length + 1) - 1;
    el.focus();
    el.setSelectionRange(start, end);
    el.scrollTop = Math.max(0, (line - 4) * LINE_HEIGHT);
  }

  return <div className="code-editor">
    {diagnostics.length ? <ul className="code-diagnostics" aria-label="Compiler messages">
      {diagnostics.slice(0, 8).map((d, i) => <li key={i} className={d.severity}>
        <button type="button" onClick={() => jumpTo(d.line)}><span className="code-diag-line">Line {d.line}</span>{d.message}</button>
      </li>)}
    </ul> : null}
    <div className="code-frame">
      <div className="code-gutter" ref={gutterRef} aria-hidden="true">
        {Array.from({ length: lines }, (_, i) => <span key={i} className={marks.get(i + 1) ?? undefined}>{i + 1}</span>)}
      </div>
      <textarea ref={textRef} className="studio-code" spellCheck={false} aria-label="Arduino sketch" value={value} wrap="off"
        onScroll={(e) => { if (gutterRef.current) gutterRef.current.scrollTop = e.currentTarget.scrollTop; }}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          event.preventDefault();
          const el = event.currentTarget, start = el.selectionStart, end = el.selectionEnd;
          onChange(el.value.slice(0, start) + "  " + el.value.slice(end));
          requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = start + 2; });
        }} />
    </div>
  </div>;
}
