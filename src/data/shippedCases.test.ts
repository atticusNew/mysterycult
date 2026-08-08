/**
 * Guard: every case JSON shipped in the repo must parse with zero structural
 * errors, and authored (non-template) cases must pass the validator with no
 * errors and no editorial warnings.
 */
import { describe, expect, it } from "vitest";
import template from "./cases/case_template.json";
import jonStewartCase from "./cases/case_jon_stewart_test.json";
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
});
