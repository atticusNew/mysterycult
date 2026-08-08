import { describe, expect, it } from "vitest";
import template from "../data/cases/case_template.json";
import { loadCaseFromJson } from "../data/caseLoader";
import { dummyCase } from "../test/dummyCase";
import { exportCaseToJson, importCaseFromJson } from "./io";

describe("JSON import/export", () => {
  it("export → import round-trips a case losslessly", () => {
    const original = dummyCase();
    const json = exportCaseToJson(original);
    const { caseData, errors } = importCaseFromJson(json);
    expect(errors).toHaveLength(0);
    expect(caseData).toEqual(original);
  });

  it("the blank case template loads successfully", () => {
    const { caseData, errors } = loadCaseFromJson(JSON.stringify(template));
    expect(errors).toHaveLength(0);
    expect(caseData).not.toBeNull();
    expect(caseData!.id).toBe("case_template");
    expect(caseData!.answer.primary).toBe("");
    expect(caseData!.clues).toHaveLength(0);
  });

  it("rejects invalid JSON with a readable error", () => {
    const { caseData, errors } = importCaseFromJson("{not json");
    expect(caseData).toBeNull();
    expect(errors[0]).toMatch(/Invalid JSON/);
  });

  it("rejects structurally corrupt cases", () => {
    const corrupt = JSON.stringify({
      id: "case_corrupt",
      clues: [{ id: "clue_a", evidenceId: "evidence_that_does_not_exist" }],
      evidence: [],
    });
    const { caseData, errors } = importCaseFromJson(corrupt);
    expect(caseData).toBeNull();
    expect(errors.join(" ")).toMatch(/unknown evidence/);
  });
});
