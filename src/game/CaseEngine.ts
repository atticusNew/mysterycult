/**
 * CaseEngine — orchestrates one investigation (game v2: the line-up).
 *
 * The loop: exhibits flip one at a time (Exhibit I is free). Between flips
 * the player studies the board — a closed line-up of suspects — rules
 * suspects out (free, reversible notes), marks a prime suspect (their
 * recorded theory), and eventually ACCUSES. Flipping more exhibits lowers
 * the potential score; a wrong accusation is a miss (three misses and the
 * case goes cold). Implemented as a pure reducer so the same engine drives
 * the daily game and the Case Workshop preview.
 */
import type { CaseData, Hypothesis } from "../models/types";
import { appendTheory } from "./HypothesisEngine";

/**
 * Accusations allowed before the case goes cold. One: you get a single
 * warrant, so accusing early is a real gamble and exhibits buy confidence.
 * Tunable if playtesting shows it's too harsh.
 */
export const MAX_MISSES = 1;

export type GamePhase =
  | "CASE_INTRO"
  | "INVESTIGATING"
  | "EXHIBIT_REVEALED"
  | "ACCUSING"
  | "CASE_COMPLETE"
  | "CASE_COLD"
  | "REVEAL";

export interface GameSession {
  caseId: string;
  phase: GamePhase;
  /** How many exhibits are face-up (in authored order). */
  revealedCount: number;
  /** The exhibit that was just flipped (drives the reveal moment). */
  lastRevealedEvidenceId: string | null;
  /** Suspect ids the player has struck out. Free and reversible. */
  ruledOutIds: string[];
  /** The player's current prime suspect, if any. */
  primeSuspectId: string | null;
  /** Theory history — every prime-suspect change is recorded. */
  theories: Hypothesis[];
  /** Wrongly accused suspect ids, in order. */
  misses: string[];
  hintsUsed: number;
  solved: boolean;
  /** Exhibits face-up at the moment the case was solved (or went cold). */
  solvedOnExhibit: number | null;
  startedAt: number;
  completedAt: number | null;
}

export type GameAction =
  | { type: "BEGIN_INVESTIGATION" }
  | { type: "FLIP_EXHIBIT" }
  | { type: "CONTINUE_INVESTIGATION" }
  | { type: "TOGGLE_RULE_OUT"; suspectId: string }
  | { type: "SET_PRIME"; suspectId: string }
  | { type: "OPEN_ACCUSE" }
  | { type: "CANCEL_ACCUSE" }
  | { type: "ACCUSE"; suspectId: string }
  | { type: "USE_HINT" }
  | { type: "VIEW_REVEAL" };

export function createSession(
  caseData: CaseData,
  now: number = Date.now(),
): GameSession {
  return {
    caseId: caseData.id,
    phase: "CASE_INTRO",
    revealedCount: 0,
    lastRevealedEvidenceId: null,
    ruledOutIds: [],
    primeSuspectId: null,
    theories: [],
    misses: [],
    hintsUsed: 0,
    solved: false,
    solvedOnExhibit: null,
    startedAt: now,
    completedAt: null,
  };
}

function suspectLabel(caseData: CaseData, suspectId: string): string {
  return (
    caseData.lineup.suspects.find((suspect) => suspect.id === suspectId)
      ?.label ?? suspectId
  );
}

const LIVE_PHASES: GamePhase[] = [
  "INVESTIGATING",
  "EXHIBIT_REVEALED",
  "ACCUSING",
];

