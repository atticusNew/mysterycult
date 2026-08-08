/**
 * RevealEngine — builds the complete CASE CLOSED reveal (spec §22).
 *
 * This is the only place where editorial relationship metadata is allowed
 * to reach the player: after the case is solved, the reveal explains how
 * each clue produced evidence and why the evidence pointed to the answer.
 */
import type { CaseData, Hypothesis } from "../models/types";
import type { GameSession } from "./CaseEngine";
import { orderedClues } from "./ClueEngine";
import { toPlayerEvidence, findEvidence, type PlayerEvidence } from "./EvidenceEngine";
import { scoreTheories } from "./HypothesisEngine";
import { computeScore, type ScoreBreakdown } from "./ScoringEngine";

export interface RevealChainItem {
  clueId: string;
  prompt: string;
  clueAnswer: string;
  solvedByPlayer: boolean;
  wrongAttempts: number;
  evidence: PlayerEvidence | null;
  /** Authored clue → evidence explanation, if written. */
  explanation: string | null;
  /** Author's documented meaning of the evidence, if written. */
  evidenceMeaning: string | null;
}

export interface CaseRevealView {
  caseTitle: string;
  question: string;
  finalAnswer: string;
  summary: string;
  evidenceToAnswer: string;
  ohMoment: string;
  majorConnections: string[];
  alternatePaths: string[];
  chain: RevealChainItem[];
  theories: Hypothesis[];
  score: ScoreBreakdown;
}

export function buildCaseReveal(
  caseData: CaseData,
  session: GameSession,
): CaseRevealView {
  const chain: RevealChainItem[] = orderedClues(caseData).map((clue) => {
    const progress = session.clueProgress.find(
      (entry) => entry.clueId === clue.id,
    );
    const evidence = clue.evidenceId
      ? findEvidence(caseData, clue.evidenceId)
      : undefined;
    const authoredExplanation = caseData.reveal.clueExplanations.find(
      (item) => item.clueId === clue.id,
    );
    return {
      clueId: clue.id,
      prompt: clue.prompt,
      clueAnswer: clue.answer.primary,
      solvedByPlayer: progress?.status === "solved",
      wrongAttempts: progress?.wrongAttempts ?? 0,
      evidence: evidence ? toPlayerEvidence(evidence) : null,
      explanation: authoredExplanation?.explanation || null,
      evidenceMeaning: evidence?.authorNotes.meaning || null,
    };
  });

  return {
    caseTitle: caseData.title,
    question: caseData.question,
    finalAnswer: caseData.answer.primary,
    summary: caseData.reveal.summary,
    evidenceToAnswer: caseData.reveal.evidenceToAnswer,
    ohMoment: caseData.reveal.ohMoment,
    majorConnections: caseData.reveal.majorConnections,
    alternatePaths: caseData.reveal.alternatePaths,
    chain,
    theories: scoreTheories(session.theories, caseData.answer),
    score: computeScore(session),
  };
}
