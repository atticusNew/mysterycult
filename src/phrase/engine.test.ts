import { describe, expect, it } from "vitest";
import demoPuzzle from "./puzzles/puzzle_001.json";
import demoPuzzleTwo from "./puzzles/puzzle_002.json";
import demoPuzzleThree from "./puzzles/puzzle_003.json";
import demoPuzzleFour from "./puzzles/puzzle_004.json";
import demoPuzzleFive from "./puzzles/puzzle_005.json";
import demoPuzzleSix from "./puzzles/puzzle_006.json";
import demoPuzzleSeven from "./puzzles/puzzle_007.json";
import demoPuzzleEight from "./puzzles/puzzle_008.json";
import demoPuzzleNine from "./puzzles/puzzle_009.json";
import template from "./puzzles/puzzle_template.json";
import { parsePuzzle } from "./model";
import {
  allRevealedPositions,
  buildPuzzleShareText,
  computePuzzleScore,
  createPuzzleSession,
  letterSequence,
  looseAnswerMatches,
  PHRASE_SCORING,
  phraseMatches,
  puzzleReducer,
  SOLVE_ATTEMPTS,
  stridePositions,
  THEME_ATTEMPTS,
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
  it("sequences letters and computes stride positions", () => {
    // "There can be only one" = 17 letters.
    expect(letterSequence("There can be only one")).toHaveLength(17);
    // Question 1 of 5 reveals positions 0, 5, 10, 15.
    expect(stridePositions("There can be only one", 5, 0)).toEqual([0, 5, 10, 15]);
    // Question 5 of 5 reveals positions 4, 9, 14.
    expect(stridePositions("There can be only one", 5, 4)).toEqual([4, 9, 14]);
  });

  it("matches phrases forgivingly", () => {
    expect(phraseMatches("there can be only one!", "There can be only one")).toBe(true);
    expect(phraseMatches("there can only be one", "There can be only one")).toBe(false);
  });

  it("tolerates one typo on longer answers", () => {
    const spec = { primary: "Sean Connery", aliases: ["connery"] };
    expect(looseAnswerMatches("Sean Conery", spec)).toBe(true);
    expect(looseAnswerMatches("Conolly", spec)).toBe(false);
    // Short answers stay strict.
    expect(looseAnswerMatches("MTB", { primary: "MTV", aliases: [] })).toBe(false);
  });
});

