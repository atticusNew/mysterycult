/**
 * Explicit game state machine (spec §27).
 *
 * CASE_INTRO → CLUE_ACTIVE → CLUE_SOLVED → EVIDENCE_REVEALED → INVESTIGATING
 * → THEORY_CREATED → CLUE_ACTIVE → ... → SOLVING → (wrong → INVESTIGATING |
 * correct → CASE_COMPLETE → REVEAL)
 *
 * An incorrect final answer does NOT destroy the case: the player returns to
 * INVESTIGATING and may continue.
 */

export type GamePhase =
  | "CASE_INTRO"
  | "CLUE_ACTIVE"
  | "CLUE_SOLVED"
  | "EVIDENCE_REVEALED"
  | "INVESTIGATING"
  | "THEORY_CREATED"
  | "SOLVING"
  | "CASE_COMPLETE"
  | "REVEAL";

const TRANSITIONS: Record<GamePhase, GamePhase[]> = {
  CASE_INTRO: ["CLUE_ACTIVE", "INVESTIGATING"],
  CLUE_ACTIVE: ["CLUE_SOLVED", "INVESTIGATING", "THEORY_CREATED", "SOLVING", "CLUE_ACTIVE"],
  CLUE_SOLVED: ["EVIDENCE_REVEALED", "INVESTIGATING"],
  EVIDENCE_REVEALED: ["INVESTIGATING", "CLUE_ACTIVE"],
  INVESTIGATING: ["CLUE_ACTIVE", "THEORY_CREATED", "SOLVING", "INVESTIGATING"],
  THEORY_CREATED: ["CLUE_ACTIVE", "INVESTIGATING", "SOLVING", "THEORY_CREATED"],
  SOLVING: ["INVESTIGATING", "CASE_COMPLETE", "CLUE_ACTIVE"],
  CASE_COMPLETE: ["REVEAL"],
  REVEAL: [],
};

export function canTransition(from: GamePhase, to: GamePhase): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

/** Assert-style transition helper: returns the target phase or throws in dev. */
export function transition(from: GamePhase, to: GamePhase): GamePhase {
  if (!canTransition(from, to)) {
    // Invalid transitions indicate an engine bug; fail loudly in development,
    // but never crash a live game session.
    console.warn(`Invalid game state transition: ${from} → ${to}`);
  }
  return to;
}
