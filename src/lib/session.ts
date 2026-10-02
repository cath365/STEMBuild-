import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

const COOKIE_NAME = "stembuild_session";
const SESSION_DAYS = 7;

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.session.create({ data: { tokenHash: tokenHash(token), userId, expiresAt } });

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (token) {
    await db.session.deleteMany({ where: { tokenHash: tokenHash(token) } });
  }
  store.delete(COOKIE_NAME);
}

export async function getCurrentUser() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { tokenHash: tokenHash(token) },
    include: { user: { include: { school: true } } },
  });

  if (!session || session.expiresAt <= new Date() || !session.user.isActive) {
    if (session) await db.session.delete({ where: { id: session.id } }).catch(() => undefined);
    store.delete(COOKIE_NAME);
    return null;
  }

  return session.user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(...roles: Array<"STUDENT" | "TEACHER" | "ADMIN">) {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect(`/dashboard/${user.role.toLowerCase()}`);
  return user;
}
