import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import { PageHeader } from "@/components/page-header";
import { LEARNING_OUTCOMES, CHALLENGES, type OutcomeId } from "@/lib/studio/challenges";

export const metadata: Metadata = {
  title: "How STEMBuild helps learning",
  description: "The research behind STEMBuild’s design, the skills learners can demonstrate, the data it records and how its impact will be measured.",
};

const research = [
  {
    principle: "Active learning",
    finding: "A meta-analysis of 225 studies in science, engineering and mathematics found exam scores rose by about 6% under active learning, and students in traditional lectures were 1.5 times more likely to fail.",
    applied: "Every lesson is build-and-test. Maker Studio and the virtual lab make learners do the engineering, not watch it.",
    source: "Freeman et al. (2014). Active learning increases student performance in science, engineering, and mathematics. PNAS, 111(23), 8410–8415.",
  },
  {
    principle: "Virtual and physical labs together",
    finding: "Virtual labs can be as effective as physical ones for conceptual learning, and combining the two can be more effective than either alone: simulation makes invisible quantities visible and is safe to repeat, and physical work builds real-world handling.",
    applied: "Learners design and debug in the simulator first, then build the real circuit and submit evidence. The Live hardware monitor connects the two.",
    source: "de Jong, Linn & Zacharia (2013). Physical and virtual laboratories in science and engineering education. Science, 340(6130), 305–308.",
  },
  {
    principle: "Specific, timely feedback",
    finding: "Feedback is among the most powerful influences on learning when it tells learners where they are going, how they are doing and what to do next.",
    applied: "The bench check explains wiring faults as they happen. Challenge checks say what passed, what failed and why. Teachers give rubric feedback on real builds.",
    source: "Hattie & Timperley (2007). The power of feedback. Review of Educational Research, 77(1), 81–112.",
  },
  {
    principle: "From worked examples to independence",
    finding: "Novices learn more when they move gradually from studying worked examples to solving problems on their own, because it manages cognitive load.",
    applied: "Ready-made examples to run and modify, then guided Build Mode steps, then open challenges where the learner chooses the wiring and writes the code.",
    source: "Renkl & Atkinson (2003). Structuring the transition from example study to problem solving in cognitive skill acquisition. Educational Psychologist, 38(1), 15–22.",
  },
  {
    principle: "Retrieval practice",
    finding: "Taking practice tests produces better long-term retention than spending the same time re-studying.",
    applied: "Knowledge checks in every lesson, and “predict, then measure” prompts in the multimeter and oscilloscope tools.",
    source: "Roediger & Karpicke (2006). Test-enhanced learning. Psychological Science, 17(3), 249–255.",
  },
  {
    principle: "Debugging is a learnable skill",
    finding: "Debugging is one of the hardest skills for novices, and it improves with explicit strategies and deliberate practice rather than by chance.",
    applied: "Fault-finding on the circuit bench, four “Fix it” challenges that start from a broken build, and troubleshooting records in practical submissions.",
    source: "McCauley et al. (2008). Debugging: a review of the literature from an educational perspective. Computer Science Education, 18(2), 67–92.",
  },
];

const outcomeEvidence: Record<OutcomeId, { tools: string; course: string }> = {
  LO1: { tools: "Circuit bench & multimeter, Maker Studio bench check, calculators", course: "Year 1 · Circuits and electrical principles" },
  LO2: { tools: "Virtual Arduino, Maker Studio, guided projects", course: "Year 1–2 · Introduction to microcontrollers" },
  LO3: { tools: "Maker Studio sensors and actuators, Live hardware monitor", course: "Year 2 · Sensors, instrumentation and interfacing" },
  LO4: { tools: "Fault-finding bench, “Fix it” challenges, troubleshooting records", course: "All years · Laboratory practice and project work" },
  LO5: { tools: "millis() and debounce challenges, oscilloscope", course: "Year 2–3 · Embedded systems design" },
  LO6: { tools: "Register and interrupt challenges", course: "Year 3 · Embedded C and computer architecture" },
};

const recorded = [
  ["Lesson progress and time on task", "Start and completion events, so duration comes from real activity, not page views"],
  ["Quiz attempts and answers", "Per-question results, kept separate from practical skill"],
  ["Practical evidence and rubric scores", "Photos, code, notes and criterion-level teacher scores"],
  ["Troubleshooting records", "Problem, what the learner tried and the result"],
  ["Live hardware readings", "Real sensor data captured over USB and attached to submissions"],
  ["Maker Studio challenge attempts", "Attempts, passes and attempts-to-pass for each challenge and learning outcome"],
  ["Hints and AI coaching", "Requests and plans, clearly labelled, never used to grade"],
];

const pilotMeasures = [
  ["Do practical skills improve?", "Pre/post practical task scored on a fixed rubric", "Two teachers score independently; report agreement and effect size with confidence intervals"],
  ["Does understanding improve?", "Pre/post concept quiz (same items)", "Report change alongside practical scores, never instead of them"],
  ["Do learners become independent debuggers?", "“Fix it” challenge pass rates and attempts-to-pass; troubleshooting records", "Compare early and late weeks for each learner"],
  ["Is it better than current practice?", "A comparison class following the usual scheme of work, where a school agrees", "Without a comparison group, report results as early signals only"],
  ["Does it help teachers?", "Review time per submission; short teacher interviews", "Report added workload as well as benefits"],
  ["Does it work with poor connectivity?", "Offline lesson use, sync successes and failures, compile-cache hits", "Record device and connection context"],
];

