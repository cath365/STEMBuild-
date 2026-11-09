"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { CHALLENGES } from "@/lib/studio/challenges";

export type ChallengeSaveResult = { saved: true } | { saved: false; reason: "signed-out" | "not-a-student" | "invalid" | "rate-limited" };

const MAX_ATTEMPTS_PER_HOUR = 120;

/**
 * Records a Maker Studio challenge run for the signed-in learner. The checks were run in the
 * learner's browser, so the record is practice evidence for teachers, never an assessed grade.
 */
export async function recordChallengeAttempt(challengeId: string, checks: { label: string; passed: boolean }[]): Promise<ChallengeSaveResult> {
  const user = await getCurrentUser();
  if (!user) return { saved: false, reason: "signed-out" };
  if (user.role !== "STUDENT") return { saved: false, reason: "not-a-student" };
  const challenge = CHALLENGES.find((c) => c.id === challengeId);
  if (!challenge || !Array.isArray(checks) || checks.length === 0 || checks.length > 10) return { saved: false, reason: "invalid" };
  const clean = checks.map((check) => ({ label: String(check?.label ?? "").slice(0, 200), passed: check?.passed === true }));
  if (clean.some((check) => !check.label)) return { saved: false, reason: "invalid" };
  const recent = await db.challengeAttempt.count({ where: { studentId: user.id, createdAt: { gte: new Date(Date.now() - 3_600_000) } } });
  if (recent >= MAX_ATTEMPTS_PER_HOUR) return { saved: false, reason: "rate-limited" };
  await db.challengeAttempt.create({ data: { studentId: user.id, challengeId, passed: clean.every((check) => check.passed), checks: clean } });
  return { saved: true };
}
