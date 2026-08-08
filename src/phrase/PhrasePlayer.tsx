/**
 * Tagline player — Wordle-simple, one screen.
 *
 * Phrase tiles up top, five numbered questions with inline inputs beneath,
 * and the phrase solve input at the bottom. One attempt per question;
 * correct answers turn tiles green. Solve any time.
 */
import { useMemo, useState, useReducer } from "react";
import type { PhrasePuzzle } from "./model";
import {
  buildPuzzleShareText,
  computePuzzleScore,
  createPuzzleSession,
  puzzleReducer,
  puzzleResultLine,
  SOLVE_ATTEMPTS,
  type PuzzleAction,
} from "./engine";

interface Props {
  puzzle: PhrasePuzzle;
  onExit: () => void;
  exitLabel?: string;
  onRestart?: () => void;
}

export default function PhrasePlayer({
  puzzle,
  onExit,
  exitLabel,
  onRestart,
}: Props) {
  const [session, dispatch] = useReducer(
    (state: ReturnType<typeof createPuzzleSession>, action: PuzzleAction) =>
      puzzleReducer(puzzle, state, action),
    puzzle,
    createPuzzleSession,
  );
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [solveText, setSolveText] = useState("");
  const [bonusText, setBonusText] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const [copied, setCopied] = useState(false);

  const words = useMemo(
    () => puzzle.phrase.trim().split(/\s+/).filter(Boolean),
    [puzzle.phrase],
  );
  const earned = new Set(session.earnedLetters);
  const attemptsLeft = SOLVE_ATTEMPTS - session.wrongSolves.length;
  const gameOver = session.phase === "COMPLETE" || session.phase === "COLD";

  function act(action: PuzzleAction) {
    dispatch(action);
  }

  const board = (revealAll: boolean) => (
    <div className="phrase-board" aria-label="Hidden phrase">
      {words.map((word, wordIndex) => (
        <span className="pword" key={`${word}_${wordIndex}`}>
          {word.split("").map((char, charIndex) => {
            const upper = char.toUpperCase();
            if (!/[A-Z]/.test(upper)) {
              return (
                <span className="ppunct" key={charIndex}>
                  {char}
                </span>
              );
            }
            const shown = revealAll || earned.has(upper);
            return (
              <span
                className={`ptile${shown ? " ptile--shown" : ""}`}
                key={charIndex}
              >
                {shown ? upper : ""}
              </span>
            );
          })}
        </span>
      ))}
    </div>
  );

  // ---------------------------------------------------- COMPLETE / COLD
  if (gameOver) {
    const score = computePuzzleScore(session);
    return (
      <div className="shell shell--flush pshell">
        <div className="case-topbar">
          <span className="kicker">{puzzle.title || "Tagline"}</span>
          <span style={{ display: "flex", gap: 6 }}>
            {onRestart ? (
              <button className="icon-round" title="Restart" onClick={onRestart}>
                ↺
              </button>
            ) : null}
            <button className="btn btn--ghost btn--small" onClick={onExit}>
              {exitLabel ?? "Home"}
            </button>
          </span>
        </div>

        <span
          className={`verdict ${session.solved ? "verdict--solved" : "verdict--cold"}`}
        >
          {session.solved ? "Solved" : "It went cold"}
        </span>
        <p className="badge" style={{ display: "block", marginTop: 8 }}>
          {puzzleResultLine(session).toUpperCase()}
        </p>

        <div className="section">{board(true)}</div>

        <div className="section">
          <span className="kicker kicker--dim">The connection</span>
          <h1 className="display" style={{ marginTop: 8 }}>
            {puzzle.connection.primary || "—"}
          </h1>
          {puzzle.reveal.summary ? (
            <p className="prose" style={{ marginTop: 10 }}>
              {puzzle.reveal.summary}
            </p>
          ) : null}
        </div>

        <div className="section">
          <div className="pq-simple-list">
            {puzzle.questions.map((question, index) => {
              const status = session.questionStatus[question.id];
              return (
                <div className="pq-row pq-row--reveal" key={question.id}>
                  <span
                    className={`pq-n${
                      status === "correct"
                        ? " pq-n--ok"
                        : status === "wrong"
                          ? " pq-n--bad"
                          : ""
                    }`}
                  >
                    {index + 1}
                  </span>
                  <div className="pq-body">
                    <p className="pq-prompt">{question.prompt}</p>
                    <p className="pq-answer">→ {question.answer.primary}</p>
                    {question.connectionNote ? (
                      <p className="pq-note">{question.connectionNote}</p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="section">
          <ul className="score-lines">
            {score.lines.map((line) => (
              <li key={line.label}>
                <span>{line.label}</span>
                <span className="amt">{line.amount}</span>
              </li>
            ))}
          </ul>
          <div className="score-total">
            <span>Final score</span>
            <span className="amt">{score.total}</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button
            className="btn"
            style={{ flex: 1 }}
            onClick={async () => {
              await navigator.clipboard?.writeText(
                buildPuzzleShareText(puzzle, session),
              );
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? "Copied" : "Share result"}
          </button>
          <button className="btn btn--primary" style={{ flex: 1 }} onClick={onExit}>
            {exitLabel ?? "Done"}
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------- PLAYING
  return (
    <div className="shell shell--flush pshell">
      <div className="case-topbar pshell-topbar">
        <span className="kicker">{puzzle.title || "Tagline"}</span>
        <span style={{ display: "flex", gap: 6 }}>
          <button
            className="icon-round"
            aria-label="How to play"
            onClick={() => setShowHelp(true)}
          >
            ?
          </button>
          {onRestart ? (
            <button className="icon-round" title="Restart" onClick={onRestart}>
              ↺
            </button>
          ) : null}
          <button className="btn btn--ghost btn--small" onClick={onExit}>
            {exitLabel ?? "Exit"}
          </button>
        </span>
      </div>

      {board(false)}

      <div className="pq-simple-list">
        {puzzle.questions.map((question, index) => {
          const status = session.questionStatus[question.id];
          return (
            <div className="pq-row" key={question.id}>
              <span
                className={`pq-n${
                  status === "correct"
                    ? " pq-n--ok"
                    : status === "wrong"
                      ? " pq-n--bad"
                      : ""
                }`}
              >
                {status === "correct" ? "✓" : status === "wrong" ? "✗" : index + 1}
              </span>
              <div className="pq-body">
                <p className="pq-prompt">{question.prompt}</p>
                {status === "open" ? (
                  <form
                    className="pq-input-row"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const value = inputs[question.id] ?? "";
                      if (!value.trim()) return;
                      act({
                        type: "ANSWER_QUESTION",
                        questionId: question.id,
                        answer: value,
                      });
                    }}
                  >
                    <input
                      className="input input--slim"
                      placeholder="Answer"
                      value={inputs[question.id] ?? ""}
                      onChange={(event) =>
                        setInputs({
                          ...inputs,
                          [question.id]: event.target.value,
                        })
                      }
                    />
                    <button
                      className="btn btn--small"
                      type="submit"
                      disabled={!(inputs[question.id] ?? "").trim()}
                    >
                      Go
                    </button>
                  </form>
                ) : status === "correct" ? (
                  <p className="pq-answer">{question.answer.primary}</p>
                ) : (
                  <p className="pq-answer pq-answer--wrong">Locked</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* inline phrase solve */}
      <form
        className="psolve"
        onSubmit={(event) => {
          event.preventDefault();
          if (!solveText.trim()) return;
          act({ type: "ATTEMPT_SOLVE", text: solveText });
          setSolveText("");
        }}
      >
        <input
          className="input"
          placeholder="Type the phrase…"
          value={solveText}
          onChange={(event) => setSolveText(event.target.value)}
        />
        <button
          className="btn btn--accuse-solid"
          type="submit"
          disabled={!solveText.trim()}
        >
          Solve
        </button>
      </form>
      <p
        className={`psolve-note${session.wrongSolves.length > 0 ? " psolve-note--miss" : ""}`}
      >
        {session.wrongSolves.length > 0
          ? `Not it — ${attemptsLeft} attempt${attemptsLeft === 1 ? "" : "s"} left`
          : `${attemptsLeft} attempts · fewer questions = higher score`}
      </p>

      {/* bonus crescendo */}
      {session.phase === "BONUS" ? (
        <div className="overlay">
          <div className="sheet">
            <span className="verdict verdict--solved">Solved</span>
            <div style={{ margin: "16px 0" }}>{board(true)}</div>
            <h2>One more thing.</h2>
            <p className="prose">
              What connects the phrase and all five answers?
            </p>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (!bonusText.trim()) return;
                act({ type: "ANSWER_BONUS", text: bonusText });
              }}
            >
              <input
                className="input"
                placeholder="Name the connection"
                value={bonusText}
                onChange={(event) => setBonusText(event.target.value)}
                autoFocus
              />
              <div className="answer-row" style={{ marginTop: 12 }}>
                <button
                  className="btn"
                  type="button"
                  onClick={() => act({ type: "SKIP_BONUS" })}
                >
                  Skip
                </button>
                <button
                  className="btn btn--primary"
                  type="submit"
                  disabled={!bonusText.trim()}
                >
                  Name it (+250)
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* help */}
      {showHelp ? (
        <div className="overlay" onClick={() => setShowHelp(false)}>
          <div className="sheet" onClick={(event) => event.stopPropagation()}>
            <span className="kicker">How to play</span>
            <ol className="howto" style={{ marginTop: 14 }}>
              <li>
                <strong>Answer questions.</strong> One attempt each — correct
                answers turn letters green.
              </li>
              <li>
                <strong>Spot the connection.</strong> All five answers — and
                the phrase — share one secret.
              </li>
              <li>
                <strong>Solve the phrase.</strong> Any time, {SOLVE_ATTEMPTS}{" "}
                attempts. Fewer questions used, higher score.
              </li>
            </ol>
            <button
              className="btn btn--primary btn--block"
              style={{ marginTop: 14 }}
              onClick={() => setShowHelp(false)}
            >
              Got it
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
