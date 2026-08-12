import { describe, expect, it } from "vitest";
import { getTodaysMvpPuzzle, MVP_PUZZLES } from "./puzzles";

describe("daily rotation", () => {
  it("advances one puzzle per local day and wraps around", () => {
    const epochNoon = new Date(2026, 7, 11, 12);
    expect(getTodaysMvpPuzzle(epochNoon).id).toBe(MVP_PUZZLES[0].id);

    const nextMorning = new Date(2026, 7, 12, 0, 5);
    expect(getTodaysMvpPuzzle(nextMorning).id).toBe(MVP_PUZZLES[1].id);

    const lateThatDay = new Date(2026, 7, 12, 23, 59);
    expect(getTodaysMvpPuzzle(lateThatDay).id).toBe(MVP_PUZZLES[1].id);

    const fullCycleLater = new Date(2026, 7, 11 + MVP_PUZZLES.length, 9);
    expect(getTodaysMvpPuzzle(fullCycleLater).id).toBe(MVP_PUZZLES[0].id);
  });

  it("still returns a bundled puzzle for dates before the epoch", () => {
    const before = new Date(2026, 7, 9, 9);
    const picked = getTodaysMvpPuzzle(before);
    expect(MVP_PUZZLES.some((puzzle) => puzzle.id === picked.id)).toBe(true);
  });
});
