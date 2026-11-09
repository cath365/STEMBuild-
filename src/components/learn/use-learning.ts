"use client";

import { useCallback, useMemo } from "react";
import { BOARD_STORAGE_KEY, DEFAULT_BOARD, isBoardId, type BoardId } from "@/lib/learn/boards";
import { LEARNED_STORAGE_KEY, parseLearned } from "@/lib/learn/progress";
import { useStoredValue } from "@/lib/use-stored-value";

/** The learner's chosen board, shared by every guide and the roadmap. */
export function useBoard() {
  const [raw, setRaw] = useStoredValue(BOARD_STORAGE_KEY);
  const board: BoardId = isBoardId(raw) ? raw : DEFAULT_BOARD;
  return [board, setRaw as (id: BoardId) => void, raw !== null] as const;
}

/** Components the learner has marked as learned by answering the check question. */
export function useLearned() {
  const [raw, setRaw] = useStoredValue(LEARNED_STORAGE_KEY);
  const learned = useMemo(() => new Set(parseLearned(raw)), [raw]);
  const markLearned = useCallback((slug: string) => {
    const next = new Set(parseLearned(raw));
    next.add(slug);
    setRaw(JSON.stringify([...next]));
  }, [raw, setRaw]);
  return [learned, markLearned] as const;
}
