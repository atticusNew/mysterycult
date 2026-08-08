import { describe, expect, it } from "vitest";
import demoPuzzle from "./puzzles/puzzle_001.json";
import demoPuzzleTwo from "./puzzles/puzzle_002.json";
import demoPuzzleThree from "./puzzles/puzzle_003.json";
import demoPuzzleFour from "./puzzles/puzzle_004.json";
import template from "./puzzles/puzzle_template.json";
import { parsePuzzle, phraseLetters, letterCount } from "./model";
import {
  attemptedCount,
  buildPuzzleShareText,
  computePuzzleScore,
  createPuzzleSession,
  PHRASE_SCORING,
  phraseMatches,
  puzzleReducer,
  SOLVE_ATTEMPTS,
  type PuzzleAction,
  type PuzzleSession,
} from "./engine";
import { validatePuzzle } from "./validator";

function puzzle() {
  const { puzzle: parsed, errors } = parsePuzzle(demoPuzzle);
  if (!parsed || errors.length > 0) throw new Error(errors.join(", "));
  return parsed;
}

function run(session: PuzzleSession, ...actions: PuzzleAction[]): PuzzleSession {
  const data = puzzle();
  return actions.reduce(
    (state, action) => puzzleReducer(data, state, action),
    session,
  );
}

describe("phrase helpers", () => {
  it("extracts letters and counts", () => {
    expect(phraseLetters("There can be only one")).toContain("E");
    expect(letterCount("There can be only one", "e")).toBe(4);
    expect(letterCount("There can be only one", "N")).toBe(3);
  });

  it("matches phrases forgivingly", () => {
    expect(phraseMatches("there can be only one!", "There can be only one")).toBe(true);
    expect(phraseMatches("there can only be one", "There can be only one")).toBe(false);
  });
});

describe("puzzle engine", () => {
  const data = puzzle();

  it("a correct answer earns the question's letter — one attempt only", () => {
    let session = run(createPuzzleSession(data), {
      type: "ANSWER_QUESTION",
      questionId: "q_band",
      answer: "queen",
    });
    expect(session.questionStatus.q_band).toBe("correct");
    expect(session.earnedLetters).toEqual(["Y"]);

    // Second attempt on the same question is a no-op.
    const before = session;
    session = run(session, {
      type: "ANSWER_QUESTION",
      questionId: "q_band",
      answer: "abba",
    });
    expect(session).toBe(before);
  });

  it("a wrong answer locks the question without revealing its letter", () => {
    const session = run(createPuzzleSession(data), {
      type: "ANSWER_QUESTION",
      questionId: "q_bond",
      answer: "Roger Moore",
    });
    expect(session.questionStatus.q_bond).toBe("wrong");
    expect(session.earnedLetters).toEqual([]);
    expect(attemptedCount(session)).toBe(1);
  });

  it("solving the phrase opens the bonus; naming the connection completes", () => {
    let session = run(
      createPuzzleSession(data),
      { type: "ANSWER_QUESTION", questionId: "q_band", answer: "Queen" },
      { type: "ATTEMPT_SOLVE", text: "There can be only one" },
    );
    expect(session.phase).toBe("BONUS");
    expect(session.solved).toBe(true);
    expect(session.solvedAfterQuestions).toBe(1);

    session = run(session, { type: "ANSWER_BONUS", text: "highlander" });
    expect(session.phase).toBe("COMPLETE");
    expect(session.bonusResult).toBe("correct");
  });

  it("the bonus can be skipped", () => {
    let session = run(
      createPuzzleSession(data),
      { type: "ATTEMPT_SOLVE", text: "there can be only one" },
      { type: "SKIP_BONUS" },
    );
    expect(session.phase).toBe("COMPLETE");
    expect(session.bonusResult).toBe("skipped");
    expect(session.solvedAfterQuestions).toBe(0);
  });

  it("running out of solve attempts sends the puzzle cold", () => {
    expect(SOLVE_ATTEMPTS).toBe(2);
    const session = run(
      createPuzzleSession(data),
      { type: "ATTEMPT_SOLVE", text: "wrong guess one" },
      { type: "ATTEMPT_SOLVE", text: "wrong guess two" },
    );
    expect(session.phase).toBe("COLD");
    expect(session.solved).toBe(false);
  });

  it("scoring rewards early solves and the connection bonus", () => {
    const clean = run(
      createPuzzleSession(data),
      { type: "ATTEMPT_SOLVE", text: "There can be only one" },
      { type: "ANSWER_BONUS", text: "Highlander" },
    );
    expect(computePuzzleScore(clean).total).toBe(
      PHRASE_SCORING.base + PHRASE_SCORING.connectionBonus,
    );

    const slower = run(
      createPuzzleSession(data),
      { type: "ANSWER_QUESTION", questionId: "q_band", answer: "Queen" },
      { type: "ANSWER_QUESTION", questionId: "q_country", answer: "Scotland" },
      { type: "ATTEMPT_SOLVE", text: "not it at all" },
      { type: "ATTEMPT_SOLVE", text: "There can be only one" },
      { type: "SKIP_BONUS" },
    );
    expect(computePuzzleScore(slower).total).toBe(
      PHRASE_SCORING.base -
        2 * PHRASE_SCORING.perQuestion -
        PHRASE_SCORING.perWrongSolve,
    );
  });

  it("share text is spoiler-free", () => {
    const session = run(
      createPuzzleSession(data),
      { type: "ANSWER_QUESTION", questionId: "q_band", answer: "Queen" },
      { type: "ATTEMPT_SOLVE", text: "There can be only one" },
      { type: "ANSWER_BONUS", text: "Highlander" },
    );
    const share = buildPuzzleShareText(data, session);
    expect(share).toContain("Tagline #001");
    expect(share.toLowerCase()).not.toContain("highlander");
    expect(share.toLowerCase()).not.toContain("only one");
    expect(share).toContain("🟩");
    expect(share).toContain("⭐");
  });
});

describe("shipped puzzles", () => {
  it("the blank template parses with no errors", () => {
    const { puzzle: parsed, errors } = parsePuzzle(template);
    expect(errors).toHaveLength(0);
    expect(parsed).not.toBeNull();
  });

  it("every demo puzzle validates with zero errors and zero warnings", () => {
    [demoPuzzle, demoPuzzleTwo, demoPuzzleThree, demoPuzzleFour].forEach((raw) => {
      const { puzzle: parsed, errors } = parsePuzzle(raw);
      expect(errors).toHaveLength(0);
      expect(parsed).not.toBeNull();
      const report = validatePuzzle(parsed!);
      expect(report.errors.map((item) => item.message)).toEqual([]);
      expect(report.warnings.map((item) => item.message)).toEqual([]);
      // The puzzle id must not leak the connection.
      const keyword = parsed!.connection.primary
        .split(" ")
        .pop()!
        .toLowerCase();
      expect(parsed!.id.toLowerCase()).not.toContain(keyword);
    });
  });
});
