import test from "node:test";
import assert from "node:assert/strict";
import { classChallengeSummary, learnerChallengeRows, type AttemptRow } from "../../src/lib/challenge-analytics";
import { CHALLENGES, LEARNING_OUTCOMES } from "../../src/lib/studio/challenges";

const at = (minute: number) => new Date(Date.UTC(2026, 10, 8, 9, minute));
const rows: AttemptRow[] = [
  { studentId: "ana", challengeId: "blink-2hz", passed: false, createdAt: at(1) },
  { studentId: "ana", challengeId: "blink-2hz", passed: false, createdAt: at(2) },
  { studentId: "ana", challengeId: "blink-2hz", passed: true, createdAt: at(3) },
  { studentId: "ben", challengeId: "blink-2hz", passed: true, createdAt: at(4) },
  { studentId: "ben", challengeId: "register-blink", passed: false, createdAt: at(5) },
];

test("every challenge is mapped to defined learning outcomes, and debugging challenges load a broken build", () => {
  for (const challenge of CHALLENGES) {
    assert.ok(challenge.outcomes.length > 0, `${challenge.id} has outcomes`);
    for (const outcome of challenge.outcomes) assert.ok(outcome in LEARNING_OUTCOMES);
  }
  const debugging = CHALLENGES.filter((c) => c.id.startsWith("fix-"));
  assert.equal(debugging.length, 4);
  for (const challenge of debugging) {
    assert.ok(challenge.starter && challenge.starter.parts.length > 0, `${challenge.id} has a starter build`);
    assert.ok(challenge.outcomes.includes("LO4"), `${challenge.id} evidences debugging (LO4)`);
  }
  assert.equal(new Set(CHALLENGES.map((c) => c.id)).size, CHALLENGES.length, "challenge ids are unique");
});

test("class summary counts learners, passes and attempts to first pass", () => {
  const { summaries, outcomeCoverage, passedPerLearner, activeLearners } = classChallengeSummary(rows);
  const blink = summaries.find((s) => s.challenge.id === "blink-2hz")!;
  assert.deepEqual([blink.learners, blink.passedLearners, blink.attempts, blink.medianAttemptsToPass], [2, 2, 4, 2]);
  const register = summaries.find((s) => s.challenge.id === "register-blink")!;
  assert.deepEqual([register.passedLearners, register.medianAttemptsToPass], [0, null]);
  assert.equal(outcomeCoverage.find((o) => o.outcome === "LO1")!.learners, 2);
  assert.equal(outcomeCoverage.find((o) => o.outcome === "LO6")!.learners, 0);
  assert.equal(passedPerLearner.get("ben"), 1);
  assert.equal(activeLearners, 2);
});

test("learner rows report attempts and the attempt that first passed", () => {
  const ana = learnerChallengeRows(rows.filter((r) => r.studentId === "ana"));
  assert.equal(ana.length, 1);
  assert.deepEqual([ana[0].attempts, ana[0].passed, ana[0].firstPassAttempt], [3, true, 3]);
  assert.deepEqual(learnerChallengeRows([]), []);
});
