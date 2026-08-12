/**
 * The MVP puzzle set — bundled into the build, no localStorage, no
 * workshop. Order defines the daily rotation.
 */
import { parsePuzzle, type PhrasePuzzle } from "../phrase/model";
import whms from "../phrase/puzzles/puzzle_005.json";
import girls from "../phrase/puzzles/puzzle_006.json";
import easyRider from "../phrase/puzzles/puzzle_007.json";
import sixthSense from "../phrase/puzzles/puzzle_008.json";
import heyJude from "../phrase/puzzles/puzzle_009.json";

function load(raw: unknown): PhrasePuzzle {
  const { puzzle, errors } = parsePuzzle(raw);
  if (!puzzle || errors.length > 0) {
    throw new Error(`Bundled puzzle failed to parse: ${errors.join(", ")}`);
  }
  return puzzle;
}

export const MVP_PUZZLES: PhrasePuzzle[] = [
  load(girls),
  load(whms),
  load(easyRider),
  load(sixthSense),
  load(heyJude),
];

export function getMvpPuzzle(id: string): PhrasePuzzle | null {
  return MVP_PUZZLES.find((puzzle) => puzzle.id === id) ?? null;
}

/**
 * Daily rotation anchor (local time). On this date the cycle starts at
 * index 0 (Girls); every local midnight advances one puzzle, wrapping
 * around until there's a real content calendar.
 */
const ROTATION_EPOCH = { year: 2026, month: 7, day: 11 }; // Aug 11, 2026

export function getTodaysMvpPuzzle(now: Date = new Date()): PhrasePuzzle {
  const start = new Date(
    ROTATION_EPOCH.year,
    ROTATION_EPOCH.month,
    ROTATION_EPOCH.day,
  );
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((today.getTime() - start.getTime()) / 86_400_000);
  const count = MVP_PUZZLES.length;
  // Double modulo keeps the index positive for dates before the epoch.
  return MVP_PUZZLES[((days % count) + count) % count];
}
