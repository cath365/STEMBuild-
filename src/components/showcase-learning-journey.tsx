type JourneyStatus = "CONTENT" | "RECORDED" | "PENDING" | "REVIEWED";

const steps = [
  ["Introduction", "Understand what environmental sensing means and what the monitor will measure."],
  ["Components", "Identify the board, breadboard, jumper wires, temperature/humidity sensor, LEDs and optional buzzer."],
  ["Safety", "Check low-voltage power, polarity and board/sensor voltage requirements before wiring."],
  ["Wiring", "Follow the selected board's pin map and inspect every connection before applying power."],
  ["Code", "Read the board-specific source code and identify where sensor readings are converted into information."],
  ["Run test", "Upload the program and observe serial output. A test is not treated as successful until evidence supports it."],
  ["Record readings", "Record temperature and humidity readings and note whether they are plausible and stable."],
  ["Troubleshoot", "If readings are missing or implausible, test power, ground, data pin, library/toolchain and wiring one item at a time."],
  ["Assessment questions", "Complete the knowledge check. Quiz events are stored separately from practical evidence."],
  ["Upload evidence", "Submit a clear setup/result image or PDF plus notes, code and troubleshooting evidence."],
  ["Teacher rubric", "A teacher scores circuit setup, sensor use, code, testing/debugging, evidence and explanation."],
  ["Learning analytics update", "Stored learner events and teacher rubric scores update skill analytics; STEMBuild does not invent progress."],
] as const;

export function ShowcaseLearningJourney({
  lessonStarted,
  quizAttempted,
  evidenceSubmitted,
  teacherReviewed,
}: {
  lessonStarted: boolean;
  quizAttempted: boolean;
  evidenceSubmitted: boolean;
  teacherReviewed: boolean;
}) {
  function status(index: number): JourneyStatus {
    if (index <= 7) return lessonStarted ? "RECORDED" : "CONTENT";
    if (index === 8) return quizAttempted ? "RECORDED" : "PENDING";
    if (index === 9) return evidenceSubmitted ? "RECORDED" : "PENDING";
    if (index === 10) return teacherReviewed ? "REVIEWED" : "PENDING";
    return teacherReviewed ? "RECORDED" : "PENDING";
  }

  const label: Record<JourneyStatus, string> = {
    CONTENT: "Learning content",
    RECORDED: "Activity recorded",
    PENDING: "Not yet evidenced",
    REVIEWED: "Teacher reviewed",
  };

  return <section className="card showcase-journey">
    <div className="eyebrow">Showcase learning journey</div>
    <h2 style={{fontSize:28,margin:"8px 0"}}>Smart Environment Monitor · 12-step build path</h2>
    <p className="muted">The journey separates instructions from evidence. Opening a step does not mark it successful; quizzes, submissions and teacher review create the authoritative records.</p>
    <div className="grid grid-3" style={{marginTop:14}}>
      <div className="card card-muted"><div className="eyebrow">Measure</div><strong>Temperature + humidity</strong><div className="small muted">Read real environmental sensor values.</div></div>
      <div className="card card-muted"><div className="eyebrow">Interpret</div><strong>Turn data into information</strong><div className="small muted">Use serial output and simple LED indicators.</div></div>
      <div className="card card-muted"><div className="eyebrow">Evidence</div><strong>Verify what actually happened</strong><div className="small muted">Readings, photos, troubleshooting and teacher review.</div></div>
    </div>
    <div className="journey-grid" style={{marginTop:16}}>
      {steps.map(([title, description], index) => {
        const state = status(index);
        return <div className="journey-step" key={title}>
          <div className="journey-number">{index + 1}</div>
          <div>
            <div className="inline"><strong>{title}</strong><span className={state === "REVIEWED" ? "badge badge-green" : state === "PENDING" ? "badge badge-yellow" : "badge"}>{label[state]}</span></div>
            <div className="small muted" style={{marginTop:5}}>{description}</div>
          </div>
        </div>;
      })}
    </div>
  </section>;
}
