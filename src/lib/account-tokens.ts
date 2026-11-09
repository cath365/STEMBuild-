// Pure helpers for class codes, single-use account links and sign-up validation.
import { createHash, randomBytes } from "node:crypto";

export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const RESET_TTL_MS = 24 * 60 * 60 * 1000;

/** A URL-safe secret for a link, and the hash that is the only thing stored. */
export function newToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashToken(token) };
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function newJoinCode() {
  return `STEM-${randomBytes(3).toString("hex").toUpperCase()}`;
}

/** Accepts "stem-1a2b3c", "1A2B3C", "STEM 1A2B3C" and similar; returns the canonical code or null. */
export function normalizeJoinCode(input: string) {
  const compact = input.trim().toUpperCase().replace(/[\s_-]+/g, "").replace(/^STEM/, "");
  return /^[0-9A-F]{6}$/.test(compact) ? `STEM-${compact}` : null;
}

/**
 * Codes to look up for what a learner typed: the exact code (any format, so older codes keep
 * working) plus the canonical STEM-XXXXXX form when the typing is a loose version of it.
 */
export function joinCodeCandidates(input: string) {
  const typed = input.trim().toUpperCase().replace(/\s+/g, "");
  if (!typed || typed.length > 40 || !/^[A-Z0-9_-]+$/.test(typed)) return [];
  const canonical = normalizeJoinCode(typed);
  return [...new Set([typed, ...(canonical ? [canonical] : [])])];
}

export function validateDisplayName(name: string) {
  const clean = name.trim().replace(/\s+/g, " ");
  if (clean.length < 2) return { error: "Enter your name (at least 2 characters)." } as const;
  if (clean.length > 80) return { error: "Name must be 80 characters or fewer." } as const;
  return { value: clean } as const;
}

export function validateEmail(email: string) {
  const clean = email.trim().toLowerCase();
  if (clean.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return { error: "Enter a valid email address." } as const;
  return { value: clean } as const;
}

/** Matches hashPassword's rule (12+ characters) and blocks the most obvious weak choices. */
export function validateNewPassword(password: string, confirm: string, email?: string) {
  if (password.length < 12) return "Password must be at least 12 characters. A short sentence works well.";
  if (password.length > 200) return "Password must be 200 characters or fewer.";
  if (password !== confirm) return "The two passwords do not match.";
  if (/^(.)\1+$/.test(password) || /^(?:0123456789|1234567890|password)/i.test(password)) return "Choose a less predictable password.";
  if (email && password.toLowerCase().includes(email.split("@")[0].toLowerCase()) && email.split("@")[0].length >= 4) return "Your password must not contain your email name.";
  return null;
}

export function tokenStatus(token: { usedAt: Date | null; expiresAt: Date } | null, now = new Date()) {
  if (!token) return "invalid" as const;
  if (token.usedAt) return "used" as const;
  if (token.expiresAt <= now) return "expired" as const;
  return "valid" as const;
}
