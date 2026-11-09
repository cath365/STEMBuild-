"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { BOARDS, BOARD_BY_ID, type CodeLanguage } from "@/lib/learn/boards";
import { nextAfter } from "@/lib/learn/roadmap";
import { studioDocFor } from "@/lib/learn/studio-build";
import type { CheckQuestion, ComponentGuide } from "@/lib/learn/types";
import { codeFor, librariesFor, wiringFor, type WireRow } from "@/lib/learn/wiring";
import { encodeBuild, SHARE_PREFIX } from "@/lib/studio/share";
import { useBoard, useLearned } from "@/components/learn/use-learning";

const ROLE_COLOUR: Record<string, string> = {
  vcc: "#d93025", gnd: "#1f2937", analog: "#e37400", pwm: "#8e24aa", servo: "#8e24aa", digital: "#1a73e8",
  sda: "#188038", scl: "#188038", mosi: "#00838f", miso: "#00838f", sck: "#00838f", cs: "#00838f", tx: "#b06000", rx: "#b06000", ext: "#6a7a8d",
};

const ROLE_NAME: Record<string, string> = {
  vcc: "power", gnd: "ground", analog: "analog in", pwm: "PWM", servo: "servo pulse", digital: "digital",
  sda: "I2C data", scl: "I2C clock", mosi: "SPI data out", miso: "SPI data in", sck: "SPI clock", cs: "SPI select", tx: "serial out", rx: "serial in", ext: "off-board", nc: "unused",
};

function shortVia(via: string) {
  return via.split(" + ").map((part) => {
    if (part.includes("divider")) return "÷ divider";
    if (part.includes("shifter")) return "level shifter";
    const ohms = /([\d.]+\s*k?Ω)/.exec(part);
    return ohms ? ohms[1] : part;
  }).join(" + ");
}

function clip(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/** Board on the left, component on the right, one straight wire per connection. */
function WiringDiagram({ rows, boardName, partName }: { rows: WireRow[]; boardName: string; partName: string }) {
  const boardRows = rows.filter((r) => r.boardPin);
  const extRows = rows.filter((r) => !r.boardPin && r.role !== "nc");
  const drawn = [...boardRows, ...extRows];
  const rowH = 38, top = 58;
  const height = top + drawn.length * rowH + 14;
  const boardBottom = top + boardRows.length * rowH - 8;
  return <svg className="wiring-diagram" viewBox={`0 0 760 ${height}`} role="img" aria-label={`Wiring diagram: ${partName} connected to ${boardName}`}>
    {boardRows.length ? <g>
      <rect x={16} y={16} width={220} height={boardBottom - 8} rx={10} className="wd-board" />
      <text x={30} y={40} className="wd-title wd-title-light">{clip(boardName, 26)}</text>
    </g> : null}
    <rect x={524} y={16} width={220} height={height - 30} rx={10} className="wd-part" />
    <text x={538} y={40} className="wd-title">{clip(partName, 26)}</text>
    {drawn.map((row, i) => {
      const y = top + i * rowH + 12;
      const colour = ROLE_COLOUR[row.role] ?? "#6a7a8d";
      const onBoard = Boolean(row.boardPin);
      return <g key={row.pinId}>
        {onBoard ? <>
          <text x={224} y={y + 4} textAnchor="end" className="wd-pin wd-pin-light">{clip(row.target, 24)}</text>
          <circle cx={236} cy={y} r={4.5} fill={colour} />
        </> : <text x={244} y={y + 4} textAnchor="end" className="wd-ext">{clip(row.target, 34)}</text>}
        <line x1={onBoard ? 236 : 252} x2={524} y1={y} y2={y} stroke={colour} strokeWidth={2.4} strokeDasharray={onBoard ? undefined : "6 5"} />
        {row.via ? <g>
          <rect x={300} y={y - 11} width={160} height={22} rx={5} className={row.warn ? "wd-via wd-via-warn" : "wd-via"} />
          <text x={380} y={y + 4} textAnchor="middle" className="wd-via-text">{clip(shortVia(row.via), 24)}</text>
        </g> : null}
        <circle cx={524} cy={y} r={4.5} fill={colour} />
        <text x={536} y={y + 4} className="wd-pin">{clip(row.pinLabel, 26)}</text>
      </g>;
    })}
  </svg>;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return <button type="button" className="btn btn-small" onClick={async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); window.setTimeout(() => setCopied(false), 1600); } catch { /* clipboard blocked: the code stays selectable */ }
  }}>{copied ? "Copied" : "Copy code"}</button>;
}

