/**
 * Case schema: structural validation + normalization.
 *
 * `parseCase` accepts unknown JSON and returns either a fully-normalized
 * CaseData (every field present with a sane default) or a list of structural
 * errors. Structural corruption is an ERROR; editorial quality issues are
 * handled separately by the CaseValidator as WARNINGS.
 */
import type {
  AnswerSpec,
  CaseData,
  CaseEditorial,
  Clue,
  ClueStage,
  CulturalEntity,
  Diagnosticity,
  EntryPoint,
  Evidence,
  EvidenceType,
  Hint,
  HypothesisNote,
  InvestigationPath,
  Lineup,
  RevealSpec,
  Suspect,
} from "../models/types";
import {
  CLUE_STAGE_VALUES,
  DIAGNOSTICITY_VALUES,
  EVIDENCE_TYPE_VALUES,
} from "../models/types";

export const CURRENT_CASE_VERSION = 2;

export interface ParseResult {
  caseData: CaseData | null;
  errors: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => asString(item)).filter((item) => item.length > 0);
}

function parseAnswerSpec(value: unknown): AnswerSpec {
  if (typeof value === "string") {
    return { primary: value, aliases: [] };
  }
  if (!isRecord(value)) return { primary: "", aliases: [] };
  return {
    primary: asString(value.primary),
    aliases: asStringArray(value.aliases),
  };
}

function parseClue(value: unknown, index: number, errors: string[]): Clue {
  if (!isRecord(value)) {
    errors.push(`Clue at position ${index + 1} is not an object.`);
    return {
      id: `clue_invalid_${index}`,
      type: "text",
      prompt: "",
      answer: { primary: "", aliases: [] },
      evidenceId: null,
      stage: "opening",
      authorNotes: {},
    };
  }
  const id = asString(value.id);
  if (!id) errors.push(`Clue at position ${index + 1} is missing an id.`);
  const stage = asString(value.stage, "opening");
  const notes = isRecord(value.authorNotes) ? value.authorNotes : {};
  return {
    id: id || `clue_${index + 1}`,
    type: asString(value.type, "text") || "text",
    prompt: asString(value.prompt),
    answer: parseAnswerSpec(value.answer),
    evidenceId: value.evidenceId == null ? null : asString(value.evidenceId) || null,
    stage: (CLUE_STAGE_VALUES.includes(stage as ClueStage)
      ? stage
      : "opening") as ClueStage,
    authorNotes: {
      whyFair: asString(notes.whyFair) || undefined,
      connection: asString(notes.connection) || undefined,
    },
  };
}

function parseEvidence(
  value: unknown,
  index: number,
  errors: string[],
): Evidence {
  if (!isRecord(value)) {
    errors.push(`Evidence at position ${index + 1} is not an object.`);
    return {
      id: `evidence_invalid_${index}`,
      type: "text",
      content: "",
      caption: null,
      diagnosticity: "low",
      relatedEntities: [],
      authorNotes: {},
    };
  }
  const id = asString(value.id);
  if (!id) errors.push(`Evidence at position ${index + 1} is missing an id.`);
  const type = asString(value.type, "text");
  const diagnosticity = asString(value.diagnosticity, "low");
  const notes = isRecord(value.authorNotes) ? value.authorNotes : {};
  return {
    id: id || `evidence_${index + 1}`,
    type: (EVIDENCE_TYPE_VALUES.includes(type as EvidenceType)
      ? type
      : "text") as EvidenceType,
    content: asString(value.content),
    caption: value.caption == null ? null : asString(value.caption) || null,
    diagnosticity: (DIAGNOSTICITY_VALUES.includes(
      diagnosticity as Diagnosticity,
    )
      ? diagnosticity
      : "low") as Diagnosticity,
    relatedEntities: asStringArray(value.relatedEntities),
    authorNotes: { meaning: asString(notes.meaning) || undefined },
  };
}

function parseSuspect(value: unknown, index: number): Suspect {
  const record = isRecord(value) ? value : {};
  return {
    id: asString(record.id) || `suspect_${index + 1}`,
    label: asString(record.label),
    whyPlausible: asString(record.whyPlausible),
    eliminatedBy: asStringArray(record.eliminatedBy),
  };
}

function parseLineup(value: unknown, errors: string[]): Lineup {
  const record = isRecord(value) ? value : {};
  const suspects = Array.isArray(record.suspects)
    ? record.suspects.map(parseSuspect)
    : [];
  const ids = new Set<string>();
  suspects.forEach((suspect) => {
    if (ids.has(suspect.id)) {
      errors.push(`Duplicate suspect id: ${suspect.id}`);
    }
    ids.add(suspect.id);
  });
  const answerSuspectId =
    record.answerSuspectId == null
      ? null
      : asString(record.answerSuspectId) || null;
  if (answerSuspectId && !ids.has(answerSuspectId)) {
    errors.push(
      `Line-up answer "${answerSuspectId}" is not one of the suspects.`,
    );
  }
  return { suspects, answerSuspectId };
}

function parseEntity(value: unknown): CulturalEntity | null {
  if (!isRecord(value)) return null;
  return {
    id: asString(value.id),
    name: asString(value.name),
    type: asString(value.type),
    recognition: asString(value.recognition),
    longevity: asString(value.longevity),
    connectionDensity: asString(value.connectionDensity),
    eras: asStringArray(value.eras),
    domains: asStringArray(value.domains),
  };
}

