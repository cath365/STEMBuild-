import { db } from "@/lib/db";
import { recomputeCredentials } from "@/lib/credentials";
import { recordLearningEvent, resolveAssignedLessonContext } from "@/lib/learning-events";

export async function recomputeLessonProgress(studentId: string, lessonId: string) {
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    include: { quiz: true, practicalTasks: true },
  });
  if (!lesson) return;

  const quizPassed = lesson.quiz
    ? Boolean(await db.quizAttempt.findFirst({ where: { quizId: lesson.quiz.id, studentId, passed: true } }))
    : true;

  const assessed = await Promise.all(lesson.practicalTasks.map(async (task) => {
    const submission = await db.practicalSubmission.findFirst({
      where: { taskId: task.id, studentId, status: "ASSESSED" },
      include: { assessment: true },
      orderBy: { submissionNo: "desc" },
    });
    if (!submission?.assessment || submission.assessment.maxScore <= 0) return false;
    return (submission.assessment.totalScore / submission.assessment.maxScore) * 100 >= 70;
  }));
  const practicalPassed = assessed.every(Boolean);
  const status = quizPassed && practicalPassed ? "COMPLETED" : "IN_PROGRESS";
  const previous = await db.lessonProgress.findUnique({ where: { studentId_lessonId: { studentId, lessonId } } });
  const completedAt = status === "COMPLETED" ? (previous?.completedAt ?? new Date()) : null;

  await db.lessonProgress.upsert({
    where: { studentId_lessonId: { studentId, lessonId } },
    create: { studentId, lessonId, status, startedAt: new Date(), completedAt },
    update: { status, completedAt },
  });

  if (status === "COMPLETED" && previous?.status !== "COMPLETED") {
    const context = await resolveAssignedLessonContext(studentId, lessonId);
    if (context) {
      const startedAt = previous?.startedAt;
      await recordLearningEvent({
        type: "LESSON_COMPLETED",
        outcome: "COMPLETED",
        learnerId: studentId,
        ...context,
        durationMs: startedAt ? completedAt!.getTime() - startedAt.getTime() : null,
      });
    }
  }

  await recomputeCredentials(studentId);
}
