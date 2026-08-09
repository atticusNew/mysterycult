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
  load(whms),
  load(girls),
  load(easyRider),
  load(sixthSense),
  load(heyJude),
];

export function getMvpPuzzle(id: string): PhrasePuzzle | null {
  return MVP_PUZZLES.find((puzzle) => puzzle.id === id) ?? null;
}

/** Today's puzzle: deterministic daily rotation. */
export function getTodaysMvpPuzzle(now: Date = new Date()): PhrasePuzzle {
  const dayIndex = Math.floor(now.getTime() / 86_400_000);
  return MVP_PUZZLES[dayIndex % MVP_PUZZLES.length];
}
