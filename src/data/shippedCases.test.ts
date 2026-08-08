/**
 * Guard: every case JSON shipped in the repo must parse with zero structural
 * errors and pass the validator with no errors and no editorial warnings.
 * Production cases must also satisfy the suspect-funnel shape and must not
 * leak the answer through ids or asset paths.
 */
import { describe, expect, it } from "vitest";
import template from "./cases/case_template.json";
import jonStewartCase from "./cases/case_jon_stewart_test.json";
import caseTwo from "./cases/case_002.json";
import caseThree from "./cases/case_003.json";
import caseFour from "./cases/case_004.json";
import caseFive from "./cases/case_005.json";
import { parseCase } from "./schema";
import { validateCase } from "../authoring/CaseValidator";
import type { CaseData } from "../models/types";

function expectClean(raw: unknown): CaseData {
  const { caseData, errors } = parseCase(raw);
  expect(errors).toHaveLength(0);
  expect(caseData).not.toBeNull();
  const report = validateCase(caseData!);
  expect(report.errors.map((issue) => issue.message)).toEqual([]);
  expect(report.warnings.map((issue) => issue.message)).toEqual([]);
  return caseData!;
}

/** The suspect-funnel shape + spoiler-leak rules for production cases. */
function expectFunnel(caseData: CaseData) {
  expect(caseData.lineup.suspects.length).toBeGreaterThanOrEqual(6);

  // Exactly one smoking gun, kept last.
  const conclusive = caseData.evidence.filter(
    (item) => item.diagnosticity === "conclusive",
  );
  expect(conclusive).toHaveLength(1);
  expect(caseData.evidence[caseData.evidence.length - 1].id).toBe(
    conclusive[0].id,
  );

  // Every decoy must be killable.
  caseData.lineup.suspects
    .filter((suspect) => suspect.id !== caseData.lineup.answerSuspectId)
    .forEach((suspect) => {
      expect(suspect.eliminatedBy.length).toBeGreaterThan(0);
    });

  // The case id and exhibit contents must not leak the answer.
  const answer = caseData.lineup.suspects.find(
    (suspect) => suspect.id === caseData.lineup.answerSuspectId,
  )!;
  const keyword = answer.label.split(" ").pop()!.toLowerCase();
  expect(caseData.id.toLowerCase()).not.toContain(keyword);
  caseData.evidence.forEach((item) => {
    expect(item.content.toLowerCase().includes(keyword)).toBe(false);
  });
}

describe("shipped case files", () => {
  it("the blank template parses with no structural errors", () => {
    const { caseData, errors } = parseCase(template);
    expect(errors).toHaveLength(0);
    expect(caseData).not.toBeNull();
  });

  it("the Jon Stewart test case validates cleanly", () => {
    expectClean(jonStewartCase);
  });

  it("case #002 validates cleanly and satisfies the funnel", () => {
    expectFunnel(expectClean(caseTwo));
  });

  it("case #003 validates cleanly and satisfies the funnel", () => {
    expectFunnel(expectClean(caseThree));
  });

  it("case #004 validates cleanly and satisfies the funnel", () => {
    expectFunnel(expectClean(caseFour));
  });

  it("case #005 validates cleanly and satisfies the funnel", () => {
    expectFunnel(expectClean(caseFive));
  });
});
