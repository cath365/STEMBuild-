"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { createSession, getCurrentUser, requireRole } from "@/lib/session";
import { setupIsOpen } from "@/lib/setup";
import { INVITE_TTL_MS, RESET_TTL_MS, hashToken, joinCodeCandidates, newJoinCode, newToken, tokenStatus, validateDisplayName, validateEmail, validateNewPassword } from "@/lib/account-tokens";

export type FormState = { error?: string; link?: string; message?: string };

const BAD_CODE = "That class code is not valid, or the class is not accepting new learners. Check the code with your teacher.";

async function siteOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

// ---------- Students: join a class with its code ----------

export async function joinWithCode(_: FormState, formData: FormData): Promise<FormState> {
  const candidates = joinCodeCandidates(String(formData.get("code") ?? ""));
  const classroom = candidates.length ? await db.classroom.findFirst({ where: { joinCode: { in: candidates } } }) : null;
  if (!classroom || !classroom.joinOpen) return { error: BAD_CODE };

  const current = await getCurrentUser();
  if (current) {
    if (current.role !== "STUDENT") return { error: "Only student accounts can join a class with a code." };
    if (classroom.schoolId && current.schoolId && classroom.schoolId !== current.schoolId) return { error: "This class belongs to a different school from your account. Ask your teacher to check the code." };
    await db.classEnrollment.upsert({
      where: { classroomId_studentId: { classroomId: classroom.id, studentId: current.id } },
      create: { classroomId: classroom.id, studentId: current.id, status: "ACTIVE" },
      update: { status: "ACTIVE" },
    });
    revalidatePath("/dashboard/student");
    redirect("/dashboard/student");
  }

  const name = validateDisplayName(String(formData.get("displayName") ?? ""));
  if ("error" in name) return { error: name.error };
  const email = validateEmail(String(formData.get("email") ?? ""));
  if ("error" in email) return { error: email.error };
  const password = String(formData.get("password") ?? "");
  const problem = validateNewPassword(password, String(formData.get("confirm") ?? ""), email.value);
  if (problem) return { error: problem };
  if (await db.user.findUnique({ where: { email: email.value } })) return { error: "An account already uses this email. Sign in first, then join the class from your dashboard." };

  const passwordHash = await hashPassword(password);
  const student = await db.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { displayName: name.value, email: email.value, passwordHash, role: "STUDENT", schoolId: classroom.schoolId } });
    await tx.classEnrollment.create({ data: { classroomId: classroom.id, studentId: user.id, status: "ACTIVE" } });
    return user;
  });
  await createSession(student.id);
  redirect("/dashboard/student");
}

// ---------- Teachers: manage their class code and student resets ----------

async function ownClass(classroomId: string) {
  const teacher = await requireRole("TEACHER");
  const classroom = await db.classroom.findUnique({ where: { id: classroomId } });
  if (!classroom || classroom.teacherId !== teacher.id) throw new Error("Class not found.");
  return { teacher, classroom };
}

export async function regenerateJoinCode(classroomId: string) {
  await ownClass(classroomId);
  for (let attempt = 0; attempt < 5; attempt++) {
    try { await db.classroom.update({ where: { id: classroomId }, data: { joinCode: newJoinCode() } }); break; } catch (error) { if (attempt === 4) throw error; }
  }
  revalidatePath(`/dashboard/teacher/classes/${classroomId}`);
}

export async function setJoinOpen(classroomId: string, open: boolean) {
  await ownClass(classroomId);
  await db.classroom.update({ where: { id: classroomId }, data: { joinOpen: open } });
  revalidatePath(`/dashboard/teacher/classes/${classroomId}`);
}

async function issueResetLink(userId: string, createdById: string) {
  const { token, hash } = newToken();
  await db.$transaction([
    db.accountToken.deleteMany({ where: { userId, kind: "PASSWORD_RESET", usedAt: null } }),
    db.accountToken.create({ data: { kind: "PASSWORD_RESET", tokenHash: hash, userId, createdById, expiresAt: new Date(Date.now() + RESET_TTL_MS) } }),
  ]);
  return `${await siteOrigin()}/reset/${token}`;
}

export async function createStudentResetLink(classroomId: string, studentId: string, _: FormState): Promise<FormState> {
  const { teacher } = await ownClass(classroomId);
  const enrolled = await db.classEnrollment.findFirst({ where: { classroomId, studentId, status: "ACTIVE" }, include: { student: true } });
  if (!enrolled || enrolled.student.role !== "STUDENT") return { error: "That learner is not in this class." };
  return { link: await issueResetLink(studentId, teacher.id), message: `Give this link to ${enrolled.student.displayName}. It works once and expires in 24 hours.` };
}

// ---------- Admins: invite teachers and reset any account ----------

