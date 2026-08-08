/**
 * Full playthrough of the line-up game loop using the structural dummy
 * case: intro → free exhibit → rule-outs → prime suspect → wrong
 * accusation (case stays open) → correct accusation → reveal.
 */
import { describe, expect, it } from "vitest";
import { dummyCase } from "../test/dummyCase";
import {
  createSession,
  gameReducer,
  MAX_MISSES,
  type GameAction,
  type GameSession,
} from "./CaseEngine";
import { buildCaseReveal } from "./RevealEngine";
import { buildShareText, computeScore, SCORING } from "./ScoringEngine";

function run(session: GameSession, ...actions: GameAction[]): GameSession {
  const caseData = dummyCase();
  return actions.reduce(
    (state, action) => gameReducer(caseData, state, action),
    session,
  );
}

describe("CaseEngine line-up playthrough", () => {
  const caseData = dummyCase();

  it("starts in CASE_INTRO and flips the first exhibit free", () => {
    let session = createSession(caseData);
    expect(session.phase).toBe("CASE_INTRO");
    session = run(session, { type: "BEGIN_INVESTIGATION" });
    expect(session.phase).toBe("EXHIBIT_REVEALED");
    expect(session.revealedCount).toBe(1);
    expect(session.lastRevealedEvidenceId).toBe("ev_1");
  });

  it("flips exhibits in authored order and stops at the end", () => {
    let session = run(
      createSession(caseData),
      { type: "BEGIN_INVESTIGATION" },
      { type: "CONTINUE_INVESTIGATION" },
      { type: "FLIP_EXHIBIT" },
      { type: "CONTINUE_INVESTIGATION" },
      { type: "FLIP_EXHIBIT" },
      { type: "CONTINUE_INVESTIGATION" },
    );
    expect(session.revealedCount).toBe(3);
    const before = session;
    session = run(session, { type: "FLIP_EXHIBIT" });
    expect(session).toBe(before); // no more exhibits
  });

  it("rule-outs are free and reversible; misses are permanent", () => {
    let session = run(
      createSession(caseData),
      { type: "BEGIN_INVESTIGATION" },
      { type: "CONTINUE_INVESTIGATION" },
      { type: "TOGGLE_RULE_OUT", suspectId: "s2" },
    );
    expect(session.ruledOutIds).toEqual(["s2"]);
    session = run(session, { type: "TOGGLE_RULE_OUT", suspectId: "s2" });
    expect(session.ruledOutIds).toEqual([]);
  });

  it("marking a prime suspect records a theory", () => {
    let session = run(
      createSession(caseData),
      { type: "BEGIN_INVESTIGATION" },
      { type: "CONTINUE_INVESTIGATION" },
      { type: "SET_PRIME", suspectId: "s3" },
    );
    expect(session.primeSuspectId).toBe("s3");
    expect(session.theories.map((theory) => theory.text)).toEqual([
      "Suspect Three",
    ]);
    session = run(session, { type: "SET_PRIME", suspectId: "s1" });
    expect(session.theories.map((theory) => theory.text)).toEqual([
      "Suspect Three",
      "Suspect One",
    ]);
  });

  it("a wrong accusation strikes the suspect but keeps the case open", () => {
    let session = run(
      createSession(caseData),
      { type: "BEGIN_INVESTIGATION" },
      { type: "CONTINUE_INVESTIGATION" },
      { type: "OPEN_ACCUSE" },
      { type: "ACCUSE", suspectId: "s2" },
    );
    expect(session.phase).toBe("INVESTIGATING");
    expect(session.solved).toBe(false);
    expect(session.misses).toEqual(["s2"]);
    expect(session.ruledOutIds).toContain("s2");
    // Missed suspects can't be restored or accused again.
    const before = session;
    session = run(session, { type: "TOGGLE_RULE_OUT", suspectId: "s2" });
    expect(session).toBe(before);
  });

  it("three misses send the case cold", () => {
    let session = run(
      createSession(caseData),
      { type: "BEGIN_INVESTIGATION" },
      { type: "CONTINUE_INVESTIGATION" },
      { type: "OPEN_ACCUSE" },
      { type: "ACCUSE", suspectId: "s2" },
      { type: "OPEN_ACCUSE" },
      { type: "ACCUSE", suspectId: "s3" },
      { type: "OPEN_ACCUSE" },
      { type: "ACCUSE", suspectId: "s4" },
    );
    expect(session.misses).toHaveLength(MAX_MISSES);
    expect(session.phase).toBe("CASE_COLD");
    expect(session.solved).toBe(false);
    session = run(session, { type: "VIEW_REVEAL" });
    expect(session.phase).toBe("REVEAL");
  });

  it("the correct accusation closes the case and builds the reveal", () => {
    let session = run(
      createSession(caseData),
      { type: "BEGIN_INVESTIGATION" },
      { type: "CONTINUE_INVESTIGATION" },
      { type: "FLIP_EXHIBIT" },
      { type: "CONTINUE_INVESTIGATION" },
      { type: "SET_PRIME", suspectId: "s1" },
      { type: "OPEN_ACCUSE" },
      { type: "ACCUSE", suspectId: "s1" },
    );
    expect(session.phase).toBe("CASE_COMPLETE");
    expect(session.solved).toBe(true);
    expect(session.solvedOnExhibit).toBe(2);

    session = run(session, { type: "VIEW_REVEAL" });
    const reveal = buildCaseReveal(caseData, session);
    expect(reveal.finalAnswer).toBe("Suspect One");
    expect(reveal.exhibits).toHaveLength(3);
    expect(reveal.exhibits[0].seenByPlayer).toBe(true);
    expect(reveal.exhibits[2].seenByPlayer).toBe(false);
    // Intended eliminations surface in the reveal.
    expect(reveal.exhibits[0].eliminates).toContain("Suspect Two");
    expect(reveal.theories[reveal.theories.length - 1].wasCorrect).toBe(true);
  });

  it("hints reveal sequentially and are capped", () => {
    let session = run(
      createSession(caseData),
      { type: "BEGIN_INVESTIGATION" },
      { type: "CONTINUE_INVESTIGATION" },
      { type: "USE_HINT" },
      { type: "USE_HINT" },
      { type: "USE_HINT" },
    );
    expect(session.hintsUsed).toBe(2); // dummy case has 2 hints
  });

  it("scoring rewards early, clean solves", () => {
    const clean = run(
      createSession(caseData),
      { type: "BEGIN_INVESTIGATION" },
      { type: "CONTINUE_INVESTIGATION" },
      { type: "OPEN_ACCUSE" },
      { type: "ACCUSE", suspectId: "s1" },
    );
    expect(computeScore(clean).total).toBe(SCORING.base);

    const messy = run(
      createSession(caseData),
      { type: "BEGIN_INVESTIGATION" },
      { type: "CONTINUE_INVESTIGATION" },
      { type: "FLIP_EXHIBIT" },
      { type: "CONTINUE_INVESTIGATION" },
      { type: "USE_HINT" },
      { type: "OPEN_ACCUSE" },
      { type: "ACCUSE", suspectId: "s2" },
      { type: "OPEN_ACCUSE" },
      { type: "ACCUSE", suspectId: "s1" },
    );
    expect(computeScore(messy).total).toBe(
      SCORING.base -
        SCORING.perExtraExhibit -
        SCORING.perMiss -
        SCORING.perHint,
    );
  });

  it("share text is spoiler-free", () => {
    const session = run(
      createSession(caseData),
      { type: "BEGIN_INVESTIGATION" },
      { type: "CONTINUE_INVESTIGATION" },
      { type: "OPEN_ACCUSE" },
      { type: "ACCUSE", suspectId: "s1" },
    );
    const share = buildShareText(caseData, session);
    expect(share).toContain("Structural Test Case");
    expect(share).not.toContain("Suspect One");
    expect(share).toContain("Exhibit I");
  });
});
