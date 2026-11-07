import { useCallback, useMemo } from "react";
import { componentCatalog, type BuildProject } from "@/lib/build-catalog";
import { useStoredValue } from "@/lib/use-stored-value";

// "My Components" is a device-local kit list. It never marks lessons or assessments complete.
export const MY_COMPONENTS_KEY = "stembuild-my-components-v1";

export function parseOwnedComponents(raw: string | null): string[] {
  try {
    const parsed = JSON.parse(raw ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

/** The learner's kit, shared live between My Components, Projects and Build Mode (and across tabs). */
export function useOwnedComponents() {
  const [raw, setRaw] = useStoredValue(MY_COMPONENTS_KEY);
  const owned = useMemo(() => parseOwnedComponents(raw), [raw]);
  const setOwned = useCallback((next: string[]) => setRaw(JSON.stringify(next)), [setRaw]);
  return [owned, setOwned] as const;
}

/** Board names (as used by BuildProject.boards) that the owned microcontrollers can stand in for. */
export function ownedBoardNames(owned: string[]) {
  return new Set(componentCatalog.filter((item) => item.category === "Microcontrollers" && owned.includes(item.slug)).flatMap((item) => item.compatibleBoards));
}

export type ProjectReadiness = { missing: string[]; hasBoard: boolean; ready: boolean };

export function projectReadiness(project: BuildProject, owned: string[], boards = ownedBoardNames(owned)): ProjectReadiness {
  const missing = project.required.filter((slug) => !owned.includes(slug));
  const hasBoard = project.boards.some((board) => boards.has(board));
  return { missing, hasBoard, ready: missing.length === 0 && hasBoard };
}

export function componentName(slug: string) {
  return componentCatalog.find((item) => item.slug === slug)?.name ?? slug;
}
