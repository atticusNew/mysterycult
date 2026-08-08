/**
 * JSON import / export for the Case Workshop.
 *
 * The content pipeline is:
 *   AUTHOR → CASE WORKSHOP → VALIDATE → EXPORT JSON → GAME ENGINE
 * and the reverse:
 *   JSON → IMPORT → CASE WORKSHOP → EDIT → EXPORT
 *
 * Export produces the complete case JSON (including editorial metadata) so
 * a case round-trips losslessly. The game engine simply never surfaces
 * editorial fields to the player.
 */
import type { CaseData } from "../models/types";
import { loadCaseFromJson } from "../data/caseLoader";

/** Serialize a case with a stable, readable key order. */
export function exportCaseToJson(caseData: CaseData): string {
  const ordered: CaseData = {
    id: caseData.id,
    version: caseData.version,
    title: caseData.title,
    question: caseData.question,
    answer: caseData.answer,
    type: caseData.type,
    category: caseData.category,
    entityId: caseData.entityId,
    entity: caseData.entity,
    clues: caseData.clues,
    evidence: caseData.evidence,
    investigationPaths: caseData.investigationPaths,
    hints: caseData.hints,
    reveal: caseData.reveal,
    editorial: caseData.editorial,
  };
  return JSON.stringify(ordered, null, 2);
}

export interface ImportResult {
  caseData: CaseData | null;
  errors: string[];
}

export function importCaseFromJson(text: string): ImportResult {
  return loadCaseFromJson(text);
}

/** Trigger a browser download of the case JSON. */
export function downloadCaseJson(caseData: CaseData): void {
  const blob = new Blob([exportCaseToJson(caseData)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${caseData.id || "case"}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
