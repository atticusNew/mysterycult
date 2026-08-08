/**
 * Case library — published, playable cases.
 *
 * Cases reach the library by being published from the Case Workshop or
 * imported as JSON. The library is persisted in localStorage for the
 * prototype; the storage layer is isolated here so it can later be swapped
 * for a server-backed catalogue of hundreds of cases without touching game
 * code.
 */
import type { CaseData } from "../models/types";
import { parseCase } from "./schema";

const STORAGE_KEY = "cm.caseLibrary.v1";

export interface LibraryEntry {
  caseData: CaseData;
  publishedAt: number;
}

function readStorage(): LibraryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry) => {
        const result = parseCase(entry?.caseData);
        if (!result.caseData || result.errors.length > 0) return null;
        return {
          caseData: result.caseData,
          publishedAt:
            typeof entry?.publishedAt === "number" ? entry.publishedAt : 0,
        };
      })
      .filter((entry): entry is LibraryEntry => entry !== null);
  } catch {
    return [];
  }
}

function writeStorage(entries: LibraryEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function listPublishedCases(): LibraryEntry[] {
  return readStorage();
}

export function getPublishedCase(caseId: string): CaseData | null {
  const entry = readStorage().find((item) => item.caseData.id === caseId);
  return entry ? entry.caseData : null;
}

/** Publish (or republish) a case, replacing any existing case with the same id. */
export function publishCase(caseData: CaseData): void {
  const entries = readStorage().filter(
    (entry) => entry.caseData.id !== caseData.id,
  );
  entries.push({ caseData, publishedAt: Date.now() });
  writeStorage(entries);
}

export function unpublishCase(caseId: string): void {
  writeStorage(readStorage().filter((entry) => entry.caseData.id !== caseId));
}

/**
 * Today's Case: deterministic daily rotation over the published library.
 * Everyone with the same library sees the same case on the same day —
 * one shared case per day, no difficulty variants (spec §7–8).
 */
export function getTodaysCase(now: Date = new Date()): CaseData | null {
  const entries = readStorage();
  if (entries.length === 0) return null;
  const sorted = [...entries].sort((a, b) => a.publishedAt - b.publishedAt);
  const dayIndex = Math.floor(now.getTime() / 86_400_000);
  return sorted[dayIndex % sorted.length].caseData;
}
