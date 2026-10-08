"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BreadboardWorkshop } from "@/components/breadboard-workshop";
import {
  LED_JOURNEY_STORAGE_KEY, LED_PRACTICE_BOARD_KEY, LED_CHALLENGE_BOARD_KEY,
  canVisitJourneyStep, diagnosisQuestions, emptyLedJourney,
  knowledgeQuestions, nextJourneyStep, parseLedJourney, predictionQuestions,
  quizReady, recallQuestions, reviewDue, stepCompleted, steps,
  type LedJourney, type LearningQuestion,
} from "@/lib/led-learning-journey";
import { makeLedOfflineGuide } from "@/lib/led-offline-guide";

function downloadOfflineHtml() {
  const url = URL.createObjectURL(new Blob([makeLedOfflineGuide()], { type: "text/html;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "STEMBuild-Arduino-LED-Take-Home-Guide.html";
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function QuizDeck({
  questions, values, onSelect, section,
}: {
  questions: readonly LearningQuestion[];
  values: number[];
  onSelect: (index: number, answer: number) => void;
  section: string;
}) {
  const [hinted, setHinted] = useState<number[]>([]);
  return <div className="led-question-grid">
    {questions.map((question, index) => {
      const picked = values[index] ?? -1;
      const correct = picked === question.correct;
      return <fieldset key={question.prompt} className="led-question">
        <legend><span className="led-question-num">{String(index + 1).padStart(2, "0")}</span>{question.prompt}</legend>
        <div className="led-choices">
          {question.choices.map((choice, answer) => <button
            key={choice} type="button" aria-pressed={picked === answer}
            className={picked === answer ? "led-choice chosen" : "led-choice"}
            onClick={() => onSelect(index, answer)}
          ><span className="led-choice-letter">{String.fromCharCode(65 + answer)}</span>{choice}</button>)}
        </div>
        {picked >= 0 ? <p role="status" className={correct ? "led-answer-feedback correct" : "led-answer-feedback"}>
          <strong>{correct ? "✓ Correct." : "Try again."}</strong> {question.explanation}
        </p> : null}
        {picked < 0 && hinted.includes(index) ? <p className="led-hint">Hint: {question.hint}</p> : null}
        {picked < 0 ? <button className="led-hint-button" type="button" onClick={() => setHinted(old => old.includes(index) ? old : [...old, index])}>
          {hinted.includes(index) ? "Hint shown" : `Need a hint for ${section} question ${index + 1}?`}
        </button> : null}
      </fieldset>;
    })}
  </div>;
}

export function LedLearningJourney() {
  const [record, setRecord] = useState<LedJourney>(emptyLedJourney);
  const [hydrated, setHydrated] = useState(false);
  const [storageReady, setStorageReady] = useState(true);
  const [stage, setStage] = useState(0);
  const [hintShown, setHintShown] = useState(false);
  const [recallAnswers, setRecallAnswers] = useState<number[]>([]);
  const [status, setStatus] = useState("Your learning and simulator checkpoints save in this browser.");
  const unlocked = useMemo(() => nextJourneyStep(record), [record]);
  const finished = steps.slice(0, 7).filter((_, index) => stepCompleted(record, index)).length;
  const canNext = stepCompleted(record, stage);
  const allContentComplete = unlocked === 7;
  const now = new Date();
  const dayOneDue = reviewDue(record.challengeRunAt, 1, now);
  const weekDue = reviewDue(record.challengeRunAt, 7, now);
  const reviewOneCompleted = record.challengeRunAt ? record.recalls.some(r => reviewDue(record.challengeRunAt, 1, new Date(r.at)) && r.correct === recallQuestions.length) : false;
  const reviewSevenCompleted = record.challengeRunAt ? record.recalls.some(r => reviewDue(record.challengeRunAt, 7, new Date(r.at)) && r.correct === recallQuestions.length) : false;

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        const saved = window.localStorage.getItem(LED_JOURNEY_STORAGE_KEY);
        if (saved) {
          const restored = parseLedJourney(JSON.parse(saved));
          setRecord(restored);
          setStage(nextJourneyStep(restored));
          setStatus("Your previous learning checkpoints were restored from this browser.");
        }
      } catch {
        setStorageReady(false);
        setStatus("Saved learning data could not be loaded. Autosave is paused so we do not overwrite it. Your simulator's separate saves remain unaffected.");
      }
      setHydrated(true);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!hydrated || !storageReady) return;
    try { window.localStorage.setItem(LED_JOURNEY_STORAGE_KEY, JSON.stringify(record)); }
    catch {
      queueMicrotask(() => { setStorageReady(false); setStatus("Browser storage is unavailable. Download the take-home guide to keep reference material."); });
    }
  }, [hydrated, record, storageReady]);

  function patch(patchValues: Partial<LedJourney>) {
    setRecord(current => ({ ...current, ...patchValues }));
  }

  function selectAnswer(field: "knowledge" | "prediction" | "diagnosis", index: number, answer: number) {
    setRecord(current => {
      const next = [...current[field]];
      next[index] = answer;
      return { ...current, [field]: next };
    });
  }

  function visit(target: number) {
    if (!canVisitJourneyStep(record, target)) return;
    setStage(target);
    setHintShown(false);
    document.getElementById("led-learning-content")?.scrollIntoView({ behavior: "auto", block: "start" });
  }

  function nextStage() {
    if (canNext && stage < 7) visit(stage + 1);
  }

  function recordValidatedRun(kind: "practice" | "challenge") {
    const time = new Date().toISOString();
    setRecord(current => kind === "practice"
      ? { ...current, practiceRunAt: current.practiceRunAt ?? time }
      : { ...current, challengeRunAt: current.challengeRunAt ?? time });
    setStatus(kind === "practice"
      ? "The circuit topology and starter sketch passed the preview. This is simulated evidence, not a physical hardware pass."
      : "Fresh-board challenge: the supported simulated wiring and sketch passed. Practical teacher assessment remains separate.");
  }

  function showHint(kind: "practice" | "challenge") {
    if (hintShown) return;
    setHintShown(true);
    setRecord(current => ({ ...current,
      [kind === "practice" ? "practiceHints" : "challengeHints"]:
        current[kind === "practice" ? "practiceHints" : "challengeHints"] + 1,
    }));
  }

  function saveRecall() {
    if (!quizReady(recallAnswers, recallQuestions)) return;
    patch({ recalls: [...record.recalls.slice(-29), { at: new Date().toISOString(), correct: recallQuestions.length }] });
    setRecallAnswers([]);
    setStatus("Recall check completed. Return again later to practise remembering without prompts.");
  }

  return <section className="led-journey" aria-label="Arduino Uno LED complete learning journey">
    <div className="led-learning-top">
      <div>
        <div className="eyebrow">A COMPLETE LEARNING JOURNEY · ARDUINO UNO</div>
        <h2>From your first LED to an explanation you can give without the website.</h2>
        <p className="muted">Learn the components, predict behaviour, build in the existing circuit simulator, troubleshoot and then rebuild on a separate empty board. Your local learning record is not a teacher-verified practical assessment.</p>
      </div>
      <div className="led-progress-card" aria-label="Journey checkpoints"><span>YOUR PROGRESS</span><strong>{finished}/7</strong><small>learning checkpoints evidenced locally</small>
        <div className="led-progress-bar"><span style={{ width: `${Math.round(finished / 7 * 100)}%` }} /></div>
      </div>
    </div>

    <p role="status" className="led-storage-note">{storageReady ? "✓" : "!"} {status} {storageReady ? "It is not cloud synced." : ""}</p>

    <div className="led-learning-layout">
      <nav className="led-learning-nav" aria-label="LED learning stages">
        {steps.map((item, index) => {
          const done = stepCompleted(record, index);
          const allowed = hydrated && canVisitJourneyStep(record, index);
          return <button key={item.title} type="button"
            className={stage === index ? "led-stage-link active" : "led-stage-link"}
            disabled={!allowed}
            aria-current={stage === index ? "step" : undefined}
            onClick={() => visit(index)}
          ><span className={done ? "led-stage-count done" : "led-stage-count"}>{done ? "✓" : String(index + 1).padStart(2, "0")}</span>
            <span><strong>{item.title}</strong><small>{item.summary}</small></span>
            {index === stage ? <span className="led-stage-current">NOW</span> : null}
          </button>;
        })}
      </nav>
      <div className="led-learning-stage" id="led-learning-content" tabIndex={-1}>
        <div className="led-stage-head">
          <span className="eyebrow">STEP {String(stage + 1).padStart(2, "0")} OF 08</span>
          <h3>{steps[stage].title}</h3>
          <p className="muted">{steps[stage].summary}</p>
        </div>

        {stage === 0 ? <div className="led-stage-body">
          <div className="led-callout"><strong>Why build this?</strong><p>How can a computer control something in the physical world? An Arduino can turn an output on and off. A blinking LED is the simplest project that lets you see a program controlling a circuit.</p></div>
          <div className="led-lesson-grid">
            <article><b>01 · Arduino Uno</b><p>A programmable microcontroller board. Our output is digital pin 8 (D8).</p></article>
            <article><b>02 · Red LED</b><p>A light-emitting diode. Current should flow toward its anode (+) and out through its cathode (−).</p></article>
            <article><b>03 · 330 Ω resistor</b><p>A series component that limits current through the LED. Never deliberately bypass it.</p></article>
            <article><b>04 · Breadboard</b><p>Five holes in a numbered A–E column connect electrically. F–J form a separate strip across the centre gap.</p></article>
          </div>
          <div className="led-learning-graphic">
            {/* This file also appears on the 3D Lab hero; both teach the same tested LED topology. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/illustrations/arduino-uno-led-breadboard.svg" alt="Arduino Uno breadboard illustration showing D8, a series 330 ohm resistor, a red LED and a ground return" width={920} height={510} loading="lazy"/>
            <p className="small muted">Starter circuit: Arduino D8 → 330 Ω resistor → LED anode (+) → LED cathode (−) → GND. The resistor can also be after the LED in the same series path.</p>
          </div>
          <div className="led-safety"><strong>Before trying physical electronics:</strong> Work only with the reviewed low-voltage Uno circuit. Disconnect power when changing wires. Do not connect household electricity, AC lamps or mains-voltage relays to this project.</div>
          <button type="button" className="btn btn-primary" onClick={() => { patch({ introReviewed: true }); setStage(1); }}>I have reviewed the concepts →</button>
        </div> : null}

        {stage === 1 ? <div className="led-stage-body">
          <p>Use your understanding, not just memorised names. Select one answer per question. If you get something wrong, read the explanation and try again.</p>
          <QuizDeck section="components" questions={knowledgeQuestions} values={record.knowledge} onSelect={(i, a) => selectAnswer("knowledge", i, a)} />
        </div> : null}

        {stage === 2 ? <div className="led-stage-body">
          <div className="led-code-explainer"><strong>Read this simplified program behaviour</strong>
            <code>pinMode(8, OUTPUT);<br/>digitalWrite(8, HIGH); delay(500);<br/>digitalWrite(8, LOW); delay(500);</code>
            <p className="small muted">The Uno uses the real Arduino starter sketch in the circuit editor. This excerpt shows the output and timing logic only.</p>
          </div>
          <QuizDeck section="prediction" questions={predictionQuestions} values={record.prediction} onSelect={(i, a) => selectAnswer("prediction", i, a)} />
        </div> : null}

        {stage === 3 ? <div className="led-stage-body">
          <div className="led-callout"><strong>Practice: build the circuit yourself</strong><p>This is the same tested, hole-level Circuit Builder as STEMBuild Free Build. The practice board has its own save. Choose a component, select two breadboard holes for its leads, then connect the Arduino and complete the path.</p></div>
          <button type="button" className="btn led-tip-button" onClick={() => showHint("practice")}>{hintShown ? "Wiring tip shown" : "Show a step-by-step wiring tip"}</button>
          {hintShown ? <div className="led-hint">Try placing the resistor across <b>E6 → F6</b> and the LED with anode at <b>E11</b> and cathode at <b>F11</b>. Then use jumper wires D8 → A6, J6 → A11, and J11 → GND. Other electrically equivalent five-hole positions may also work.</div> : null}
          <div className="led-board-embedded">
            <BreadboardWorkshop active={true} learningMode storageKey={LED_PRACTICE_BOARD_KEY} onValidatedRun={() => recordValidatedRun("practice")} />
          </div>
          {record.practiceRunAt ? <p className="led-answer-feedback correct" role="status"><strong>✓ Preview verified.</strong> The supported electrical path, LED polarity and starter code passed the simulation check. Hints used: {record.practiceHints}. You can continue.</p> : null}
        </div> : null}

        {stage === 4 ? <div className="led-stage-body">
          <div className="led-callout"><strong>Engineers expect mistakes</strong><p>Debugging means checking a possible cause, observing evidence and changing one thing at a time. Here are two realistic failure scenarios to diagnose before rebuilding.</p></div>
          <QuizDeck section="troubleshooting" questions={diagnosisQuestions} values={record.diagnosis} onSelect={(i, a) => selectAnswer("diagnosis", i, a)} />
        </div> : null}

        {stage === 5 ? <div className="led-stage-body">
          <div className="led-callout"><strong>Independent rebuild challenge</strong><p>Your board below starts separately from the practice circuit. Do not use the earlier wiring tip. Identify the components, position them, connect D8 through a resistor and correctly oriented LED to GND, then run the preview.</p></div>
          <button type="button" className="btn led-tip-button" onClick={() => showHint("challenge")}>{hintShown ? "Hint shown" : "I am stuck — show one hint"}</button>
          {hintShown ? <div className="led-hint">First check that both the resistor and LED cross the breadboard centre trench; A–E and F–J are separate five-hole groups. Then follow the current path from D8 to GND.</div> : null}
          <div className="led-board-embedded">
            <BreadboardWorkshop active={true} learningMode storageKey={LED_CHALLENGE_BOARD_KEY} onValidatedRun={() => recordValidatedRun("challenge")} />
          </div>
          {record.challengeRunAt ? <p className="led-answer-feedback correct" role="status"><strong>✓ Fresh-board simulation verified.</strong> Recorded as simulator evidence, not as a teacher-checked physical build. Hints used: {record.challengeHints}.</p> : null}
        </div> : null}

        {stage === 6 ? <div className="led-stage-body">
          <div className="led-callout"><strong>Explain it to another learner</strong><p>Write an explanation in your own words. Include what the resistor does, the direction of current through the LED, what HIGH/LOW do and one troubleshooting check.</p></div>
          <label className="led-reflection-label" htmlFor="led-reflection">Your explanation</label>
          <textarea id="led-reflection" rows={8} maxLength={1200} value={record.reflection}
            onChange={event => patch({reflection:event.target.value,reflectionSubmitted:false})}
            placeholder="I connected Arduino D8 to ... I needed a resistor because ... If the LED did not light, I would check ..."
          />
          <div className="led-reflection-action"><span className="small muted">{record.reflection.trim().length}/50 minimum characters · Your writing stays in this browser.</span>
            <button type="button" className="btn btn-primary" disabled={record.reflection.trim().length < 50 || record.reflectionSubmitted}
              onClick={() => patch({reflectionSubmitted:true})}>Save my explanation</button></div>
          {record.reflectionSubmitted ? <p role="status" className="led-answer-feedback correct"><strong>✓ Reflection saved.</strong> This is a self-written explanation, not an automatically graded technical answer. A teacher or mentor should review its accuracy.</p> : null}
        </div> : null}

        {stage === 7 ? <div className="led-stage-body">
          <div className="led-callout"><strong>Take your learning home</strong><p>The guide below is a complete offline HTML document with the circuit diagram, component explanations, safety guidance, reviewed starter sketch, troubleshooting questions and a rebuild challenge. Open it in a browser even without internet; you can also print it or save it as a PDF.</p></div>
          <div className="led-finish-grid">
            <article><div className="eyebrow">OFFLINE REVISION</div><h4>Keep a learning card</h4><p>Review the concepts and Arduino sketch without staying online.</p>
              <button type="button" className="btn btn-primary" onClick={downloadOfflineHtml}>Download take-home guide (.html)</button>
            </article>
            <article><div className="eyebrow">REAL-WORLD TRANSFER</div><h4>Try physical components</h4><p>Use a real Uno, resistor, LED and breadboard with power disconnected during wiring. Ask a teacher to assess your wiring and explanation.</p>
              <Link className="btn" href="/build/first-led">Open reviewed hardware instructions</Link>
            </article>
          </div>
          <div className="led-skill-report">
            <h4>My Learning Passport · local evidence</h4>
            <p className="small muted">This shows only recorded quiz answers, simulator runs and your self-written reflection. It is not a credential or proof of a physical build.</p>
            <dl>
              <div><dt>Component knowledge</dt><dd>{quizReady(record.knowledge, knowledgeQuestions) ? "✓ Questions answered correctly" : "Not yet completed"}</dd></div>
              <div><dt>Prediction &amp; code</dt><dd>{quizReady(record.prediction, predictionQuestions) ? "✓ Questions answered correctly" : "Not yet completed"}</dd></div>
              <div><dt>Wiring simulation</dt><dd>{record.practiceRunAt ? "✓ Wiring-aware preview run" : "Not yet tested"}</dd></div>
              <div><dt>Troubleshooting</dt><dd>{quizReady(record.diagnosis, diagnosisQuestions) ? "✓ Scenarios answered correctly" : "Not yet completed"}</dd></div>
              <div><dt>Independent simulator rebuild</dt><dd>{record.challengeRunAt ? `✓ Preview run · ${record.challengeHints} hint(s)` : "Not yet tested"}</dd></div>
              <div><dt>Technical explanation</dt><dd>{record.reflectionSubmitted ? "✓ Written reflection saved · not graded" : "Not yet submitted"}</dd></div>
              <div><dt>Physical build verified by teacher</dt><dd>Not verified by this journey</dd></div>
            </dl>
          </div>
          <div className="led-recall">
            <h4>Remember it tomorrow — and next week.</h4>
            <p className="muted">Retrieval practice helps make knowledge easier to recall. STEMBuild records these checks only when you return; it does not send automatic reminders.</p>
            <div className="led-review-schedule">
              <span><strong>After 1 day</strong><small>{reviewOneCompleted ? "✓ Recall demonstrated" : dayOneDue ? "Ready for review" : "Come back after 24 hours"}</small></span>
              <span><strong>After 7 days</strong><small>{reviewSevenCompleted ? "✓ Recall demonstrated" : weekDue ? "Ready for review" : "Come back after 7 days"}</small></span>
            </div>
            <h5>Try a memory check now</h5>
            <QuizDeck section="recall" questions={recallQuestions} values={recallAnswers}
              onSelect={(index, answer) => setRecallAnswers(old => {
                const next = [...old]; next[index] = answer; return next;
              })} />
            <button type="button" className="btn btn-primary" onClick={saveRecall} disabled={!quizReady(recallAnswers, recallQuestions)}>
              Record recall check
            </button>
            <p className="small muted">Recall checks can be repeated; a one-day or seven-day review is marked only if a correct attempt happens after that interval.</p>
          </div>
        </div> : null}

        {stage < 7 ? <div className="led-stage-footer">
          <span className={canNext ? "led-step-complete" : "led-step-pending"}>{canNext ? "✓ This checkpoint is recorded" : "Complete this step before moving ahead"}</span>
          {stage > 0 ? <button type="button" className="btn" onClick={() => visit(stage - 1)}>← Previous</button> : null}
          <button type="button" className="btn btn-primary" onClick={nextStage} disabled={!canNext}>
            {stage === 6 ? "Go to take-home revision →" : "Continue learning →"}
          </button>
        </div> : <div className="led-stage-footer"><button type="button" className="btn" onClick={() => visit(6)}>← Review your explanation</button>
          <Link href="/learning-paths/first-robot" className="btn">Explore the next project →</Link></div>}
        {allContentComplete && stage !== 7 ? <p className="small muted">All seven recorded checkpoints are complete; the recall stage remains available whenever you return.</p> : null}
      </div>
    </div>
  </section>;
}
