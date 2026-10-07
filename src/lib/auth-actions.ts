"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { createSession, destroySession } from "@/lib/session";

export type LoginState = { error?: string };

export async function login(_: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const genericError = { error: "Invalid email or password." };

  if (!email.includes("@") || password.length < 1) return genericError;

  const user = await db.user.findUnique({ where: { email } });
  if (!user || !user.isActive) return genericError;

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return { error: "Sign-in is temporarily locked after repeated attempts. Try again later." };
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    const nextCount = user.failedLoginCount + 1;
    await db.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: nextCount >= 5 ? 0 : nextCount,
        lockedUntil: nextCount >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null,
      },
    });
    return genericError;
  }

  await db.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null },
  });
  await createSession(user.id);
  redirect(`/dashboard/${user.role.toLowerCase()}`);
  return {};
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
