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

describe("shipped case files", () => {
  it("the blank template parses with no structural errors", () => {
    const { caseData, errors } = parseCase(template);
    expect(errors).toHaveLength(0);
    expect(caseData).not.toBeNull();
  });

  it("the Jon Stewart test case parses and validates cleanly", () => {
    const { caseData, errors } = parseCase(jonStewartCase);
    expect(errors).toHaveLength(0);
    expect(caseData).not.toBeNull();

    const report = validateCase(caseData!);
    expect(report.errors.map((issue) => issue.message)).toEqual([]);
    expect(report.warnings.map((issue) => issue.message)).toEqual([]);
  });

  it("the Sopranos test case parses and validates cleanly", () => {
    const { caseData, errors } = parseCase(sopranosCase);
    expect(errors).toHaveLength(0);
    expect(caseData).not.toBeNull();

    const report = validateCase(caseData!);
    expect(report.errors.map((issue) => issue.message)).toEqual([]);
    expect(report.warnings.map((issue) => issue.message)).toEqual([]);

    // The suspect funnel: multiple documented wrong theories, one smoking gun
    // on a final-stage clue, and an ambiguous (low/medium) opening.
    const suspects = caseData!.editorial.hypotheses;
    expect(suspects.length).toBeGreaterThanOrEqual(3);
    const conclusive = caseData!.evidence.filter(
      (item) => item.diagnosticity === "conclusive",
    );
    expect(conclusive).toHaveLength(1);
    const gunClue = caseData!.clues.find(
      (clue) => clue.evidenceId === conclusive[0].id,
    );
    expect(gunClue?.stage).toBe("final");
  });
});
