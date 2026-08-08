/**
 * AnswerEngine — normalizes and matches player answers against an
 * AnswerSpec (primary answer + accepted aliases).
 *
 * Matching is intentionally forgiving: case-insensitive, diacritic-insensitive,
 * punctuation-insensitive, whitespace-collapsed, and tolerant of a leading
 * "the". Authors add aliases for anything beyond that.
 */
import type { AnswerSpec } from "../models/types";

export function normalizeAnswer(raw: string): string {
  const cleaned = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.replace(/^the\s+/, "");
}

/** All normalized accepted forms for a spec (primary + aliases). */
export function acceptedForms(spec: AnswerSpec): string[] {
  const forms = [spec.primary, ...spec.aliases]
    .map(normalizeAnswer)
    .filter((form) => form.length > 0);
  return Array.from(new Set(forms));
}

export function answerMatches(input: string, spec: AnswerSpec): boolean {
  const normalized = normalizeAnswer(input);
  if (!normalized) return false;
  return acceptedForms(spec).includes(normalized);
}
