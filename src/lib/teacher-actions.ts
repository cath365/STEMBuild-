"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { recomputeLessonProgress } from "@/lib/progress";

function joinCode() { return `STEM-${randomBytes(3).toString("hex").toUpperCase()}`; }

export async function createClass(formData: FormData) {
  const teacher = await requireRole("TEACHER");
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 3) throw new Error("Class name is too short.");
  await db.classroom.create({ data: { name, teacherId: teacher.id, schoolId: teacher.schoolId, joinCode: joinCode() } });
  revalidatePath("/dashboard/teacher/classes");
}

export async function addStudentToClass(classroomId: string, formData: FormData) {
  const teacher = await requireRole("TEACHER");
  const classroom = await db.classroom.findUnique({ where: { id: classroomId } });
  if (!classroom || classroom.teacherId !== teacher.id) throw new Error("Class not found.");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const student = await db.user.findUnique({ where: { email } });
  if (!student || student.role !== "STUDENT") throw new Error("No student account was found with that email.");
  await db.classEnrollment.upsert({
    where: { classroomId_studentId: { classroomId, studentId: student.id } },
    create: { classroomId, studentId: student.id, status: "ACTIVE" },
    update: { status: "ACTIVE" },
  });
  revalidatePath(`/dashboard/teacher/classes/${classroomId}`);
}

export async function assignLesson(classroomId: string, formData: FormData) {
  const teacher = await requireRole("TEACHER");
  const classroom = await db.classroom.findUnique({ where: { id: classroomId } });
  if (!classroom || classroom.teacherId !== teacher.id) throw new Error("Class not found.");
  const lessonId = String(formData.get("lessonId") ?? "");
  const due = String(formData.get("dueAt") ?? "");
  await db.lessonAssignment.upsert({
    where: { classroomId_lessonId: { classroomId, lessonId } },
    create: { classroomId, lessonId, assignedById: teacher.id, dueAt: due ? new Date(`${due}T23:59:59`) : null },
    update: { status: "ACTIVE", dueAt: due ? new Date(`${due}T23:59:59`) : null },
  });
  revalidatePath(`/dashboard/teacher/classes/${classroomId}`);
}

export async function assessPractical(submissionId: string, formData: FormData) {
  const teacher = await requireRole("TEACHER");
  const submission = await db.practicalSubmission.findUnique({
    where: { id: submissionId },
    include: {
      classroom: true,
      task: { include: { lesson: { include: { module: { include: { course: true } } } }, rubric: { include: { criteria: true } } } },
    },
  });
  if (!submission || !submission.classroom || submission.classroom.teacherId !== teacher.id) throw new Error("Submission not available for this teacher.");

  const feedback = String(formData.get("feedback") ?? "").trim();
  const decision = String(formData.get("decision") ?? "ASSESSED");
  let totalScore = 0;
  const maxScore = submission.task.rubric.criteria.reduce((sum, c) => sum + c.maxScore, 0);
  const scores = submission.task.rubric.criteria.map((criterion) => {
    const raw = Number(formData.get(`criterion_${criterion.id}`));
    const score = Number.isFinite(raw) ? Math.max(0, Math.min(criterion.maxScore, raw)) : 0;
    totalScore += score;
    return { criterionId: criterion.id, skillId: criterion.skillId, score, maxScore: criterion.maxScore, feedback: null as string | null };
  });
  const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
  const reviewOutcome = decision === "NEEDS_REVISION" ? "NEEDS_REVISION" : percentage >= 70 ? "PASSED" : "FAILED";
  const assessedAt = new Date();

  await db.$transaction(async (tx) => {
    const assessment = await tx.practicalAssessment.upsert({
      where: { submissionId },
      create: { submissionId, teacherId: teacher.id, totalScore, maxScore, feedback, assessedAt },
      update: { teacherId: teacher.id, totalScore, maxScore, feedback, assessedAt },
    });
    await tx.criterionScore.deleteMany({ where: { assessmentId: assessment.id } });
    await tx.criterionScore.createMany({ data: scores.map(({ skillId: _skillId, maxScore: _maxScore, ...s }) => ({ ...s, assessmentId: assessment.id })) });
    await tx.practicalSubmission.update({ where: { id: submissionId }, data: { status: decision === "NEEDS_REVISION" ? "NEEDS_REVISION" : "ASSESSED" } });

    const common = {
      learnerId: submission.studentId,
      actorUserId: teacher.id,
      classroomId: submission.classroomId,
      courseId: submission.task.lesson.module.course.id,
      lessonId: submission.task.lessonId,
      practicalTaskId: submission.taskId,
      practicalSubmissionId: submission.id,
      hardwarePlatformId: submission.hardwarePlatformId,
      attemptNo: submission.submissionNo,
      source: "teacher-rubric",
      occurredAt: assessedAt,
    };
    await tx.learningEvent.createMany({
      data: [
        ...scores.map((item) => ({
          ...common,
          type: "RUBRIC_SCORED" as const,
          outcome: item.maxScore > 0 && (item.score / item.maxScore) * 100 >= 70 ? ("PASSED" as const) : ("FAILED" as const),
          skillId: item.skillId,
          score: item.score,
          maxScore: item.maxScore,
          metadata: { criterionId: item.criterionId, assessmentType: "practical" },
        })),
        {
          ...common,
          type: "TEACHER_FEEDBACK_RECEIVED" as const,
          outcome: "RECEIVED" as const,
          score: totalScore,
          maxScore,
          metadata: { hasWrittenFeedback: feedback.length > 0, feedbackCharacters: feedback.length },
        },
        {
          ...common,
          type: "PRACTICAL_TASK_COMPLETED" as const,
          outcome: reviewOutcome as "PASSED" | "FAILED" | "NEEDS_REVISION",
          score: totalScore,
          maxScore,
        },
      ],
    });
  });

  await recomputeLessonProgress(submission.studentId, submission.task.lessonId);
  revalidatePath("/dashboard/teacher/reviews");
  revalidatePath("/dashboard/teacher/analytics");
  revalidatePath(`/dashboard/teacher/classes/${submission.classroomId}`);
}

