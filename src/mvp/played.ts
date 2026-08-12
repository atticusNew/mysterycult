/**
 * Which puzzles this device has finished, and the best score for each.
 * Drives the picker's played badges and the end screen's "Up next" card.
 */
import { MVP_PUZZLES } from "./puzzles";
import type { PhrasePuzzle } from "../phrase/model";

const KEY = "thrulines.played";

export interface PlayedRecord {
  best: number;
  plays: number;
}

export function getPlayed(): Record<string, PlayedRecord> {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, PlayedRecord>) : {};
  } catch {
    return {};
  }
}

export function recordPlayed(puzzleId: string, total: number): void {
  try {
    const all = getPlayed();
    const prev = all[puzzleId];
    all[puzzleId] = {
      best: Math.max(prev?.best ?? 0, total),
      plays: (prev?.plays ?? 0) + 1,
    };
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // Private-mode storage failures only cost the badges — never the game.
  }
}

/** The first bundled puzzle this device hasn't finished, if any. */
export function nextUnplayed(excludeId?: string): PhrasePuzzle | null {
  const played = getPlayed();
  return (
    MVP_PUZZLES.find(
      (puzzle) => puzzle.id !== excludeId && !played[puzzle.id],
    ) ?? null
  );
}
