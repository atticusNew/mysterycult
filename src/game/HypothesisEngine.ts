/**
 * HypothesisEngine — the player's persistent Theory (spec §18–19).
 *
 * Recording a theory never ends the case. Theories accumulate into a
 * history; the current theory is the most recent entry.
 */
import type { AnswerSpec, Hypothesis } from "../models/types";
import { answerMatches, normalizeAnswer } from "./AnswerEngine";

let theoryCounter = 0;

export function createTheory(text: string, now: number = Date.now()): Hypothesis {
  theoryCounter += 1;
  return {
    id: `theory_${now.toString(36)}_${theoryCounter}`,
    text: text.trim(),
    createdAt: now,
    wasCorrect: false,
  };
}

/**
 * Append a theory to the history, ignoring empty input and exact repeats of
 * the current theory.
 */
export function appendTheory(
  history: Hypothesis[],
  text: string,
  now: number = Date.now(),
): Hypothesis[] {
  const trimmed = text.trim();
  if (!trimmed) return history;
  const current = history[history.length - 1];
  if (current && normalizeAnswer(current.text) === normalizeAnswer(trimmed)) {
    return history;
  }
  return [...history, createTheory(trimmed, now)];
}

export function currentTheory(history: Hypothesis[]): Hypothesis | null {
  return history.length > 0 ? history[history.length - 1] : null;
}

/** Mark theories that matched the final answer (used in the reveal). */
export function scoreTheories(
  history: Hypothesis[],
  answer: AnswerSpec,
): Hypothesis[] {
  return history.map((theory) => ({
    ...theory,
    wasCorrect: answerMatches(theory.text, answer),
  }));
}
