"use server";

import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { clampDurationMs, latestOpenStart, recordLearningEvent, resolveAssignedLessonContext, type LearningEventInput } from "@/lib/learning-events";
import { recomputeLessonProgress } from "@/lib/progress";

const EVIDENCE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

function evidenceType(file: File): "IMAGE" | "PDF" {
  return file.type === "application/pdf" ? "PDF" : "IMAGE";
}


function metadataString(value: unknown, key: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const item = (value as Record<string, unknown>)[key];
  return typeof item === "string" && item ? item : null;
}

function assertEvidence(file: FormDataEntryValue | null) {
  if (!(file instanceof File) || file.size === 0) throw new Error("A photo or PDF evidence file is required.");
  if (!EVIDENCE_TYPES.has(file.type)) throw new Error("Evidence must be JPG, PNG, WEBP or PDF.");
  if (file.size > 3_500_000) throw new Error("Evidence must be 3.5 MB or smaller for the MVP server upload.");
  return file;
}

export async function startLesson(lessonId: string) {
  const user = await requireRole("STUDENT");
  const context = await resolveAssignedLessonContext(user.id, lessonId);
  if (!context) throw new Error("Lesson is not assigned to your active class.");

  const existing = await db.lessonProgress.findUnique({ where: { studentId_lessonId: { studentId: user.id, lessonId } } });
  const now = new Date();
  await db.lessonProgress.upsert({
    where: { studentId_lessonId: { studentId: user.id, lessonId } },
    create: { studentId: user.id, lessonId, status: "IN_PROGRESS", startedAt: now },
    update: existing?.status === "COMPLETED" ? {} : { status: "IN_PROGRESS", startedAt: existing?.startedAt ?? now },
  });

  if (!existing?.startedAt) {
    await recordLearningEvent({
      type: "LESSON_STARTED",
      outcome: "STARTED",
      learnerId: user.id,
      ...context,
    });
  }
  revalidatePath(`/dashboard/student/lessons/${lessonId}`);
}

export async function startQuiz(quizId: string) {
  const user = await requireRole("STUDENT");
  const quiz = await db.quiz.findUnique({
    where: { id: quizId },
    include: { lesson: { include: { module: { include: { course: true } } } } },
  });
  if (!quiz) throw new Error("Quiz not found.");
  const assignment = await db.lessonAssignment.findFirst({
    where: { lessonId: quiz.lessonId, status: "ACTIVE", classroom: { enrollments: { some: { studentId: user.id, status: "ACTIVE" } } } },
  });
  if (!assignment) throw new Error("Quiz is not assigned to your active class.");

  const attemptNo = (await db.quizAttempt.count({ where: { quizId, studentId: user.id } })) + 1;
  const existing = await latestOpenStart({ learnerId: user.id, type: "QUIZ_STARTED", quizId, attemptNo });
  if (!existing) {
    await recordLearningEvent({
      type: "QUIZ_STARTED",
      outcome: "STARTED",
      learnerId: user.id,
      classroomId: assignment.classroomId,
      courseId: quiz.lesson.module.course.id,
      lessonId: quiz.lessonId,
      quizId,
      attemptNo,
    });
  }
  revalidatePath(`/dashboard/student/lessons/${quiz.lessonId}`);
}

