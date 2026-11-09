// Summaries of Maker Studio challenge attempts for learner and teacher dashboards (pure functions).
import { CHALLENGES, LEARNING_OUTCOMES, type Challenge, type OutcomeId } from "@/lib/studio/challenges";

export type AttemptRow = { studentId: string; challengeId: string; passed: boolean; createdAt: Date };

export type ChallengeSummary = {
  challenge: Challenge;
  learners: number;
  passedLearners: number;
  attempts: number;
  /** Median number of attempts a learner needed before their first pass. */
  medianAttemptsToPass: number | null;
};

export type LearnerChallengeRow = { challenge: Challenge; attempts: number; passed: boolean; firstPassAttempt: number | null; lastAttemptAt: Date };

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Per learner and challenge: attempts in time order, and which attempt first passed. */
function byLearnerAndChallenge(rows: AttemptRow[]) {
  const map = new Map<string, Map<string, AttemptRow[]>>();
  for (const row of [...rows].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())) {
    if (!map.has(row.studentId)) map.set(row.studentId, new Map());
    const perChallenge = map.get(row.studentId)!;
    if (!perChallenge.has(row.challengeId)) perChallenge.set(row.challengeId, []);
    perChallenge.get(row.challengeId)!.push(row);
  }
  return map;
}

export function learnerChallengeRows(rows: AttemptRow[]): LearnerChallengeRow[] {
  const perChallenge = byLearnerAndChallenge(rows).values().next().value ?? new Map<string, AttemptRow[]>();
  return CHALLENGES.flatMap((challenge) => {
    const attempts = perChallenge.get(challenge.id);
    if (!attempts?.length) return [];
    const first = attempts.findIndex((a) => a.passed);
    return [{ challenge, attempts: attempts.length, passed: first >= 0, firstPassAttempt: first >= 0 ? first + 1 : null, lastAttemptAt: attempts[attempts.length - 1].createdAt }];
  });
}

export function classChallengeSummary(rows: AttemptRow[]) {
  const grouped = byLearnerAndChallenge(rows);
  const summaries: ChallengeSummary[] = CHALLENGES.map((challenge) => {
    let learners = 0, passedLearners = 0, attempts = 0;
    const toPass: number[] = [];
    for (const perChallenge of grouped.values()) {
      const list = perChallenge.get(challenge.id);
      if (!list?.length) continue;
      learners++; attempts += list.length;
      const first = list.findIndex((a) => a.passed);
      if (first >= 0) { passedLearners++; toPass.push(first + 1); }
    }
    return { challenge, learners, passedLearners, attempts, medianAttemptsToPass: median(toPass) };
  }).filter((s) => s.learners > 0);

  // An outcome is "demonstrated" by a learner who passed at least one challenge mapped to it.
  const outcomeCoverage = (Object.keys(LEARNING_OUTCOMES) as OutcomeId[]).map((outcome) => {
    let learners = 0;
    for (const perChallenge of grouped.values()) {
      const passedAny = CHALLENGES.some((c) => c.outcomes.includes(outcome) && perChallenge.get(c.id)?.some((a) => a.passed));
      if (passedAny) learners++;
    }
    return { outcome, description: LEARNING_OUTCOMES[outcome], learners };
  });

  const passedPerLearner = new Map([...grouped].map(([studentId, perChallenge]) => [studentId, [...perChallenge.values()].filter((list) => list.some((a) => a.passed)).length]));
  return { summaries, outcomeCoverage, passedPerLearner, activeLearners: grouped.size };
}