export function BoardPicker() {
  const [board, setBoard] = useBoard();
  return <div className="mcu-picker" role="radiogroup" aria-label="Your board">
    {BOARDS.map((b) => <button key={b.id} type="button" role="radio" aria-checked={board === b.id} className="mcu-choice" onClick={() => setBoard(b.id)}>
      <strong>{b.name}</strong><span>{b.logic} V logic</span>
    </button>)}
  </div>;
}

export function ComponentLab({ guide, name }: { guide: ComponentGuide; name: string }) {
  const [boardId] = useBoard();
  const board = BOARD_BY_ID[boardId];
  const wiring = useMemo(() => wiringFor(guide, board), [guide, board]);
  const [chosenLanguage, setLanguage] = useState<CodeLanguage>("arduino");
  const language = board.languages.includes(chosenLanguage) ? chosenLanguage : "arduino";
  const code = codeFor(guide, board, wiring, language);
  const libraries = librariesFor(guide, board, language);
  const [opening, setOpening] = useState(false);
  const router = useRouter();
  const hasMicroPython = Boolean(guide.code?.micropython);

  async function openInStudio() {
    const doc = studioDocFor(guide);
    if (!doc) return;
    setOpening(true);
    router.push(`/studio${SHARE_PREFIX}${await encodeBuild(doc)}`);
  }

  return <>
    <section className="card guide-section" id="wire-it" aria-labelledby="wire-heading">
      <div className="eyebrow">Step 2 · Wire it</div>
      <h2 id="wire-heading" style={{ marginTop: 8 }}>Connect it to your board</h2>
      <p className="small muted">Pick the board you have. Pins, voltages and code change to match it, and the choice is remembered on every guide.</p>
      <BoardPicker />
      {wiring.warnings.length ? <div className="notice guide-warnings" role="note">{wiring.warnings.map((w) => <p key={w}>{w}</p>)}</div> : null}
      <div className="wiring-diagram-wrap"><WiringDiagram rows={wiring.rows} boardName={board.name} partName={name} /></div>
      <div className="table-wrap">
        <table className="guide-wiring-table">
          <thead><tr><th scope="col">{name} pin</th><th scope="col">Connect to</th><th scope="col">Through</th><th scope="col">Notes</th></tr></thead>
          <tbody>{wiring.rows.map((row) => <tr key={row.pinId} className={row.warn ? "row-warn" : undefined}>
            <th scope="row"><span className="role-dot" style={{ background: ROLE_COLOUR[row.role] ?? "#aab4c0" }} aria-hidden="true" />{row.pinLabel}<small>{ROLE_NAME[row.role]}</small></th>
            <td data-label="Connect to"><strong>{row.target}</strong></td>
            <td data-label="Through" data-empty={row.via ? undefined : "true"}>{row.via ?? "—"}</td>
            <td data-label="Notes" data-empty={row.warn || row.notes.length ? undefined : "true"}>{row.warn ? <p className="guide-warn">⚠ {row.warn}</p> : null}{row.notes.map((n) => <p key={n}>{n}</p>)}</td>
          </tr>)}</tbody>
        </table>
      </div>
      <p className="small muted">Wire with the power off. Check every row against the table before you plug in USB.</p>
    </section>

    {code ? <section className="card guide-section" id="code-it" aria-labelledby="code-heading">
      <div className="eyebrow">Step 3 · Program it</div>
      <div className="guide-code-head">
        <h2 id="code-heading">Code for {board.name}</h2>
        {hasMicroPython && board.languages.includes("micropython") ? <div className="segmented" role="tablist" aria-label="Language">
          {(["arduino", "micropython"] as const).map((l) => <button key={l} type="button" role="tab" aria-selected={language === l} onClick={() => setLanguage(l)}>{l === "arduino" ? "Arduino C++" : "MicroPython"}</button>)}
        </div> : null}
      </div>
      {libraries.length ? <p className="small"><strong>Install first:</strong> {libraries.join(" · ")}</p> : null}
      <div className="guide-code-wrap">
        <CopyButton text={code} />
        <pre className="guide-code" tabIndex={0} aria-label={`${language === "arduino" ? "Arduino" : "MicroPython"} code`}><code>{code}</code></pre>
      </div>
      {guide.expected ? <p><strong>What you should see:</strong> {guide.expected}</p> : null}
      <p className="small muted">{language === "arduino" ? `Arduino IDE: choose ${board.name} under Tools → Board${board.id === "esp32" ? " (install the esp32 boards package first)" : board.id === "pico" ? " (install the Raspberry Pi Pico/RP2040 boards package first)" : ""}, then open Tools → Serial Monitor at 115200 baud.` : "Thonny: select MicroPython for your board (bottom right), paste the code and press Run."}</p>
    </section> : null}

    {guide.studio ? <section className="card guide-section guide-try" aria-labelledby="try-heading">
      <div>
        <div className="eyebrow">No parts yet?</div>
        <h2 id="try-heading" style={{ marginTop: 8 }}>Try this exact circuit in Maker Studio</h2>
        <p className="small muted">Opens the wiring and code above on a simulated Arduino Uno{board.id !== "uno" ? " (the simulator uses Uno pins)" : ""}. Press Run, then change the code and see what happens.</p>
      </div>
      <button type="button" className="btn btn-primary" onClick={openInStudio} disabled={opening}>{opening ? "Opening…" : "Open in Maker Studio"}</button>
    </section> : null}
  </>;
}

