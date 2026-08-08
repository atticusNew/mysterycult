/**
 * A purely structural dummy case for automated tests.
 *
 * Deliberately contains NO real Cultural Mystery content — placeholder
 * strings only. It exists to prove the infrastructure works end to end
 * without fabricating an actual mystery.
 */
import type { CaseData } from "../models/types";
import { parseCase } from "../data/schema";

export const DUMMY_CASE_JSON = {
  id: "case_structural_test",
  version: 1,
  title: "Structural Test Case",
  question: "Placeholder mystery question?",
  answer: {
    primary: "Placeholder Final Answer",
    aliases: ["placeholder answer", "the placeholder final answer"],
  },
  type: "other",
  category: "test",
  entityId: "placeholder_entity",
  entity: {
    id: "placeholder_entity",
    name: "Placeholder Final Answer",
    type: "other",
    recognition: "broad",
    longevity: "high",
    connectionDensity: "high",
    eras: ["placeholder era"],
    domains: ["placeholder domain a", "placeholder domain b"],
  },
  clues: [
    {
      id: "clue_001",
      type: "text",
      prompt: "Placeholder clue prompt one.",
      answer: { primary: "Clue Answer One", aliases: ["answer one"] },
      evidenceId: "evidence_001",
      stage: "opening",
      authorNotes: { connection: "Placeholder connection note one." },
    },
    {
      id: "clue_002",
      type: "text",
      prompt: "Placeholder clue prompt two.",
      answer: { primary: "Clue Answer Two", aliases: ["answer two"] },
      evidenceId: "evidence_002",
      stage: "middle",
      authorNotes: { connection: "Placeholder connection note two." },
    },
    {
      id: "clue_003",
      type: "text",
      prompt: "Placeholder clue prompt three.",
      answer: { primary: "Clue Answer Three", aliases: [] },
      evidenceId: "evidence_003",
      stage: "final",
      authorNotes: {},
    },
  ],
  evidence: [
    {
      id: "evidence_001",
      type: "text",
      content: "Placeholder evidence one",
      caption: null,
      diagnosticity: "low",
      relatedEntities: ["placeholder_entity"],
      authorNotes: { meaning: "Placeholder meaning one." },
    },
    {
      id: "evidence_002",
      type: "number",
      content: "1234",
      caption: null,
      diagnosticity: "high",
      relatedEntities: ["placeholder_entity"],
      authorNotes: { meaning: "Placeholder meaning two." },
    },
    {
      id: "evidence_003",
      type: "quote",
      content: "Placeholder conclusive quote",
      caption: null,
      diagnosticity: "conclusive",
      relatedEntities: ["placeholder_entity"],
      authorNotes: { meaning: "Placeholder meaning three." },
    },
  ],
  investigationPaths: [
    {
      id: "path_a",
      name: "Placeholder route A",
      startingPoint: "clue_001",
      nodes: ["clue_001", "evidence_001"],
      target: "Placeholder Final Answer",
    },
    {
      id: "path_b",
      name: "Placeholder route B",
      startingPoint: "clue_002",
      nodes: ["clue_002", "evidence_002"],
      target: "Placeholder Final Answer",
    },
  ],
  hints: [
    { id: "hint_1", text: "Placeholder investigative hint one." },
    { id: "hint_2", text: "Placeholder investigative hint two." },
  ],
  reveal: {
    summary: "Placeholder answer explanation.",
    clueExplanations: [
      { clueId: "clue_001", explanation: "Placeholder clue-to-evidence one." },
      { clueId: "clue_002", explanation: "Placeholder clue-to-evidence two." },
    ],
    evidenceToAnswer: "Placeholder evidence-to-answer explanation.",
    majorConnections: ["Placeholder connection"],
    alternatePaths: ["Placeholder alternate path"],
    ohMoment: "Placeholder OH moment.",
  },
  editorial: {
    entryPoints: [
      {
        id: "entry_1",
        domain: "placeholder domain a",
        description: "Placeholder entry point one",
        clueId: "clue_001",
      },
      {
        id: "entry_2",
        domain: "placeholder domain b",
        description: "Placeholder entry point two",
        clueId: "clue_002",
      },
    ],
    hypotheses: [
      {
        id: "hypothesis_1",
        hypothesis: "Placeholder plausible hypothesis",
        supportingEvidence: "evidence_001",
        weakeningEvidence: "evidence_002",
        resolution: "Placeholder resolution",
      },
    ],
    notes: "Structural test case. Not a real mystery.",
  },
};

export function dummyCase(): CaseData {
  const { caseData, errors } = parseCase(DUMMY_CASE_JSON);
  if (!caseData || errors.length > 0) {
    throw new Error(`Dummy case failed to parse: ${errors.join(", ")}`);
  }
  return caseData;
}
