/**
 * Blank-case factories for the Case Workshop.
 *
 * `blankCase()` produces a structurally valid, completely empty case —
 * deliberately containing no real Cultural Mystery content. The first real
 * case is authored by the game designer through the workshop.
 */
import template from "../data/cases/case_template.json";
import type {
  CaseData,
  EntryPoint,
  Evidence,
  Hint,
  InvestigationPath,
  Suspect,
} from "../models/types";
import { parseCase } from "../data/schema";

let uidCounter = 0;

export function uid(prefix: string): string {
  uidCounter += 1;
  return `${prefix}_${Date.now().toString(36)}${uidCounter.toString(36)}`;
}

/** A fresh, empty case draft based on the blank JSON template. */
export function blankCase(): CaseData {
  const { caseData } = parseCase(template);
  if (!caseData) {
    throw new Error("Blank case template failed to parse — this is a bug.");
  }
  return { ...caseData, id: uid("case") };
}

export function blankSuspect(): Suspect {
  return {
    id: uid("suspect"),
    label: "",
    whyPlausible: "",
    eliminatedBy: [],
  };
}

export function blankEvidence(): Evidence {
  return {
    id: uid("evidence"),
    type: "text",
    content: "",
    caption: null,
    diagnosticity: "low",
    relatedEntities: [],
    authorNotes: {},
  };
}

export function blankEntryPoint(): EntryPoint {
  return { id: uid("entry"), domain: "", description: "", clueId: null };
}

export function blankPath(): InvestigationPath {
  return { id: uid("path"), name: "", startingPoint: "", nodes: [], target: "" };
}

export function blankHint(): Hint {
  return { id: uid("hint"), text: "" };
}
