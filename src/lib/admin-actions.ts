"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { requireRole } from "@/lib/session";
import { componentBySlug } from "@/lib/build-catalog";
import { deleteEvidence, storeEvidence } from "@/lib/evidence-storage";
import { evidenceSignature } from "@/lib/validation";

function slugify(value: string) { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

export async function createSchool(formData: FormData) {
  await requireRole("ADMIN");
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) throw new Error("School name is required.");
  await db.school.create({ data: { name, slug: `${slugify(name)}-${Date.now().toString(36)}` } });
  revalidatePath("/dashboard/admin/schools");
}

export async function createUser(formData: FormData) {
  await requireRole("ADMIN");
  const displayName = String(formData.get("displayName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "STUDENT") as "STUDENT" | "TEACHER" | "ADMIN";
  const schoolId = String(formData.get("schoolId") ?? "") || null;
  if (!["STUDENT", "TEACHER", "ADMIN"].includes(role)) throw new Error("Invalid role.");
  if (schoolId && !await db.school.findUnique({ where: { id: schoolId } })) throw new Error("School not found.");
  if (!displayName || !email.includes("@")) throw new Error("Name and a valid email are required.");
  const passwordHash = await hashPassword(password);
  await db.user.create({ data: { displayName, email, passwordHash, role, schoolId } });
  revalidatePath("/dashboard/admin/users");
}

export async function createHardware(formData: FormData) {
  await requireRole("ADMIN");
  const name = String(formData.get("name") ?? "").trim();
  const family = String(formData.get("family") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!name || !family) throw new Error("Hardware name and family are required.");
  await db.hardwarePlatform.create({ data: { name, family, description, slug: `${slugify(name)}-${Date.now().toString(36)}` } });
  revalidatePath("/dashboard/admin/hardware");
}



export async function createRoboticsKit(formData: FormData) {
  await requireRole("ADMIN");
  const schoolId = String(formData.get("schoolId") ?? "");
  const hardwarePlatformId = String(formData.get("hardwarePlatformId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 30);
  if (!schoolId || !hardwarePlatformId || !name || !code) throw new Error("School, hardware platform, kit name and kit code are required.");
  const [school, hardware] = await Promise.all([
    db.school.findUnique({ where: { id: schoolId }, select: { id: true } }),
    db.hardwarePlatform.findUnique({ where: { id: hardwarePlatformId }, select: { id: true } }),
  ]);
  if (!school || !hardware) throw new Error("School or hardware platform was not found.");
  await db.roboticsKit.create({ data: { schoolId, hardwarePlatformId, name, code } });
  revalidatePath("/dashboard/admin/hardware");
}

export async function toggleRoboticsKit(kitId: string) {
  await requireRole("ADMIN");
  const kit = await db.roboticsKit.findUnique({ where: { id: kitId }, select: { active: true } });
  if (!kit) throw new Error("Robotics kit not found.");
  await db.roboticsKit.update({ where: { id: kitId }, data: { active: !kit.active } });
  revalidatePath("/dashboard/admin/hardware");
}

export async function createOutcome(formData: FormData) {
  await requireRole("ADMIN");
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const skillId = String(formData.get("skillId") ?? "") || null;
  if (!code || !title || !description) throw new Error("Code, title and description are required.");
  if (skillId && !(await db.skill.findUnique({ where: { id: skillId } }))) throw new Error("Skill not found.");
  await db.learningOutcome.create({ data: { code, title, description, skillId } });
  revalidatePath("/dashboard/admin/outcomes");
}

export async function createCourse(formData: FormData) {
  await requireRole("ADMIN");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!title || !description) throw new Error("Title and description are required.");
  await db.course.create({ data: { title, slug: `${slugify(title)}-${Date.now().toString(36)}`, description, status: "DRAFT", difficulty: "BEGINNER" } });
  revalidatePath("/dashboard/admin/curriculum");
}

export async function upsertLessonHardwareVariant(formData: FormData) {
  await requireRole("ADMIN");
  const lessonId = String(formData.get("lessonId") ?? "");
  const hardwarePlatformId = String(formData.get("hardwarePlatformId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const wiringInstructions = String(formData.get("wiringInstructions") ?? "").trim();
  const gpioMappings = String(formData.get("gpioMappings") ?? "").trim();
  const codeLanguage = String(formData.get("codeLanguage") ?? "").trim();
  const programmingFramework = String(formData.get("programmingFramework") ?? "").trim();
  const codeSnippet = String(formData.get("sourceCode") ?? "").trim();
  const uploadProcedure = String(formData.get("uploadProcedure") ?? "").trim();
  const expectedOutput = String(formData.get("expectedOutput") ?? "").trim();
  const troubleshooting = String(formData.get("troubleshooting") ?? "").trim();

  if (!lessonId || !hardwarePlatformId || !wiringInstructions || !codeLanguage || !codeSnippet || !expectedOutput || !troubleshooting) {
    throw new Error("Lesson, board, wiring, language, source code, expected output and troubleshooting are required.");
  }

  const [lesson, hardware] = await Promise.all([
    db.lesson.findUnique({ where: { id: lessonId }, select: { id: true, title: true } }),
    db.hardwarePlatform.findUnique({ where: { id: hardwarePlatformId }, select: { id: true, name: true, active: true } }),
  ]);
  if (!lesson || !hardware || !hardware.active) throw new Error("Lesson or active hardware platform was not found.");

  await db.lessonHardwareVariant.upsert({
    where: { lessonId_hardwarePlatformId: { lessonId, hardwarePlatformId } },
    create: {
      lessonId,
      hardwarePlatformId,
      title: title || `${lesson.title} — ${hardware.name}`,
      wiringInstructions,
      gpioMappings,
      codeLanguage,
      programmingFramework,
      codeSnippet,
      uploadProcedure,
      expectedOutput,
      troubleshooting,
    },
    update: {
      title: title || `${lesson.title} — ${hardware.name}`,
      wiringInstructions,
      gpioMappings,
      codeLanguage,
      programmingFramework,
      codeSnippet,
      uploadProcedure,
      expectedOutput,
      troubleshooting,
    },
  });
  revalidatePath("/dashboard/admin/hardware/variants");
  revalidatePath(`/dashboard/student/lessons/${lessonId}`);
}

export async function upsertProjectHardwareVariant(formData: FormData) {
  await requireRole("ADMIN");
  const projectId = String(formData.get("projectId") ?? "");
  const hardwarePlatformId = String(formData.get("hardwarePlatformId") ?? "");
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const wiringInstructions = String(formData.get("wiringInstructions") ?? "").trim();
  const gpioMappings = String(formData.get("gpioMappings") ?? "").trim();
  const codeLanguage = String(formData.get("codeLanguage") ?? "").trim();
  const programmingFramework = String(formData.get("programmingFramework") ?? "").trim();
  const sourceCode = String(formData.get("sourceCode") ?? "").trim();
  const uploadProcedure = String(formData.get("uploadProcedure") ?? "").trim();
  const expectedOutput = String(formData.get("expectedOutput") ?? "").trim();
  const troubleshooting = String(formData.get("troubleshooting") ?? "").trim();

  if (!projectId || !hardwarePlatformId || !wiringInstructions || !codeLanguage || !sourceCode || !expectedOutput || !troubleshooting) {
    throw new Error("Project, board, wiring, language, source code, expected output and troubleshooting are required.");
  }

  const [project, hardware] = await Promise.all([
    db.project.findUnique({ where: { id: projectId }, select: { id: true } }),
    db.hardwarePlatform.findUnique({ where: { id: hardwarePlatformId }, select: { id: true, active: true } }),
  ]);
  if (!project || !hardware || !hardware.active) throw new Error("Project or active hardware platform was not found.");

  await db.projectHardware.upsert({
    where: { projectId_hardwarePlatformId: { projectId, hardwarePlatformId } },
    create: {
      projectId,
      hardwarePlatformId,
      notes,
      wiringInstructions,
      gpioMappings,
      codeLanguage,
      programmingFramework,
      sourceCode,
      uploadProcedure,
      expectedOutput,
      troubleshooting,
    },
    update: {
      notes,
      wiringInstructions,
      gpioMappings,
      codeLanguage,
      programmingFramework,
      sourceCode,
      uploadProcedure,
      expectedOutput,
      troubleshooting,
    },
  });
  revalidatePath("/dashboard/admin/hardware/variants");
  revalidatePath("/dashboard/student/projects");
}

export async function toggleUserActive(userId: string) {
  await requireRole("ADMIN");
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found.");
  await db.user.update({ where: { id: userId }, data: { isActive: !user.isActive } });
  revalidatePath("/dashboard/admin/users");
}

export async function setCourseStatus(courseId: string, formData: FormData) {
  await requireRole("ADMIN");
  const status = String(formData.get("status") ?? "DRAFT") as "DRAFT" | "PUBLISHED" | "ARCHIVED";
  if (!["DRAFT", "PUBLISHED", "ARCHIVED"].includes(status)) throw new Error("Invalid course status.");
  await db.course.update({ where: { id: courseId }, data: { status } });
  revalidatePath("/dashboard/admin/curriculum");
}

export async function toggleHardwareActive(hardwareId: string) {
  await requireRole("ADMIN");
  const hardware = await db.hardwarePlatform.findUnique({ where: { id: hardwareId } });
  if (!hardware) throw new Error("Hardware platform not found.");
  await db.hardwarePlatform.update({ where: { id: hardwareId }, data: { active: !hardware.active } });
  revalidatePath("/dashboard/admin/hardware");
}

export async function createRubric(formData: FormData) {
  await requireRole("ADMIN");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const lines = String(formData.get("criteria") ?? "").split("\n").map((line) => line.trim()).filter(Boolean);
  const parsed = lines.map((line, index) => {
    const [label, skillTag, maxRaw, ...descParts] = line.split("|").map((part) => part.trim());
    const maxScore = Number(maxRaw);
    if (!label || !skillTag || !Number.isFinite(maxScore) || maxScore <= 0) throw new Error(`Invalid criterion on line ${index + 1}.`);
    return { label, skillTag, maxScore, description: descParts.join(" | ") || label, order: index + 1 };
  });
  if (!name || !description || parsed.length === 0) throw new Error("Rubric name, description and at least one criterion are required.");
  const skills = await db.skill.findMany({ where: { slug: { in: parsed.map((item) => item.skillTag) } } });
  const skillBySlug = new Map(skills.map((skill) => [skill.slug, skill.id]));
  const criteria = parsed.map((item, index) => {
    const skillId = skillBySlug.get(item.skillTag);
    if (!skillId) throw new Error(`Unknown skill taxonomy slug on line ${index + 1}: ${item.skillTag}`);
    return { ...item, skillId };
  });
  await db.rubric.create({ data: { name, description, criteria: { create: criteria } } });
  revalidatePath("/dashboard/admin/rubrics");
}


const COMPONENT_MEDIA_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const COMPONENT_MEDIA_KINDS = new Set(["PHOTO", "PINOUT", "WIRING", "EXPECTED_RESULT", "COMMON_MISTAKE"]);

async function assertComponentMediaFile(value: FormDataEntryValue | null) {
  if (!(value instanceof File) || value.size === 0) throw new Error("Choose a JPG, PNG or WEBP image.");
  if (!COMPONENT_MEDIA_TYPES.has(value.type)) throw new Error("Component media must be JPG, PNG or WEBP.");
  if (value.size > 3_500_000) throw new Error("Component media must be 3.5 MB or smaller.");
  if (!evidenceSignature(new Uint8Array(await value.slice(0, 12).arrayBuffer()), value.type)) throw new Error("Image content does not match its file type.");
  return value;
}

export async function uploadComponentMedia(formData: FormData) {
  await requireRole("ADMIN");
  const componentSlug = String(formData.get("componentSlug") ?? "").trim();
  const kind = String(formData.get("kind") ?? "PHOTO");
  const altText = String(formData.get("altText") ?? "").trim();
  const caption = String(formData.get("caption") ?? "").trim();
  const credit = String(formData.get("credit") ?? "").trim() || null;
  const licenseName = String(formData.get("licenseName") ?? "").trim() || null;
  const licenseUrl = String(formData.get("licenseUrl") ?? "").trim() || null;
  const sourceUrl = String(formData.get("sourceUrl") ?? "").trim() || null;
  const sortOrder = Math.max(0, Math.min(999, Number(formData.get("sortOrder") ?? 0) || 0));
  const file = await assertComponentMediaFile(formData.get("media"));

  if (!componentBySlug(componentSlug)) throw new Error("Unknown public component slug.");
  if (!COMPONENT_MEDIA_KINDS.has(kind)) throw new Error("Invalid component media kind.");
  if (altText.length < 3 || altText.length > 220) throw new Error("Alt text must be 3–220 characters.");
  if (caption.length < 3 || caption.length > 600) throw new Error("Caption must be 3–600 characters.");

  for (const [label, url] of [["License URL", licenseUrl], ["Source URL", sourceUrl]] as const) {
    if (url && !/^https:\/\//i.test(url)) throw new Error(`${label} must use HTTPS.`);
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const pathname = `component-media/${componentSlug}/${randomUUID()}-${safeName}`;
  const stored = await storeEvidence(pathname, file);

  try {
    await db.componentMedia.create({
      data: {
        componentSlug,
        kind: kind as "PHOTO" | "PINOUT" | "WIRING" | "EXPECTED_RESULT" | "COMMON_MISTAKE",
        storagePath: stored.pathname,
        originalName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        altText,
        caption,
        credit,
        licenseName,
        licenseUrl,
        sourceUrl,
        sortOrder,
        verified: false,
      },
    });
  } catch (error) {
    await deleteEvidence(stored.pathname).catch(() => undefined);
    throw error;
  }

  revalidatePath("/dashboard/admin/hardware/visuals");
  revalidatePath(`/components/${componentSlug}`);
}

export async function setComponentMediaVerified(mediaId: string, formData: FormData) {
  await requireRole("ADMIN");
  const verified = String(formData.get("verified") ?? "false") === "true";
  const media = await db.componentMedia.findUnique({ where: { id: mediaId }, select: { componentSlug: true } });
  if (!media) throw new Error("Component media not found.");
  await db.componentMedia.update({ where: { id: mediaId }, data: { verified } });
  revalidatePath("/dashboard/admin/hardware/visuals");
  revalidatePath(`/components/${media.componentSlug}`);
}

export async function deleteComponentMedia(mediaId: string) {
  await requireRole("ADMIN");
  const media = await db.componentMedia.findUnique({ where: { id: mediaId } });
  if (!media) throw new Error("Component media not found.");
  await db.componentMedia.delete({ where: { id: mediaId } });
  await deleteEvidence(media.storagePath).catch(() => undefined);
  revalidatePath("/dashboard/admin/hardware/visuals");
  revalidatePath(`/components/${media.componentSlug}`);
}
