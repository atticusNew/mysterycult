/**
 * Guard: every case JSON shipped in the repo must parse with zero structural
 * errors, and authored (non-template) cases must pass the validator with no
 * errors and no editorial warnings.
 */
import { describe, expect, it } from "vitest";
import template from "./cases/case_template.json";
import jonStewartCase from "./cases/case_jon_stewart_test.json";
import sopranosCase from "./cases/case_the_sopranos.json";
import { parseCase } from "./schema";
import { validateCase } from "../authoring/CaseValidator";

function expectClean(raw: unknown) {
  const { caseData, errors } = parseCase(raw);
  expect(errors).toHaveLength(0);
  expect(caseData).not.toBeNull();
  const report = validateCase(caseData!);
  expect(report.errors.map((issue) => issue.message)).toEqual([]);
  expect(report.warnings.map((issue) => issue.message)).toEqual([]);
  return caseData!;
}

describe("shipped case files", () => {
  it("the blank template parses with no structural errors", () => {
    const { caseData, errors } = parseCase(template);
    expect(errors).toHaveLength(0);
    expect(caseData).not.toBeNull();
  });

  it("the Jon Stewart test case parses and validates cleanly", () => {
    const caseData = expectClean(jonStewartCase);
    expect(caseData.lineup.suspects.length).toBeGreaterThanOrEqual(8);
  });

  it("the Sopranos test case parses and validates cleanly", () => {
    const caseData = expectClean(sopranosCase);

    // The suspect funnel: a big board, decoys that die on specific exhibits,
    // and a single smoking gun kept last.
    expect(caseData.lineup.suspects.length).toBeGreaterThanOrEqual(8);
    const conclusive = caseData.evidence.filter(
      (item) => item.diagnosticity === "conclusive",
    );
    expect(conclusive).toHaveLength(1);
    expect(caseData.evidence[caseData.evidence.length - 1].id).toBe(
      conclusive[0].id,
    );
    const answer = caseData.lineup.suspects.find(
      (suspect) => suspect.id === caseData.lineup.answerSuspectId,
    );
    expect(answer?.label).toBe("The Sopranos");
    // Every decoy must be killable.
    caseData.lineup.suspects
      .filter((suspect) => suspect.id !== caseData.lineup.answerSuspectId)
      .forEach((suspect) => {
        expect(suspect.eliminatedBy.length).toBeGreaterThan(0);
      });
  });
});
