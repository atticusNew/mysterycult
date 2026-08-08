/**
 * RevealEngine (game v2) — builds the complete post-case reveal.
 *
 * The only place editorial metadata reaches the player: exhibit by exhibit,
 * what it meant, and which suspects it was designed to eliminate — the
 * "the traps were intentional" moment.
 */
import type { CaseData, Hypothesis } from "../models/types";
import type { GameSession } from "./CaseEngine";
import { toPlayerEvidence, type PlayerEvidence } from "./EvidenceEngine";
import { scoreTheories } from "./HypothesisEngine";
import { computeScore, resultLine, type ScoreBreakdown } from "./ScoringEngine";

export interface RevealExhibitItem {
  evidence: PlayerEvidence;
  /** Was this exhibit flipped during play? */
  seenByPlayer: boolean;
  /** The author's documented meaning. */
  meaning: string | null;
  /** Labels of suspects this exhibit was designed to rule out. */
  eliminates: string[];
}

export interface CaseRevealView {
  caseTitle: string;
  question: string;
  finalAnswer: string;
  solved: boolean;
  result: string;
  summary: string;
  evidenceToAnswer: string;
  ohMoment: string;
  majorConnections: string[];
  alternatePaths: string[];
  exhibits: RevealExhibitItem[];
  theories: Hypothesis[];
  score: ScoreBreakdown;
}

export function buildCaseReveal(
  caseData: CaseData,
  session: GameSession,
): CaseRevealView {
  const answerSuspect = caseData.lineup.suspects.find(
    (suspect) => suspect.id === caseData.lineup.answerSuspectId,
  );

  const exhibits: RevealExhibitItem[] = caseData.evidence.map(
    (evidence, index) => ({
      evidence: toPlayerEvidence(evidence),
      seenByPlayer: index < session.revealedCount,
      meaning: evidence.authorNotes.meaning || null,
      eliminates: caseData.lineup.suspects
        .filter((suspect) => suspect.eliminatedBy.includes(evidence.id))
        .map((suspect) => suspect.label),
    }),
  );

  return {
    caseTitle: caseData.title,
    question: caseData.question,
    finalAnswer: answerSuspect?.label || caseData.answer.primary,
    solved: session.solved,
    result: resultLine(session),
    summary: caseData.reveal.summary,
    evidenceToAnswer: caseData.reveal.evidenceToAnswer,
    ohMoment: caseData.reveal.ohMoment,
    majorConnections: caseData.reveal.majorConnections,
    alternatePaths: caseData.reveal.alternatePaths,
    exhibits,
    theories: scoreTheories(session.theories, {
      primary: answerSuspect?.label || caseData.answer.primary,
      aliases: caseData.answer.aliases,
    }),
    score: computeScore(session),
  };
}