describe("puzzle engine v2", () => {
  const data = puzzle();

  it("a correct answer reveals that question's stride positions", () => {
    const session = run(createPuzzleSession(data), {
      type: "ANSWER_QUESTION",
      questionId: data.questions[0].id,
      answer: data.questions[0].answer.primary,
    });
    expect(session.questionStatus[data.questions[0].id]).toBe("correct");
    expect(session.revealedPositions).toEqual([0, 5, 10, 15]);
  });

  it("a wrong answer locks the question and reveals nothing", () => {
    const session = run(createPuzzleSession(data), {
      type: "ANSWER_QUESTION",
      questionId: data.questions[0].id,
      answer: "definitely wrong",
    });
    expect(session.questionStatus[data.questions[0].id]).toBe("wrong");
    expect(session.revealedPositions).toEqual([]);
  });

  it("the letter hint reveals the first hidden position and costs once", () => {
    let session = run(createPuzzleSession(data), {
      type: "USE_HINT",
      hint: "letter",
    });
    expect(session.hintPositions).toEqual([0]);
    const before = session;
    session = run(session, { type: "USE_HINT", hint: "letter" });
    expect(session).toBe(before);
  });

  it("category and decade hints require authored text and mark as used", () => {
    let session = run(createPuzzleSession(data), {
      type: "USE_HINT",
      hint: "category",
    });
    expect(session.usedHints).toContain("category");
    session = run(session, { type: "USE_HINT", hint: "decade" });
    expect(session.usedHints).toContain("decade");
  });

  it("naming the theme is the win and opens the phrase bonus", () => {
    let session = run(createPuzzleSession(data), {
      type: "ATTEMPT_CONNECTION",
      text: data.connection.primary,
    });
    expect(session.connectionResult).toBe("correct");
    expect(session.phase).toBe("BONUS");
    session = run(session, { type: "ATTEMPT_SOLVE", text: data.phrase });
    expect(session.phase).toBe("COMPLETE");
    expect(session.solved).toBe(true);
  });

  it("the phrase can be solved mid-game as a stepping stone", () => {
    let session = run(createPuzzleSession(data), {
      type: "ATTEMPT_SOLVE",
      text: data.phrase,
    });
    expect(session.solved).toBe(true);
    expect(session.phase).toBe("PLAYING"); // theme still to name
    session = run(session, {
      type: "ATTEMPT_CONNECTION",
      text: data.connection.primary,
    });
    expect(session.phase).toBe("COMPLETE");
  });

  it("two wrong theme guesses send the puzzle cold", () => {
    expect(THEME_ATTEMPTS).toBe(2);
    const session = run(
      createPuzzleSession(data),
      { type: "ATTEMPT_CONNECTION", text: "wrong theme one" },
      { type: "ATTEMPT_CONNECTION", text: "wrong theme two" },
    );
    expect(session.phase).toBe("COLD");
    expect(session.connectionResult).toBe("wrong");
  });

  it("a fully revealed phrase completes itself", () => {
    let session = createPuzzleSession(data);
    data.questions.forEach((question) => {
      session = run(session, {
        type: "ANSWER_QUESTION",
        questionId: question.id,
        answer: question.answer.primary,
      });
    });
    // All stride positions revealed → the phrase bonus is earned, no typing.
    expect(session.solved).toBe(true);
    expect(session.phase).toBe("PLAYING"); // throughline still to name
  });

  it("failed phrase attempts lock the bonus but never end the game", () => {
    expect(SOLVE_ATTEMPTS).toBe(2);
    let session = run(
      createPuzzleSession(data),
      { type: "ATTEMPT_SOLVE", text: "wrong guess one" },
      { type: "ATTEMPT_SOLVE", text: "wrong guess two" },
    );
    expect(session.phase).toBe("PLAYING");
    const before = session;
    session = run(session, { type: "ATTEMPT_SOLVE", text: data.phrase });
    expect(session).toBe(before); // locked
  });

  it("a perfect game is always 100 points, however it is reached", () => {
    // Route one: answer everything, then solve, then name the connection.
    let all = createPuzzleSession(data);
    data.questions.forEach((question) => {
      all = run(all, {
        type: "ANSWER_QUESTION",
        questionId: question.id,
        answer: question.answer.primary,
      });
    });
    all = run(
      all,
      { type: "ATTEMPT_SOLVE", text: data.phrase },
      { type: "ATTEMPT_CONNECTION", text: data.connection.primary },
    );
    expect(computePuzzleScore(data, all).total).toBe(100);

    // Route two: theme cold-open with zero questions, then the phrase bonus.
    const zero = run(
      createPuzzleSession(data),
      { type: "ATTEMPT_CONNECTION", text: data.connection.primary },
      { type: "ATTEMPT_SOLVE", text: data.phrase },
    );
    expect(computePuzzleScore(data, zero).total).toBe(100);
  });

  it("wrong answers forfeit their 5 points and hints cost 10", () => {
    let session = run(
      createPuzzleSession(data),
      {
        type: "ANSWER_QUESTION",
        questionId: data.questions[0].id,
        answer: "wrong",
      },
      { type: "USE_HINT", hint: "letter" },
      { type: "ATTEMPT_CONNECTION", text: data.connection.primary },
      { type: "SKIP_BONUS" },
    );
    // 4 banked (5th was forfeited) + 50 theme - 10 hint = 60.
    expect(computePuzzleScore(data, session).total).toBe(
      4 * PHRASE_SCORING.perQuestion +
        PHRASE_SCORING.themeWin -
        PHRASE_SCORING.hintCost,
    );
  });

  it("share text is spoiler-free and shows the score", () => {
    const session = run(
      createPuzzleSession(data),
      { type: "ATTEMPT_CONNECTION", text: data.connection.primary },
      { type: "ATTEMPT_SOLVE", text: data.phrase },
    );
    const share = buildPuzzleShareText(data, session);
    expect(share).toContain("100/100");
    expect(share.toLowerCase()).not.toContain("highlander");
    expect(share.toLowerCase()).not.toContain("only one");
    expect(share).toContain("⭐");
  });

  it("revealed positions merge answers and hints", () => {
    const session = run(
      createPuzzleSession(data),
      { type: "USE_HINT", hint: "letter" },
      {
        type: "ANSWER_QUESTION",
        questionId: data.questions[1].id,
        answer: data.questions[1].answer.primary,
      },
    );
    const revealed = allRevealedPositions(session);
    expect(revealed.has(0)).toBe(true); // hint
    expect(revealed.has(1)).toBe(true); // question 2 stride
  });
});

describe("shipped puzzles", () => {
  it("the blank template parses with no errors", () => {
    const { puzzle: parsed, errors } = parsePuzzle(template);
    expect(errors).toHaveLength(0);
    expect(parsed).not.toBeNull();
  });

  it("every demo puzzle validates with zero errors and zero warnings", () => {
    [
      demoPuzzle,
      demoPuzzleTwo,
      demoPuzzleThree,
      demoPuzzleFour,
      demoPuzzleFive,
      demoPuzzleSix,
      demoPuzzleSeven,
      demoPuzzleEight,
      demoPuzzleNine,
    ].forEach((raw) => {
      const { puzzle: parsed, errors } = parsePuzzle(raw);
      expect(errors).toHaveLength(0);
      expect(parsed).not.toBeNull();
      const report = validatePuzzle(parsed!);
      expect(report.errors.map((item) => item.message)).toEqual([]);
      expect(report.warnings.map((item) => item.message)).toEqual([]);
      const keyword = parsed!.connection.primary.split(" ").pop()!.toLowerCase();
      expect(parsed!.id.toLowerCase()).not.toContain(keyword);
    });
  });
});
