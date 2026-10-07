import { db } from "@/lib/db";

export type LearningEventInput = {
  type:
    | "LESSON_STARTED"
    | "LESSON_COMPLETED"
    | "QUIZ_STARTED"
    | "QUIZ_ANSWERED"
    | "QUIZ_COMPLETED"
    | "PRACTICAL_TASK_STARTED"
    | "PRACTICAL_TASK_ATTEMPTED"
    | "PRACTICAL_TASK_COMPLETED"
    | "EVIDENCE_UPLOADED"
    | "PROJECT_STARTED"
    | "PROJECT_SUBMITTED"
    | "TEACHER_FEEDBACK_RECEIVED"
    | "RUBRIC_SCORED"
    | "TROUBLESHOOTING_ATTEMPTED"
    | "HINT_REQUESTED"
    | "CODE_SUBMISSION"
    | "HARDWARE_PLATFORM_SELECTED";
  outcome?:
    | "STARTED"
    | "COMPLETED"
    | "SUBMITTED"
    | "PASSED"
    | "FAILED"
    | "CORRECT"
    | "INCORRECT"
    | "NEEDS_REVISION"
    | "RECORDED"
    | "RECEIVED"
    | "REQUESTED"
    | "SELECTED";
  learnerId: string;
  actorUserId?: string | null;
  classroomId?: string | null;
  courseId?: string | null;
  lessonId?: string | null;
  projectId?: string | null;
  quizId?: string | null;
  quizAttemptId?: string | null;
  practicalTaskId?: string | null;
  practicalSubmissionId?: string | null;
  projectSubmissionId?: string | null;
  hardwarePlatformId?: string | null;
  skillId?: string | null;
  attemptNo?: number | null;
  durationMs?: number | null;
  score?: number | null;
  maxScore?: number | null;
  metadata?: Record<string, string | number | boolean | null>;
  source?: string;
  occurredAt?: Date;
};

export function clampDurationMs(value: number | null | undefined) {
  if (!Number.isFinite(value)) return null;
  return Math.max(0, Math.min(Math.round(value!), 24 * 60 * 60 * 1000));
}

export async function recordLearningEvent(input: LearningEventInput) {
  return db.learningEvent.create({
    data: {
      ...input,
      durationMs: clampDurationMs(input.durationMs),
      metadata: input.metadata ?? undefined,
      source: input.source ?? "server",
    },
  });
}

export async function resolveAssignedLessonContext(learnerId: string, lessonId: string) {
  const assignment = await db.lessonAssignment.findFirst({
    where: {
      lessonId,
      status: "ACTIVE",
      lesson: { status: "PUBLISHED", module: { course: { status: "PUBLISHED" } } },
      classroom: { enrollments: { some: { studentId: learnerId, status: "ACTIVE" } } },
    },
    include: { lesson: { include: { module: { include: { course: true } } } } },
  });
  if (!assignment) return null;
  return {
    classroomId: assignment.classroomId,
    courseId: assignment.lesson.module.course.id,
    lessonId: assignment.lessonId,
  };
}

export async function latestOpenStart(args: {
  learnerId: string;
  type: "QUIZ_STARTED" | "PRACTICAL_TASK_STARTED" | "PROJECT_STARTED";
  attemptNo: number;
  quizId?: string;
  practicalTaskId?: string;
  projectId?: string;
}) {
  return db.learningEvent.findFirst({
    where: {
      learnerId: args.learnerId,
      type: args.type,
      attemptNo: args.attemptNo,
      quizId: args.quizId,
      practicalTaskId: args.practicalTaskId,
      projectId: args.projectId,
    },
    orderBy: { occurredAt: "desc" },
  });
}