export async function submitQuiz(quizId: string, formData: FormData) {
  const user = await requireRole("STUDENT");
  const quiz = await db.quiz.findUnique({
    where: { id: quizId },
    include: {
      questions: { orderBy: { order: "asc" } },
      lesson: { include: { module: { include: { course: true } } } },
    },
  });
  if (!quiz) throw new Error("Quiz not found.");
  const assignment = await db.lessonAssignment.findFirst({
    where: { lessonId: quiz.lessonId, status: "ACTIVE", classroom: { enrollments: { some: { studentId: user.id, status: "ACTIVE" } } } },
  });
  if (!assignment) throw new Error("Quiz is not assigned to your active class.");

  const previous = await db.quizAttempt.count({ where: { quizId, studentId: user.id } });
  const attemptNo = previous + 1;
  let score = 0;
  let maxScore = 0;
  const answers = quiz.questions.map((question) => {
    maxScore += question.points;
    const raw = String(formData.get(`q_${question.id}`) ?? "");
    const expected = typeof question.correctAnswer === "string" ? question.correctAnswer : JSON.stringify(question.correctAnswer);
    const correct = raw === expected;
    const points = correct ? question.points : 0;
    score += points;
    return { questionId: question.id, answer: raw, isCorrect: correct, points, skillId: question.skillId, maxPoints: question.points };
  });
  const pct = maxScore ? (score / maxScore) * 100 : 0;
  const passed = pct >= quiz.passScore;
  const started = await latestOpenStart({ learnerId: user.id, type: "QUIZ_STARTED", quizId, attemptNo });
  const completedAt = new Date();
  const durationMs = clampDurationMs(started ? completedAt.getTime() - started.occurredAt.getTime() : null);

  await db.$transaction(async (tx) => {
    const attempt = await tx.quizAttempt.create({
      data: {
        quizId,
        studentId: user.id,
        score,
        maxScore,
        passed,
        attemptNo,
        completedAt,
        answers: { create: answers.map(({ skillId: _skillId, maxPoints: _maxPoints, ...answer }) => answer) },
      },
    });

    await tx.learningEvent.createMany({
      data: [
        ...answers.map((answer) => ({
          type: "QUIZ_ANSWERED" as const,
          outcome: answer.isCorrect ? ("CORRECT" as const) : ("INCORRECT" as const),
          learnerId: user.id,
          classroomId: assignment.classroomId,
          courseId: quiz.lesson.module.course.id,
          lessonId: quiz.lessonId,
          quizId,
          quizAttemptId: attempt.id,
          skillId: answer.skillId,
          attemptNo,
          score: answer.points,
          maxScore: answer.maxPoints,
          metadata: { questionId: answer.questionId },
          source: "server",
          occurredAt: completedAt,
        })),
        {
          type: "QUIZ_COMPLETED" as const,
          outcome: passed ? ("PASSED" as const) : ("FAILED" as const),
          learnerId: user.id,
          classroomId: assignment.classroomId,
          courseId: quiz.lesson.module.course.id,
          lessonId: quiz.lessonId,
          quizId,
          quizAttemptId: attempt.id,
          attemptNo,
          durationMs,
          score,
          maxScore,
          metadata: { passScore: quiz.passScore },
          source: "server",
          occurredAt: completedAt,
        },
      ],
    });
  });

  await recomputeLessonProgress(user.id, quiz.lessonId);
  revalidatePath(`/dashboard/student/lessons/${quiz.lessonId}`);
  revalidatePath("/dashboard/student/progress");
}

