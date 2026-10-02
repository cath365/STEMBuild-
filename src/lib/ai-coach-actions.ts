"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createCoachSession, generateAdaptedCoachSteps, type LearnerCoachSnapshot } from "@/lib/ai-coach";
import { db } from "@/lib/db";
import { recordLearningEvent, resolveAssignedLessonContext } from "@/lib/learning-events";
import { requireRole } from "@/lib/session";

const CHECK_OUTCOMES = new Set(["WORKED", "PARTLY_WORKED", "DID_NOT_WORK", "NEED_TEACHER"]);

function shortText(value: FormDataEntryValue | null, max = 600) {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

export async function generateAiLabCoachPlan(formData: FormData) {
  const user = await requireRole("STUDENT");
  const lessonId = shortText(formData.get("lessonId"), 100);
  const hardwarePlatformId = shortText(formData.get("hardwarePlatformId"), 100) || null;
  if (!lessonId) throw new Error("Choose a lesson for the AI Lab Coach.");

  const session = await createCoachSession(user.id, lessonId, hardwarePlatformId);
  revalidatePath("/dashboard/student/ai-lab-coach");
  redirect(`/dashboard/student/ai-lab-coach?session=${session.id}`);
}

export async function revealAiLabCoachHint(stepId: string) {
  const user = await requireRole("STUDENT");
  const step = await db.aiCoachStep.findFirst({
    where: { id: stepId, session: { learnerId: user.id } },
    include: { session: true },
  });
  if (!step) throw new Error("Coach step not found.");

  if (!step.hintRevealedAt) {
    const context = await resolveAssignedLessonContext(user.id, step.session.lessonId);
    await db.$transaction(async (tx) => {
      await tx.aiCoachStep.update({ where: { id: step.id }, data: { hintRevealedAt: new Date() } });
      await tx.aiCoachLog.create({ data: { sessionId: step.sessionId, phase: "GUIDE", event: "hint_revealed", payload: { stepId: step.id, skillId: step.skillId } } });
    });
    if (context) {
      await recordLearningEvent({
        type: "HINT_REQUESTED",
        outcome: "REQUESTED",
        learnerId: user.id,
        ...context,
        hardwarePlatformId: step.session.hardwarePlatformId,
        skillId: step.skillId,
        metadata: { aiCoachSessionId: step.sessionId, aiCoachStepId: step.id },
        source: "ai-lab-coach",
      });
    }
  }
  revalidatePath("/dashboard/student/ai-lab-coach");
}

export async function submitAiLabCoachCheck(stepId: string, formData: FormData) {
  const user = await requireRole("STUDENT");
  const outcome = shortText(formData.get("outcome"), 30).toUpperCase();
  const learnerResult = shortText(formData.get("learnerResult"), 600);
  if (!CHECK_OUTCOMES.has(outcome)) throw new Error("Choose what happened after the check.");
  if (!learnerResult) throw new Error("Describe what you observed so the coach can adapt safely.");

  const step = await db.aiCoachStep.findFirst({
    where: { id: stepId, session: { learnerId: user.id } },
    include: {
      session: { include: { steps: { orderBy: [{ revision: "asc" }, { order: "asc" }] } } },
    },
  });
  if (!step) throw new Error("Coach step not found.");
  if (step.status === "SUPERSEDED" || step.status === "SKIPPED") throw new Error("This coach step is no longer active.");
  const activeSequence = step.session.steps.filter((item) => item.status === "PENDING" || item.status === "NEEDS_HELP");
  const currentActionable = activeSequence[0];
  if (currentActionable && currentActionable.id !== step.id) throw new Error("Complete the current coach step before checking a later step.");

  const typedOutcome = outcome as "WORKED" | "PARTLY_WORKED" | "DID_NOT_WORK" | "NEED_TEACHER";
  const nextStatus = typedOutcome === "WORKED" ? "VERIFIED" : "NEEDS_HELP";

  await db.$transaction(async (tx) => {
    await tx.aiCoachStep.update({
      where: { id: step.id },
      data: { status: nextStatus, checkOutcome: typedOutcome, learnerResult },
    });
    await tx.aiCoachLog.create({
      data: {
        sessionId: step.sessionId,
        phase: "CHECK",
        event: "learner_check_submitted",
        payload: { stepId: step.id, outcome: typedOutcome, noteLength: learnerResult.length },
      },
    });
  });

  if (typedOutcome === "WORKED") {
    const remaining = await db.aiCoachStep.count({ where: { sessionId: step.sessionId, status: "PENDING" } });
    if (remaining === 0) {
      await db.$transaction([
        db.aiCoachSession.update({ where: { id: step.sessionId }, data: { status: "COMPLETED", completedAt: new Date() } }),
        db.aiCoachLog.create({ data: { sessionId: step.sessionId, phase: "CHECK", event: "coaching_plan_completed", payload: { note: "Coach plan completed; practical assessment remains separate." } } }),
      ]);
    }
    revalidatePath("/dashboard/student/ai-lab-coach");
    return;
  }

  const futurePending = step.session.steps.filter((item) => item.status === "PENDING" && item.id !== step.id);
  if (futurePending.length) {
    await db.aiCoachStep.updateMany({ where: { id: { in: futurePending.map((item) => item.id) } }, data: { status: "SUPERSEDED" } });
  }

  const maxRevision = Math.max(0, ...step.session.steps.map((item) => item.revision));
  const maxOrder = Math.max(0, ...step.session.steps.map((item) => item.order));

  if (typedOutcome === "NEED_TEACHER") {
    await db.$transaction([
      db.aiCoachStep.create({
        data: {
          sessionId: step.sessionId,
          order: maxOrder + 1,
          revision: maxRevision + 1,
          skillId: step.skillId,
          actionType: "ASK_TEACHER",
          sourceMode: "rules-safety",
          title: "Ask your teacher with evidence",
          instruction: "Stop making further hardware changes. Show your teacher the current setup, the result you observed, and the troubleshooting steps you already tried.",
          rationale: "Repeated or uncertain faults should be escalated to a teacher rather than solved by increasingly risky experimentation.",
          checkPrompt: "Can you explain the fault and your previous tests clearly to your teacher?",
          hint: "Take your troubleshooting record and identify the last point where the circuit behaved as expected.",
          safetyNote: "Do not increase voltage/current or bypass protective components while waiting for help.",
        },
      }),
      db.aiCoachLog.create({ data: { sessionId: step.sessionId, phase: "ADAPT", event: "teacher_escalation_added", payload: { afterStepId: step.id } } }),
    ]);
    revalidatePath("/dashboard/student/ai-lab-coach");
    return;
  }

  const snapshot = step.session.evidenceSnapshot as unknown as LearnerCoachSnapshot;
  const adapted = await generateAdaptedCoachSteps({
    snapshot,
    priorSteps: step.session.steps.map((item) => ({ title: item.title, instruction: item.instruction, status: item.status, checkOutcome: item.checkOutcome })),
    checkedStep: { title: step.title, instruction: step.instruction, checkPrompt: step.checkPrompt },
    outcome: typedOutcome,
    learnerResult,
  });
  const skillSlugs = adapted.steps.map((item) => item.skillSlug).filter((value): value is string => Boolean(value));
  const skills = await db.skill.findMany({ where: { slug: { in: skillSlugs } }, select: { id: true, slug: true } });
  const skillBySlug = new Map(skills.map((item) => [item.slug, item.id]));

  await db.$transaction(async (tx) => {
    for (const [index, item] of adapted.steps.entries()) {
      await tx.aiCoachStep.create({
        data: {
          sessionId: step.sessionId,
          order: maxOrder + index + 1,
          revision: maxRevision + 1,
          skillId: item.skillSlug ? skillBySlug.get(item.skillSlug) ?? null : null,
          actionType: item.actionType,
          sourceMode: adapted.sourceMode,
          title: item.title,
          instruction: item.instruction,
          rationale: item.rationale,
          checkPrompt: item.checkPrompt,
          hint: item.hint,
          safetyNote: item.safetyNote,
        },
      });
    }
    await tx.aiCoachLog.create({
      data: {
        sessionId: step.sessionId,
        phase: "ADAPT",
        event: "plan_adapted_after_check",
        payload: { afterStepId: step.id, outcome: typedOutcome, sourceMode: adapted.sourceMode, model: adapted.model, newStepCount: adapted.steps.length, guardrailFlags: adapted.guardrailFlags },
        latencyMs: adapted.latencyMs,
      },
    });
    if (adapted.guardrailFlags.length) {
      await tx.aiCoachLog.create({ data: { sessionId: step.sessionId, phase: "SAFETY", event: "adaptive_guardrail_triggered", payload: { flags: adapted.guardrailFlags } } });
    }
  });

  revalidatePath("/dashboard/student/ai-lab-coach");
}
