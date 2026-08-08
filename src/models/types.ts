/**
 * Core data models for Cultural Mystery.
 *
 * The most important architectural distinction (spec §11):
 * - A CLUE is something the player solves.
 * - EVIDENCE is what the player receives after solving the clue.
 * They are NOT necessarily the same thing, and the engine never explains
 * the relationship during gameplay. Relationship metadata lives in
 * `authorNotes` / `editorial` and is only surfaced in authoring and the reveal.
 */

/** Editorial diagnosticity of an evidence item (spec §13). Not a difficulty rating. */
export type Diagnosticity = "low" | "medium" | "high" | "conclusive";

export const DIAGNOSTICITY_VALUES: Diagnosticity[] = [
  "low",
  "medium",
  "high",
  "conclusive",
];

/** Where a clue sits in the intended progression of the case. */
export type ClueStage = "opening" | "middle" | "late" | "final";

export const CLUE_STAGE_VALUES: ClueStage[] = [
  "opening",
  "middle",
  "late",
  "final",
];

/**
 * Evidence types. The first prototype renders text / image / number / quote,
 * but the model supports the full future set (spec §25).
 */
export type EvidenceType =
  | "text"
  | "image"
  | "cropped_image"
  | "number"
  | "date"
  | "quote"
  | "location"
  | "object"
  | "logo"
  | "audio"
  | "video"
  | "color"
  | "symbol";

export const EVIDENCE_TYPE_VALUES: EvidenceType[] = [
  "text",
  "image",
  "cropped_image",
  "number",
  "date",
  "quote",
  "location",
  "object",
  "logo",
  "audio",
  "video",
  "color",
  "symbol",
];

/** Evidence types the player UI can currently render. */
export const SUPPORTED_EVIDENCE_TYPES: EvidenceType[] = [...EVIDENCE_TYPE_VALUES];

/** What kind of thing the final answer is (spec §9). */
export type CaseType =
  | "person"
  | "place"
  | "film"
  | "television"
  | "song"
  | "album"
  | "book"
  | "character"
  | "event"
  | "object"
  | "invention"
  | "brand"
  | "sporting_moment"
  | "cultural_moment"
  | "artwork"
  | "cultural_entity"
  | "other"
  | "";

export const CASE_TYPE_VALUES: CaseType[] = [
  "person",
  "place",
  "film",
  "television",
  "song",
  "album",
  "book",
  "character",
  "event",
  "object",
  "invention",
  "brand",
  "sporting_moment",
  "cultural_moment",
  "artwork",
  "cultural_entity",
  "other",
];

/** A canonical answer plus accepted aliases. */
export interface AnswerSpec {
  primary: string;
  aliases: string[];
}

/** Author-only notes attached to a clue. Never shown during gameplay. */
export interface ClueAuthorNotes {
  whyFair?: string;
  connection?: string;
}

export interface Clue {
  id: string;
  /** Clue presentation type. The prototype supports "text". */
  type: string;
  prompt: string;
  answer: AnswerSpec;
  /** Evidence unlocked when this clue is solved. */
  evidenceId: string | null;
  stage: ClueStage;
  authorNotes: ClueAuthorNotes;
}

/** Author-only notes attached to evidence. Never shown during gameplay. */
export interface EvidenceAuthorNotes {
  meaning?: string;
}

export interface Evidence {
  id: string;
  type: EvidenceType;
  /** Text content, number, quote text, or an image URL/path depending on type. */
  content: string;
  caption: string | null;
  /** Editorial only — hidden from the player (spec §43). */
  diagnosticity: Diagnosticity;
  /** Editorial only — entity ids this evidence relates to. */
  relatedEntities: string[];
  authorNotes: EvidenceAuthorNotes;
}

/** Editorial metadata about the cultural entity behind the answer (spec §31). */
export interface CulturalEntity {
  id: string;
  name: string;
  type: string;
  recognition: string;
  longevity: string;
  connectionDensity: string;
  eras: string[];
  domains: string[];
}

/**
 * A documented legitimate route through the case (spec §32).
 * Author-facing only; used to verify a case supports multiple approaches.
 */
export interface InvestigationPath {
  id: string;
  name: string;
  /** Free-text description of where this route begins (domain, clue, etc.). */
  startingPoint: string;
  /** Ordered clue/evidence ids forming the route. */
  nodes: string[];
  /** The answer this route converges on (normally the case answer). */
  target: string;
}

/** An authored entry point: a legitimate cultural doorway into the mystery (spec §15). */
export interface EntryPoint {
  id: string;
  domain: string;
  description: string;
  /** Optional clue this entry point maps to. */
  clueId: string | null;
}

/**
 * An authored plausible hypothesis (spec worksheet "HYPOTHESIS MAP").
 * This documents what a player might reasonably believe mid-case.
 * Distinct from the player's live Theory (see `Hypothesis`).
 */
export interface HypothesisNote {
  id: string;
  hypothesis: string;
  supportingEvidence: string;
  weakeningEvidence: string;
  resolution: string;
}

/** An investigative hint (spec §21) — improves reasoning, never leaks the answer. */
export interface Hint {
  id: string;
  text: string;
}

/** Per-clue reveal explanation: how the clue produced evidence, and why it mattered. */
export interface RevealClueExplanation {
  clueId: string;
  explanation: string;
}

/** The complete case reveal (spec §22). */
export interface RevealSpec {
  /** Final explanation of the answer. */
  summary: string;
  /** Clue → evidence explanations. */
  clueExplanations: RevealClueExplanation[];
  /** Evidence → answer explanation. */
  evidenceToAnswer: string;
  majorConnections: string[];
  alternatePaths: string[];
  /** The intended "OH!" moment. */
  ohMoment: string;
}

/** Author-only editorial block. Never exposed to the player. */
export interface CaseEditorial {
  entryPoints: EntryPoint[];
  hypotheses: HypothesisNote[];
  notes: string;
}

export interface CaseData {
  id: string;
  version: number;
  title: string;
  /** The mystery question, e.g. "What are we looking for?" */
  question: string;
  answer: AnswerSpec;
  type: CaseType | string;
  category: string;
  entityId: string | null;
  /** Embedded cultural entity metadata (editorial). */
  entity: CulturalEntity | null;
  clues: Clue[];
  evidence: Evidence[];
  investigationPaths: InvestigationPath[];
  hints: Hint[];
  reveal: RevealSpec;
  editorial: CaseEditorial;
}

// ---------------------------------------------------------------------------
// Player-side runtime models
// ---------------------------------------------------------------------------

/** A player theory recorded during an investigation (spec §18). */
export interface Hypothesis {
  id: string;
  text: string;
  createdAt: number;
  /** Set at case completion when the theory matched the final answer. */
  wasCorrect: boolean;
}

/** The outcome of committing to a final answer. */
export interface Solution {
  answerGiven: string;
  correct: boolean;
  submittedAt: number;
}
