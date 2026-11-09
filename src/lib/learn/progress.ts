// Learning progress kept in the browser: which components the learner has checked off.
// Kept separate from the guide data so client components stay small.

export const LEARNED_STORAGE_KEY = "stembuild-learned-v1";

export function parseLearned(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && /^[a-z0-9-]{1,60}$/.test(item)) : [];
  } catch {
    return [];
  }
}
