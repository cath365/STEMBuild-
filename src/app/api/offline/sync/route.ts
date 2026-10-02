import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import type { OfflineSyncOperation } from "@/lib/offline-types";

const MAX_OPERATIONS = 25;
const ALLOWED_SECTIONS = new Set(["objective", "theory", "hardware", "practical", "safety"]);

function text(value: unknown, max: number) {
  return String(value ?? "").trim().slice(0, max);
}

function parseDate(value: unknown) {
  const date = new Date(String(value ?? ""));
  const now = Date.now();
  if (Number.isNaN(date.getTime())) return new Date();
  if (date.getTime() > now + 5 * 60_000) return new Date();
  return date;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (user.role !== "STUDENT") return NextResponse.json({ error: "Student account required." }, { status: 403 });

  let body: { operations?: OfflineSyncOperation[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const operations = Array.isArray(body.operations) ? body.operations.slice(0, MAX_OPERATIONS) : [];
  if (!operations.length) return NextResponse.json({ accepted: [], rejected: [] });

  const lessonIds = [...new Set(operations.map((op) => String(op?.payload?.lessonId ?? "")).filter(Boolean))];
  const taskIds = [...new Set(operations.map((op) => String(op?.payload?.practicalTaskId ?? "")).filter(Boolean))];

  const [assignments, tasks] = await Promise.all([
    db.lessonAssignment.findMany({
      where: {
        lessonId: { in: lessonIds },
        status: "ACTIVE",
        classroom: { enrollments: { some: { studentId: user.id, status: "ACTIVE" } } },
      },
      select: { lessonId: true, classroomId: true, lesson: { select: { module: { select: { courseId: true } } } } },
    }),
    taskIds.length
      ? db.practicalTask.findMany({ where: { id: { in: taskIds } }, select: { id: true, lessonId: true } })
      : Promise.resolve([]),
  ]);

  const assignmentByLesson = new Map(assignments.map((a) => [a.lessonId, a]));
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const accepted: string[] = [];
  const rejected: Array<{ id: string; reason: string; retryable: boolean }> = [];

  for (const operation of operations) {
    const id = String(operation?.id ?? "");
    if (!id || operation?.type !== "CHECKPOINT_UPSERT") {
      rejected.push({ id, reason: "Unsupported offline operation.", retryable: false });
      continue;
    }
    if (operation.ownerId !== user.id) {
      rejected.push({ id, reason: "Offline record belongs to another learner.", retryable: true });
      continue;
    }

    const lessonId = String(operation.payload?.lessonId ?? "");
    const practicalTaskId = operation.payload?.practicalTaskId ? String(operation.payload.practicalTaskId) : null;
    const assignment = assignmentByLesson.get(lessonId);
    if (!assignment) {
      rejected.push({ id, reason: "Lesson is not assigned to this learner.", retryable: false });
      continue;
    }
    if (practicalTaskId && taskById.get(practicalTaskId)?.lessonId !== lessonId) {
      rejected.push({ id, reason: "Practical task does not belong to the lesson.", retryable: false });
      continue;
    }

    const completedSections = Array.isArray(operation.payload?.completedSections)
      ? operation.payload.completedSections.map(String).filter((section) => ALLOWED_SECTIONS.has(section)).slice(0, 5)
      : [];
    const clientUpdatedAt = parseDate(operation.payload?.clientUpdatedAt);
    const clientKey = `${user.id}:${lessonId}:${practicalTaskId ?? "lesson"}`;
    const existingProgress = await db.lessonProgress.findUnique({ where: { studentId_lessonId: { studentId: user.id, lessonId } } });

    await db.$transaction(async (tx) => {
      await tx.offlineLessonCheckpoint.upsert({
        where: { clientKey },
        create: {
          clientKey,
          learnerId: user.id,
          lessonId,
          practicalTaskId,
          completedSections,
          notes: text(operation.payload?.notes, 4000),
          codeDraft: text(operation.payload?.codeDraft, 12000),
          troubleshooting: text(operation.payload?.troubleshooting, 4000),
          clientUpdatedAt,
          syncedAt: new Date(),
        },
        update: {
          completedSections,
          notes: text(operation.payload?.notes, 4000),
          codeDraft: text(operation.payload?.codeDraft, 12000),
          troubleshooting: text(operation.payload?.troubleshooting, 4000),
          clientUpdatedAt,
          syncedAt: new Date(),
        },
      });

      if (!existingProgress?.startedAt) {
        const startedAt = clientUpdatedAt;
        await tx.lessonProgress.upsert({
          where: { studentId_lessonId: { studentId: user.id, lessonId } },
          create: { studentId: user.id, lessonId, status: "IN_PROGRESS", startedAt },
          update: { status: existingProgress?.status === "COMPLETED" ? "COMPLETED" : "IN_PROGRESS", startedAt },
        });
        await tx.learningEvent.create({
          data: {
            type: "LESSON_STARTED",
            outcome: "STARTED",
            learnerId: user.id,
            classroomId: assignment.classroomId,
            courseId: assignment.lesson.module.courseId,
            lessonId,
            metadata: { offline: true },
            source: "offline-sync",
            occurredAt: startedAt,
          },
        });
      }
    });

    accepted.push(id);
  }

  return NextResponse.json(
    { accepted, rejected },
    { headers: { "Cache-Control": "no-store, private" } },
  );
}
