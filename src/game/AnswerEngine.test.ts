import { describe, expect, it } from "vitest";
import { answerMatches, normalizeAnswer } from "./AnswerEngine";

describe("normalizeAnswer", () => {
  it("lowercases, trims and collapses whitespace", () => {
    expect(normalizeAnswer("  Placeholder   Answer ")).toBe(
      "placeholder answer",
    );
  });

  it("strips punctuation and diacritics", () => {
    expect(normalizeAnswer("Plá-cehol.der's Answer!")).toBe(
      "pla cehol der s answer",
    );
  });

  it("drops a leading 'the'", () => {
    expect(normalizeAnswer("The Placeholder")).toBe("placeholder");
  });
});

describe("answerMatches", () => {
  const spec = {
    primary: "Placeholder Answer",
    aliases: ["alias form", "second alias"],
  };

  it("matches the primary answer case-insensitively", () => {
    expect(answerMatches("placeholder answer", spec)).toBe(true);
    expect(answerMatches("PLACEHOLDER ANSWER", spec)).toBe(true);
  });

  it("matches aliases", () => {
    expect(answerMatches("Alias Form", spec)).toBe(true);
  });

  it("matches with a leading 'the'", () => {
    expect(answerMatches("The Placeholder Answer", spec)).toBe(true);
  });

  it("rejects wrong and empty answers", () => {
    expect(answerMatches("wrong", spec)).toBe(false);
    expect(answerMatches("", spec)).toBe(false);
    expect(answerMatches("   ", spec)).toBe(false);
  });
});
