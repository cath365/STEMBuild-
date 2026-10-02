"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { requireRole } from "@/lib/session";

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
