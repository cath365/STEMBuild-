"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { parseQuizDraft, requiredText } from "@/lib/validation";

function slug(title: string) { return `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80)}-${randomUUID().slice(0,8)}`; }

export async function createModule(form: FormData) {
  await requireRole("ADMIN");
  const courseId = requiredText(form, "courseId", 100);
  const title = requiredText(form, "title", 200);
  const description = requiredText(form, "description", 4000);
  if (!await db.course.findUnique({ where: { id: courseId } })) throw new Error("Course not found.");
  await db.$transaction(async (tx) => {
    const last = await tx.module.aggregate({ where: { courseId }, _max: { order: true } });
    await tx.module.create({ data: { courseId, title, description, slug: slug(title), order: (last._max.order ?? 0) + 1 } });
  });
  revalidatePath("/dashboard/admin/curriculum");
}

export async function createLesson(form: FormData) {
  await requireRole("ADMIN");
  const moduleId = requiredText(form, "moduleId", 100);
  const title = requiredText(form, "title", 200);
  const rubricId = requiredText(form, "rubricId", 100);
  const objective = requiredText(form, "objective", 2000);
  const theory = requiredText(form, "theory");
  const safetyNotes = requiredText(form, "safetyNotes", 4000);
  const practicalChallenge = requiredText(form, "practicalChallenge", 4000);
  const expectedOutput = requiredText(form, "expectedOutput", 4000);
  const generalTroubleshoot = requiredText(form, "generalTroubleshoot", 4000);
  const evidencePrompt = requiredText(form, "evidencePrompt", 4000);
  const questions = parseQuizDraft(requiredText(form, "questions"));
  const minutes = Number(form.get("estimatedMinutes"));
  if (!Number.isInteger(minutes) || minutes < 5 || minutes > 240) throw new Error("Duration must be 5–240 minutes.");
  const [module, rubric, skills] = await Promise.all([
    db.module.findUnique({ where: { id: moduleId } }),
    db.rubric.findUnique({ where: { id: rubricId }, include: { criteria: true } }),
    db.skill.findMany({ where: { id: { in: questions.flatMap((q) => q.skillId ? [q.skillId] : []) } } }),
  ]);
  if (!module || !rubric?.criteria.length || questions.some((q) => q.skillId && !skills.some((skill) => skill.id === q.skillId))) throw new Error("Choose a module, a rubric with criteria and valid quiz skills.");
  await db.$transaction(async (tx) => {
    const last = await tx.lesson.aggregate({ where: { moduleId }, _max: { order: true } });
    await tx.lesson.create({ data: {
      moduleId, title, slug: slug(title), concept: objective, objective, theory, safetyNotes, practicalChallenge, expectedOutput, generalTroubleshoot,
      estimatedMinutes: minutes, order: (last._max.order ?? 0) + 1, status: "DRAFT",
      quiz: { create: { title: `${title} assessment`, passScore: 70, questions: { create: questions.map((q, i) => ({ ...q, type: "SINGLE_CHOICE", points: 1, order: i + 1 })) } } },
      practicalTasks: { create: { rubricId, title: `${title} practical`, instructions: practicalChallenge, successCriteria: expectedOutput, evidencePrompt } },
    } });
  });
  revalidatePath("/dashboard/admin/curriculum");
}

export async function setLessonStatus(lessonId: string, form: FormData) {
  await requireRole("ADMIN");
  const status = requiredText(form, "status", 20) as "DRAFT" | "PUBLISHED" | "ARCHIVED";
  if (!["DRAFT", "PUBLISHED", "ARCHIVED"].includes(status)) throw new Error("Invalid lesson status.");
  const lesson = await db.lesson.findUnique({ where: { id: lessonId }, include: { hardwareVariants: { include: { hardwarePlatform: true } }, quiz: { include: { questions: true } }, practicalTasks: true } });
  if (!lesson) throw new Error("Lesson not found.");
  if (status === "PUBLISHED" && (!lesson.quiz?.questions.length || !lesson.practicalTasks.length || !lesson.hardwareVariants.some((v) => v.hardwarePlatform.active && v.codeSnippet && v.wiringInstructions && v.uploadProcedure))) throw new Error("Add a quiz, practical task and complete active board variant before publishing.");
  await db.lesson.update({ where: { id: lessonId }, data: { status } });
  revalidatePath("/dashboard/admin/curriculum");
  revalidatePath(`/dashboard/student/lessons/${lessonId}`);
}

export async function createProject(form: FormData) {
  await requireRole("ADMIN");
  const courseId = requiredText(form, "courseId", 100);
  const rubricId = requiredText(form, "rubricId", 100);
  const title = requiredText(form, "title", 200);
  const description = requiredText(form, "description", 4000);
  const instructions = requiredText(form, "instructions");
  const successCriteria = requiredText(form, "successCriteria", 4000);
  const [course, rubric] = await Promise.all([db.course.findUnique({ where: { id: courseId } }), db.rubric.findUnique({ where: { id: rubricId }, include: { criteria: true } })]);
  if (!course || !rubric?.criteria.length) throw new Error("Choose a course and rubric with criteria.");
  await db.project.create({ data: { courseId, rubricId, title, slug: slug(title), description, instructions, successCriteria } });
  revalidatePath("/dashboard/admin/curriculum");
}

export async function setProjectStatus(projectId: string, form: FormData) {
  await requireRole("ADMIN");
  const status = requiredText(form, "status", 20) as "DRAFT" | "PUBLISHED" | "ARCHIVED";
  if (!["DRAFT", "PUBLISHED", "ARCHIVED"].includes(status)) throw new Error("Invalid project status.");
  const project = await db.project.findUnique({ where: { id: projectId }, include: { hardware: { include: { hardwarePlatform: true } } } });
  if (!project) throw new Error("Project not found.");
  if (status === "PUBLISHED" && !project.hardware.some((v) => v.hardwarePlatform.active && v.wiringInstructions && v.sourceCode && v.uploadProcedure)) throw new Error("Add a complete active board variant before publishing.");
  await db.project.update({ where: { id: projectId }, data: { status } });
  revalidatePath("/dashboard/admin/curriculum");
}
