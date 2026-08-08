/**
 * CasePlayer (game v3) — the daily line-up investigation.
 *
 * Two gestures only:
 *   1. Tap a suspect to cross them off (tap again to restore).
 *   2. ACCUSE → tap the suspect on the board → confirm. One accusation.
 * Exhibits live in a swipeable rail above the board; flipping the next one
 * happens from the dock and costs potential score.
 */
import { useEffect, useReducer, useRef, useState } from "react";
import type { CaseData } from "../models/types";
import {
  createSession,
  gameReducer,
  type GameAction,
} from "../game/CaseEngine";
import { unlockedPlayerEvidence } from "../game/EvidenceEngine";
import { buildCaseReveal } from "../game/RevealEngine";
import {
  buildShareText,
  resultLine,
  romanNumeral,
} from "../game/ScoringEngine";
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
  const [session, dispatch] = useReducer(
    (state: ReturnType<typeof createSession>, action: GameAction) =>
      gameReducer(caseData, state, action),
    caseData,
    createSession,
  );
  const [pendingAccuseId, setPendingAccuseId] = useState<string | null>(null);
  const [showHints, setShowHints] = useState(false);
  const [copied, setCopied] = useState(false);
  const railRef = useRef<HTMLDivElement>(null);

  const accusing = session.phase === "ACCUSING";
  const revealedEvidence = unlockedPlayerEvidence(
    caseData,
    caseData.evidence.slice(0, session.revealedCount).map((item) => item.id),
  );
  const totalExhibits = caseData.evidence.length;
  const remaining = caseData.lineup.suspects.filter(
    (suspect) =>
      !session.ruledOutIds.includes(suspect.id) &&
      !session.misses.includes(suspect.id),
  );
  const canFlip = session.revealedCount < totalExhibits;

  // Keep the newest exhibit in view.
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    rail.scrollTo({ left: rail.scrollWidth, behavior: "smooth" });
  }, [session.revealedCount]);

  function act(action: GameAction) {
    dispatch(action);
  }

  // ----------------------------------------------------------------- REVEAL
  if (session.phase === "REVEAL") {
    return (
      <CaseRevealView
        reveal={buildCaseReveal(caseData, session)}
        onExit={onExit}
        exitLabel={exitLabel}
        shareText={buildShareText(caseData, session)}
      />
    );
  }

  // ------------------------------------------------- COMPLETE / COLD screen
  if (session.phase === "CASE_COMPLETE" || session.phase === "CASE_COLD") {
    const reveal = buildCaseReveal(caseData, session);
    return (
      <div className="shell">
        <div className="fullpage">
          <span
            className={`verdict ${session.solved ? "verdict--solved" : "verdict--cold"}`}
          >
            {session.solved ? "Case closed" : "The case went cold"}
          </span>
          <h1 className="display">{reveal.finalAnswer}</h1>
          <p className="prose">{resultLine(session)}</p>
          <div className="result-tiles" aria-hidden>
            {Array.from({ length: totalExhibits }).map((_, index) => (
              <span
                key={index}
                className={`tile ${index < session.revealedCount ? "tile--used" : ""}`}
              />
            ))}
            {session.misses.map((id) => (
              <span key={id} className="tile tile--miss" />
            ))}
          </div>
          <button
            className="btn btn--primary btn--block"
            onClick={() => act({ type: "VIEW_REVEAL" })}
          >
            See how it fit together
          </button>
          <button
            className="btn btn--block"
            onClick={async () => {
              await navigator.clipboard?.writeText(
                buildShareText(caseData, session),
              );
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? "Copied" : "Share result"}
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
          <span className="kicker">{caseNumber ?? "Case"}</span>
          <button className="btn btn--ghost btn--small" onClick={onExit}>
            {exitLabel ?? "Exit"}
          </button>
        </div>
        <div className="fullpage">
          <span className="kicker kicker--dim">Daily case</span>
          <h1 className="display">{caseData.title || "Untitled Case"}</h1>
          <p className="case-question">
            {caseData.question || "Whose story is the evidence telling?"}
          </p>
          <ol className="howto">
            <li>
              <strong>Flip exhibits.</strong> Every one truly connects to the
              answer. The first is free; each flip costs score.
            </li>
            <li>
              <strong>Work the line-up.</strong> Tap suspects to cross off
              anyone the evidence rules out.
            </li>
            <li>
              <strong>Accuse — once.</strong> One accusation. Wrong, and the
              case goes cold.
            </li>
          </ol>
          <button
            className="btn btn--primary btn--block"
            onClick={() => act({ type: "BEGIN_INVESTIGATION" })}
          >
            Open the case
          </button>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------- MAIN BOARD
  const revealedHints = caseData.hints.slice(0, session.hintsUsed);
  const pendingSuspect = caseData.lineup.suspects.find(
    (suspect) => suspect.id === pendingAccuseId,
  );

  return (
    <div className="shell">
      <div className="case-topbar">
        <span className="kicker">{caseNumber ?? "Case"}</span>
        <button className="btn btn--ghost btn--small" onClick={onExit}>
          {exitLabel ?? "Exit"}
        </button>
      </div>

      <header className="case-header">
        <h1>{caseData.title || "Untitled Case"}</h1>
        <p className="case-question">
          {caseData.question || "Whose story is the evidence telling?"}
        </p>
      </header>

      {/* EXHIBIT RAIL */}
      <section className="section">
        <div className="section-head">
          <span className="kicker kicker--dim">Evidence</span>
          <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span className="badge">
              EXHIBIT {session.revealedCount ? romanNumeral(session.revealedCount) : "—"} OF{" "}
              {totalExhibits ? romanNumeral(totalExhibits) : "—"}
            </span>
            {session.revealedCount > 1 || (session.revealedCount === 1 && canFlip) ? (
              <span className="rail-nav">
                <button
                  aria-label="Previous exhibit"
                  onClick={() =>
                    railRef.current?.scrollBy({
                      left: -railRef.current.clientWidth * 0.85,
                      behavior: "smooth",
                    })
                  }
                >
                  ‹
                </button>
                <button
                  aria-label="Next exhibit"
                  onClick={() =>
                    railRef.current?.scrollBy({
                      left: railRef.current.clientWidth * 0.85,
                      behavior: "smooth",
                    })
                  }
                >
                  ›
                </button>
              </span>
            ) : null}
          </span>
        </div>
        {totalExhibits === 0 ? (
          <div className="empty-note">This case has no exhibits.</div>
        ) : (
          <div className="exhibit-rail" ref={railRef}>
            {revealedEvidence.map((item, index) => (
              <div className="rail-card" key={item.id}>
                <EvidenceCard evidence={item} index={index} />
              </div>
            ))}
            {canFlip ? (
              <button
                className="rail-card exhibit-next"
                onClick={() => act({ type: "FLIP_EXHIBIT" })}
                disabled={accusing}
              >
                <span className="exhibit-next-label">
                  Exhibit {romanNumeral(session.revealedCount + 1)}
                </span>
                <span className="exhibit-next-action">Flip</span>
              </button>
            ) : null}
          </div>
        )}
      </section>

      {/* THE LINE-UP */}
      <section className="section">
        <div className="section-head">
          <span className="kicker kicker--dim">The line-up</span>
          <span style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
            {caseData.hints.length > 0 ? (
              <button
                className="hint-link"
                disabled={showHints && session.hintsUsed >= caseData.hints.length}
                onClick={() => {
                  setShowHints(true);
                  if (session.hintsUsed < caseData.hints.length) {
                    act({ type: "USE_HINT" });
                  }
                }}
              >
                Hint ({caseData.hints.length - session.hintsUsed})
              </button>
            ) : null}
            <span className="badge">{remaining.length} REMAIN</span>
          </span>
        </div>

        {accusing ? (
          <div className="accuse-banner">
            <span>Tap the suspect you're accusing.</span>
            <button onClick={() => act({ type: "CANCEL_ACCUSE" })}>
              Cancel
            </button>
          </div>
        ) : (
          <p className="board-help">Tap a suspect to cross them off.</p>
        )}

        <div className={`suspect-grid${accusing ? " suspect-grid--accusing" : ""}`}>
          {caseData.lineup.suspects.map((suspect) => {
            const ruledOut =
              session.ruledOutIds.includes(suspect.id) ||
              session.misses.includes(suspect.id);
            return (
              <button
                key={suspect.id}
                className={[
                  "suspect",
                  ruledOut ? "suspect--out" : "",
                  accusing && !ruledOut ? "suspect--accusable" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                disabled={accusing && ruledOut}
                onClick={() => {
                  if (accusing) {
                    setPendingAccuseId(suspect.id);
                  } else {
                    act({ type: "TOGGLE_RULE_OUT", suspectId: suspect.id });
                  }
                }}
              >
                <span className="suspect-label">{suspect.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* hints */}
      {revealedHints.length > 0 && showHints ? (
        <section className="section">
          <span className="kicker kicker--dim">Hints</span>
          {revealedHints.map((hint) => (
            <div className="hint-note" key={hint.id}>
              {hint.text}
            </div>
          ))}
        </section>
      ) : null}

      {/* dock */}
      <div className="dock">
        <div className="dock-inner">
          {canFlip && !accusing ? (
            <button
              className="btn"
              onClick={() => act({ type: "FLIP_EXHIBIT" })}
            >
              Flip Exhibit {romanNumeral(session.revealedCount + 1)}
            </button>
          ) : null}
          {accusing ? (
            <button
              className="btn"
              onClick={() => act({ type: "CANCEL_ACCUSE" })}
            >
              Keep investigating
            </button>
          ) : (
            <button
              className="btn btn--accuse-solid"
              onClick={() => act({ type: "OPEN_ACCUSE" })}
            >
              Accuse
            </button>
          )}
        </div>
      </div>

      {/* accusation confirm */}
      {pendingSuspect ? (
        <div className="overlay" onClick={() => setPendingAccuseId(null)}>
          <div className="sheet" onClick={(event) => event.stopPropagation()}>
            <span className="kicker">Your one accusation</span>
            <h2>{pendingSuspect.label}</h2>
            <p className="prose">
              Accusing on Exhibit {romanNumeral(Math.max(session.revealedCount, 1))}.
              This is your only accusation — if you're wrong, the case goes
              cold.
            </p>
            <div className="answer-row" style={{ marginTop: 14 }}>
              <button
                className="btn"
                onClick={() => setPendingAccuseId(null)}
              >
                Not yet
              </button>
              <button
                className="btn btn--accuse-solid"
                onClick={() => {
                  act({ type: "ACCUSE", suspectId: pendingSuspect.id });
                  setPendingAccuseId(null);
                }}
              >
                Accuse {pendingSuspect.label}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
