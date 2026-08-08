/**
 * ClueEngine — clue ordering, availability and progress.
 *
 * Clues are presented in stage order (opening → middle → late → final),
 * preserving authored order within a stage. Clues unlock progressively:
 * the next clue becomes available once the previous one is solved or set
 * aside, so late-stage clue text is not exposed early.
 */
import type { CaseData, Clue, ClueStage } from "../models/types";

const STAGE_ORDER: Record<ClueStage, number> = {
  opening: 0,
  middle: 1,
  late: 2,
  final: 3,
};

export type ClueStatus = "locked" | "available" | "skipped" | "solved";

export interface ClueProgress {
  clueId: string;
  status: ClueStatus;
  wrongAttempts: number;
  solvedAt: number | null;
}

/** Stable sort of clues by stage, preserving authored order within a stage. */
export function orderedClues(caseData: CaseData): Clue[] {
  return caseData.clues
    .map((clue, index) => ({ clue, index }))
    .sort((a, b) => {
      const stageDiff =
        (STAGE_ORDER[a.clue.stage] ?? 0) - (STAGE_ORDER[b.clue.stage] ?? 0);
      return stageDiff !== 0 ? stageDiff : a.index - b.index;
    })
    .map((entry) => entry.clue);
}

export function initialClueProgress(caseData: CaseData): ClueProgress[] {
  return orderedClues(caseData).map((clue, index) => ({
    clueId: clue.id,
    status: index === 0 ? "available" : "locked",
    wrongAttempts: 0,
    solvedAt: null,
  }));
}

/**
 * Recompute availability: every clue up to (and including) the one after the
 * furthest solved/skipped clue is available.
 */
export function refreshAvailability(progress: ClueProgress[]): ClueProgress[] {
  let furthestTouched = -1;
  progress.forEach((entry, index) => {
    if (entry.status === "solved" || entry.status === "skipped") {
      furthestTouched = Math.max(furthestTouched, index);
    }
  });
  return progress.map((entry, index) => {
    if (entry.status === "solved" || entry.status === "skipped") return entry;
    const unlocked = index <= furthestTouched + 1;
    return { ...entry, status: unlocked ? "available" : "locked" };
  });
}

export function findProgress(
  progress: ClueProgress[],
  clueId: string,
): ClueProgress | undefined {
  return progress.find((entry) => entry.clueId === clueId);
}

/** The next clue the player should look at, preferring available then skipped. */
export function nextOpenClueId(progress: ClueProgress[]): string | null {
  const available = progress.find((entry) => entry.status === "available");
  if (available) return available.clueId;
  const skipped = progress.find((entry) => entry.status === "skipped");
  if (skipped) return skipped.clueId;
  return null;
}

export function allCluesResolved(progress: ClueProgress[]): boolean {
  return progress.every((entry) => entry.status === "solved");
}