export async function createTeacherInvite(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireRole("ADMIN");
  const rawEmail = String(formData.get("email") ?? "").trim();
  let email: string | null = null;
  if (rawEmail) {
    const checked = validateEmail(rawEmail);
    if ("error" in checked) return { error: checked.error };
    if (await db.user.findUnique({ where: { email: checked.value } })) return { error: "An account already uses this email." };
    email = checked.value;
  }
  const schoolId = String(formData.get("schoolId") ?? "") || null;
  if (schoolId && !(await db.school.findUnique({ where: { id: schoolId } }))) return { error: "School not found." };
  const { token, hash } = newToken();
  await db.accountToken.create({ data: { kind: "TEACHER_INVITE", tokenHash: hash, email, schoolId, createdById: admin.id, expiresAt: new Date(Date.now() + INVITE_TTL_MS) } });
  return { link: `${await siteOrigin()}/invite/${token}`, message: "Send this link to the teacher. It works once and expires in 7 days." };
}

export async function createAdminResetLink(userId: string, _: FormState): Promise<FormState> {
  const admin = await requireRole("ADMIN");
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "User not found." };
  return { link: await issueResetLink(user.id, admin.id), message: `Reset link for ${user.displayName}. It works once and expires in 24 hours.` };
}

// ---------- First run: the very first administrator ----------

export async function createFirstAdmin(_: FormState, formData: FormData): Promise<FormState> {
  const name = validateDisplayName(String(formData.get("displayName") ?? ""));
  if ("error" in name) return { error: name.error };
  const email = validateEmail(String(formData.get("email") ?? ""));
  if ("error" in email) return { error: email.error };
  const password = String(formData.get("password") ?? "");
  const problem = validateNewPassword(password, String(formData.get("confirm") ?? ""), email.value);
  if (problem) return { error: problem };
  const passwordHash = await hashPassword(password);
  let admin: { id: string } | "closed" | "taken";
  try {
    // Serializable: if two people submit at the same moment, only one can become the first admin.
    admin = await db.$transaction(async (tx) => {
      if ((await tx.user.count({ where: { role: "ADMIN" } })) > 0) return "closed" as const;
      if (await tx.user.findUnique({ where: { email: email.value } })) return "taken" as const;
      return tx.user.create({ data: { displayName: name.value, email: email.value, passwordHash, role: "ADMIN" }, select: { id: true } });
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    // A serialization conflict means someone else finished first; anything else is a real failure.
    if (await setupIsOpen()) throw error;
    admin = "closed";
  }
  if (admin === "closed") return { error: "An administrator already exists, so setup is closed. Sign in instead." };
  if (admin === "taken") return { error: "An account already uses this email. Use a different email for the administrator." };
  await createSession(admin.id);
  redirect("/dashboard/admin");
}

// ---------- Public: accept an invitation, reset a password ----------

export async function acceptTeacherInvite(token: string, _: FormState, formData: FormData): Promise<FormState> {
  const invite = await db.accountToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!invite || invite.kind !== "TEACHER_INVITE" || tokenStatus(invite) !== "valid") return { error: "This invitation is no longer valid. Ask your administrator for a new link." };
  const name = validateDisplayName(String(formData.get("displayName") ?? ""));
  if ("error" in name) return { error: name.error };
  const email = validateEmail(invite.email ?? String(formData.get("email") ?? ""));
  if ("error" in email) return { error: email.error };
  const password = String(formData.get("password") ?? "");
  const problem = validateNewPassword(password, String(formData.get("confirm") ?? ""), email.value);
  if (problem) return { error: problem };
  if (await db.user.findUnique({ where: { email: email.value } })) return { error: "An account already uses this email. Sign in instead." };
  const passwordHash = await hashPassword(password);
  const teacher = await db.$transaction(async (tx) => {
    // Claim the invitation first so two simultaneous submissions cannot both succeed.
    const claimed = await tx.accountToken.updateMany({ where: { id: invite.id, usedAt: null }, data: { usedAt: new Date() } });
    if (claimed.count !== 1) return null;
    return tx.user.create({ data: { displayName: name.value, email: email.value, passwordHash, role: "TEACHER", schoolId: invite.schoolId } });
  });
  if (!teacher) return { error: "This invitation has already been used." };
  await createSession(teacher.id);
  redirect("/dashboard/teacher");
}

export async function resetPasswordWithToken(token: string, _: FormState, formData: FormData): Promise<FormState> {
  const reset = await db.accountToken.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
  if (!reset || reset.kind !== "PASSWORD_RESET" || !reset.user || tokenStatus(reset) !== "valid") return { error: "This reset link is no longer valid. Ask your teacher or administrator for a new one." };
  if (!reset.user.isActive) return { error: "This account is not active. Contact your administrator." };
  const password = String(formData.get("password") ?? "");
  const problem = validateNewPassword(password, String(formData.get("confirm") ?? ""), reset.user.email);
  if (problem) return { error: problem };
  const passwordHash = await hashPassword(password);
  const done = await db.$transaction(async (tx) => {
    const claimed = await tx.accountToken.updateMany({ where: { id: reset.id, usedAt: null }, data: { usedAt: new Date() } });
    if (claimed.count !== 1) return false;
    await tx.user.update({ where: { id: reset.user!.id }, data: { passwordHash, failedLoginCount: 0, lockedUntil: null } });
    await tx.session.deleteMany({ where: { userId: reset.user!.id } }); // sign out everywhere
    return true;
  });
  if (!done) return { error: "This reset link has already been used." };
  redirect("/login?reset=1");
}