export async function startPracticalTask(taskId: string, formData: FormData) {
  const user = await requireRole("STUDENT");
  const hardwarePlatformId = String(formData.get("hardwarePlatformId") ?? "");
  const roboticsKitId = String(formData.get("roboticsKitId") ?? "") || null;
  const task = await db.practicalTask.findUnique({
    where: { id: taskId },
    include: { lesson: { include: { module: { include: { course: true } }, hardwareVariants: true } } },
  });
  if (!task) throw new Error("Practical task not found.");
  if (!task.lesson.hardwareVariants.some((variant) => variant.hardwarePlatformId === hardwarePlatformId)) throw new Error("The selected hardware is not configured for this lesson.");
  const assignment = await db.lessonAssignment.findFirst({
    where: { lessonId: task.lessonId, status: "ACTIVE", classroom: { enrollments: { some: { studentId: user.id, status: "ACTIVE" } } } },
  });
  if (!assignment) throw new Error("This practical task is not assigned to your active class.");

  const kit = roboticsKitId ? await db.roboticsKit.findFirst({
    where: { id: roboticsKitId, active: true, hardwarePlatformId, schoolId: user.schoolId ?? "__no-school__" },
    select: { id: true, code: true },
  }) : null;
  if (roboticsKitId && !kit) throw new Error("The selected shared kit is not available for this learner and hardware platform.");

  const attemptNo = (await db.practicalSubmission.count({ where: { taskId, studentId: user.id } })) + 1;
  const existing = await latestOpenStart({ learnerId: user.id, type: "PRACTICAL_TASK_STARTED", practicalTaskId: taskId, attemptNo });
  if (!existing) {
    await db.$transaction(async (tx) => {
      if (kit) {
        await tx.kitUsage.create({
          data: {
            kitId: kit.id,
            learnerId: user.id,
            classroomId: assignment.classroomId,
            lessonId: task.lessonId,
            practicalTaskId: taskId,
          },
        });
      }
      await tx.learningEvent.createMany({
        data: [
          {
            type: "PRACTICAL_TASK_STARTED",
            outcome: "STARTED",
            learnerId: user.id,
            classroomId: assignment.classroomId,
            courseId: task.lesson.module.course.id,
            lessonId: task.lessonId,
            practicalTaskId: taskId,
            hardwarePlatformId,
            attemptNo,
            metadata: kit ? { kitId: kit.id, kitCode: kit.code } : undefined,
            source: "server",
          },
          {
            type: "HARDWARE_PLATFORM_SELECTED",
            outcome: "SELECTED",
            learnerId: user.id,
            classroomId: assignment.classroomId,
            courseId: task.lesson.module.course.id,
            lessonId: task.lessonId,
            practicalTaskId: taskId,
            hardwarePlatformId,
            attemptNo,
            metadata: { phase: "task_start", ...(kit ? { kitId: kit.id, kitCode: kit.code } : {}) },
            source: "server",
          },
        ],
      });
    });
  }
  revalidatePath(`/dashboard/student/lessons/${task.lessonId}`);
}

