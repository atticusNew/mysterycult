/**
 * Tagline engine — pure reducer over one puzzle session.
 *
 * Loop: answer questions (ONE attempt each; a correct answer reveals every
 * occurrence of that question's letter) and attempt to solve the phrase at
 * any time — the earlier, the better. Solving the phrase opens the bonus:
 * name the connection. Wrong phrase attempts are limited; running out sends
 * the puzzle cold.
 */
import { answerMatches, normalizeAnswer } from "../game/AnswerEngine";
import type { PhrasePuzzle } from "./model";

/** Attempts allowed per question. Tunable. */
export const QUESTION_ATTEMPTS = 1;
/** Wrong phrase solves allowed before the puzzle goes cold. Tunable. */
export const SOLVE_ATTEMPTS = 2;

export const PHRASE_SCORING = {
  base: 1000,
  /** Deducted per question attempted (right or wrong) before solving. */
  perQuestion: 150,
  /** Deducted per wrong phrase attempt. */
  perWrongSolve: 100,
  /** Awarded for naming the connection in the bonus. */
  connectionBonus: 250,
  min: 0,
} as const;

export type QuestionStatus = "open" | "correct" | "wrong";

export type PuzzlePhase = "PLAYING" | "BONUS" | "COMPLETE" | "COLD";

export interface PuzzleSession {
  puzzleId: string;
  phase: PuzzlePhase;
  questionStatus: Record<string, QuestionStatus>;
  /** Letters earned via correct answers (uppercase). */
  earnedLetters: string[];
  /** Wrong phrase attempts, in order. */
  wrongSolves: string[];
  /** Questions attempted at the moment of solving (for scoring/share). */
  solvedAfterQuestions: number | null;
  solved: boolean;
  bonusResult: "correct" | "wrong" | "skipped" | null;
  startedAt: number;
  completedAt: number | null;
}

export type PuzzleAction =
  | { type: "ANSWER_QUESTION"; questionId: string; answer: string }
  | { type: "ATTEMPT_SOLVE"; text: string }
  | { type: "ANSWER_BONUS"; text: string }
  | { type: "SKIP_BONUS" };

export function createPuzzleSession(
  puzzle: PhrasePuzzle,
  now: number = Date.now(),
): PuzzleSession {
  const questionStatus: Record<string, QuestionStatus> = {};
  puzzle.questions.forEach((question) => {
    questionStatus[question.id] = "open";
  });
  return {
    puzzleId: puzzle.id,
    phase: "PLAYING",
    questionStatus,
    earnedLetters: [],
    wrongSolves: [],
    solvedAfterQuestions: null,
    solved: false,
    bonusResult: null,
    startedAt: now,
    completedAt: null,
  };
}

export function attemptedCount(session: PuzzleSession): number {
  return Object.values(session.questionStatus).filter(
    (status) => status !== "open",
  ).length;
}

/** Case-insensitive whole-phrase comparison, punctuation-tolerant. */
export function phraseMatches(guess: string, phrase: string): boolean {
  const normalized = normalizeAnswer(guess);
  return normalized.length > 0 && normalized === normalizeAnswer(phrase);
}

