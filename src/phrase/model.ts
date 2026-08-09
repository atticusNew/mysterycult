/**
 * TAGLINE (working title) — game two: the hidden phrase.
 *
 * A phrase is hidden behind letter tiles. Answering trivia questions earns
 * letters (each question is tied to one letter of the alphabet; a correct
 * answer reveals every occurrence). All question answers — and the phrase
 * itself — orbit one hidden connection. The player solves by naming the
 * PHRASE; naming the CONNECTION afterwards is the bonus crescendo.
 *
 * Completely separate from the line-up game: own model, engine, workshop.
 */
import type { AnswerSpec } from "../models/types";

export const PHRASE_GAME_TITLE = "ThruLines";
export const CURRENT_PUZZLE_VERSION = 1;

export interface PhraseQuestion {
  id: string;
  /**
   * The subject card shown face-up before the question is revealed
   * (e.g. HISTORY, MUSIC). Often a feint: the answer's real meaning lies
   * with the connection.
   */
  subject: string;
  /** Self-contained general-knowledge prompt. Never names the connection. */
  prompt: string;
  answer: AnswerSpec;
  /** The letter (A–Z) this question unlocks in the phrase. */
  letter: string;
  /**
   * A quick interesting fact shown after answering — about the SUBJECT
   * meaning of the answer, never the connection meaning (no spoilers).
   */
  factoid: string;
  /** Editorial: how this answer relates to the connection. Reveal-only. */
  connectionNote: string;
}

export interface PhraseReveal {
  /** How the answers and the phrase fit the connection. */
  summary: string;
  ohMoment: string;
}

export interface PhrasePuzzle {
  id: string;
  version: number;
  title: string;
  /** The hidden phrase — the solve target. */
  phrase: string;
  /** The entity connecting the questions and the phrase. Bonus target. */
  connection: AnswerSpec;
  /** Player-visible genre pill (Movie, TV Show, Song…). Sets the arena. */
  genre: string;
  /** Question ORDER matters: question k reveals letter positions k, k+5, … */
  questions: PhraseQuestion[];
  /** Purchasable hints (10 points each). Empty string = hint not offered. */
  hints: { category: string; decade: string };
  reveal: PhraseReveal;
  editorial: { notes: string };
}

// ---------------------------------------------------------------------------
// Parsing / normalization
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => asString(item)).filter(Boolean);
}

function parseAnswerSpec(value: unknown): AnswerSpec {
  if (typeof value === "string") return { primary: value, aliases: [] };
  if (!isRecord(value)) return { primary: "", aliases: [] };
  return {
    primary: asString(value.primary),
    aliases: asStringArray(value.aliases),
  };
}

export interface PuzzleParseResult {
  puzzle: PhrasePuzzle | null;
  errors: string[];
}

export function parsePuzzle(raw: unknown): PuzzleParseResult {
  const errors: string[] = [];
  if (!isRecord(raw)) {
    return { puzzle: null, errors: ["Puzzle JSON must be an object."] };
  }

  const id = asString(raw.id);
  if (!id) errors.push("Puzzle is missing an id.");

  if (raw.questions !== undefined && !Array.isArray(raw.questions)) {
    errors.push("`questions` must be an array.");
  }

  const questions: PhraseQuestion[] = Array.isArray(raw.questions)
    ? raw.questions.map((value, index) => {
        const record = isRecord(value) ? value : {};
        const qid = asString(record.id) || `q_${index + 1}`;
        return {
          id: qid,
          subject: asString(record.subject),
          prompt: asString(record.prompt),
          answer: parseAnswerSpec(record.answer),
          letter: asString(record.letter).trim().toUpperCase().slice(0, 1),
          factoid: asString(record.factoid),
          connectionNote: asString(record.connectionNote),
        };
      })
    : [];

  const ids = new Set<string>();
  questions.forEach((question) => {
    if (ids.has(question.id)) errors.push(`Duplicate question id: ${question.id}`);
    ids.add(question.id);
  });

  const revealRecord = isRecord(raw.reveal) ? raw.reveal : {};
  const editorialRecord = isRecord(raw.editorial) ? raw.editorial : {};
  const hintsRecord = isRecord(raw.hints) ? raw.hints : {};

  const puzzle: PhrasePuzzle = {
    id: id || "puzzle_untitled",
    version:
      typeof raw.version === "number" && Number.isFinite(raw.version)
        ? raw.version
        : CURRENT_PUZZLE_VERSION,
    title: asString(raw.title),
    phrase: asString(raw.phrase),
    connection: parseAnswerSpec(raw.connection),
    genre: asString(raw.genre),
    questions,
    hints: {
      category: asString(hintsRecord.category),
      decade: asString(hintsRecord.decade),
    },
    reveal: {
      summary: asString(revealRecord.summary),
      ohMoment: asString(revealRecord.ohMoment),
    },
    editorial: { notes: asString(editorialRecord.notes) },
  };

  return errors.length > 0 ? { puzzle, errors } : { puzzle, errors: [] };
}

export function loadPuzzleFromJson(text: string): PuzzleParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (error) {
    return {
      puzzle: null,
      errors: [
        `Invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
      ],
    };
  }
  const result = parsePuzzle(raw);
  return result.errors.length > 0
    ? { puzzle: null, errors: result.errors }
    : result;
}

export function exportPuzzleToJson(puzzle: PhrasePuzzle): string {
  return JSON.stringify(puzzle, null, 2);
}

// ---------------------------------------------------------------------------
// Blanks
// ---------------------------------------------------------------------------

let uidCounter = 0;

function uid(prefix: string): string {
  uidCounter += 1;
  return `${prefix}_${Date.now().toString(36)}${uidCounter.toString(36)}`;
}

export function blankQuestion(): PhraseQuestion {
  return {
    id: uid("q"),
    subject: "",
    prompt: "",
    answer: { primary: "", aliases: [] },
    letter: "",
    factoid: "",
    connectionNote: "",
  };
}

export function blankPuzzle(): PhrasePuzzle {
  return {
    id: uid("puzzle"),
    version: CURRENT_PUZZLE_VERSION,
    title: "New Puzzle",
    phrase: "",
    connection: { primary: "", aliases: [] },
    genre: "",
    questions: [blankQuestion(), blankQuestion(), blankQuestion(), blankQuestion(), blankQuestion()],
    hints: { category: "", decade: "" },
    reveal: { summary: "", ohMoment: "" },
    editorial: { notes: "" },
  };
}

// ---------------------------------------------------------------------------
// Phrase helpers
// ---------------------------------------------------------------------------

/** Distinct letters (A–Z) present in the phrase. */
export function phraseLetters(phrase: string): string[] {
  return Array.from(
    new Set(
      phrase
        .toUpperCase()
        .split("")
        .filter((char) => /[A-Z]/.test(char)),
    ),
  );
}

/** Count of occurrences of a letter in the phrase. */
export function letterCount(phrase: string, letter: string): number {
  const upper = letter.toUpperCase();
  return phrase
    .toUpperCase()
    .split("")
    .filter((char) => char === upper).length;
}
