/**
 * Workshop draft persistence (localStorage for the prototype).
 * Drafts are full CaseData objects; "Save Draft" writes here.
 */
import type { CaseData } from "../models/types";
import { parseCase } from "../data/schema";

const STORAGE_KEY = "cm.workshop.drafts.v1";

export interface DraftEntry {
  draftId: string;
  caseData: CaseData;
  savedAt: number;
}

function readStorage(): DraftEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry) => {
        const result = parseCase(entry?.caseData);
        if (!result.caseData) return null;
        return {
          draftId: typeof entry?.draftId === "string" ? entry.draftId : "",
          caseData: result.caseData,
          savedAt: typeof entry?.savedAt === "number" ? entry.savedAt : 0,
        };
      })
      .filter((entry): entry is DraftEntry => entry !== null && !!entry.draftId);
  } catch {
    return [];
  }
}

function writeStorage(entries: DraftEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function listDrafts(): DraftEntry[] {
  return readStorage().sort((a, b) => b.savedAt - a.savedAt);
}

export function getDraft(draftId: string): DraftEntry | null {
  return readStorage().find((entry) => entry.draftId === draftId) ?? null;
}

export function saveDraft(draftId: string, caseData: CaseData): DraftEntry {
  const entries = readStorage().filter((entry) => entry.draftId !== draftId);
  const saved: DraftEntry = { draftId, caseData, savedAt: Date.now() };
  entries.push(saved);
  writeStorage(entries);
  return saved;
}

export function deleteDraft(draftId: string): void {
  writeStorage(readStorage().filter((entry) => entry.draftId !== draftId));
}