export async function submitPractical(formData: FormData) {
  const user = await requireRole("STUDENT");
  const taskId = String(formData.get("taskId") ?? "");
  const hardwarePlatformId = String(formData.get("hardwarePlatformId") ?? "");
  const requestedKitId = String(formData.get("roboticsKitId") ?? "") || null;
  const studentNotes = String(formData.get("studentNotes") ?? "").trim();
  const codeSnippet = String(formData.get("codeSnippet") ?? "").trim();
  const issue = String(formData.get("issue") ?? "").trim();
  const actionTried = String(formData.get("actionTried") ?? "").trim();
  const result = String(formData.get("result") ?? "").trim();
  const file = assertEvidence(formData.get("evidence"));

  const task = await db.practicalTask.findUnique({
    where: { id: taskId },
    include: { lesson: { include: { module: { include: { course: true } }, hardwareVariants: true } } },
  });
  if (!task) throw new Error("Practical task not found.");
  const compatible = task.lesson.hardwareVariants.some((variant) => variant.hardwarePlatformId === hardwarePlatformId);
  if (!compatible) throw new Error("The selected hardware is not configured for this lesson.");

  const assignment = await db.lessonAssignment.findFirst({
    where: { lessonId: task.lessonId, status: "ACTIVE", classroom: { enrollments: { some: { studentId: user.id, status: "ACTIVE" } } } },
  });
  if (!assignment) throw new Error("This practical task is not assigned to your active class.");

  const prior = await db.practicalSubmission.count({ where: { taskId, studentId: user.id } });
  const attemptNo = prior + 1;
  const started = await latestOpenStart({ learnerId: user.id, type: "PRACTICAL_TASK_STARTED", practicalTaskId: taskId, attemptNo });
  if (started?.hardwarePlatformId && started.hardwarePlatformId !== hardwarePlatformId) {
    throw new Error("Use the same board selected when this practical attempt started.");
  }
  const startedKitId = metadataString(started?.metadata, "kitId");
  if (startedKitId && requestedKitId && startedKitId !== requestedKitId) throw new Error("Use the same shared kit selected when this attempt started.");
  const roboticsKitId = startedKitId ?? requestedKitId;
  const kit = roboticsKitId ? await db.roboticsKit.findFirst({
    where: { id: roboticsKitId, active: true, hardwarePlatformId, schoolId: user.schoolId ?? "__no-school__" },
    select: { id: true, code: true },
  }) : null;
  if (roboticsKitId && !kit) throw new Error("The selected shared kit is not available for this learner and hardware platform.");

  const openKitUsage = kit ? await db.kitUsage.findFirst({
    where: { kitId: kit.id, learnerId: user.id, classroomId: assignment.classroomId, practicalTaskId: taskId, endedAt: null },
    orderBy: { startedAt: "desc" },
  }) : null;

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const pathname = `evidence/${user.id}/${taskId}/${randomUUID()}-${safeName}`;
  const blob = await put(pathname, file, { access: "private" });
  const submittedAt = new Date();
  const durationMs = clampDurationMs(started ? submittedAt.getTime() - started.occurredAt.getTime() : null);
  const [programmingSkill, debuggingSkill] = await Promise.all([
    codeSnippet ? db.skill.findUnique({ where: { slug: "microcontroller-programming" }, select: { id: true } }) : null,
    issue || actionTried || result ? db.skill.findUnique({ where: { slug: "debugging" }, select: { id: true } }) : null,
  ]);

  await db.$transaction(async (tx) => {
    const submission = await tx.practicalSubmission.create({
      data: {
        taskId,
        studentId: user.id,
        classroomId: assignment.classroomId,
        hardwarePlatformId,
        kitUsageId: openKitUsage?.id ?? null,
        status: "SUBMITTED",
        studentNotes: studentNotes || null,
        codeSnippet: codeSnippet || null,
        submissionNo: attemptNo,
        submittedAt,
        evidence: { create: { type: evidenceType(file), storagePath: blob.pathname, originalName: file.name, mimeType: file.type, sizeBytes: file.size } },
        troubleshooting: issue || actionTried || result ? { create: { issue: issue || "Not specified", actionTried: actionTried || "Not specified", result: result || "Not specified" } } : undefined,
      },
    });

    if (openKitUsage) await tx.kitUsage.update({ where: { id: openKitUsage.id }, data: { endedAt: submittedAt } });

    const common = {
      learnerId: user.id,
      classroomId: assignment.classroomId,
      courseId: task.lesson.module.course.id,
      lessonId: task.lessonId,
      practicalTaskId: taskId,
      practicalSubmissionId: submission.id,
      hardwarePlatformId,
      attemptNo,
      source: "server",
      occurredAt: submittedAt,
    };
    const kitMetadata = kit ? { kitId: kit.id, kitCode: kit.code } : {};
    const events: LearningEventInput[] = [
      { ...common, type: "PRACTICAL_TASK_ATTEMPTED", outcome: "SUBMITTED", durationMs, metadata: kitMetadata },
      { ...common, type: "EVIDENCE_UPLOADED", outcome: "RECORDED", metadata: { mimeType: file.type, sizeBytes: file.size, ...kitMetadata } },
      { ...common, type: "HARDWARE_PLATFORM_SELECTED", outcome: "SELECTED", metadata: { phase: "submission", ...kitMetadata } },
    ];
    if (issue || actionTried || result) events.push({ ...common, type: "TROUBLESHOOTING_ATTEMPTED", outcome: "RECORDED", skillId: debuggingSkill?.id, metadata: { hasIssue: Boolean(issue), hasAction: Boolean(actionTried), hasResult: Boolean(result), ...kitMetadata } });
    if (codeSnippet) events.push({ ...common, type: "CODE_SUBMISSION", outcome: "RECORDED", skillId: programmingSkill?.id, metadata: { characters: codeSnippet.length, ...kitMetadata } });
    await tx.learningEvent.createMany({ data: events });
  });

  revalidatePath(`/dashboard/student/lessons/${task.lessonId}`);
  revalidatePath("/dashboard/student/progress");
}

export type AiHelpState = { response?: string; error?: string };

