/**
 * EvidenceEngine — controls what evidence the player can see.
 *
 * Critically, the player-facing projection strips ALL editorial metadata:
 * diagnosticity, related entities and author notes never reach player mode
 * (spec §12, §43). The player sees the evidence itself and must infer why
 * it matters.
 */
import type { CaseData, Evidence, EvidenceType } from "../models/types";

/** The player-safe projection of an evidence item. */
export interface PlayerEvidence {
  id: string;
  type: EvidenceType;
  content: string;
  caption: string | null;
}

export function toPlayerEvidence(evidence: Evidence): PlayerEvidence {
  return {
    id: evidence.id,
    type: evidence.type,
    content: evidence.content,
    caption: evidence.caption,
  };
}

export function findEvidence(
  caseData: CaseData,
  evidenceId: string,
): Evidence | undefined {
  return caseData.evidence.find((item) => item.id === evidenceId);
}

/** Unlocked evidence in unlock order, projected for the player. */
export function unlockedPlayerEvidence(
  caseData: CaseData,
  unlockedIds: string[],
): PlayerEvidence[] {
  return unlockedIds
    .map((id) => findEvidence(caseData, id))
    .filter((item): item is Evidence => Boolean(item))
    .map(toPlayerEvidence);
}

/** Evidence unlocked by solving a given clue, if any. */
export function evidenceForClue(
  caseData: CaseData,
  clueId: string,
): Evidence | undefined {
  const clue = caseData.clues.find((item) => item.id === clueId);
  if (!clue || !clue.evidenceId) return undefined;
  return findEvidence(caseData, clue.evidenceId);
}
