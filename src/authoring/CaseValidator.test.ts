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

describe("validateCase", () => {
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
    expect(codes).toContain("no_clues");
    expect(codes).toContain("no_evidence");
    expect(codes).toContain("too_few_entry_points");
    expect(codes).toContain("single_investigation_path");
    expect(codes).toContain("no_hints");
    expect(codes).toContain("missing_reveal_summary");
  });

  it("flags structural corruption as errors", () => {
    const broken = dummyCase();
    broken.clues[0] = { ...broken.clues[0], evidenceId: "evidence_missing" };
    broken.clues[1] = { ...broken.clues[1], id: broken.clues[2].id };
    const report = validateCase(broken);
    const codes = report.errors.map((error) => error.code);
    expect(codes).toContain("broken_evidence_link");
    expect(codes).toContain("duplicate_clue_id");
  });

  it("warns when a clue gives away the final answer", () => {
    const leaky = dummyCase();
    leaky.clues[0] = {
      ...leaky.clues[0],
      prompt: "This one involves Placeholder Final Answer somehow.",
    };
    const report = validateCase(leaky);
    expect(report.warnings.map((warning) => warning.code)).toContain(
      "clue_gives_away_answer",
    );
  });

  it("warns when a clue's answer IS the final answer", () => {
    const leaky = dummyCase();
    leaky.clues[0] = {
      ...leaky.clues[0],
      answer: { primary: "Placeholder Final Answer", aliases: [] },
    };
    const report = validateCase(leaky);
    expect(report.warnings.map((warning) => warning.code)).toContain(
      "clue_answer_is_final_answer",
    );
  });

  it("warns when non-conclusive evidence contains the final answer", () => {
    const leaky = dummyCase();
    leaky.evidence[0] = {
      ...leaky.evidence[0],
      content: "placeholder final answer",
    };
    const report = validateCase(leaky);
    expect(report.warnings.map((warning) => warning.code)).toContain(
      "evidence_gives_away_answer",
    );
  });

  it("warns about missing diagnosticity coverage", () => {
    const flat = dummyCase();
    flat.evidence = flat.evidence.map((item) => ({
      ...item,
      diagnosticity: "medium" as const,
    }));
    const report = validateCase(flat);
    const codes = report.warnings.map((warning) => warning.code);
    expect(codes).toContain("no_low_diagnosticity");
    expect(codes).toContain("no_high_diagnosticity");
    expect(codes).toContain("no_conclusive_evidence");
  });

  it("warns when the entity does not match the final answer", () => {
    const mismatched = dummyCase();
    mismatched.entity = { ...mismatched.entity!, name: "Different Entity" };
    const report = validateCase(mismatched);
    expect(report.warnings.map((warning) => warning.code)).toContain(
      "entity_answer_mismatch",
    );
  });

  it("warns about duplicate clues and evidence", () => {
    const dupes = dummyCase();
    dupes.clues[1] = { ...dupes.clues[1], prompt: dupes.clues[0].prompt };
    dupes.evidence[1] = {
      ...dupes.evidence[1],
      content: dupes.evidence[0].content,
    };
    const report = validateCase(dupes);
    const codes = report.warnings.map((warning) => warning.code);
    expect(codes).toContain("duplicate_clues");
    expect(codes).toContain("duplicate_evidence");
  });
});
