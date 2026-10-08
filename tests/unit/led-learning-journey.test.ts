import test from "node:test";
import assert from "node:assert/strict";
import {
  knowledgeQuestions, predictionQuestions, diagnosisQuestions, recallQuestions,
  emptyLedJourney, parseLedJourney, quizReady, stepCompleted,
  nextJourneyStep, canVisitJourneyStep, reviewDue,
} from "../../src/lib/led-learning-journey";
import { makeLedOfflineGuide } from "../../src/lib/led-offline-guide";

const right = (questions: readonly {correct:number}[]) => questions.map(question => question.correct);

test("new learner starts at discovery and cannot skip the evidence-producing stages", () => {
  const learner=emptyLedJourney();
  assert.equal(nextJourneyStep(learner),0);
  assert.equal(canVisitJourneyStep(learner,0),true);
  assert.equal(canVisitJourneyStep(learner,1),false);
  assert.equal(stepCompleted(learner,5),false);
  assert.equal(stepCompleted(learner,7),false);
});

test("correct understanding and predictions unlock building; a wrong answer cannot unlock it", () => {
  const learner=emptyLedJourney();
  learner.introReviewed=true;
  assert.equal(nextJourneyStep(learner),1);
  learner.knowledge=right(knowledgeQuestions);
  learner.knowledge[1]=(learner.knowledge[1]+1)%3;
  assert.equal(stepCompleted(learner,1),false);
  assert.equal(canVisitJourneyStep(learner,2),false);
  learner.knowledge=right(knowledgeQuestions);
  assert.equal(nextJourneyStep(learner),2);
  learner.prediction=right(predictionQuestions);
  assert.equal(nextJourneyStep(learner),3);
});

test("independent simulation, diagnostic checks and reflection all remain separate signals", () => {
  const learner=emptyLedJourney();
  learner.introReviewed=true;
  learner.knowledge=right(knowledgeQuestions);
  learner.prediction=right(predictionQuestions);
  learner.practiceRunAt="2026-09-01T11:00:00.000Z";
  assert.equal(nextJourneyStep(learner),4);
  learner.diagnosis=right(diagnosisQuestions);
  assert.equal(nextJourneyStep(learner),5);
  learner.challengeRunAt="2026-09-01T11:30:00.000Z";
  assert.equal(nextJourneyStep(learner),6);
  learner.reflection="I used a resistor to limit current, the LED anode connects toward D8 and its cathode goes to ground.";
  assert.equal(stepCompleted(learner,6),false);
  learner.reflectionSubmitted=true;
  assert.equal(nextJourneyStep(learner),7);
  assert.equal(stepCompleted(learner,7),false);
});

test("import validates stored state and never treats arbitrary text as teacher-verified evidence", () => {
  const clean=emptyLedJourney();
  clean.introReviewed=true;
  clean.reflection="too short";
  clean.reflectionSubmitted=true;
  clean.knowledge=[20,-2,1];
  clean.challengeHints=-100;
  clean.practiceRunAt="not-a-timestamp";
  const parsed=parseLedJourney(clean);
  assert.equal(parsed.reflectionSubmitted,false);
  assert.equal(parsed.challengeHints,0);
  assert.equal(parsed.practiceRunAt,null);
  assert.deepEqual(parsed.knowledge,[-1,-1,1]);
  assert.throws(()=>parseLedJourney({version:2}),/Unsupported/);
  assert.throws(()=>parseLedJourney(null),/Invalid/);
});

test("recall is only due after elapsed real time; any early attempt cannot count for scheduled review", () => {
  const at="2026-10-01T10:00:00.000Z";
  assert.equal(reviewDue(at,1,new Date("2026-10-02T09:59:59.000Z")),false);
  assert.equal(reviewDue(at,1,new Date("2026-10-02T10:00:00.000Z")),true);
  assert.equal(reviewDue(at,7,new Date("2026-10-08T10:00:00.000Z")),true);
  assert.equal(reviewDue(null,1,new Date()),false);
  assert.equal(quizReady(right(recallQuestions),recallQuestions),true);
  assert.equal(quizReady([0,1,0],recallQuestions),false);
});

test("downloadable handout is truly self-contained, with sketch, voltage caution and circuit path", () => {
  const html=makeLedOfflineGuide();
  assert.match(html,/<html lang="en">/);
  assert.match(html,/Arduino Uno LED Blink Take-Home Guide/);
  assert.match(html,/digitalWrite\(LED_PIN, HIGH\)/);
  assert.match(html,/330 Ω resistor/);
  assert.match(html,/household|mains-voltage|wall socket/);
  assert.match(html,/Anode|anode/);
  assert.ok(!html.includes("https://"));
  assert.ok(!html.includes('<script'));
});