export default function HowItHelpsPage() {
  const challengesFor = (outcome: OutcomeId) => CHALLENGES.filter((c) => c.outcomes.includes(outcome)).length;
  return <div>
    <PublicHeader />
    <main className="how-page">
      <PageHeader
        crumbs={[{ label: "Home", href: "/" }, { label: "For teachers", href: "/teachers" }, { label: "How it helps" }]}
        title="How STEMBuild helps learning"
        description="The research behind each design decision, the skills learners can demonstrate, the data the platform records, and how we will measure whether it works."
      />

      <section className="container section" aria-labelledby="gap-title">
        <div className="grid grid-2">
          <div>
            <h2 id="gap-title">The gap we are designing for</h2>
            <p className="muted">Many learners can describe Ohm’s law in a test but have never built, measured or debugged a working circuit. Practical skill is hard to assess at scale, kits are often shared or scarce, and internet access is unreliable in many schools.</p>
            <p className="muted">STEMBuild is designed so learners practise in a simulator when parts are missing, build the real thing when they can, and leave evidence a teacher can assess.</p>
          </div>
          <div className="card card-muted">
            <h3>An honest status</h3>
            <p className="small muted">The principles below are well supported by published research. That does <strong>not</strong> prove that STEMBuild itself improves learning. That needs our own classroom evaluation, described at the end of this page, and we will publish the results with their sample size and limitations, whether positive or not.</p>
          </div>
        </div>
      </section>

      <section className="container section" aria-labelledby="research-title" style={{ paddingTop: 0 }}>
        <div className="section-heading"><div><h2 id="research-title">What the research says, and how we apply it</h2><p>Six findings from peer-reviewed research, each linked to a specific feature.</p></div></div>
        <div className="evidence-list">
          {research.map((item) => <article key={item.principle} className="evidence-row">
            <h3>{item.principle}</h3>
            <div><span className="evidence-label">Research found</span><p>{item.finding}</p></div>
            <div><span className="evidence-label">In STEMBuild</span><p>{item.applied}</p></div>
            <p className="evidence-source">{item.source}</p>
          </article>)}
        </div>
      </section>

      <section className="container section" aria-labelledby="outcomes-title" style={{ paddingTop: 0 }}>
        <div className="section-heading"><div><h2 id="outcomes-title">What learners can demonstrate</h2><p>Learning outcomes phrased the way engineering programmes write them. Each is evidenced by specific tools and challenges.</p></div></div>
        <div className="table-wrap"><table>
          <thead><tr><th>Outcome</th><th>Evidence in STEMBuild</th><th>Challenges</th><th>Typical university module</th></tr></thead>
          <tbody>{(Object.keys(LEARNING_OUTCOMES) as OutcomeId[]).map((id) => <tr key={id}>
            <td><strong>{id}</strong> · {LEARNING_OUTCOMES[id]}</td>
            <td>{outcomeEvidence[id].tools}</td>
            <td>{challengesFor(id)}</td>
            <td>{outcomeEvidence[id].course}</td>
          </tr>)}</tbody>
        </table></div>
      </section>

      <section className="container section" aria-labelledby="data-title" style={{ paddingTop: 0 }}>
        <div className="grid grid-2">
          <div>
            <h2 id="data-title">The data teachers and researchers get</h2>
            <p className="muted">Every value comes from a real learning action. There is no page-view tracking, learner data stays private by default, and AI never grades practical work.</p>
            <Link className="text-link" href="/teachers">See the teacher workflow →</Link>
          </div>
          <dl className="data-list">{recorded.map(([name, detail]) => <div key={name}><dt>{name}</dt><dd>{detail}</dd></div>)}</dl>
        </div>
      </section>

      <section className="container section" aria-labelledby="pilot-title" style={{ paddingTop: 0 }}>
        <div className="section-heading"><div><h2 id="pilot-title">How we will measure impact</h2><p>An 8-week pilot with one or two schools, with the measures and analysis decided before it starts so the results can be trusted.</p></div></div>
        <div className="table-wrap"><table>
          <thead><tr><th>Question</th><th>Measure</th><th>How it is analysed</th></tr></thead>
          <tbody>{pilotMeasures.map(([q, m, a]) => <tr key={q}><td><strong>{q}</strong></td><td>{m}</td><td>{a}</td></tr>)}</tbody>
        </table></div>
        <p className="small muted" style={{ marginTop: 12 }}>Learners and parents give informed consent, data is de-identified before analysis, and no learner work is published without permission.</p>
      </section>

      <section className="container section" aria-labelledby="partners-title" style={{ paddingTop: 0 }}>
        <div className="card partner-card">
          <div>
            <h2 id="partners-title">For universities and partners</h2>
            <p className="muted">STEMBuild can support first-year laboratory preparation (pre-lab simulation, then the physical lab), act as a backup lab when equipment is scarce, and give a shared practical-skills baseline for incoming students.</p>
          </div>
          <ul className="list">
            <li>Review lesson and challenge content for technical accuracy</li>
            <li>Co-run the pilot evaluation and its ethics process</li>
            <li>Co-publish the findings, including what did not work</li>
          </ul>
          <div className="inline"><Link className="btn btn-primary" href="/studio">Try Maker Studio</Link><Link className="btn" href="/about">About the project</Link></div>
        </div>
      </section>
    </main>
    <PublicFooter />
  </div>;
}
