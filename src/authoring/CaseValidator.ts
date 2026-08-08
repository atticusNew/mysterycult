/**
 * CaseValidator — automated editorial + structural review of a case
 * (spec §34, prompt §7).
 *
 * Structural corruption (broken references, duplicate ids) is an ERROR.
 * Editorial quality issues are WARNINGS: they are surfaced in the workshop
 * but never block saving, previewing or exporting a draft.
 */
import type { CaseData } from "../models/types";
import { normalizeAnswer } from "../game/AnswerEngine";

export type IssueLevel = "error" | "warning";

export interface ValidationIssue {
  level: IssueLevel;
  code: string;
  section:
    | "case"
    | "entity"
    | "entry_points"
    | "clues"
    | "evidence"
    | "hypotheses"
    | "paths"
    | "hints"
    | "reveal";
  message: string;
}

export interface ValidationReport {
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  issues: ValidationIssue[];
}

function issue(
  level: IssueLevel,
  code: string,
  section: ValidationIssue["section"],
  message: string,
): ValidationIssue {
  return { level, code, section, message };
}

/** True when `text` contains the final answer (normalized, whole-phrase). */
function containsAnswer(text: string, answerPrimary: string): boolean {
  const answer = normalizeAnswer(answerPrimary);
  if (!answer || answer.length < 3) return false;
  const haystack = ` ${normalizeAnswer(text)} `;
  return haystack.includes(` ${answer} `);
}

