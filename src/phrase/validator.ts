/**
 * Tagline puzzle validator. Structural corruption = errors; editorial
 * quality = warnings. Same philosophy as the case validator.
 */
import { normalizeAnswer } from "../game/AnswerEngine";
import { letterCount, phraseLetters, type PhrasePuzzle } from "./model";

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

function containsPhraseTarget(text: string, target: string): boolean {
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
    containsPhraseTarget(puzzle.phrase, connection)
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

  const lettersInPhrase = new Set(phraseLetters(puzzle.phrase));
  const usedLetters = new Map<string, number>();
  puzzle.questions.forEach((question, index) => {
    const label = `Question ${index + 1}`;
    if (!question.prompt.trim()) {
      issues.push(issue("warning", "missing_prompt", `${label} has no prompt.`));
    }
    // Subjects and factoids are currently not shown in play; validate only
    // that a provided subject doesn't leak the connection.
    if (connection && containsPhraseTarget(question.subject, connection)) {
      issues.push(
        issue(
          "warning",
          "subject_names_connection",
          `${label}'s subject card names the connection.`,
        ),
      );
    }
    if (!question.answer.primary.trim()) {
      issues.push(issue("warning", "missing_answer", `${label} has no answer.`));
    }
    if (question.answer.primary.trim() && question.answer.aliases.length === 0) {
      issues.push(
        issue("warning", "missing_aliases", `${label} has no answer aliases.`),
      );
    }
    if (!question.letter) {
      issues.push(
        issue("warning", "missing_letter", `${label} has no letter assigned.`),
      );
    } else {
      if (puzzle.phrase.trim() && !lettersInPhrase.has(question.letter)) {
        issues.push(
          issue(
            "warning",
            "letter_not_in_phrase",
            `${label} unlocks "${question.letter}", which does not appear in the phrase — a correct answer would reveal nothing.`,
          ),
        );
      }
      usedLetters.set(
        question.letter,
        (usedLetters.get(question.letter) ?? 0) + 1,
      );
    }
    if (connection && containsPhraseTarget(question.prompt, connection)) {
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
  usedLetters.forEach((count, letter) => {
    if (count > 1) {
      issues.push(
        issue(
          "warning",
          "duplicate_letter",
          `Two or more questions unlock the same letter "${letter}".`,
        ),
      );
    }
  });

  // Reveal-coverage curve: how much of the phrase opens if all answers land.
  if (puzzle.phrase.trim() && puzzle.questions.length > 0) {
    const totalLetters = puzzle.phrase
      .toUpperCase()
      .split("")
      .filter((char) => /[A-Z]/.test(char)).length;
    const revealed = Array.from(
      new Set(puzzle.questions.map((question) => question.letter).filter(Boolean)),
    ).reduce((sum, letter) => sum + letterCount(puzzle.phrase, letter), 0);
    const coverage = totalLetters > 0 ? revealed / totalLetters : 0;
    if (coverage < 0.4) {
      issues.push(
        issue(
          "warning",
          "coverage_low",
          `Full success reveals only ${Math.round(coverage * 100)}% of the phrase — likely unsolvable. Aim for 60–85%.`,
        ),
      );
    }
    if (coverage > 0.9) {
      issues.push(
        issue(
          "warning",
          "coverage_high",
          `Full success reveals ${Math.round(coverage * 100)}% of the phrase — it will read itself. Aim for 60–85%.`,
        ),
      );
    }
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
