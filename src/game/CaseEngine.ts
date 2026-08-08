/**
 * CaseEngine — orchestrates a single investigation session.
 *
 * Implemented as a pure reducer over an explicit GameSession so the same
 * engine drives the daily player experience AND the Case Workshop preview.
 * All behaviour is driven by case data; there is no case-specific logic here.
 */
import type { CaseData } from "../models/types";
import type { Hypothesis } from "../models/types";
import { answerMatches } from "./AnswerEngine";
import {
  initialClueProgress,
  refreshAvailability,
  nextOpenClueId,
  type ClueProgress,
} from "./ClueEngine";
import { appendTheory } from "./HypothesisEngine";
import { transition, type GamePhase } from "./stateMachine";

export interface GameSession {
  caseId: string;
  phase: GamePhase;
  clueProgress: ClueProgress[];
  /** The clue currently in front of the player, if any. */
  activeClueId: string | null;
  /** The clue that was just solved (drives the evidence reveal moment). */
  lastSolvedClueId: string | null;
  /** The evidence item that was just unlocked (highlighted in the UI). */
  lastUnlockedEvidenceId: string | null;
  /** Evidence ids in unlock order. */
  unlockedEvidenceIds: string[];
  theories: Hypothesis[];
  /** How many hints have been revealed (hints reveal sequentially). */
  hintsUsed: number;
  wrongFinalGuesses: string[];
  finalAnswer: string | null;
  solved: boolean;
  /** Transient UI feedback for the last clue submission. */
  clueFeedback: "correct" | "incorrect" | null;
  /** Transient UI feedback for the last final-answer submission. */
  finalFeedback: "correct" | "incorrect" | null;
  startedAt: number;
  completedAt: number | null;
}

export type GameAction =
  | { type: "BEGIN_INVESTIGATION" }
  | { type: "SUBMIT_CLUE_ANSWER"; answer: string }
  | { type: "REVEAL_EVIDENCE" }
  | { type: "CONTINUE_INVESTIGATION" }
  | { type: "ACTIVATE_CLUE"; clueId: string }
  | { type: "SET_ASIDE_CLUE" }
  | { type: "RECORD_THEORY"; text: string }
  | { type: "USE_HINT" }
  | { type: "OPEN_SOLVE" }
  | { type: "CANCEL_SOLVE" }
  | { type: "SUBMIT_FINAL_ANSWER"; answer: string }
  | { type: "VIEW_REVEAL" }
  | { type: "CLEAR_FEEDBACK" };

export function createSession(
  caseData: CaseData,
  now: number = Date.now(),
): GameSession {
  return {
    caseId: caseData.id,
    phase: "CASE_INTRO",
    clueProgress: initialClueProgress(caseData),
    activeClueId: null,
    lastSolvedClueId: null,
    lastUnlockedEvidenceId: null,
    unlockedEvidenceIds: [],
    theories: [],
    hintsUsed: 0,
    wrongFinalGuesses: [],
    finalAnswer: null,
    solved: false,
    clueFeedback: null,
    finalFeedback: null,
    startedAt: now,
    completedAt: null,
  };
}

function findClue(caseData: CaseData, clueId: string | null) {
  if (!clueId) return undefined;
  return caseData.clues.find((clue) => clue.id === clueId);
}

