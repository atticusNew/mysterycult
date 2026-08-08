import { describe, expect, it } from "vitest";
import type { CaseData } from "../models/types";
import { dummyCase } from "../test/dummyCase";
import { parseCase } from "../data/schema";
import template from "../data/cases/case_template.json";
import { validateCase } from "./CaseValidator";

function templateCase(): CaseData {
  const { caseData } = parseCase(template);
  if (!caseData) throw new Error("template failed to parse");
  return caseData;
}

describe("validateCase (line-up)", () => {
  it("the well-formed dummy case has no errors", () => {
    const report = validateCase(dummyCase());
    expect(report.errors).toHaveLength(0);
  });

  it("the blank template is structurally valid but full of editorial warnings", () => {
    const report = validateCase(templateCase());
    expect(report.errors).toHaveLength(0);
    const codes = report.warnings.map((warning) => warning.code);
    expect(codes).toContain("missing_final_answer");
    expect(codes).toContain("missing_question");
    expect(codes).toContain("no_suspects");
    expect(codes).toContain("no_evidence");
    expect(codes).toContain("too_few_entry_points");
    expect(codes).toContain("single_investigation_path");
    expect(codes).toContain("no_hints");
    expect(codes).toContain("missing_reveal_summary");
  });

  it("flags structural corruption as errors", () => {
    const broken = dummyCase();
    broken.lineup.suspects[1] = {
      ...broken.lineup.suspects[1],
      eliminatedBy: ["ev_missing"],
    };
    broken.lineup.answerSuspectId = "s_nonexistent";
    const report = validateCase(broken);
    const codes = report.errors.map((error) => error.code);
    expect(codes).toContain("broken_elimination_link");
    expect(codes).toContain("answer_not_on_board");
  });

  it("warns about a thin suspect pool", () => {
    const thin = dummyCase();
    thin.lineup.suspects = thin.lineup.suspects.slice(0, 3);
    const report = validateCase(thin);
    expect(report.warnings.map((warning) => warning.code)).toContain(
      "too_few_suspects",
    );
  });

  it("warns about unkillable and undocumented decoys", () => {
    const sloppy = dummyCase();
    sloppy.lineup.suspects[1] = {
      ...sloppy.lineup.suspects[1],
      whyPlausible: "",
      eliminatedBy: [],
    };
    const report = validateCase(sloppy);
    const codes = report.warnings.map((warning) => warning.code);
    expect(codes).toContain("undocumented_suspect");
    expect(codes).toContain("unkillable_suspect");
  });

  it("warns when an exhibit does no elimination work", () => {
    const idle = dummyCase();
    idle.lineup.suspects = idle.lineup.suspects.map((suspect) => ({
      ...suspect,
      eliminatedBy: suspect.eliminatedBy.filter((id) => id !== "ev_2"),
    }));
    // Keep other suspects killable so we isolate the exhibit warning.
    idle.lineup.suspects[2].eliminatedBy = ["ev_1"];
    idle.lineup.suspects[3].eliminatedBy = ["ev_3"];
    const report = validateCase(idle);
    expect(report.warnings.map((warning) => warning.code)).toContain(
      "evidence_eliminates_nobody",
    );
  });

  it("warns when the smoking gun is not last or the opening is too hot", () => {
    const early = dummyCase();
    early.evidence[0] = { ...early.evidence[0], diagnosticity: "conclusive" };
    const report = validateCase(early);
    const codes = report.warnings.map((warning) => warning.code);
    expect(codes).toContain("conclusive_too_early");
    expect(codes).toContain("opening_too_diagnostic");
  });

  it("warns when a non-conclusive exhibit contains the answer", () => {
    const leaky = dummyCase();
    leaky.evidence[0] = { ...leaky.evidence[0], content: "suspect one" };
    const report = validateCase(leaky);
    expect(report.warnings.map((warning) => warning.code)).toContain(
      "evidence_gives_away_answer",
    );
  });

  it("warns when the answer is marked as eliminated", () => {
    const contradictory = dummyCase();
    contradictory.lineup.suspects[0] = {
      ...contradictory.lineup.suspects[0],
      eliminatedBy: ["ev_1"],
    };
    const report = validateCase(contradictory);
    expect(report.warnings.map((warning) => warning.code)).toContain(
      "answer_marked_eliminated",
    );
  });

  it("warns when the entity does not match the answer", () => {
    const mismatched = dummyCase();
    mismatched.entity = { ...mismatched.entity!, name: "Different Entity" };
    const report = validateCase(mismatched);
    expect(report.warnings.map((warning) => warning.code)).toContain(
      "entity_answer_mismatch",
    );
  });
});