export function puzzleReducer(
  puzzle: PhrasePuzzle,
  session: PuzzleSession,
  action: PuzzleAction,
): PuzzleSession {
  switch (action.type) {
    case "ANSWER_QUESTION": {
      if (session.phase !== "PLAYING") return session;
      const question = puzzle.questions.find(
        (item) => item.id === action.questionId,
      );
      if (!question) return session;
      if (session.questionStatus[question.id] !== "open") return session;
      if (!action.answer.trim()) return session;

      const correct = answerMatches(action.answer, question.answer);
      const letter = question.letter.toUpperCase();
      return {
        ...session,
        questionStatus: {
          ...session.questionStatus,
          [question.id]: correct ? "correct" : "wrong",
        },
        earnedLetters:
          correct && letter && !session.earnedLetters.includes(letter)
            ? [...session.earnedLetters, letter]
            : session.earnedLetters,
      };
    }

    case "ATTEMPT_SOLVE": {
      if (session.phase !== "PLAYING") return session;
      const trimmed = action.text.trim();
      if (!trimmed) return session;

      if (phraseMatches(trimmed, puzzle.phrase)) {
        return {
          ...session,
          phase: "BONUS",
          solved: true,
          solvedAfterQuestions: attemptedCount(session),
        };
      }
      const wrongSolves = [...session.wrongSolves, trimmed];
      if (wrongSolves.length >= SOLVE_ATTEMPTS) {
        return {
          ...session,
          phase: "COLD",
          wrongSolves,
          solvedAfterQuestions: attemptedCount(session),
          completedAt: Date.now(),
        };
      }
      return { ...session, wrongSolves };
    }

    case "ANSWER_BONUS": {
      if (session.phase !== "BONUS") return session;
      if (!action.text.trim()) return session;
      return {
        ...session,
        phase: "COMPLETE",
        bonusResult: answerMatches(action.text, puzzle.connection)
          ? "correct"
          : "wrong",
        completedAt: Date.now(),
      };
    }

    case "SKIP_BONUS": {
      if (session.phase !== "BONUS") return session;
      return {
        ...session,
        phase: "COMPLETE",
        bonusResult: "skipped",
        completedAt: Date.now(),
      };
    }

    default:
      return session;
  }
}

// ---------------------------------------------------------------------------
// Scoring & share
// ---------------------------------------------------------------------------

export interface ScoreLine {
  label: string;
  amount: number;
}

export interface PuzzleScore {
  total: number;
  lines: ScoreLine[];
}

export function computePuzzleScore(session: PuzzleSession): PuzzleScore {
  const lines: ScoreLine[] = [
    { label: "Base score", amount: PHRASE_SCORING.base },
  ];
  const attempted = session.solvedAfterQuestions ?? attemptedCount(session);
  if (attempted > 0) {
    lines.push({
      label: `Questions used × ${attempted}`,
      amount: -attempted * PHRASE_SCORING.perQuestion,
    });
  }
  if (session.wrongSolves.length > 0) {
    lines.push({
      label: `Wrong solves × ${session.wrongSolves.length}`,
      amount: -session.wrongSolves.length * PHRASE_SCORING.perWrongSolve,
    });
  }
  if (!session.solved) {
    lines.push({ label: "Puzzle went cold", amount: -PHRASE_SCORING.base });
  }
  if (session.bonusResult === "correct") {
    lines.push({
      label: "Named the connection",
      amount: PHRASE_SCORING.connectionBonus,
    });
  }
  const total = Math.max(
    PHRASE_SCORING.min,
    lines.reduce((sum, line) => sum + line.amount, 0),
  );
  return { total, lines };
}

export function puzzleResultLine(session: PuzzleSession): string {
  if (!session.solved) return "The puzzle went cold";
  const used = session.solvedAfterQuestions ?? 0;
  const bonus = session.bonusResult === "correct" ? " · connection named" : "";
  return `Solved after ${used} question${used === 1 ? "" : "s"}${bonus}`;
}

/** Spoiler-free share text: per-question tiles in board order. */
export function buildPuzzleShareText(
  puzzle: PhrasePuzzle,
  session: PuzzleSession,
): string {
  const tiles = puzzle.questions
    .map((question) => {
      const status = session.questionStatus[question.id];
      if (status === "correct") return "🟩";
      if (status === "wrong") return "🟥";
      return "⬜";
    })
    .join("");
  const misses = "❌".repeat(session.wrongSolves.length);
  const outcome = session.solved ? "✔" : "🧊";
  const star = session.bonusResult === "correct" ? "⭐" : "";
  const title = puzzle.title || "Tagline";
  return `${title} — ${puzzleResultLine(session)}\n${tiles} ${misses}${outcome}${star}`.trim();
}
