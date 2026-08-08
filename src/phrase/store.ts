/**
 * Tagline drafts + published library (localStorage, same pattern as the
 * case library).
 */
import { parsePuzzle, type PhrasePuzzle } from "./model";

const DRAFTS_KEY = "cm.phrase.drafts.v1";
const LIBRARY_KEY = "cm.phrase.library.v1";

export interface PuzzleDraft {
  draftId: string;
  puzzle: PhrasePuzzle;
  savedAt: number;
}

interface LibraryEntry {
  puzzle: PhrasePuzzle;
  publishedAt: number;
}

function read<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ------------------------------------------------------------------ drafts

export function listPuzzleDrafts(): PuzzleDraft[] {
  return read<Record<string, unknown>>(DRAFTS_KEY)
    .map((entry) => {
      const { puzzle } = parsePuzzle(entry?.puzzle);
      if (!puzzle) return null;
      return {
        draftId: typeof entry?.draftId === "string" ? entry.draftId : "",
        puzzle,
        savedAt: typeof entry?.savedAt === "number" ? entry.savedAt : 0,
      };
    })
    .filter((entry): entry is PuzzleDraft => entry !== null && !!entry.draftId)
    .sort((a, b) => b.savedAt - a.savedAt);
}

export function getPuzzleDraft(draftId: string): PuzzleDraft | null {
  return listPuzzleDrafts().find((entry) => entry.draftId === draftId) ?? null;
}

export function savePuzzleDraft(draftId: string, puzzle: PhrasePuzzle): void {
  const entries = listPuzzleDrafts().filter(
    (entry) => entry.draftId !== draftId,
  );
  entries.push({ draftId, puzzle, savedAt: Date.now() });
  localStorage.setItem(DRAFTS_KEY, JSON.stringify(entries));
}

export function deletePuzzleDraft(draftId: string): void {
  localStorage.setItem(
    DRAFTS_KEY,
    JSON.stringify(listPuzzleDrafts().filter((entry) => entry.draftId !== draftId)),
  );
}

// ----------------------------------------------------------------- library

export function listPublishedPuzzles(): { puzzle: PhrasePuzzle; publishedAt: number }[] {
  return read<Record<string, unknown>>(LIBRARY_KEY)
    .map((entry) => {
      const { puzzle } = parsePuzzle(entry?.puzzle);
      if (!puzzle) return null;
      return {
        puzzle,
        publishedAt:
          typeof entry?.publishedAt === "number" ? entry.publishedAt : 0,
      };
    })
    .filter((entry): entry is LibraryEntry => entry !== null);
}

export function getPublishedPuzzle(puzzleId: string): PhrasePuzzle | null {
  return (
    listPublishedPuzzles().find((entry) => entry.puzzle.id === puzzleId)
      ?.puzzle ?? null
  );
}

export function publishPuzzle(puzzle: PhrasePuzzle): void {
  const entries = listPublishedPuzzles().filter(
    (entry) => entry.puzzle.id !== puzzle.id,
  );
  entries.push({ puzzle, publishedAt: Date.now() });
  localStorage.setItem(LIBRARY_KEY, JSON.stringify(entries));
}

export function unpublishPuzzle(puzzleId: string): void {
  localStorage.setItem(
    LIBRARY_KEY,
    JSON.stringify(
      listPublishedPuzzles().filter((entry) => entry.puzzle.id !== puzzleId),
    ),
  );
}

/** Today's puzzle: deterministic daily rotation over the published library. */
export function getTodaysPuzzle(now: Date = new Date()): PhrasePuzzle | null {
  const entries = listPublishedPuzzles();
  if (entries.length === 0) return null;
  const sorted = [...entries].sort((a, b) => a.publishedAt - b.publishedAt);
  const dayIndex = Math.floor(now.getTime() / 86_400_000);
  return sorted[dayIndex % sorted.length].puzzle;
}
