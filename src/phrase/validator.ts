/**
 * Tagline puzzle validator (v2, positional-stride reveal).
 * Structural corruption = errors; editorial quality = warnings.
 */
import { normalizeAnswer } from "../game/AnswerEngine";
import { letterSequence } from "./engine";
import type { PhrasePuzzle } from "./model";

export interface PuzzleIssue {
  level: "error" | "warning";
  code: string;
  message: string;
}

export interface PuzzleReport {
  errors: PuzzleIssue[];
  warnings: PuzzleIssue[];
  issues: PuzzleIssue[];
}

function issue(
  level: PuzzleIssue["level"],
  code: string,
  message: string,
): PuzzleIssue {
  return { level, code, message };
}

function containsTarget(text: string, target: string): boolean {
  const needle = normalizeAnswer(target);
  if (!needle || needle.length < 3) return false;
  return ` ${normalizeAnswer(text)} `.includes(` ${needle} `);
}

export function validatePuzzle(puzzle: PhrasePuzzle): PuzzleReport {
  const issues: PuzzleIssue[] = [];
  const connection = puzzle.connection.primary.trim();

  // ---------------------------------------------------------------- errors
  if (!puzzle.id.trim()) {
    issues.push(issue("error", "missing_id", "The puzzle has no id."));
  }
  const questionIds = new Set<string>();
  puzzle.questions.forEach((question) => {
    if (questionIds.has(question.id)) {
      issues.push(
        issue("error", "duplicate_question_id", `Duplicate question id "${question.id}".`),
      );
    }
    questionIds.add(question.id);
  });

  // -------------------------------------------------------------- warnings
  if (!puzzle.phrase.trim()) {
    issues.push(issue("warning", "missing_phrase", "The phrase is missing."));
  }
  if (!connection) {
    issues.push(
      issue("warning", "missing_connection", "The connection (bonus answer) is missing."),
    );
  }
  if (!puzzle.title.trim()) {
    issues.push(issue("warning", "missing_title", "The puzzle has no title."));
  }
  if (connection && puzzle.connection.aliases.length === 0) {
    issues.push(
      issue(
        "warning",
        "missing_connection_aliases",
        "The connection has no aliases — reasonable bonus answers will be marked wrong.",
      ),
    );
  }
  if (
    connection &&
    puzzle.phrase.trim() &&
    containsTarget(puzzle.phrase, connection)
  ) {
    issues.push(
      issue(
        "warning",
        "phrase_names_connection",
        "The phrase contains the connection's name — the bonus will answer itself.",
      ),
    );
  }

  if (puzzle.questions.length === 0) {
    issues.push(issue("warning", "no_questions", "The puzzle has no questions."));
  } else if (puzzle.questions.length !== 5) {
    issues.push(
      issue(
        "warning",
        "question_count",
        `${puzzle.questions.length} questions — the daily format is 5.`,
      ),
    );
  }

  const totalLetters = letterSequence(puzzle.phrase).length;
  if (totalLetters > 58) {
    issues.push(
      issue(
        "warning",
        "phrase_long",
        `The phrase is ${totalLetters} letters — boards over ~58 letters crowd small phones. Pick a shorter line.`,
      ),
    );
  }
  if (
    puzzle.phrase.trim() &&
    puzzle.questions.length > 0 &&
    totalLetters < puzzle.questions.length * 2
  ) {
    issues.push(
      issue(
        "warning",
        "phrase_too_short",
        `Only ${totalLetters} letters across ${puzzle.questions.length} questions — some questions will reveal almost nothing.`,
      ),
    );
  }

  puzzle.questions.forEach((question, index) => {
    const label = `Question ${index + 1}`;
    if (!question.prompt.trim()) {
      issues.push(issue("warning", "missing_prompt", `${label} has no prompt.`));
    }
    if (!question.answer.primary.trim()) {
      issues.push(issue("warning", "missing_answer", `${label} has no answer.`));
    }
    if (question.answer.primary.trim() && question.answer.aliases.length === 0) {
      issues.push(
        issue("warning", "missing_aliases", `${label} has no answer aliases.`),
      );
    }
    if (connection && containsTarget(question.prompt, connection)) {
      issues.push(
        issue(
          "warning",
          "prompt_names_connection",
          `${label}'s prompt names the connection — questions must stay self-contained.`,
        ),
      );
    }
    if (!question.connectionNote.trim()) {
      issues.push(
        issue(
          "warning",
          "missing_connection_note",
          `${label} has no connection note — the reveal will have nothing to explain.`,
        ),
      );
    }
  });

  if (!puzzle.genre.trim()) {
    issues.push(
      issue(
        "warning",
        "missing_genre",
        "No genre set (Movie, TV Show, Song…) — the genre pill anchors the search space.",
      ),
    );
  }
  if (connection && containsTarget(puzzle.hints.category, connection)) {
    issues.push(
      issue(
        "warning",
        "hint_names_connection",
        "The category hint names the connection.",
      ),
    );
  }
  if (connection && containsTarget(puzzle.hints.decade, connection)) {
    issues.push(
      issue(
        "warning",
        "hint_names_connection",
        "The decade hint names the connection.",
      ),
    );
  }

  if (!puzzle.reveal.summary.trim()) {
    issues.push(
      issue("warning", "missing_reveal", "The reveal summary is missing."),
    );
  }

  const errors = issues.filter((item) => item.level === "error");
  const warnings = issues.filter((item) => item.level === "warning");
  return { errors, warnings, issues };
}
