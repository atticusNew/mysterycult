/**
 * ScoringEngine — deliberately simple initial model (spec §20).
 *
 * BASE 1000, with deductions for wrong clue answers, hints, wrong final
 * guesses, and how much evidence the player needed. The headline metric is
 * "how early did the player solve the mystery?".
 */
import type { GameSession } from "./CaseEngine";

export const SCORING = {
  base: 1000,
  /** Deducted per incorrect clue answer. */
  wrongClueAnswer: 25,
  /** Deducted per hint used. */
  hintUsed: 60,
  /** Deducted per incorrect final guess. */
  wrongFinalGuess: 100,
  /** Evidence pieces the player may unlock with no deduction. */
  freeEvidence: 2,
  /** Deducted per evidence piece beyond the free allowance. */
  evidenceBeyondFree: 40,
  min: 0,
} as const;

export interface ScoreBreakdownLine {
  label: string;
  amount: number;
}

export interface ScoreBreakdown {
  total: number;
  lines: ScoreBreakdownLine[];
}

export function computeScore(session: GameSession): ScoreBreakdown {
  const lines: ScoreBreakdownLine[] = [
    { label: "Base score", amount: SCORING.base },
  ];

  const wrongClueAnswers = session.clueProgress.reduce(
    (sum, entry) => sum + entry.wrongAttempts,
    0,
  );
  if (wrongClueAnswers > 0) {
    lines.push({
      label: `Incorrect clue answers × ${wrongClueAnswers}`,
      amount: -wrongClueAnswers * SCORING.wrongClueAnswer,
    });
  }

  if (session.hintsUsed > 0) {
    lines.push({
      label: `Hints used × ${session.hintsUsed}`,
      amount: -session.hintsUsed * SCORING.hintUsed,
    });
  }

  const wrongFinals = session.wrongFinalGuesses.length;
  if (wrongFinals > 0) {
    lines.push({
      label: `Incorrect final guesses × ${wrongFinals}`,
      amount: -wrongFinals * SCORING.wrongFinalGuess,
    });
  }

  const extraEvidence = Math.max(
    0,
    session.unlockedEvidenceIds.length - SCORING.freeEvidence,
  );
  if (extraEvidence > 0) {
    lines.push({
      label: `Evidence needed beyond ${SCORING.freeEvidence} × ${extraEvidence}`,
      amount: -extraEvidence * SCORING.evidenceBeyondFree,
    });
  }

  const total = Math.max(
    SCORING.min,
    lines.reduce((sum, line) => sum + line.amount, 0),
  );
  return { total, lines };
}
