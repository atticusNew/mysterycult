/**
 * Tagline engine v2 — pure reducer over one puzzle session.
 *
 * Reveal model: POSITIONAL STRIDE. Letters are numbered in reading order;
 * question k (by board order) reveals positions k, k+5, k+10… (stride =
 * question count). Question order is therefore part of the design.
 *
 * Scoring: every question is worth 5 — earned by answering correctly, or
 * banked if still untouched when the phrase is solved (wrong answers
 * forfeit it). +50 for the phrase, +25 for naming the connection (one
 * attempt, any time). Hints cost 10 each. A perfect game is always 100.
 */
import { answerMatches, normalizeAnswer } from "../game/AnswerEngine";
import type { PhrasePuzzle } from "./model";

/** Attempts allowed per question. Tunable. */
export const QUESTION_ATTEMPTS = 1;
/** Theme guesses allowed before the puzzle goes cold. THE win condition. */
export const THEME_ATTEMPTS = 1;
/** Phrase-solve attempts (the bonus). Running out locks it, never colds. */
export const SOLVE_ATTEMPTS = 1;

export const PHRASE_SCORING = {
  perQuestion: 5,
  /** Naming the theme — the win. */
  themeWin: 50,
  /** Solving the phrase — the bonus. */
  phraseBonus: 25,
  hintCost: 10,
  min: 0,
} as const;

export type QuestionStatus = "open" | "correct" | "wrong";
export type PuzzlePhase = "PLAYING" | "BONUS" | "COMPLETE" | "COLD";
export type HintKind = "category" | "decade" | "letter";

export interface PuzzleSession {
  puzzleId: string;
  phase: PuzzlePhase;
  questionStatus: Record<string, QuestionStatus>;
  /** Letter positions revealed by correct answers (0-based, letters only). */
  revealedPositions: number[];
  /** Letter positions revealed by the letter hint. */
  hintPositions: number[];
  usedHints: HintKind[];
  /** Theme state: null until first correct/failed-out guess resolves it. */
  connectionResult: "correct" | "wrong" | null;
  /** Wrong theme guesses (the win condition — 2 misses = cold). */
  wrongThemes: string[];
  /** Wrong phrase attempts (the bonus — exhausting them only locks it). */
  wrongSolves: string[];
  /** Questions attempted when the theme was named (for banking). */
  solvedAfterQuestions: number | null;
  /** The phrase bonus. */
  solved: boolean;
  startedAt: number;
  completedAt: number | null;
}

export type PuzzleAction =
  | { type: "ANSWER_QUESTION"; questionId: string; answer: string }
  | { type: "ATTEMPT_SOLVE"; text: string }
  | { type: "ATTEMPT_CONNECTION"; text: string }
  | { type: "SKIP_BONUS" }
  | { type: "USE_HINT"; hint: HintKind };

// ---------------------------------------------------------------------------
// Phrase positions
// ---------------------------------------------------------------------------

/** The phrase's letters (A–Z, uppercased) in reading order. */
export function letterSequence(phrase: string): string[] {
  return phrase
    .toUpperCase()
    .split("")
    .filter((char) => /[A-Z]/.test(char));
}

/** Positions revealed by the question at `questionIndex` (stride model). */
export function stridePositions(
  phrase: string,
  questionCount: number,
  questionIndex: number,
): number[] {
  if (questionCount <= 0) return [];
  const total = letterSequence(phrase).length;
  const positions: number[] = [];
  for (let i = questionIndex; i < total; i += questionCount) {
    positions.push(i);
  }
  return positions;
}

/** Case-insensitive whole-phrase comparison, punctuation-tolerant. */
export function phraseMatches(guess: string, phrase: string): boolean {
  const normalized = normalizeAnswer(guess);
  return normalized.length > 0 && normalized === normalizeAnswer(phrase);
}

// ---------------------------------------------------------------------------
// Forgiving answer matching (typo tolerance)
// ---------------------------------------------------------------------------

function editDistance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dist: number[] = Array.from({ length: cols }, (_, j) => j);
  for (let i = 1; i < rows; i++) {
    let prev = dist[0];
    dist[0] = i;
    for (let j = 1; j < cols; j++) {
      const temp = dist[j];
      dist[j] = Math.min(
        dist[j] + 1,
        dist[j - 1] + 1,
        prev + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      prev = temp;
    }
  }
  return dist[cols - 1];
}