export async function requestLessonHelp(lessonId: string, _: AiHelpState, formData: FormData): Promise<AiHelpState> {
  const user = await requireRole("STUDENT");
  const question = String(formData.get("question") ?? "").trim();
  const hardwarePlatformId = String(formData.get("hardwarePlatformId") ?? "");
  if (question.length < 5) return { error: "Describe what is happening so the assistant can help." };

  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    include: { module: { include: { course: true } }, hardwareVariants: { include: { hardwarePlatform: true } } },
  });
  if (!lesson) return { error: "Lesson not found." };
  const assignment = await db.lessonAssignment.findFirst({ where: { lessonId, status: "ACTIVE", classroom: { enrollments: { some: { studentId: user.id, status: "ACTIVE" } } } } });
  if (!assignment) return { error: "This lesson is not assigned to your active class." };

  const variant = lesson.hardwareVariants.find((v) => v.hardwarePlatformId === hardwarePlatformId) ?? lesson.hardwareVariants[0];
  const q = question.toLowerCase();
  const focus = q.includes("not work") || q.includes("fail") || q.includes("wrong")
    ? "Check power and ground first, then verify one connection and one code assumption at a time."
    : q.includes("hot") || q.includes("smell") || q.includes("smoke")
      ? "Disconnect power immediately and ask a teacher to inspect the circuit before continuing."
      : q.includes("upload") || q.includes("port")
        ? "Confirm the board model, USB cable, selected port and toolchain before changing the circuit."
        : "Compare the observed result with the expected output, then isolate the smallest subsystem that is not behaving as expected.";

  const response = `${focus}\n\nLesson guidance: ${variant?.troubleshooting ?? lesson.generalTroubleshoot}\n\nBoard reminder: ${variant?.hardwarePlatform.name ?? "Use the configured hardware variant"}. Do not bypass the lesson safety notes.`;
  const requestNo = (await db.aiHelpRequest.count({ where: { studentId: user.id, lessonId } })) + 1;
  await db.$transaction([
    db.aiHelpRequest.create({ data: { studentId: user.id, lessonId, question, response, sourceMode: "approved-guidance" } }),
    db.learningEvent.create({
      data: {
        type: "HINT_REQUESTED",
        outcome: "REQUESTED",
        learnerId: user.id,
        classroomId: assignment.classroomId,
        courseId: lesson.module.course.id,
        lessonId,
        hardwarePlatformId: variant?.hardwarePlatformId,
        attemptNo: requestNo,
        metadata: { questionLength: question.length, sourceMode: "approved-guidance" },
        source: "server",
      },
    }),
  ]);
  revalidatePath(`/dashboard/student/lessons/${lessonId}`);
  return { response };
}

export async function startProject(projectId: string, formData: FormData) {
  const user = await requireRole("STUDENT");
  const hardwarePlatformId = String(formData.get("hardwarePlatformId") ?? "");
  const assignment = await db.projectAssignment.findFirst({
    where: { projectId, status: "ACTIVE", classroom: { enrollments: { some: { studentId: user.id, status: "ACTIVE" } } } },
    include: { project: { include: { hardware: true } } },
  });
  if (!assignment) throw new Error("This project is not assigned to your active class.");
  if (!assignment.project.hardware.some((h) => h.hardwarePlatformId === hardwarePlatformId)) throw new Error("Selected hardware is not configured for this project.");
  const attemptNo = (await db.projectSubmission.count({ where: { projectId, studentId: user.id } })) + 1;
  const existing = await latestOpenStart({ learnerId: user.id, type: "PROJECT_STARTED", projectId, attemptNo });
  if (!existing) {
    await db.learningEvent.createMany({ data: [
      { type: "PROJECT_STARTED", outcome: "STARTED", learnerId: user.id, classroomId: assignment.classroomId, courseId: assignment.project.courseId, projectId, hardwarePlatformId, attemptNo, source: "server" },
      { type: "HARDWARE_PLATFORM_SELECTED", outcome: "SELECTED", learnerId: user.id, classroomId: assignment.classroomId, courseId: assignment.project.courseId, projectId, hardwarePlatformId, attemptNo, metadata: { phase: "project_start" }, source: "server" },
    ] });
  }
  revalidatePath("/dashboard/student/projects");
}