export function gameReducer(
  caseData: CaseData,
  session: GameSession,
  action: GameAction,
): GameSession {
  switch (action.type) {
    case "BEGIN_INVESTIGATION": {
      if (session.phase !== "CASE_INTRO") return session;
      // Exhibit I is free.
      const first = caseData.evidence[0];
      return {
        ...session,
        phase: first ? "EXHIBIT_REVEALED" : "INVESTIGATING",
        revealedCount: first ? 1 : 0,
        lastRevealedEvidenceId: first ? first.id : null,
      };
    }

    case "FLIP_EXHIBIT": {
      if (
        session.phase !== "INVESTIGATING" &&
        session.phase !== "EXHIBIT_REVEALED"
      ) {
        return session;
      }
      if (session.revealedCount >= caseData.evidence.length) return session;
      const next = caseData.evidence[session.revealedCount];
      return {
        ...session,
        phase: "EXHIBIT_REVEALED",
        revealedCount: session.revealedCount + 1,
        lastRevealedEvidenceId: next.id,
      };
    }

    case "CONTINUE_INVESTIGATION": {
      if (
        session.phase !== "EXHIBIT_REVEALED" &&
        session.phase !== "ACCUSING"
      ) {
        return session;
      }
      return {
        ...session,
        phase: "INVESTIGATING",
        lastRevealedEvidenceId: null,
      };
    }

    case "TOGGLE_RULE_OUT": {
      if (!LIVE_PHASES.includes(session.phase)) return session;
      const suspect = caseData.lineup.suspects.find(
        (item) => item.id === action.suspectId,
      );
      if (!suspect) return session;
      // A missed accusation is a permanent strike; it can't be un-ruled.
      if (session.misses.includes(action.suspectId)) return session;
      const ruledOut = session.ruledOutIds.includes(action.suspectId);
      return {
        ...session,
        ruledOutIds: ruledOut
          ? session.ruledOutIds.filter((id) => id !== action.suspectId)
          : [...session.ruledOutIds, action.suspectId],
        // Ruling out the prime suspect clears the pin.
        primeSuspectId:
          !ruledOut && session.primeSuspectId === action.suspectId
            ? null
            : session.primeSuspectId,
      };
    }

    case "SET_PRIME": {
      if (!LIVE_PHASES.includes(session.phase)) return session;
      const suspect = caseData.lineup.suspects.find(
        (item) => item.id === action.suspectId,
      );
      if (!suspect) return session;
      if (
        session.ruledOutIds.includes(action.suspectId) ||
        session.misses.includes(action.suspectId)
      ) {
        return session;
      }
      if (session.primeSuspectId === action.suspectId) {
        // Unpin.
        return { ...session, primeSuspectId: null };
      }
      return {
        ...session,
        primeSuspectId: action.suspectId,
        theories: appendTheory(session.theories, suspect.label),
      };
    }

    case "OPEN_ACCUSE": {
      if (
        session.phase !== "INVESTIGATING" &&
        session.phase !== "EXHIBIT_REVEALED"
      ) {
        return session;
      }
      return { ...session, phase: "ACCUSING", lastRevealedEvidenceId: null };
    }

    case "CANCEL_ACCUSE": {
      if (session.phase !== "ACCUSING") return session;
      return { ...session, phase: "INVESTIGATING" };
    }

    case "ACCUSE": {
      if (session.phase !== "ACCUSING") return session;
      const suspect = caseData.lineup.suspects.find(
        (item) => item.id === action.suspectId,
      );
      if (!suspect) return session;
      if (
        session.ruledOutIds.includes(action.suspectId) ||
        session.misses.includes(action.suspectId)
      ) {
        return session;
      }

      const correct = caseData.lineup.answerSuspectId === action.suspectId;
      if (correct) {
        return {
          ...session,
          phase: "CASE_COMPLETE",
          solved: true,
          solvedOnExhibit: session.revealedCount,
          theories: appendTheory(session.theories, suspect.label),
          completedAt: Date.now(),
        };
      }

      const misses = [...session.misses, action.suspectId];
      if (misses.length >= MAX_MISSES) {
        return {
          ...session,
          phase: "CASE_COLD",
          misses,
          ruledOutIds: [...session.ruledOutIds, action.suspectId],
          primeSuspectId:
            session.primeSuspectId === action.suspectId
              ? null
              : session.primeSuspectId,
          solvedOnExhibit: session.revealedCount,
          completedAt: Date.now(),
        };
      }
      // Wrong accusation: the suspect is struck out, the case stays open.
      return {
        ...session,
        phase: "INVESTIGATING",
        misses,
        ruledOutIds: [...session.ruledOutIds, action.suspectId],
        primeSuspectId:
          session.primeSuspectId === action.suspectId
            ? null
            : session.primeSuspectId,
      };
    }

    case "USE_HINT": {
      if (!LIVE_PHASES.includes(session.phase)) return session;
      if (session.hintsUsed >= caseData.hints.length) return session;
      return { ...session, hintsUsed: session.hintsUsed + 1 };
    }

    case "VIEW_REVEAL": {
      if (session.phase !== "CASE_COMPLETE" && session.phase !== "CASE_COLD") {
        return session;
      }
      return { ...session, phase: "REVEAL" };
    }

    default:
      return session;
  }
}

/** Suspects still standing (not ruled out, not missed). */
export function remainingSuspects(
  caseData: CaseData,
  session: GameSession,
): string[] {
  return caseData.lineup.suspects
    .filter(
      (suspect) =>
        !session.ruledOutIds.includes(suspect.id) &&
        !session.misses.includes(suspect.id),
    )
    .map((suspect) => suspect.id);
}

export { suspectLabel };
