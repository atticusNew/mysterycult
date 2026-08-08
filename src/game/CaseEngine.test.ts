/**
 * Full playthrough of the game state machine using the structural dummy
 * case — proves the core loop works end-to-end without any real content:
 * intro → clue → evidence → theory → wrong final answer → continue →
 * correct final answer → CASE CLOSED → reveal.
 */
import { describe, expect, it } from "vitest";
import { dummyCase } from "../test/dummyCase";
import {
  createSession,
  gameReducer,
  type GameAction,
  type GameSession,
} from "./CaseEngine";
import { buildCaseReveal } from "./RevealEngine";
import { computeScore, SCORING } from "./ScoringEngine";

function run(session: GameSession, ...actions: GameAction[]): GameSession {
  const caseData = dummyCase();
  return actions.reduce(
    (state, action) => gameReducer(caseData, state, action),
    session,
  );
}

describe("CaseEngine full playthrough", () => {
  const caseData = dummyCase();

  it("starts in CASE_INTRO and activates the first clue", () => {
    let session = createSession(caseData);
    expect(session.phase).toBe("CASE_INTRO");
    session = run(session, { type: "BEGIN_INVESTIGATION" });
    expect(session.phase).toBe("CLUE_ACTIVE");
    expect(session.activeClueId).toBe("clue_001");
  });

  it("rejects a wrong clue answer and counts the attempt", () => {
    let session = run(createSession(caseData), { type: "BEGIN_INVESTIGATION" });
    session = run(session, { type: "SUBMIT_CLUE_ANSWER", answer: "nope" });
    expect(session.phase).toBe("CLUE_ACTIVE");
    expect(session.clueFeedback).toBe("incorrect");
    expect(session.clueProgress[0].wrongAttempts).toBe(1);
    expect(session.unlockedEvidenceIds).toHaveLength(0);
  });

  it("solving a clue unlocks its evidence (and only its evidence)", () => {
    let session = run(createSession(caseData), { type: "BEGIN_INVESTIGATION" });
    session = run(session, {
      type: "SUBMIT_CLUE_ANSWER",
      answer: "Clue Answer One",
    });
    expect(session.phase).toBe("CLUE_SOLVED");
    session = run(session, { type: "REVEAL_EVIDENCE" });
    expect(session.phase).toBe("EVIDENCE_REVEALED");
    expect(session.unlockedEvidenceIds).toEqual(["evidence_001"]);
    expect(session.lastUnlockedEvidenceId).toBe("evidence_001");
  });

  it("accepts clue answer aliases", () => {
    let session = run(createSession(caseData), { type: "BEGIN_INVESTIGATION" });
    session = run(session, { type: "SUBMIT_CLUE_ANSWER", answer: "answer one" });
    expect(session.phase).toBe("CLUE_SOLVED");
  });

  it("records and revises theories without ending the case", () => {
    let session = run(
      createSession(caseData),
      { type: "BEGIN_INVESTIGATION" },
      { type: "SUBMIT_CLUE_ANSWER", answer: "answer one" },
      { type: "REVEAL_EVIDENCE" },
      { type: "CONTINUE_INVESTIGATION" },
    );
    session = run(session, { type: "RECORD_THEORY", text: "First theory" });
    expect(session.phase).toBe("THEORY_CREATED");
    expect(session.theories).toHaveLength(1);
    session = run(session, { type: "RECORD_THEORY", text: "Second theory" });
    expect(session.theories).toHaveLength(2);
    // Repeating the current theory is a no-op.
    session = run(session, { type: "RECORD_THEORY", text: "second theory" });
    expect(session.theories).toHaveLength(2);
  });

  it("a wrong final answer does NOT destroy the case", () => {
    let session = run(
      createSession(caseData),
      { type: "BEGIN_INVESTIGATION" },
      { type: "SUBMIT_CLUE_ANSWER", answer: "answer one" },
      { type: "REVEAL_EVIDENCE" },
      { type: "CONTINUE_INVESTIGATION" },
      { type: "OPEN_SOLVE" },
      { type: "SUBMIT_FINAL_ANSWER", answer: "Wrong Guess" },
    );
    expect(session.phase).toBe("INVESTIGATING");
    expect(session.solved).toBe(false);
    expect(session.wrongFinalGuesses).toEqual(["Wrong Guess"]);
    // Player can keep investigating: next clue is available.
    session = run(session, { type: "ACTIVATE_CLUE", clueId: "clue_002" });
    expect(session.phase).toBe("CLUE_ACTIVE");
    expect(session.activeClueId).toBe("clue_002");
  });

  it("a clue can be set aside and returned to later", () => {
    let session = run(
      createSession(caseData),
      { type: "BEGIN_INVESTIGATION" },
      { type: "SET_ASIDE_CLUE" },
    );
    expect(session.phase).toBe("INVESTIGATING");
    expect(session.clueProgress[0].status).toBe("skipped");
    // Setting aside clue 1 unlocks clue 2.
    expect(session.clueProgress[1].status).toBe("available");
    session = run(session, { type: "ACTIVATE_CLUE", clueId: "clue_001" });
    expect(session.activeClueId).toBe("clue_001");
  });

  it("locked clues cannot be activated", () => {
    let session = run(createSession(caseData), { type: "BEGIN_INVESTIGATION" });
    expect(session.clueProgress[2].status).toBe("locked");
    const before = session;
    session = run(session, { type: "ACTIVATE_CLUE", clueId: "clue_003" });
    expect(session).toBe(before);
  });

  it("hints reveal sequentially and are capped", () => {
    let session = run(
      createSession(caseData),
      { type: "BEGIN_INVESTIGATION" },
      { type: "USE_HINT" },
      { type: "USE_HINT" },
      { type: "USE_HINT" },
    );
    expect(session.hintsUsed).toBe(2); // dummy case has 2 hints
  });

  it("the correct final answer completes the case and builds the reveal", () => {
    let session = run(
      createSession(caseData),
      { type: "BEGIN_INVESTIGATION" },
      { type: "SUBMIT_CLUE_ANSWER", answer: "answer one" },
      { type: "REVEAL_EVIDENCE" },
      { type: "CONTINUE_INVESTIGATION" },
      { type: "RECORD_THEORY", text: "placeholder final answer" },
      { type: "OPEN_SOLVE" },
      { type: "SUBMIT_FINAL_ANSWER", answer: "the placeholder final answer" },
    );
    expect(session.phase).toBe("CASE_COMPLETE");
    expect(session.solved).toBe(true);

    session = run(session, { type: "VIEW_REVEAL" });
    expect(session.phase).toBe("REVEAL");

    const reveal = buildCaseReveal(caseData, session);
    expect(reveal.finalAnswer).toBe("Placeholder Final Answer");
    expect(reveal.summary).toBe("Placeholder answer explanation.");
    expect(reveal.chain).toHaveLength(3);
    expect(reveal.chain[0].solvedByPlayer).toBe(true);
    expect(reveal.chain[0].evidence?.id).toBe("evidence_001");
    expect(reveal.chain[0].explanation).toBe(
      "Placeholder clue-to-evidence one.",
    );
    expect(reveal.theories[0].wasCorrect).toBe(true);
  });

  it("scoring deducts for mistakes, hints and evidence needed", () => {
    const session = run(
      createSession(caseData),
      { type: "BEGIN_INVESTIGATION" },
      { type: "SUBMIT_CLUE_ANSWER", answer: "wrong" },
      { type: "SUBMIT_CLUE_ANSWER", answer: "answer one" },
      { type: "REVEAL_EVIDENCE" },
      { type: "CONTINUE_INVESTIGATION" },
      { type: "USE_HINT" },
      { type: "OPEN_SOLVE" },
      { type: "SUBMIT_FINAL_ANSWER", answer: "wrong final" },
      { type: "OPEN_SOLVE" },
      { type: "SUBMIT_FINAL_ANSWER", answer: "Placeholder Final Answer" },
    );
    const score = computeScore(session);
    expect(score.total).toBe(
      SCORING.base -
        SCORING.wrongClueAnswer -
        SCORING.hintUsed -
        SCORING.wrongFinalGuess,
    );
  });
});