export function gameReducer(
  caseData: CaseData,
  session: GameSession,
  action: GameAction,
): GameSession {
  switch (action.type) {
    case "BEGIN_INVESTIGATION": {
      if (session.phase !== "CASE_INTRO") return session;
      const firstClueId = nextOpenClueId(session.clueProgress);
      return {
        ...session,
        phase: transition(
          session.phase,
          firstClueId ? "CLUE_ACTIVE" : "INVESTIGATING",
        ),
        activeClueId: firstClueId,
      };
    }

    case "SUBMIT_CLUE_ANSWER": {
      if (session.phase !== "CLUE_ACTIVE") return session;
      const clue = findClue(caseData, session.activeClueId);
      if (!clue) return session;

      if (!answerMatches(action.answer, clue.answer)) {
        return {
          ...session,
          clueFeedback: "incorrect",
          clueProgress: session.clueProgress.map((entry) =>
            entry.clueId === clue.id
              ? { ...entry, wrongAttempts: entry.wrongAttempts + 1 }
              : entry,
          ),
        };
      }

      const clueProgress = refreshAvailability(
        session.clueProgress.map((entry) =>
          entry.clueId === clue.id
            ? { ...entry, status: "solved" as const, solvedAt: Date.now() }
            : entry,
        ),
      );
      return {
        ...session,
        phase: transition(session.phase, "CLUE_SOLVED"),
        clueProgress,
        clueFeedback: "correct",
        lastSolvedClueId: clue.id,
      };
    }

    case "REVEAL_EVIDENCE": {
      if (session.phase !== "CLUE_SOLVED") return session;
      const clue = findClue(caseData, session.lastSolvedClueId);
      const evidenceId = clue?.evidenceId ?? null;
      const alreadyUnlocked = evidenceId
        ? session.unlockedEvidenceIds.includes(evidenceId)
        : true;
      if (!evidenceId || alreadyUnlocked) {
        // Clue had no linked evidence — skip straight to investigating.
        return {
          ...session,
          phase: transition(session.phase, "INVESTIGATING"),
          activeClueId: null,
          clueFeedback: null,
          lastUnlockedEvidenceId: null,
        };
      }
      return {
        ...session,
        phase: transition(session.phase, "EVIDENCE_REVEALED"),
        unlockedEvidenceIds: [...session.unlockedEvidenceIds, evidenceId],
        lastUnlockedEvidenceId: evidenceId,
        activeClueId: null,
        clueFeedback: null,
      };
    }

    case "CONTINUE_INVESTIGATION": {
      if (
        session.phase !== "EVIDENCE_REVEALED" &&
        session.phase !== "THEORY_CREATED" &&
        session.phase !== "CLUE_ACTIVE" &&
        session.phase !== "CLUE_SOLVED"
      ) {
        return session;
      }
      return {
        ...session,
        phase: transition(session.phase, "INVESTIGATING"),
        activeClueId: null,
        lastUnlockedEvidenceId: null,
        clueFeedback: null,
      };
    }

    case "ACTIVATE_CLUE": {
      if (
        session.phase !== "INVESTIGATING" &&
        session.phase !== "EVIDENCE_REVEALED" &&
        session.phase !== "THEORY_CREATED" &&
        session.phase !== "CLUE_ACTIVE"
      ) {
        return session;
      }
      const entry = session.clueProgress.find(
        (item) => item.clueId === action.clueId,
      );
      if (!entry || entry.status === "locked" || entry.status === "solved") {
        return session;
      }
      return {
        ...session,
        phase: transition(session.phase, "CLUE_ACTIVE"),
        activeClueId: action.clueId,
        lastUnlockedEvidenceId: null,
        clueFeedback: null,
      };
    }

    case "SET_ASIDE_CLUE": {
      if (session.phase !== "CLUE_ACTIVE" || !session.activeClueId) {
        return session;
      }
      const clueProgress = refreshAvailability(
        session.clueProgress.map((entry) =>
          entry.clueId === session.activeClueId &&
          entry.status !== "solved"
            ? { ...entry, status: "skipped" as const }
            : entry,
        ),
      );
      return {
        ...session,
        phase: transition(session.phase, "INVESTIGATING"),
        clueProgress,
        activeClueId: null,
        clueFeedback: null,
      };
    }

    case "RECORD_THEORY": {
      if (
        session.phase === "CASE_COMPLETE" ||
        session.phase === "REVEAL" ||
        session.phase === "CASE_INTRO"
      ) {
        return session;
      }
      const theories = appendTheory(session.theories, action.text);
      if (theories === session.theories) return session;
      return {
        ...session,
        theories,
        phase:
          session.phase === "SOLVING"
            ? session.phase
            : transition(session.phase, "THEORY_CREATED"),
      };
    }

    case "USE_HINT": {
      if (session.phase === "CASE_COMPLETE" || session.phase === "REVEAL") {
        return session;
      }
      if (session.hintsUsed >= caseData.hints.length) return session;
      return { ...session, hintsUsed: session.hintsUsed + 1 };
    }

    case "OPEN_SOLVE": {
      if (
        session.phase !== "INVESTIGATING" &&
        session.phase !== "CLUE_ACTIVE" &&
        session.phase !== "THEORY_CREATED"
      ) {
        return session;
      }
      return {
        ...session,
        phase: transition(session.phase, "SOLVING"),
        finalFeedback: null,
      };
    }

    case "CANCEL_SOLVE": {
      if (session.phase !== "SOLVING") return session;
      return {
        ...session,
        phase: transition(session.phase, "INVESTIGATING"),
        finalFeedback: null,
      };
    }

    case "SUBMIT_FINAL_ANSWER": {
      if (session.phase !== "SOLVING") return session;
      const trimmed = action.answer.trim();
      if (!trimmed) return session;

      if (answerMatches(trimmed, caseData.answer)) {
        return {
          ...session,
          phase: transition(session.phase, "CASE_COMPLETE"),
          finalAnswer: trimmed,
          solved: true,
          finalFeedback: "correct",
          completedAt: Date.now(),
        };
      }
      // Wrong final answer: record it, return to the investigation.
      return {
        ...session,
        phase: transition(session.phase, "INVESTIGATING"),
        wrongFinalGuesses: [...session.wrongFinalGuesses, trimmed],
        finalFeedback: "incorrect",
      };
    }

    case "VIEW_REVEAL": {
      if (session.phase !== "CASE_COMPLETE") return session;
      return { ...session, phase: transition(session.phase, "REVEAL") };
    }

    case "CLEAR_FEEDBACK": {
      if (!session.clueFeedback && !session.finalFeedback) return session;
      return { ...session, clueFeedback: null, finalFeedback: null };
    }

    default:
      return session;
  }
}
