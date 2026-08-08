/**
 * CaseValidator (game v2) — automated editorial + structural review of a
 * line-up case.
 *
 * Structural corruption (broken references, duplicate ids, an answer that
 * isn't on the board) is an ERROR. Editorial quality — suspect-funnel
 * shape, diagnosticity arc, giveaway leaks — is a WARNING: surfaced in the
 * workshop but never blocking saving, previewing or exporting.
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
    | "lineup"
    | "evidence"
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

/** True when `text` contains the answer label (normalized, whole-phrase). */
function containsAnswer(text: string, answerLabel: string): boolean {
  const answer = normalizeAnswer(answerLabel);
  if (!answer || answer.length < 3) return false;
  const haystack = ` ${normalizeAnswer(text)} `;
  return haystack.includes(` ${answer} `);
}

export function validateCase(caseData: CaseData): ValidationReport {
  const issues: ValidationIssue[] = [];
  const suspects = caseData.lineup.suspects;
  const answerSuspect = suspects.find(
    (suspect) => suspect.id === caseData.lineup.answerSuspectId,
  );
  const answerLabel =
    answerSuspect?.label.trim() || caseData.answer.primary.trim();

  // -------------------------------------------------------------------
  // STRUCTURAL ERRORS
  // -------------------------------------------------------------------
  if (!caseData.id.trim()) {
    issues.push(issue("error", "missing_case_id", "case", "The case has no id."));
  }

  const suspectIdCounts = new Map<string, number>();
  suspects.forEach((suspect) =>
    suspectIdCounts.set(
      suspect.id,
      (suspectIdCounts.get(suspect.id) ?? 0) + 1,
    ),
  );
  suspectIdCounts.forEach((count, id) => {
    if (count > 1) {
      issues.push(
        issue(
          "error",
          "duplicate_suspect_id",
          "lineup",
          `Duplicate suspect id "${id}".`,
        ),
      );
    }
  });

  if (
    caseData.lineup.answerSuspectId &&
    !suspects.some((suspect) => suspect.id === caseData.lineup.answerSuspectId)
  ) {
    issues.push(
      issue(
        "error",
        "answer_not_on_board",
        "lineup",
        "The answer suspect id does not match any suspect on the line-up.",
      ),
    );
  }

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
          `Duplicate exhibit id "${id}".`,
        ),
      );
    }
  });

  const evidenceIds = new Set(caseData.evidence.map((item) => item.id));
  suspects.forEach((suspect, index) => {
    suspect.eliminatedBy.forEach((evidenceId) => {
      if (!evidenceIds.has(evidenceId)) {
        issues.push(
          issue(
            "error",
            "broken_elimination_link",
            "lineup",
            `Suspect ${index + 1} ("${suspect.label || suspect.id}") is marked as eliminated by unknown exhibit "${evidenceId}".`,
          ),
        );
      }
    });
  });

  const knownNodeIds = new Set([
    ...caseData.evidence.map((item) => item.id),
    ...caseData.clues.map((clue) => clue.id),
    ...suspects.map((suspect) => suspect.id),
  ]);
  caseData.investigationPaths.forEach((path, index) => {
    path.nodes.forEach((node) => {
      if (!knownNodeIds.has(node)) {
        issues.push(
          issue(
            "error",
            "broken_path_node",
            "paths",
            `Investigation path ${index + 1} references unknown id "${node}".`,
          ),
        );
      }
    });
  });

  // -------------------------------------------------------------------
  // EDITORIAL WARNINGS — CASE
  // -------------------------------------------------------------------
  if (!caseData.lineup.answerSuspectId || !answerSuspect) {
    issues.push(
      issue(
        "warning",
        "missing_final_answer",
        "case",
        "No suspect is marked as the answer.",
      ),
    );
  }
  if (!caseData.question.trim()) {
    issues.push(
      issue(
        "warning",
        "missing_question",
        "case",
        'The mystery question is missing (e.g. "Whose story is the evidence telling?").',
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
  if (
    answerLabel &&
    caseData.category.trim() &&
    containsAnswer(caseData.category, answerLabel)
  ) {
    issues.push(
      issue(
        "warning",
        "category_gives_away_answer",
        "case",
        "The category contains the answer.",
      ),
    );
  }

  // -------------------------------------------------------------------
  // EDITORIAL WARNINGS — CULTURAL ENTITY
  // -------------------------------------------------------------------
  if (answerLabel) {
    const entityName = caseData.entity?.name?.trim() ?? "";
    if (!caseData.entity || !entityName) {
      issues.push(
        issue(
          "warning",
          "answer_not_in_entity",
          "entity",
          "The answer is not represented in the cultural entity data. Fill in the Cultural Entity section.",
        ),
      );
    } else if (
      normalizeAnswer(entityName) !== normalizeAnswer(answerLabel) &&
      !caseData.answer.aliases.some(
        (alias) => normalizeAnswer(alias) === normalizeAnswer(entityName),
      )
    ) {
      issues.push(
        issue(
          "warning",
          "entity_answer_mismatch",
          "entity",
          `The cultural entity ("${entityName}") does not match the answer ("${answerLabel}").`,
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
  // EDITORIAL WARNINGS — THE LINE-UP (suspect funnel)
  // -------------------------------------------------------------------
  if (suspects.length === 0) {
    issues.push(
      issue("warning", "no_suspects", "lineup", "The line-up has no suspects."),
    );
  } else {
    if (suspects.length < 6) {
      issues.push(
        issue(
          "warning",
          "too_few_suspects",
          "lineup",
          `Only ${suspects.length} suspect(s) on the board. Aim for 8–12 so the funnel has room to narrow.`,
        ),
      );
    }

    const labelCounts = new Map<string, number>();
    suspects.forEach((suspect, index) => {
      const label = suspect.label.trim();
      if (!label) {
        issues.push(
          issue(
            "warning",
            "missing_suspect_label",
            "lineup",
            `Suspect ${index + 1} has no name.`,
          ),
        );
        return;
      }
      const key = normalizeAnswer(label);
      labelCounts.set(key, (labelCounts.get(key) ?? 0) + 1);
    });
    labelCounts.forEach((count) => {
      if (count > 1) {
        issues.push(
          issue(
            "warning",
            "duplicate_suspects",
            "lineup",
            "Two or more suspects have the same name.",
          ),
        );
      }
    });

    suspects.forEach((suspect, index) => {
      if (suspect.id === caseData.lineup.answerSuspectId) {
        if (suspect.eliminatedBy.length > 0) {
          issues.push(
            issue(
              "warning",
              "answer_marked_eliminated",
              "lineup",
              `The answer ("${suspect.label}") is marked as eliminated by an exhibit — that contradicts the case.`,
            ),
          );
        }
        return;
      }
      if (!suspect.whyPlausible.trim()) {
        issues.push(
          issue(
            "warning",
            "undocumented_suspect",
            "lineup",
            `Suspect ${index + 1} ("${suspect.label || "unnamed"}") has no "why plausible" note. Decoys must be designed, not decorative.`,
          ),
        );
      }
      if (suspect.eliminatedBy.length === 0) {
        issues.push(
          issue(
            "warning",
            "unkillable_suspect",
            "lineup",
            `Suspect ${index + 1} ("${suspect.label || "unnamed"}") is never ruled out by any exhibit. Every decoy should die on specific evidence.`,
          ),
        );
      }
    });
  }

  // -------------------------------------------------------------------
  // EDITORIAL WARNINGS — EXHIBITS
  // -------------------------------------------------------------------
  if (caseData.evidence.length === 0) {
    issues.push(
      issue("warning", "no_evidence", "evidence", "The case has no exhibits."),
    );
  } else {
    if (caseData.evidence.length < 4) {
      issues.push(
        issue(
          "warning",
          "too_few_exhibits",
          "evidence",
          `Only ${caseData.evidence.length} exhibit(s). Aim for 5–8 so accusing early means something.`,
        ),
      );
    }

    const contentCounts = new Map<string, number>();
    caseData.evidence.forEach((item, index) => {
      const label = `Exhibit ${index + 1}`;
      if (!item.content.trim()) {
        issues.push(
          issue(
            "warning",
            "missing_evidence_content",
            "evidence",
            `${label} has no content.`,
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
        answerLabel &&
        item.diagnosticity !== "conclusive" &&
        containsAnswer(item.content, answerLabel)
      ) {
        issues.push(
          issue(
            "warning",
            "evidence_gives_away_answer",
            "evidence",
            `${label} contains the answer but is not marked CONCLUSIVE — it may give the case away too early.`,
          ),
        );
      }
      const suspectsKilled = suspects.filter((suspect) =>
        suspect.eliminatedBy.includes(item.id),
      ).length;
      if (suspects.length > 1 && suspectsKilled === 0) {
        issues.push(
          issue(
            "warning",
            "evidence_eliminates_nobody",
            "evidence",
            `${label} does no elimination work — no suspect is designed to die on it.`,
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
            "Two or more exhibits have identical content.",
          ),
        );
      }
    });

    // Diagnosticity arc: ambiguous open, undeniable close.
    const levels = new Set(caseData.evidence.map((item) => item.diagnosticity));
    if (!levels.has("low")) {
      issues.push(
        issue(
          "warning",
          "no_low_diagnosticity",
          "evidence",
          "No LOW-diagnosticity exhibit. The opening should be interesting but ambiguous.",
        ),
      );
    }
    if (!levels.has("high")) {
      issues.push(
        issue(
          "warning",
          "no_high_diagnosticity",
          "evidence",
          "No HIGH-diagnosticity exhibit. Late exhibits should strongly narrow the board.",
        ),
      );
    }
    if (!levels.has("conclusive")) {
      issues.push(
        issue(
          "warning",
          "no_conclusive_evidence",
          "evidence",
          "No CONCLUSIVE exhibit. The case needs a smoking gun.",
        ),
      );
    }

    const firstDiagnosticity = caseData.evidence[0].diagnosticity;
    if (firstDiagnosticity === "high" || firstDiagnosticity === "conclusive") {
      issues.push(
        issue(
          "warning",
          "opening_too_diagnostic",
          "evidence",
          "Exhibit 1 (the free one) is HIGH or CONCLUSIVE. The opening exhibit should keep the whole board alive.",
        ),
      );
    }
    caseData.evidence.forEach((item, index) => {
      if (
        item.diagnosticity === "conclusive" &&
        index < caseData.evidence.length - 1
      ) {
        issues.push(
          issue(
            "warning",
            "conclusive_too_early",
            "evidence",
            `Exhibit ${index + 1} is CONCLUSIVE but is not the final exhibit. Keep the smoking gun last.`,
          ),
        );
      }
    });
  }

  // -------------------------------------------------------------------
  // EDITORIAL WARNINGS — PATHS, HINTS, REVEAL
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
    caseData.evidence.length > 0 &&
    caseData.evidence.filter((item) => (item.authorNotes.meaning ?? "").trim())
      .length === 0
  ) {
    issues.push(
      issue(
        "warning",
        "missing_exhibit_meanings",
        "reveal",
        'No exhibit has a "why it matters" note — the reveal will have nothing to explain.',
      ),
    );
  }

  const errors = issues.filter((item) => item.level === "error");
  const warnings = issues.filter((item) => item.level === "warning");
  return { errors, warnings, issues };
}