export async function assessProject(submissionId: string, formData: FormData) {
  const teacher = await requireRole("TEACHER");
  const submission = await db.projectSubmission.findUnique({
    where: { id: submissionId },
    include: {
      classroom: true,
      project: { include: { rubric: { include: { criteria: true } } } },
    },
  });
  if (!submission || submission.classroom.teacherId !== teacher.id) throw new Error("Project submission is not available for this teacher.");
  const feedback = String(formData.get("feedback") ?? "").trim();
  const decision = String(formData.get("decision") ?? "ASSESSED");
  let totalScore = 0;
  const maxScore = submission.project.rubric.criteria.reduce((sum, c) => sum + c.maxScore, 0);
  const scores = submission.project.rubric.criteria.map((criterion) => {
    const raw = Number(formData.get(`criterion_${criterion.id}`));
    const score = Number.isFinite(raw) ? Math.max(0, Math.min(criterion.maxScore, raw)) : 0;
    totalScore += score;
    return { criterionId: criterion.id, skillId: criterion.skillId, score, maxScore: criterion.maxScore, feedback: null as string | null };
  });
  const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
  const reviewOutcome = decision === "NEEDS_REVISION" ? "NEEDS_REVISION" : percentage >= 70 ? "PASSED" : "FAILED";
  const assessedAt = new Date();

  await db.$transaction(async (tx) => {
    const assessment = await tx.projectAssessment.upsert({
      where: { submissionId },
      create: { submissionId, teacherId: teacher.id, totalScore, maxScore, feedback, assessedAt },
      update: { teacherId: teacher.id, totalScore, maxScore, feedback, assessedAt },
    });
    await tx.projectCriterionScore.deleteMany({ where: { assessmentId: assessment.id } });
    await tx.projectCriterionScore.createMany({ data: scores.map(({ skillId: _skillId, maxScore: _maxScore, ...s }) => ({ ...s, assessmentId: assessment.id })) });
    await tx.projectSubmission.update({ where: { id: submissionId }, data: { status: decision === "NEEDS_REVISION" ? "NEEDS_REVISION" : "ASSESSED" } });

    const common = {
      learnerId: submission.studentId,
      actorUserId: teacher.id,
      classroomId: submission.classroomId,
      courseId: submission.project.courseId,
      projectId: submission.projectId,
      projectSubmissionId: submission.id,
      hardwarePlatformId: submission.hardwarePlatformId,
      attemptNo: submission.submissionNo,
      source: "teacher-rubric",
      occurredAt: assessedAt,
    };
    await tx.learningEvent.createMany({ data: [
      ...scores.map((item) => ({
        ...common,
        type: "RUBRIC_SCORED" as const,
        outcome: item.maxScore > 0 && (item.score / item.maxScore) * 100 >= 70 ? ("PASSED" as const) : ("FAILED" as const),
        skillId: item.skillId,
        score: item.score,
        maxScore: item.maxScore,
        metadata: { criterionId: item.criterionId, assessmentType: "project" },
      })),
      {
        ...common,
        type: "TEACHER_FEEDBACK_RECEIVED" as const,
        outcome: "RECEIVED" as const,
        score: totalScore,
        maxScore,
        metadata: { hasWrittenFeedback: feedback.length > 0, feedbackCharacters: feedback.length, reviewOutcome },
      },
    ] });
  });

  const { recomputeCredentials } = await import("@/lib/credentials");
  await recomputeCredentials(submission.studentId);
  revalidatePath("/dashboard/teacher/reviews");
  revalidatePath("/dashboard/teacher/analytics");
  revalidatePath(`/dashboard/teacher/classes/${submission.classroomId}`);
}
