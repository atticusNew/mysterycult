/**
 * The full CASE CLOSED reveal (spec §22): answer, explanation, the
 * clue → evidence → answer chain, connections, alternate paths, the
 * player's theory history and the score breakdown.
 */
import type { CaseRevealView as RevealData } from "../game/RevealEngine";
import EvidenceCard from "./EvidenceCard";

interface Props {
  reveal: RevealData;
  onExit: () => void;
  exitLabel?: string;
}

export default function CaseRevealView({ reveal, onExit, exitLabel }: Props) {
  return (
    <div className="shell shell--flush">
      <div className="case-topbar">
        <span className="kicker">Case Reveal</span>
        <button className="btn btn--ghost btn--small" onClick={onExit}>
          {exitLabel ?? "Done"}
        </button>
      </div>

      <span className="stamp">Case Closed</span>
      <h1 className="display" style={{ marginTop: 18 }}>
        {reveal.finalAnswer || "—"}
      </h1>
      {reveal.summary ? (
        <p className="prose" style={{ fontSize: 16 }}>
          {reveal.summary}
        </p>
      ) : null}

      {reveal.ohMoment ? (
        <div className="section">
          <span className="kicker kicker--dim">The moment</span>
          <p
            className="case-question"
            style={{ marginTop: 8 }}
          >
            {reveal.ohMoment}
          </p>
        </div>
      ) : null}

      <div className="section">
        <div className="section-head">
          <span className="kicker kicker--dim">How the case fit together</span>
        </div>
        <div className="reveal-chain">
          {reveal.chain.map((item, index) => (
            <div className="reveal-item" key={item.clueId}>
              <span className="badge">
                CLUE {index + 1}
                {item.solvedByPlayer ? " · SOLVED" : " · UNSOLVED"}
              </span>
              <p style={{ margin: "6px 0 0", fontFamily: "var(--serif)" }}>
                {item.prompt || "—"}
              </p>
              <div className="arrow">→ {item.clueAnswer || "—"}</div>
              {item.evidence ? (
                <EvidenceCard evidence={item.evidence} index={index} />
              ) : null}
              {item.explanation || item.evidenceMeaning ? (
                <div className="exp">
                  {item.explanation ?? item.evidenceMeaning}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      {reveal.evidenceToAnswer ? (
        <div className="section">
          <span className="kicker kicker--dim">Why the evidence pointed here</span>
          <p className="prose">{reveal.evidenceToAnswer}</p>
        </div>
      ) : null}

      {reveal.majorConnections.length > 0 ? (
        <div className="section">
          <span className="kicker kicker--dim">Major connections</span>
          <ul className="pill-list">
            {reveal.majorConnections.map((connection) => (
              <li key={connection}>{connection}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {reveal.alternatePaths.length > 0 ? (
        <div className="section">
          <span className="kicker kicker--dim">Other legitimate routes</span>
          <ul className="pill-list">
            {reveal.alternatePaths.map((path) => (
              <li key={path}>{path}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="section">
        <span className="kicker kicker--dim">Your theories</span>
        {reveal.theories.length === 0 ? (
          <p className="prose">You never recorded a theory.</p>
        ) : (
          <ul className="theory-history">
            {reveal.theories.map((theory, index) => (
              <li key={theory.id} className={theory.wasCorrect ? "correct" : ""}>
                <span className="n">{index + 1}.</span>
                <span>
                  {theory.text}
                  {theory.wasCorrect ? " ✓" : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="section">
        <span className="kicker kicker--dim">Score</span>
        <ul className="score-lines">
          {reveal.score.lines.map((line) => (
            <li key={line.label}>
              <span>{line.label}</span>
              <span className="amt">
                {line.amount > 0 ? line.amount : line.amount}
              </span>
            </li>
          ))}
        </ul>
        <div className="score-total">
          <span>Final score</span>
          <span className="amt">{reveal.score.total}</span>
        </div>
      </div>

      <button className="btn btn--primary btn--block" onClick={onExit}>
        {exitLabel ?? "Done"}
      </button>
    </div>
  );
}
