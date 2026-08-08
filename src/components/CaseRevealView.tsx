/**
 * The full post-case reveal (game v2): the answer, the explanation, and —
 * exhibit by exhibit — what each piece meant and which suspects it was
 * designed to eliminate.
 */
import { useState } from "react";
import type { CaseRevealView as RevealData } from "../game/RevealEngine";
import { romanNumeral } from "../game/ScoringEngine";
import EvidenceCard from "./EvidenceCard";

interface Props {
  reveal: RevealData;
  onExit: () => void;
  exitLabel?: string;
  shareText?: string;
}

export default function CaseRevealView({
  reveal,
  onExit,
  exitLabel,
  shareText,
}: Props) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="shell shell--flush">
      <div className="case-topbar">
        <span className="kicker">The reveal</span>
        <button className="btn btn--ghost btn--small" onClick={onExit}>
          {exitLabel ?? "Done"}
        </button>
      </div>

      <span
        className={`verdict ${reveal.solved ? "verdict--solved" : "verdict--cold"}`}
      >
        {reveal.solved ? "Case closed" : "The case went cold"}
      </span>
      <h1 className="display" style={{ marginTop: 14 }}>
        {reveal.finalAnswer || "—"}
      </h1>
      <p className="badge" style={{ display: "block", marginTop: 6 }}>
        {reveal.result.toUpperCase()}
      </p>
      {reveal.summary ? (
        <p className="prose" style={{ fontSize: 16, marginTop: 14 }}>
          {reveal.summary}
        </p>
      ) : null}

      {reveal.ohMoment ? (
        <div className="section">
          <span className="kicker kicker--dim">The moment</span>
          <p className="case-question" style={{ marginTop: 8 }}>
            {reveal.ohMoment}
          </p>
        </div>
      ) : null}

      <div className="section">
        <div className="section-head">
          <span className="kicker kicker--dim">Exhibit by exhibit</span>
        </div>
        <div className="reveal-chain">
          {reveal.exhibits.map((item, index) => (
            <div className="reveal-item" key={item.evidence.id}>
              <div className="reveal-item-head">
                <span className="badge">
                  EXHIBIT {romanNumeral(index + 1)}
                  {item.seenByPlayer ? "" : " · NEVER FLIPPED"}
                </span>
              </div>
              <EvidenceCard evidence={item.evidence} index={index} />
              {item.meaning ? <p className="exp">{item.meaning}</p> : null}
              {item.eliminates.length > 0 ? (
                <p className="eliminates">
                  Rules out:{" "}
                  {item.eliminates.map((label, i) => (
                    <span key={label}>
                      {i > 0 ? ", " : ""}
                      <s>{label}</s>
                    </span>
                  ))}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      {reveal.evidenceToAnswer ? (
        <div className="section">
          <span className="kicker kicker--dim">Why it could only be one</span>
          <p className="prose">{reveal.evidenceToAnswer}</p>
        </div>
      ) : null}

      {reveal.majorConnections.length > 0 ? (
        <div className="section">
          <span className="kicker kicker--dim">The connections</span>
          <ul className="fact-list">
            {reveal.majorConnections.map((connection) => (
              <li key={connection}>{connection}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {reveal.theories.length > 0 ? (
        <div className="section">
          <span className="kicker kicker--dim">Your suspects, in order</span>
          <ul className="fact-list">
            {reveal.theories.map((theory, index) => (
              <li
                key={theory.id}
                className={theory.wasCorrect ? "correct" : ""}
              >
                {index + 1}. {theory.text}
                {theory.wasCorrect ? " ✓" : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="section">
        <span className="kicker kicker--dim">Score</span>
        <ul className="score-lines">
          {reveal.score.lines.map((line) => (
            <li key={line.label}>
              <span>{line.label}</span>
              <span className="amt">{line.amount}</span>
            </li>
          ))}
        </ul>
        <div className="score-total">
          <span>Final score</span>
          <span className="amt">{reveal.score.total}</span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        {shareText ? (
          <button
            className="btn"
            style={{ flex: 1 }}
            onClick={async () => {
              await navigator.clipboard?.writeText(shareText);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? "Copied" : "Share result"}
          </button>
        ) : null}
        <button
          className="btn btn--primary"
          style={{ flex: 1 }}
          onClick={onExit}
        >
          {exitLabel ?? "Done"}
        </button>
      </div>
    </div>
  );
}