/** Exact alias match, or one typo of slack on answers of 5+ characters. */
export function looseAnswerMatches(
  input: string,
  spec: { primary: string; aliases: string[] },
): boolean {
  if (answerMatches(input, spec)) return true;
  const guess = normalizeAnswer(input);
  if (!guess) return false;
  return [spec.primary, ...spec.aliases]
    .map(normalizeAnswer)
    .filter((candidate) => candidate.length >= 5)
    .some((candidate) => editDistance(guess, candidate) <= 1);
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

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
    revealedPositions: [],
    hintPositions: [],
    usedHints: [],
    connectionResult: null,
    wrongThemes: [],
    wrongSolves: [],
    solvedAfterQuestions: null,
    solved: false,
    startedAt: now,
    completedAt: null,
  };
}

export function attemptedCount(session: PuzzleSession): number {
  return Object.values(session.questionStatus).filter(
    (status) => status !== "open",
  ).length;
}

export function correctCount(session: PuzzleSession): number {
  return Object.values(session.questionStatus).filter(
    (status) => status === "correct",
  ).length;
}

export function allRevealedPositions(session: PuzzleSession): Set<number> {
  return new Set([...session.revealedPositions, ...session.hintPositions]);
}

export function puzzleReducer(
  puzzle: PhrasePuzzle,
  session: PuzzleSession,
  action: PuzzleAction,
): PuzzleSession {
  switch (action.type) {
    case "ANSWER_QUESTION": {
      if (session.phase !== "PLAYING") return session;
      const index = puzzle.questions.findIndex(
        (item) => item.id === action.questionId,
      );
      if (index < 0) return session;
      const question = puzzle.questions[index];
      if (session.questionStatus[question.id] !== "open") return session;
      if (!action.answer.trim()) return session;

      const correct = looseAnswerMatches(action.answer, question.answer);
      const revealedPositions = correct
        ? [
            ...session.revealedPositions,
            ...stridePositions(puzzle.phrase, puzzle.questions.length, index),
          ]
        : session.revealedPositions;
      // A fully revealed phrase counts as solved — no typing what you can read.
      const totalLetters = letterSequence(puzzle.phrase).length;
      const fullyRevealed =
        totalLetters > 0 &&
        new Set([...revealedPositions, ...session.hintPositions]).size >=
          totalLetters;
      return {
        ...session,
        questionStatus: {
          ...session.questionStatus,
          [question.id]: correct ? "correct" : "wrong",
        },
        revealedPositions,
        solved: session.solved || fullyRevealed,
      };
    }

    case "ATTEMPT_SOLVE": {
      // The phrase is the BONUS: solvable during play (a stepping stone
      // toward the theme) or in the post-theme bonus phase.
      if (session.phase !== "PLAYING" && session.phase !== "BONUS") {
        return session;
      }
      if (session.solved) return session;
      if (session.wrongSolves.length >= SOLVE_ATTEMPTS) return session;
      const trimmed = action.text.trim();
      if (!trimmed) return session;

      if (phraseMatches(trimmed, puzzle.phrase)) {
        const next = { ...session, solved: true };
        if (session.connectionResult === "correct") {
          return { ...next, phase: "COMPLETE" as const, completedAt: Date.now() };
        }
        return next; // keep hunting the theme, board now fully open
      }
      const wrongSolves = [...session.wrongSolves, trimmed];
      if (session.phase === "BONUS" && wrongSolves.length >= SOLVE_ATTEMPTS) {
        // Bonus spent — the game is over either way.
        return {
          ...session,
          wrongSolves,
          phase: "COMPLETE",
          completedAt: Date.now(),
        };
      }
      return { ...session, wrongSolves };
    }

    case "ATTEMPT_CONNECTION": {
      // Naming the theme is THE win condition: two guesses, then cold.
      if (session.phase !== "PLAYING") return session;
      if (session.connectionResult !== null) return session;
      if (!action.text.trim()) return session;

      if (looseAnswerMatches(action.text, puzzle.connection)) {
        const won = {
          ...session,
          connectionResult: "correct" as const,
          solvedAfterQuestions: attemptedCount(session),
        };
        if (session.solved) {
          return { ...won, phase: "COMPLETE" as const, completedAt: Date.now() };
        }
        return { ...won, phase: "BONUS" as const };
      }
      const wrongThemes = [...session.wrongThemes, action.text.trim()];
      if (wrongThemes.length >= THEME_ATTEMPTS) {
        return {
          ...session,
          wrongThemes,
          connectionResult: "wrong",
          phase: "COLD",
          solvedAfterQuestions: attemptedCount(session),
          completedAt: Date.now(),
        };
      }
      return { ...session, wrongThemes };
    }

    case "SKIP_BONUS": {
      if (session.phase !== "BONUS") return session;
      return { ...session, phase: "COMPLETE", completedAt: Date.now() };
    }

    case "USE_HINT": {
      if (session.phase !== "PLAYING") return session;
      if (session.usedHints.includes(action.hint)) return session;
      if (action.hint === "category" && !puzzle.hints.category.trim()) {
        return session;
      }
      if (action.hint === "decade" && !puzzle.hints.decade.trim()) {
        return session;
      }
      if (action.hint === "letter") {
        const revealed = allRevealedPositions(session);
        const total = letterSequence(puzzle.phrase).length;
        let target = -1;
        for (let i = 0; i < total; i++) {
          if (!revealed.has(i)) {
            target = i;
            break;
          }
        }
        if (target < 0) return session;
        return {
          ...session,
          usedHints: [...session.usedHints, action.hint],
          hintPositions: [...session.hintPositions, target],
        };
      }
      return { ...session, usedHints: [...session.usedHints, action.hint] };
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

export function computePuzzleScore(
  puzzle: PhrasePuzzle,
  session: PuzzleSession,
): PuzzleScore {
  const lines: ScoreLine[] = [];
  const correct = correctCount(session);
  if (correct > 0) {
    lines.push({
      label: `Questions answered × ${correct}`,
      amount: correct * PHRASE_SCORING.perQuestion,
    });
  }
  if (session.connectionResult === "correct") {
    const banked = puzzle.questions.length - (session.solvedAfterQuestions ?? 0);
    if (banked > 0) {
      lines.push({
        label: `Questions never needed × ${banked}`,
        amount: banked * PHRASE_SCORING.perQuestion,
      });
    }
    lines.push({ label: "Named the theme", amount: PHRASE_SCORING.themeWin });
  }
  if (session.solved) {
    lines.push({
      label: "Solved the phrase",
      amount: PHRASE_SCORING.phraseBonus,
    });
  }
  if (session.usedHints.length > 0) {
    lines.push({
      label: `Hints × ${session.usedHints.length}`,
      amount: -session.usedHints.length * PHRASE_SCORING.hintCost,
    });
  }
  const total = Math.max(
    PHRASE_SCORING.min,
    lines.reduce((sum, line) => sum + line.amount, 0),
  );
  return { total, lines };
}

/** The score as it stands mid-game (for the live score chip). */
export function liveScore(puzzle: PhrasePuzzle, session: PuzzleSession): number {
  return computePuzzleScore(puzzle, session).total;
}

export function puzzleResultLine(
  puzzle: PhrasePuzzle,
  session: PuzzleSession,
): string {
  const total = computePuzzleScore(puzzle, session).total;
  if (session.connectionResult !== "correct") {
    return `ThruLine missed · ${total}/100`;
  }
  const used = session.solvedAfterQuestions ?? 0;
  return `${total}/100 · theme after ${used} question${used === 1 ? "" : "s"}`;
}

/** Spoiler-free share text. */
export function buildPuzzleShareText(
  puzzle: PhrasePuzzle,
  session: PuzzleSession,
): string {
  const total = computePuzzleScore(puzzle, session).total;
  const tiles = puzzle.questions
    .map((question) => {
      const status = session.questionStatus[question.id];
      if (status === "correct") return "🟩";
      if (status === "wrong") return "🟥";
      return "⬜";
    })
    .join("");
  const misses = "❌".repeat(session.wrongThemes.length);
  const outcome = session.connectionResult === "correct" ? "✔" : "🧊";
  const star = session.solved ? "⭐" : "";
  const title = puzzle.title || "Tagline";
  return `${title} — ${total}/100\n${tiles} ${misses}${outcome}${star}`.trim();
}
