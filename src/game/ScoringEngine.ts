/**
 * ScoringEngine (game v2) — the headline metric is how early the case was
 * closed: which exhibit the player accused on, and how cleanly.
 *
 * Numeric score kept deliberately simple for stats; the human-readable
 * result ("Solved on Exhibit III · 1 miss") and the spoiler-free share
 * line are the real currency.
 */
import type { CaseData } from "../models/types";
import type { GameSession } from "./CaseEngine";

export const SCORING = {
  base: 1000,
  /** Deducted per exhibit flipped beyond the free first one. */
  perExtraExhibit: 100,
  /** Deducted per wrong accusation. */
  perMiss: 150,
  /** Deducted per hint used. */
  perHint: 50,
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

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

export function romanNumeral(index: number): string {
  return ROMAN[index - 1] ?? String(index);
}

export function computeScore(session: GameSession): ScoreBreakdown {
  const lines: ScoreBreakdownLine[] = [
    { label: "Base score", amount: SCORING.base },
  ];

  const extraExhibits = Math.max(0, session.revealedCount - 1);
  if (extraExhibits > 0) {
    lines.push({
      label: `Exhibits flipped beyond the first × ${extraExhibits}`,
      amount: -extraExhibits * SCORING.perExtraExhibit,
    });
  }
  if (session.misses.length > 0) {
    lines.push({
      label: `Wrong accusations × ${session.misses.length}`,
      amount: -session.misses.length * SCORING.perMiss,
    });
  }
  if (session.hintsUsed > 0) {
    lines.push({
      label: `Hints used × ${session.hintsUsed}`,
      amount: -session.hintsUsed * SCORING.perHint,
    });
  }
  if (!session.solved) {
    lines.push({ label: "Case went cold", amount: -SCORING.base });
  }

  const total = Math.max(
    SCORING.min,
    lines.reduce((sum, line) => sum + line.amount, 0),
  );
  return { total, lines };
}

/** Human-readable result, e.g. "Solved on Exhibit III · clean". */
export function resultLine(session: GameSession): string {
  if (!session.solved) return "The case went cold";
  const exhibit = romanNumeral(session.solvedOnExhibit ?? 1);
  const misses =
    session.misses.length === 0
      ? "clean"
      : `${session.misses.length} miss${session.misses.length > 1 ? "es" : ""}`;
  return `Solved on Exhibit ${exhibit} · ${misses}`;
}

/** Spoiler-free share text. */
export function buildShareText(
  caseData: CaseData,
  session: GameSession,
): string {
  const total = caseData.evidence.length;
  const used = session.revealedCount;
  const tiles =
    "🟨".repeat(used) + "⬜".repeat(Math.max(0, total - used));
  const missMarks = "❌".repeat(session.misses.length);
  const outcome = session.solved ? "✔" : "🧊";
  const title = caseData.title || "Cultural Mystery";
  return `${title} — ${resultLine(session)}\n${tiles} ${missMarks}${outcome}`.trim();
}
