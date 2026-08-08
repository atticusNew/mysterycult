/**
 * CasePlayer — the complete player experience for one case.
 *
 * Used by both the daily game (/play) and the Case Workshop's Preview mode.
 * It renders ONLY player-safe data: no diagnosticity, no author notes, no
 * related entities, no investigation paths (spec §43). Editorial metadata
 * appears only in the final reveal, via the RevealEngine.
 */
import { useMemo, useReducer, useState } from "react";
import type { CaseData } from "../models/types";
import {
  createSession,
  gameReducer,
  type GameAction,
} from "../game/CaseEngine";
import { orderedClues } from "../game/ClueEngine";
import { unlockedPlayerEvidence } from "../game/EvidenceEngine";
import { currentTheory } from "../game/HypothesisEngine";
import { buildCaseReveal } from "../game/RevealEngine";
import { computeScore } from "../game/ScoringEngine";
import EvidenceCard from "../components/EvidenceCard";
import CaseRevealView from "../components/CaseRevealView";

interface Props {
  caseData: CaseData;
  caseNumber?: string;
  onExit: () => void;
  exitLabel?: string;
}

export default function CasePlayer({
  caseData,
  caseNumber,
  onExit,
  exitLabel,
}: Props) {
  const [session, rawDispatch] = useReducer(
    (state: ReturnType<typeof createSession>, action: GameAction) =>
      gameReducer(caseData, state, action),
    caseData,
    createSession,
  );
  const dispatch = rawDispatch;

  const [clueInput, setClueInput] = useState("");
  const [theoryInput, setTheoryInput] = useState("");
  const [finalInput, setFinalInput] = useState("");
  const [showTheoryHistory, setShowTheoryHistory] = useState(false);
  const [showHints, setShowHints] = useState(false);

  const clues = useMemo(() => orderedClues(caseData), [caseData]);
  const unlockedEvidence = unlockedPlayerEvidence(
    caseData,
    session.unlockedEvidenceIds,
  );
  const activeClue = clues.find((clue) => clue.id === session.activeClueId);
  const theory = currentTheory(session.theories);
  const solvedCount = session.clueProgress.filter(
    (entry) => entry.status === "solved",
  ).length;

  // ----------------------------------------------------------------- REVEAL
  if (session.phase === "REVEAL") {
    return (
      <CaseRevealView
        reveal={buildCaseReveal(caseData, session)}
        onExit={onExit}
        exitLabel={exitLabel}
      />
    );
  }

  // ---------------------------------------------------------- CASE_COMPLETE
  if (session.phase === "CASE_COMPLETE") {
    const score = computeScore(session);
    return (
      <div className="shell">
        <div className="fullpage">
          <span className="stamp">Case Closed</span>
          <h1 className="display">{caseData.answer.primary}</h1>
          <p className="prose">
            Solved with {solvedCount} of {clues.length} clues,{" "}
            {session.unlockedEvidenceIds.length} pieces of evidence and{" "}
            {session.theories.length}{" "}
            {session.theories.length === 1 ? "theory" : "theories"}.
          </p>
          <div className="score-total" style={{ maxWidth: 280 }}>
            <span>Score</span>
            <span className="amt">{score.total}</span>
          </div>
          <button
            className="btn btn--primary btn--block"
            onClick={() => dispatch({ type: "VIEW_REVEAL" })}
          >
            View the full reveal
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------- CASE_INTRO
  if (session.phase === "CASE_INTRO") {
    return (
      <div className="shell">
        <div className="case-topbar">
          <span className="kicker">{caseNumber ?? "Case File"}</span>
          <button className="btn btn--ghost btn--small" onClick={onExit}>
            {exitLabel ?? "Exit"}
          </button>
        </div>
        <div className="fullpage">
          <span className="kicker kicker--dim">A cultural mystery</span>
          <h1 className="display">{caseData.title || "Untitled Case"}</h1>
          <p className="case-question">
            {caseData.question || "What are we looking for?"}
          </p>
          <p className="prose">
            Solve clues to unlock evidence. Work out why each piece matters.
            Record a theory, revise it as the picture changes — then close the
            case.
          </p>
          <button
            className="btn btn--primary btn--block"
            onClick={() => dispatch({ type: "BEGIN_INVESTIGATION" })}
          >
            Open the case file
          </button>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------- MAIN BOARD
  const justSolvedClue = clues.find(
    (clue) => clue.id === session.lastSolvedClueId,
  );
  const justUnlockedEvidence = session.lastUnlockedEvidenceId
    ? unlockedEvidence.find(
        (item) => item.id === session.lastUnlockedEvidenceId,
      )
    : undefined;
  const revealedHints = caseData.hints.slice(0, session.hintsUsed);

  return (
    <div className="shell">
      {/* header */}
      <div className="case-topbar">
        <span className="kicker">{caseNumber ?? "Case File"}</span>
        <button className="btn btn--ghost btn--small" onClick={onExit}>
          {exitLabel ?? "Exit"}
        </button>
      </div>
      <header className="case-header">
        <h1>{caseData.title || "Untitled Case"}</h1>
        <p className="case-question">
          {caseData.question || "What are we looking for?"}
        </p>
      </header>

      {/* final answer feedback (wrong guess keeps the case open) */}
      {session.finalFeedback === "incorrect" ? (
        <div className="feedback feedback--bad">
          That isn't it. The case remains open — keep investigating.
        </div>
      ) : null}

      {/* EVIDENCE */}
      <section className="section">
        <div className="section-head">
          <span className="kicker kicker--dim">Evidence</span>
          <span className="badge">
            {unlockedEvidence.length} / {caseData.evidence.length} UNLOCKED
          </span>
        </div>
        {caseData.evidence.length === 0 ? (
          <div className="evidence-locked" style={{ minHeight: 70 }}>
            NO EVIDENCE IN THIS CASE
          </div>
        ) : (
          <div className="evidence-grid">
            {unlockedEvidence.map((item, index) => (
              <EvidenceCard
                key={item.id}
                evidence={item}
                index={index}
                highlight={item.id === session.lastUnlockedEvidenceId}
                style={{ animationDelay: `${Math.min(index * 70, 400)}ms` }}
              />
            ))}
            {Array.from({
              length: caseData.evidence.length - unlockedEvidence.length,
            }).map((_, index) => (
              <div className="evidence-locked" key={`locked_${index}`}>
                <span className="redact" />
                <span className="redact" />
                <span className="redact" />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* YOUR THEORY */}
      <section className="section">
        <div className="section-head">
          <span className="kicker kicker--dim">Your theory</span>
          {session.theories.length > 1 ? (
            <button
              className="btn btn--ghost btn--small"
              onClick={() => setShowTheoryHistory((value) => !value)}
            >
              {showTheoryHistory ? "Hide history" : "History"}
            </button>
          ) : null}
        </div>
        <div className="theory-panel">
          <div className="theory-current">
            {theory ? (
              theory.text
            ) : (
              <span className="placeholder">No theory yet. What could it be?</span>
            )}
          </div>
          <form
            className="answer-row"
            onSubmit={(event) => {
              event.preventDefault();
              if (!theoryInput.trim()) return;
              dispatch({ type: "RECORD_THEORY", text: theoryInput });
              setTheoryInput("");
            }}
          >
            <input
              className="input"
              placeholder="I think this is…"
              value={theoryInput}
              onChange={(event) => setTheoryInput(event.target.value)}
            />
            <button className="btn" type="submit" disabled={!theoryInput.trim()}>
              {theory ? "Update" : "Record"}
            </button>
          </form>
          {showTheoryHistory && session.theories.length > 0 ? (
            <ul className="theory-history">
              {session.theories.map((entry, index) => (
                <li key={entry.id}>
                  <span className="n">{index + 1}.</span>
                  <span>{entry.text}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>

      {/* INVESTIGATION / CLUES */}
      <section className="section">
        <div className="section-head">
          <span className="kicker kicker--dim">Investigation</span>
          <span className="badge">
            {solvedCount} / {clues.length} CLUES SOLVED
          </span>
        </div>

        {clues.length === 0 ? (
          <div className="evidence-locked" style={{ minHeight: 70 }}>
            NO CLUES IN THIS CASE
          </div>
        ) : (
          <>
            <div className="clue-tabs">
              {clues.map((clue, index) => {
                const progress = session.clueProgress.find(
                  (entry) => entry.clueId === clue.id,
                );
                const status = progress?.status ?? "locked";
                const isActive = session.activeClueId === clue.id;
                const className = [
                  "clue-tab",
                  isActive ? "clue-tab--active" : "",
                  status === "solved" ? "clue-tab--solved" : "",
                  status === "locked" ? "clue-tab--locked" : "",
                ]
                  .filter(Boolean)
                  .join(" ");
                return (
                  <button
                    key={clue.id}
                    className={className}
                    disabled={status === "locked" || status === "solved"}
                    onClick={() =>
                      dispatch({ type: "ACTIVATE_CLUE", clueId: clue.id })
                    }
                  >
                    {status === "solved" ? "✓" : ""} CLUE {index + 1}
                  </button>
                );
              })}
            </div>

            {activeClue && session.phase === "CLUE_ACTIVE" ? (
              <div
                className={`clue-card${
                  session.clueFeedback === "incorrect" ? " clue-card--shake" : ""
                }`}
                key={`${activeClue.id}:${
                  session.clueProgress.find(
                    (entry) => entry.clueId === activeClue.id,
                  )?.wrongAttempts ?? 0
                }`}
              >
                <span className="kicker kicker--dim">
                  Clue {clues.indexOf(activeClue) + 1}
                </span>
                <p className="clue-prompt">{activeClue.prompt || "—"}</p>
                <form
                  className="answer-row"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (!clueInput.trim()) return;
                    dispatch({
                      type: "SUBMIT_CLUE_ANSWER",
                      answer: clueInput,
                    });
                    setClueInput("");
                  }}
                >
                  <input
                    className="input"
                    placeholder="Your answer"
                    value={clueInput}
                    onChange={(event) => setClueInput(event.target.value)}
                    autoFocus
                  />
                  <button
                    className="btn btn--primary"
                    type="submit"
                    disabled={!clueInput.trim()}
                  >
                    Submit
                  </button>
                </form>
                {session.clueFeedback === "incorrect" ? (
                  <div className="feedback feedback--bad">
                    Not quite. Look at it from another angle.
                  </div>
                ) : null}
                <div style={{ marginTop: 12 }}>
                  <button
                    className="btn btn--ghost btn--small"
                    onClick={() => dispatch({ type: "SET_ASIDE_CLUE" })}
                  >
                    Set this clue aside for now
                  </button>
                </div>
              </div>
            ) : session.phase === "INVESTIGATING" ||
              session.phase === "THEORY_CREATED" ? (
              <div className="clue-card">
                <p className="prose" style={{ margin: 0 }}>
                  {session.clueProgress.some(
                    (entry) =>
                      entry.status === "available" || entry.status === "skipped",
                  )
                    ? "Pick a clue above to keep investigating — or close the case if you know the answer."
                    : "Every clue is solved. Study the evidence, then close the case."}
                </p>
              </div>
            ) : null}
          </>
        )}
      </section>

      {/* revealed hints */}
      {revealedHints.length > 0 && showHints ? (
        <section className="section">
          <span className="kicker kicker--dim">Hints</span>
          {revealedHints.map((hint) => (
            <div className="feedback feedback--hint" key={hint.id}>
              {hint.text}
            </div>
          ))}
        </section>
      ) : null}

      {/* dock */}
      <div className="dock">
        <div className="dock-inner">
          <button
            className="btn"
            disabled={
              caseData.hints.length === 0 ||
              (showHints && session.hintsUsed >= caseData.hints.length)
            }
            onClick={() => {
              setShowHints(true);
              if (session.hintsUsed < caseData.hints.length) {
                dispatch({ type: "USE_HINT" });
              }
            }}
          >
            Hint
            {caseData.hints.length > 0
              ? ` (${caseData.hints.length - session.hintsUsed} left)`
              : ""}
          </button>
          <button
            className="btn btn--primary"
            onClick={() => dispatch({ type: "OPEN_SOLVE" })}
          >
            Solve case
          </button>
        </div>
      </div>

      {/* CLUE_SOLVED interstitial */}
      {session.phase === "CLUE_SOLVED" && justSolvedClue ? (
        <div className="overlay">
          <div className="sheet">
            <span className="kicker">Clue solved</span>
            <h2>{justSolvedClue.answer.primary}</h2>
            <p className="prose">
              {justSolvedClue.evidenceId &&
              !session.unlockedEvidenceIds.includes(justSolvedClue.evidenceId)
                ? "This unlocks a new piece of evidence."
                : "Correct."}
            </p>
            <button
              className="btn btn--primary btn--block"
              onClick={() => dispatch({ type: "REVEAL_EVIDENCE" })}
            >
              {justSolvedClue.evidenceId ? "Open the evidence" : "Continue"}
            </button>
          </div>
        </div>
      ) : null}

      {/* EVIDENCE_REVEALED interstitial */}
      {session.phase === "EVIDENCE_REVEALED" && justUnlockedEvidence ? (
        <div className="overlay">
          <div className="sheet">
            <span className="kicker">Evidence unlocked</span>
            <div style={{ margin: "14px 0" }}>
              <EvidenceCard
                evidence={justUnlockedEvidence}
                index={unlockedEvidence.length - 1}
                highlight
              />
            </div>
            <p className="prose">Why are you being shown this?</p>
            <button
              className="btn btn--primary btn--block"
              onClick={() => dispatch({ type: "CONTINUE_INVESTIGATION" })}
            >
              Add to the case file
            </button>
          </div>
        </div>
      ) : null}

      {/* SOLVING overlay */}
      {session.phase === "SOLVING" ? (
        <div className="overlay">
          <div className="sheet">
            <span className="kicker">Solve the case</span>
            <h2>{caseData.question || "What are we looking for?"}</h2>
            <p className="prose">
              Commit to a final answer. If you're wrong, the case stays open.
            </p>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (!finalInput.trim()) return;
                dispatch({ type: "SUBMIT_FINAL_ANSWER", answer: finalInput });
                setFinalInput("");
              }}
            >
              <input
                className="input"
                placeholder={theory ? theory.text : "Your final answer"}
                value={finalInput}
                onChange={(event) => setFinalInput(event.target.value)}
                autoFocus
              />
              <div className="answer-row" style={{ marginTop: 12 }}>
                <button
                  className="btn btn--ghost"
                  type="button"
                  onClick={() => dispatch({ type: "CANCEL_SOLVE" })}
                >
                  Keep investigating
                </button>
                <button
                  className="btn btn--primary"
                  type="submit"
                  disabled={!finalInput.trim()}
                >
                  Close the case
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
