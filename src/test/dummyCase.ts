/**
 * A purely structural dummy case for automated tests (game v2).
 *
 * Deliberately contains NO real Cultural Mystery content — placeholder
 * strings only. It exists to prove the infrastructure works end to end
 * without fabricating an actual mystery.
 */
import type { CaseData } from "../models/types";
import { parseCase } from "../data/schema";

export const DUMMY_CASE_JSON = {
  id: "case_structural_test",
  version: 2,
  title: "Structural Test Case",
  question: "Placeholder mystery question?",
  answer: {
    primary: "Suspect One",
    aliases: ["suspect one"],
  },
  type: "other",
  category: "test",
  entityId: "placeholder_entity",
  entity: {
    id: "placeholder_entity",
    name: "Suspect One",
    type: "other",
    recognition: "broad",
    longevity: "high",
    connectionDensity: "high",
    eras: ["placeholder era"],
    domains: ["placeholder domain a", "placeholder domain b"],
  },
  lineup: {
    answerSuspectId: "s1",
    suspects: [
      { id: "s1", label: "Suspect One", whyPlausible: "The answer.", eliminatedBy: [] },
      { id: "s2", label: "Suspect Two", whyPlausible: "Placeholder decoy two.", eliminatedBy: ["ev_1"] },
      { id: "s3", label: "Suspect Three", whyPlausible: "Placeholder decoy three.", eliminatedBy: ["ev_2"] },
      { id: "s4", label: "Suspect Four", whyPlausible: "Placeholder decoy four.", eliminatedBy: ["ev_2"] },
      { id: "s5", label: "Suspect Five", whyPlausible: "Placeholder decoy five.", eliminatedBy: ["ev_3"] },
      { id: "s6", label: "Suspect Six", whyPlausible: "Placeholder decoy six.", eliminatedBy: ["ev_3"] }
    ],
  },
  clues: [],
  evidence: [
    {
      id: "ev_1",
      type: "text",
      content: "Placeholder exhibit one",
      caption: null,
      diagnosticity: "low",
      relatedEntities: ["placeholder_entity"],
      authorNotes: { meaning: "Placeholder meaning one." },
    },
    {
      id: "ev_2",
      type: "number",
      content: "1234",
      caption: null,
      diagnosticity: "high",
      relatedEntities: ["placeholder_entity"],
      authorNotes: { meaning: "Placeholder meaning two." },
    },
    {
      id: "ev_3",
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
      startingPoint: "Placeholder start A",
      nodes: ["ev_1", "ev_2"],
      target: "Suspect One",
    },
    {
      id: "path_b",
      name: "Placeholder route B",
      startingPoint: "Placeholder start B",
      nodes: ["ev_3"],
      target: "Suspect One",
    },
  ],
  hints: [
    { id: "hint_1", text: "Placeholder investigative hint one." },
    { id: "hint_2", text: "Placeholder investigative hint two." },
  ],
  reveal: {
    summary: "Placeholder answer explanation.",
    clueExplanations: [],
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
        clueId: null,
      },
      {
        id: "entry_2",
        domain: "placeholder domain b",
        description: "Placeholder entry point two",
        clueId: null,
      },
    ],
    hypotheses: [],
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