export function GuideCheck({ slug, check, names, step }: { slug: string; check: CheckQuestion; names: Record<string, string>; step: number }) {
  const [learned, markLearned] = useLearned();
  const [choice, setChoice] = useState<number | null>(null);
  const answered = choice !== null;
  const correct = choice === check.answer;
  const next = nextAfter(slug, learned.has(slug) || correct ? new Set([...learned, slug]) : learned);

  return <section className="card guide-section" id="check" aria-labelledby="check-heading">
    <div className="eyebrow">Step {step} · Check yourself</div>
    <h2 id="check-heading" style={{ marginTop: 8 }}>{check.question}</h2>
    <div className="guide-options" role="radiogroup" aria-label={check.question}>
      {check.options.map((option, i) => <button key={option} type="button" role="radio" aria-checked={choice === i}
        className={answered && i === check.answer ? "guide-option is-right" : answered && i === choice ? "guide-option is-wrong" : "guide-option"}
        onClick={() => { setChoice(i); if (i === check.answer) markLearned(slug); }}>{option}</button>)}
    </div>
    {answered ? <div className={correct ? "guide-feedback is-right" : "guide-feedback is-wrong"} role="status">
      {correct ? <><strong>Correct.</strong> {check.why} <span>Marked as learned on your roadmap.</span></> : <><strong>Not quite.</strong> Re-read &ldquo;How it works&rdquo; above and try another answer.</>}
    </div> : learned.has(slug) ? <p className="small muted" role="status">You have already learned this one. ✓</p> : null}
    {next && (correct || learned.has(slug)) ? <p style={{ marginTop: 12 }}><Link className="text-link" href={`/components/${next}`}>Next on your roadmap: {names[next] ?? next} →</Link></p> : null}
  </section>;
}