export async function submitProject(projectId: string, formData: FormData) {
  const user = await requireRole("STUDENT");
  const hardwarePlatformId = String(formData.get("hardwarePlatformId") ?? "");
  const studentNotes = String(formData.get("studentNotes") ?? "").trim();
  const codeSnippet = String(formData.get("codeSnippet") ?? "").trim();
  const troubleshootingNotes = String(formData.get("troubleshootingNotes") ?? "").trim();
  const file = assertEvidence(formData.get("evidence"));

  const assignment = await db.projectAssignment.findFirst({
    where: { projectId, status: "ACTIVE", classroom: { enrollments: { some: { studentId: user.id, status: "ACTIVE" } } } },
    include: { project: { include: { hardware: true } } },
  });
  if (!assignment) throw new Error("This project is not assigned to your active class.");
  if (!assignment.project.hardware.some((h) => h.hardwarePlatformId === hardwarePlatformId)) throw new Error("Selected hardware is not configured for this project.");

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const pathname = `project-evidence/${user.id}/${projectId}/${randomUUID()}-${safeName}`;
  const blob = await put(pathname, file, { access: "private" });
  const prior = await db.projectSubmission.count({ where: { projectId, studentId: user.id } });
  const attemptNo = prior + 1;
  const started = await latestOpenStart({ learnerId: user.id, type: "PROJECT_STARTED", projectId, attemptNo });
  if (started?.hardwarePlatformId && started.hardwarePlatformId !== hardwarePlatformId) {
    throw new Error("Use the same board selected when this project attempt started.");
  }
  const submittedAt = new Date();
  const durationMs = clampDurationMs(started ? submittedAt.getTime() - started.occurredAt.getTime() : null);
  const [programmingSkill, debuggingSkill] = await Promise.all([
    codeSnippet ? db.skill.findUnique({ where: { slug: "microcontroller-programming" }, select: { id: true } }) : null,
    troubleshootingNotes ? db.skill.findUnique({ where: { slug: "debugging" }, select: { id: true } }) : null,
  ]);

  await db.$transaction(async (tx) => {
    const submission = await tx.projectSubmission.create({
      data: {
        projectId,
        studentId: user.id,
        classroomId: assignment.classroomId,
        hardwarePlatformId,
        status: "SUBMITTED",
        studentNotes: studentNotes || null,
        codeSnippet: codeSnippet || null,
        troubleshootingNotes: troubleshootingNotes || null,
        submissionNo: attemptNo,
        submittedAt,
        evidence: { create: { type: evidenceType(file), storagePath: blob.pathname, originalName: file.name, mimeType: file.type, sizeBytes: file.size } },
      },
    });
    const common = { learnerId: user.id, classroomId: assignment.classroomId, courseId: assignment.project.courseId, projectId, projectSubmissionId: submission.id, hardwarePlatformId, attemptNo, source: "server", occurredAt: submittedAt };
    const events: LearningEventInput[] = [
      { ...common, type: "PROJECT_SUBMITTED", outcome: "SUBMITTED", durationMs },
      { ...common, type: "EVIDENCE_UPLOADED", outcome: "RECORDED", metadata: { mimeType: file.type, sizeBytes: file.size } },
      { ...common, type: "HARDWARE_PLATFORM_SELECTED", outcome: "SELECTED", metadata: { phase: "project_submission" } },
    ];
    if (troubleshootingNotes) events.push({ ...common, type: "TROUBLESHOOTING_ATTEMPTED", outcome: "RECORDED", skillId: debuggingSkill?.id, metadata: { characters: troubleshootingNotes.length, context: "project" } });
    if (codeSnippet) events.push({ ...common, type: "CODE_SUBMISSION", outcome: "RECORDED", skillId: programmingSkill?.id, metadata: { characters: codeSnippet.length, context: "project" } });
    await tx.learningEvent.createMany({ data: events });
  });
  revalidatePath("/dashboard/student/projects");
  revalidatePath("/dashboard/student/progress");
}
