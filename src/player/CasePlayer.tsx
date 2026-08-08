/**
 * CasePlayer (game v2) — the daily line-up investigation.
 *
 * One decision loop: study the exhibits, work the suspect board, then
 * FLIP another exhibit or ACCUSE. Renders only player-safe data; editorial
 * metadata appears solely in the final reveal.
 */
import { useReducer, useState } from "react";
import type { CaseData } from "../models/types";
import {
  createSession,
  gameReducer,
  MAX_MISSES,
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showHints, setShowHints] = useState(false);
  const [copied, setCopied] = useState(false);

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
  const selected = caseData.lineup.suspects.find(
    (suspect) => suspect.id === selectedId,
  );

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
          <span className="kicker kicker--dim">
            {caseData.category || "Daily case"}
          </span>
          <h1 className="display">{caseData.title || "Untitled Case"}</h1>
          <p className="case-question">
            {caseData.question || "Whose story is the evidence telling?"}
          </p>
          <p className="prose">
            {caseData.lineup.suspects.length} suspects.{" "}
            {totalExhibits} exhibits. Every exhibit truly connects to the
            answer — work out how, rule suspects out, and accuse as early as
            you dare. The first exhibit is free.
          </p>
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
  const justRevealed = session.lastRevealedEvidenceId
    ? revealedEvidence.find(
        (item) => item.id === session.lastRevealedEvidenceId,
      )
    : undefined;
  const revealedHints = caseData.hints.slice(0, session.hintsUsed);
  const canFlip = session.revealedCount < totalExhibits;

  return (
    <div className="shell">
      <div className="case-topbar">
        <span className="kicker">{caseNumber ?? "Case"}</span>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {session.misses.length > 0 ? (
            <span className="miss-meter" aria-label="misses">
              {Array.from({ length: MAX_MISSES }).map((_, index) => (
                <span
                  key={index}
                  className={index < session.misses.length ? "m m--used" : "m"}
                />
              ))}
            </span>
          ) : null}
          <button className="btn btn--ghost btn--small" onClick={onExit}>
            {exitLabel ?? "Exit"}
          </button>
        </div>
      </div>

      <header className="case-header">
        <h1>{caseData.title || "Untitled Case"}</h1>
        <p className="case-question">
          {caseData.question || "Whose story is the evidence telling?"}
        </p>
      </header>

      {/* EXHIBITS */}
      <section className="section">
        <div className="section-head">
          <span className="kicker kicker--dim">Exhibits</span>
          <span className="badge">
            {session.revealedCount} of {totalExhibits}
          </span>
        </div>
        {totalExhibits === 0 ? (
          <div className="empty-note">This case has no exhibits.</div>
        ) : (
          <div className="exhibit-stack">
            {revealedEvidence.map((item, index) => (
              <EvidenceCard
                key={item.id}
                evidence={item}
                index={index}
                style={{ animationDelay: `${Math.min(index * 60, 300)}ms` }}
              />
            ))}
            {canFlip ? (
              <button
                className="exhibit-next"
                onClick={() => act({ type: "FLIP_EXHIBIT" })}
              >
                <span className="exhibit-next-label">
                  Exhibit {romanNumeral(session.revealedCount + 1)}
                </span>
                <span className="exhibit-next-action">Flip it</span>
              </button>
            ) : null}
          </div>
        )}
      </section>

      {/* THE LINE-UP */}
      <section className="section">
        <div className="section-head">
          <span className="kicker kicker--dim">The line-up</span>
          <span className="badge">{remaining.length} remain</span>
        </div>
        <div className="suspect-grid">
          {caseData.lineup.suspects.map((suspect) => {
            const ruledOut =
              session.ruledOutIds.includes(suspect.id) ||
              session.misses.includes(suspect.id);
            const missed = session.misses.includes(suspect.id);
            const prime = session.primeSuspectId === suspect.id;
            const isSelected = selectedId === suspect.id;
            return (
              <button
                key={suspect.id}
                className={[
                  "suspect",
                  ruledOut ? "suspect--out" : "",
                  missed ? "suspect--missed" : "",
                  prime ? "suspect--prime" : "",
                  isSelected ? "suspect--selected" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() =>
                  setSelectedId(isSelected ? null : suspect.id)
                }
              >
                {prime ? <span className="prime-dot" aria-hidden /> : null}
                <span className="suspect-label">{suspect.label}</span>
                {missed ? <span className="suspect-note">accused</span> : null}
              </button>
            );
          })}
        </div>

        {/* selected suspect action bar */}
        {selected ? (
          <div className="suspect-actions">
            <span className="suspect-actions-name">{selected.label}</span>
            <div className="suspect-actions-buttons">
              {!session.misses.includes(selected.id) ? (
                <button
                  className="btn btn--small"
                  onClick={() => {
                    act({ type: "TOGGLE_RULE_OUT", suspectId: selected.id });
                    setSelectedId(null);
                  }}
                >
                  {session.ruledOutIds.includes(selected.id)
                    ? "Restore"
                    : "Rule out"}
                </button>
              ) : null}
              {!session.ruledOutIds.includes(selected.id) &&
              !session.misses.includes(selected.id) ? (
                <>
                  <button
                    className="btn btn--small"
                    onClick={() => {
                      act({ type: "SET_PRIME", suspectId: selected.id });
                      setSelectedId(null);
                    }}
                  >
                    {session.primeSuspectId === selected.id
                      ? "Unpin"
                      : "Prime suspect"}
                  </button>
                  <button
                    className="btn btn--small btn--accuse"
                    onClick={() => act({ type: "OPEN_ACCUSE" })}
                  >
                    Accuse…
                  </button>
                </>
              ) : null}
            </div>
          </div>
        ) : null}
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
          {caseData.hints.length > 0 ? (
            <button
              className="btn"
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
          <button
            className="btn btn--primary"
            onClick={() => act({ type: "OPEN_ACCUSE" })}
          >
            Accuse
          </button>
        </div>
      </div>

      {/* EXHIBIT_REVEALED interstitial */}
      {session.phase === "EXHIBIT_REVEALED" && justRevealed ? (
        <div
          className="overlay"
          onClick={() => act({ type: "CONTINUE_INVESTIGATION" })}
        >
          <div className="sheet" onClick={(event) => event.stopPropagation()}>
            <span className="kicker">
              Exhibit {romanNumeral(session.revealedCount)}
            </span>
            <div style={{ margin: "14px 0" }}>
              <EvidenceCard
                evidence={justRevealed}
                index={session.revealedCount - 1}
              />
            </div>
            <p className="prose">Who does this rule out?</p>
            <button
              className="btn btn--primary btn--block"
              onClick={() => act({ type: "CONTINUE_INVESTIGATION" })}
            >
              Work the board
            </button>
          </div>
        </div>
      ) : null}

      {/* ACCUSING overlay */}
      {session.phase === "ACCUSING" ? (
        <div className="overlay" onClick={() => act({ type: "CANCEL_ACCUSE" })}>
          <div className="sheet" onClick={(event) => event.stopPropagation()}>
            <span className="kicker">Make an accusation</span>
            <h2>
              {caseData.question || "Whose story is the evidence telling?"}
            </h2>
            <p className="prose">
              Accusing on Exhibit {romanNumeral(Math.max(session.revealedCount, 1))}.
              A wrong accusation is a strike — {MAX_MISSES - session.misses.length}{" "}
              left.
            </p>
            <div className="accuse-list">
              {remaining.map((suspect) => (
                <button
                  key={suspect.id}
                  className="accuse-option"
                  onClick={() => act({ type: "ACCUSE", suspectId: suspect.id })}
                >
                  {suspect.label}
                  {session.primeSuspectId === suspect.id ? (
                    <span className="accuse-prime">prime</span>
                  ) : null}
                </button>
              ))}
            </div>
            <button
              className="btn btn--ghost btn--block"
              style={{ marginTop: 10 }}
              onClick={() => act({ type: "CANCEL_ACCUSE" })}
            >
              Keep investigating
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