export function validateCase(caseData: CaseData): ValidationReport {
  const issues: ValidationIssue[] = [];
  const answerPrimary = caseData.answer.primary.trim();

  // -------------------------------------------------------------------
  // STRUCTURAL ERRORS
  // -------------------------------------------------------------------
  if (!caseData.id.trim()) {
    issues.push(issue("error", "missing_case_id", "case", "The case has no id."));
  }

  const clueIdCounts = new Map<string, number>();
  caseData.clues.forEach((clue) =>
    clueIdCounts.set(clue.id, (clueIdCounts.get(clue.id) ?? 0) + 1),
  );
  clueIdCounts.forEach((count, id) => {
    if (count > 1) {
      issues.push(
        issue("error", "duplicate_clue_id", "clues", `Duplicate clue id "${id}".`),
      );
    }
  });

  const evidenceIdCounts = new Map<string, number>();
  caseData.evidence.forEach((item) =>
    evidenceIdCounts.set(item.id, (evidenceIdCounts.get(item.id) ?? 0) + 1),
  );
  evidenceIdCounts.forEach((count, id) => {
    if (count > 1) {
      issues.push(
        issue(
          "error",
          "duplicate_evidence_id",
          "evidence",
          `Duplicate evidence id "${id}".`,
        ),
      );
    }
  });

  const evidenceIds = new Set(caseData.evidence.map((item) => item.id));
  caseData.clues.forEach((clue, index) => {
    if (clue.evidenceId && !evidenceIds.has(clue.evidenceId)) {
      issues.push(
        issue(
          "error",
          "broken_evidence_link",
          "clues",
          `Clue ${index + 1} links to evidence "${clue.evidenceId}" which does not exist.`,
        ),
      );
    }
  });

  const knownNodeIds = new Set([
    ...caseData.clues.map((clue) => clue.id),
    ...caseData.evidence.map((item) => item.id),
  ]);
  caseData.investigationPaths.forEach((path, index) => {
    path.nodes.forEach((node) => {
      if (!knownNodeIds.has(node)) {
        issues.push(
          issue(
            "error",
            "broken_path_node",
            "paths",
            `Investigation path ${index + 1} references unknown clue/evidence id "${node}".`,
          ),
        );
      }
    });
  });

  // -------------------------------------------------------------------
  // EDITORIAL WARNINGS — CASE
  // -------------------------------------------------------------------
  if (!answerPrimary) {
    issues.push(
      issue("warning", "missing_final_answer", "case", "The final answer is missing."),
    );
  }
  if (answerPrimary && caseData.answer.aliases.length === 0) {
    issues.push(
      issue(
        "warning",
        "missing_answer_aliases",
        "case",
        "The final answer has no accepted aliases. Players typing a reasonable variant will be marked wrong.",
      ),
    );
  }
  if (!caseData.question.trim()) {
    issues.push(
      issue(
        "warning",
        "missing_question",
        "case",
        "The mystery question is missing (e.g. \"What are we looking for?\").",
      ),
    );
  }
  if (!caseData.title.trim()) {
    issues.push(issue("warning", "missing_title", "case", "The case has no title."));
  }
  if (!caseData.type.trim()) {
    issues.push(
      issue("warning", "missing_case_type", "case", "The case type is not set."),
    );
  }

  // -------------------------------------------------------------------
  // EDITORIAL WARNINGS — CULTURAL ENTITY
  // -------------------------------------------------------------------
  if (answerPrimary) {
    const entityName = caseData.entity?.name?.trim() ?? "";
    if (!caseData.entity || !entityName) {
      issues.push(
        issue(
          "warning",
          "answer_not_in_entity",
          "entity",
          "The final answer is not represented in the cultural entity data. Fill in the Cultural Entity section.",
        ),
      );
    } else if (
      normalizeAnswer(entityName) !== normalizeAnswer(answerPrimary) &&
      !caseData.answer.aliases.some(
        (alias) => normalizeAnswer(alias) === normalizeAnswer(entityName),
      )
    ) {
      issues.push(
        issue(
          "warning",
          "entity_answer_mismatch",
          "entity",
          `The cultural entity ("${entityName}") does not match the final answer ("${answerPrimary}").`,
        ),
      );
    }
  }

  // -------------------------------------------------------------------
  // EDITORIAL WARNINGS — ENTRY POINTS
  // -------------------------------------------------------------------
  const namedEntryPoints = caseData.editorial.entryPoints.filter(
    (entry) => entry.domain.trim() || entry.description.trim(),
  );
  if (namedEntryPoints.length < 2) {
    issues.push(
      issue(
        "warning",
        "too_few_entry_points",
        "entry_points",
        `Only ${namedEntryPoints.length} entry point(s) documented. A strong case has at least 2–3 independent cultural doorways.`,
      ),
    );
  }

  // -------------------------------------------------------------------
  // EDITORIAL WARNINGS — CLUES
  // -------------------------------------------------------------------
  if (caseData.clues.length === 0) {
    issues.push(issue("warning", "no_clues", "clues", "The case has no clues."));
  }

  const promptCounts = new Map<string, number>();
  caseData.clues.forEach((clue, index) => {
    const label = `Clue ${index + 1}`;
    if (!clue.prompt.trim()) {
      issues.push(
        issue("warning", "missing_clue_prompt", "clues", `${label} has no clue text.`),
      );
    }
    if (!clue.answer.primary.trim()) {
      issues.push(
        issue("warning", "missing_clue_answer", "clues", `${label} has no answer.`),
      );
    }
    if (clue.answer.primary.trim() && clue.answer.aliases.length === 0) {
      issues.push(
        issue(
          "warning",
          "missing_clue_aliases",
          "clues",
          `${label} has no accepted aliases for its answer.`,
        ),
      );
    }
    if (!clue.evidenceId) {
      issues.push(
        issue(
          "warning",
          "clue_without_evidence",
          "clues",
          `${label} unlocks no evidence. Solving it will feel unrewarding.`,
        ),
      );
    }
    if (answerPrimary && containsAnswer(clue.prompt, answerPrimary)) {
      issues.push(
        issue(
          "warning",
          "clue_gives_away_answer",
          "clues",
          `${label}'s text contains the final answer.`,
        ),
      );
    }
    if (
      answerPrimary &&
      clue.answer.primary.trim() &&
      normalizeAnswer(clue.answer.primary) === normalizeAnswer(answerPrimary)
    ) {
      issues.push(
        issue(
          "warning",
          "clue_answer_is_final_answer",
          "clues",
          `${label}'s answer IS the final answer — it gives the case away.`,
        ),
      );
    }
    const promptKey = normalizeAnswer(clue.prompt);
    if (promptKey) {
      promptCounts.set(promptKey, (promptCounts.get(promptKey) ?? 0) + 1);
    }
  });
  promptCounts.forEach((count) => {
    if (count > 1) {
      issues.push(
        issue(
          "warning",
          "duplicate_clues",
          "clues",
          "Two or more clues have identical text.",
        ),
      );
    }
  });

  // -------------------------------------------------------------------
  // EDITORIAL WARNINGS — EVIDENCE
  // -------------------------------------------------------------------
  if (caseData.evidence.length === 0) {
    issues.push(
      issue("warning", "no_evidence", "evidence", "The case has no evidence."),
    );
  }

  const linkedEvidenceIds = new Set(
    caseData.clues.map((clue) => clue.evidenceId).filter(Boolean),
  );
  const contentCounts = new Map<string, number>();
  caseData.evidence.forEach((item, index) => {
    const label = `Evidence ${index + 1}`;
    if (!item.content.trim()) {
      issues.push(
        issue("warning", "missing_evidence_content", "evidence", `${label} has no content.`),
      );
    }
    if (!linkedEvidenceIds.has(item.id)) {
      issues.push(
        issue(
          "warning",
          "orphan_evidence",
          "evidence",
          `${label} is not unlocked by any clue — the player can never see it.`,
        ),
      );
    }
    if (
      item.relatedEntities.length === 0 &&
      !(item.authorNotes.meaning ?? "").trim()
    ) {
      issues.push(
        issue(
          "warning",
          "undocumented_evidence",
          "evidence",
          `${label} has no documented relationship (no related entities and no "why it matters" note).`,
        ),
      );
    }
    if (
      answerPrimary &&
      item.diagnosticity !== "conclusive" &&
      containsAnswer(item.content, answerPrimary)
    ) {
      issues.push(
        issue(
          "warning",
          "evidence_gives_away_answer",
          "evidence",
          `${label} contains the final answer but is not marked CONCLUSIVE — it may give the case away too early.`,
        ),
      );
    }
    const contentKey = normalizeAnswer(item.content);
    if (contentKey) {
      contentCounts.set(contentKey, (contentCounts.get(contentKey) ?? 0) + 1);
    }
  });
  contentCounts.forEach((count) => {
    if (count > 1) {
      issues.push(
        issue(
          "warning",
          "duplicate_evidence",
          "evidence",
          "Two or more evidence items have identical content.",
        ),
      );
    }
  });

  // Diagnosticity progression (spec §13): a case needs ambiguity early and
  // certainty late.
  if (caseData.evidence.length > 0) {
    const levels = new Set(caseData.evidence.map((item) => item.diagnosticity));
    if (!levels.has("low")) {
      issues.push(
        issue(
          "warning",
          "no_low_diagnosticity",
          "evidence",
          "No LOW-diagnosticity evidence. Early evidence should be interesting but ambiguous.",
        ),
      );
    }
    if (!levels.has("high")) {
      issues.push(
        issue(
          "warning",
          "no_high_diagnosticity",
          "evidence",
          "No HIGH-diagnosticity evidence. Late evidence should strongly point toward the answer.",
        ),
      );
    }
    if (!levels.has("conclusive")) {
      issues.push(
        issue(
          "warning",
          "no_conclusive_evidence",
          "evidence",
          "No CONCLUSIVE evidence. The case needs at least one piece that makes the answer undeniable.",
        ),
      );
    }
  }

  // -------------------------------------------------------------------
  // EDITORIAL WARNINGS — INVESTIGATION PATHS
  // -------------------------------------------------------------------
  if (caseData.investigationPaths.length <= 1) {
    issues.push(
      issue(
        "warning",
        "single_investigation_path",
        "paths",
        caseData.investigationPaths.length === 0
          ? "No investigation paths documented. Document at least two legitimate routes to the answer."
          : "Only one investigation path documented. A strong case supports multiple legitimate routes.",
      ),
    );
  }

  // -------------------------------------------------------------------
  // EDITORIAL WARNINGS — HINTS & REVEAL
  // -------------------------------------------------------------------
  if (caseData.hints.filter((hint) => hint.text.trim()).length === 0) {
    issues.push(
      issue(
        "warning",
        "no_hints",
        "hints",
        "No hints written. Players who stall will have nowhere to go.",
      ),
    );
  }
  if (!caseData.reveal.summary.trim()) {
    issues.push(
      issue(
        "warning",
        "missing_reveal_summary",
        "reveal",
        "The reveal has no answer explanation. The reveal is the reward — write it.",
      ),
    );
  }
  if (
    caseData.clues.length > 0 &&
    caseData.reveal.clueExplanations.filter((item) => item.explanation.trim())
      .length === 0
  ) {
    issues.push(
      issue(
        "warning",
        "missing_clue_explanations",
        "reveal",
        "No clue → evidence explanations written for the reveal.",
      ),
    );
  }

  const errors = issues.filter((item) => item.level === "error");
  const warnings = issues.filter((item) => item.level === "warning");
  return { errors, warnings, issues };
}