function parsePath(value: unknown, index: number): InvestigationPath {
  const record = isRecord(value) ? value : {};
  return {
    id: asString(record.id) || `path_${index + 1}`,
    name: asString(record.name),
    startingPoint: asString(record.startingPoint),
    nodes: asStringArray(record.nodes),
    target: asString(record.target),
  };
}

function parseHint(value: unknown, index: number): Hint {
  if (typeof value === "string") {
    return { id: `hint_${index + 1}`, text: value };
  }
  const record = isRecord(value) ? value : {};
  return {
    id: asString(record.id) || `hint_${index + 1}`,
    text: asString(record.text),
  };
}

function parseReveal(value: unknown): RevealSpec {
  const record = isRecord(value) ? value : {};
  const clueExplanations = Array.isArray(record.clueExplanations)
    ? record.clueExplanations
        .filter(isRecord)
        .map((item) => ({
          clueId: asString(item.clueId),
          explanation: asString(item.explanation),
        }))
    : [];
  return {
    summary: asString(record.summary),
    clueExplanations,
    evidenceToAnswer: asString(record.evidenceToAnswer),
    majorConnections: asStringArray(record.majorConnections),
    alternatePaths: asStringArray(record.alternatePaths),
    ohMoment: asString(record.ohMoment),
  };
}

function parseEntryPoint(value: unknown, index: number): EntryPoint {
  if (typeof value === "string") {
    return {
      id: `entry_${index + 1}`,
      domain: value,
      description: "",
      clueId: null,
    };
  }
  const record = isRecord(value) ? value : {};
  return {
    id: asString(record.id) || `entry_${index + 1}`,
    domain: asString(record.domain),
    description: asString(record.description),
    clueId: record.clueId == null ? null : asString(record.clueId) || null,
  };
}

function parseHypothesisNote(value: unknown, index: number): HypothesisNote {
  const record = isRecord(value) ? value : {};
  return {
    id: asString(record.id) || `hypothesis_${index + 1}`,
    hypothesis: asString(record.hypothesis),
    supportingEvidence: asString(record.supportingEvidence),
    weakeningEvidence: asString(record.weakeningEvidence),
    resolution: asString(record.resolution),
  };
}

function parseEditorial(value: unknown): CaseEditorial {
  const record = isRecord(value) ? value : {};
  const entryPoints = Array.isArray(record.entryPoints)
    ? record.entryPoints.map(parseEntryPoint)
    : [];
  const hypotheses = Array.isArray(record.hypotheses)
    ? record.hypotheses.map(parseHypothesisNote)
    : [];
  return {
    entryPoints,
    hypotheses,
    notes: asString(record.notes),
  };
}

/**
 * Parse and normalize unknown JSON into CaseData.
 * Returns structural errors; a case with errors should not be played.
 */
export function parseCase(raw: unknown): ParseResult {
  const errors: string[] = [];

  if (!isRecord(raw)) {
    return { caseData: null, errors: ["Case JSON must be an object."] };
  }

  const id = asString(raw.id);
  if (!id) errors.push("Case is missing an id.");

  const version =
    typeof raw.version === "number" && Number.isFinite(raw.version)
      ? raw.version
      : CURRENT_CASE_VERSION;
  if (version > CURRENT_CASE_VERSION) {
    errors.push(
      `Case version ${version} is newer than the supported version ${CURRENT_CASE_VERSION}.`,
    );
  }

  if (raw.clues !== undefined && !Array.isArray(raw.clues)) {
    errors.push("`clues` must be an array.");
  }
  if (raw.evidence !== undefined && !Array.isArray(raw.evidence)) {
    errors.push("`evidence` must be an array.");
  }

  const clues = Array.isArray(raw.clues)
    ? raw.clues.map((clue, index) => parseClue(clue, index, errors))
    : [];
  const evidence = Array.isArray(raw.evidence)
    ? raw.evidence.map((item, index) => parseEvidence(item, index, errors))
    : [];

  // Duplicate ids are structural corruption.
  const clueIds = new Set<string>();
  clues.forEach((clue) => {
    if (clueIds.has(clue.id)) errors.push(`Duplicate clue id: ${clue.id}`);
    clueIds.add(clue.id);
  });
  const evidenceIds = new Set<string>();
  evidence.forEach((item) => {
    if (evidenceIds.has(item.id)) {
      errors.push(`Duplicate evidence id: ${item.id}`);
    }
    evidenceIds.add(item.id);
  });

  // Broken references are structural corruption.
  clues.forEach((clue) => {
    if (clue.evidenceId && !evidenceIds.has(clue.evidenceId)) {
      errors.push(
        `Clue "${clue.id}" links to unknown evidence "${clue.evidenceId}".`,
      );
    }
  });

  const caseData: CaseData = {
    id: id || "case_untitled",
    version,
    title: asString(raw.title),
    question: asString(raw.question),
    answer: parseAnswerSpec(raw.answer),
    type: asString(raw.type),
    category: asString(raw.category),
    entityId: raw.entityId == null ? null : asString(raw.entityId) || null,
    entity: parseEntity(raw.entity),
    lineup: parseLineup(raw.lineup, errors),
    clues,
    evidence,
    investigationPaths: Array.isArray(raw.investigationPaths)
      ? raw.investigationPaths.map(parsePath)
      : [],
    hints: Array.isArray(raw.hints) ? raw.hints.map(parseHint) : [],
    reveal: parseReveal(raw.reveal),
    editorial: parseEditorial(raw.editorial),
  };

  return errors.length > 0
    ? { caseData, errors }
    : { caseData, errors: [] };
}
