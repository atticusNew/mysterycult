/**
 * Case loading — the single entry point for turning JSON text into a
 * playable case. Used by JSON import, the case library and the workshop.
 */
import type { CaseData } from "../models/types";
import { parseCase } from "./schema";

export interface LoadResult {
  caseData: CaseData | null;
  errors: string[];
}

export function loadCaseFromJson(text: string): LoadResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (error) {
    return {
      caseData: null,
      errors: [
        `Invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
      ],
    };
  }
  const { caseData, errors } = parseCase(raw);
  return errors.length > 0 ? { caseData: null, errors } : { caseData, errors };
}

export function loadCaseFromObject(raw: unknown): LoadResult {
  const { caseData, errors } = parseCase(raw);
  return errors.length > 0 ? { caseData: null, errors } : { caseData, errors };
}
