/**
 * Tagline player — the hidden-phrase board.
 *
 * Answer questions (one attempt each) to earn letters; solve the phrase
 * whenever you dare; then name the connection for the bonus.
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
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [flippedIds, setFlippedIds] = useState<string[]>([]);
  const [solveOpen, setSolveOpen] = useState(false);
  const [solveText, setSolveText] = useState("");
  const [bonusText, setBonusText] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const [copied, setCopied] = useState(false);

  const gameOver = session.phase === "COMPLETE" || session.phase === "COLD";
  const words = useMemo(
    () => puzzle.phrase.trim().split(/\s+/).filter(Boolean),
    [puzzle.phrase],
  );
  const earned = new Set(session.earnedLetters);
  const attemptsLeft = SOLVE_ATTEMPTS - session.wrongSolves.length;

  function act(action: PuzzleAction) {
    dispatch(action);
  }

  const board = (revealAll: boolean) => (
    <div className="phrase-board" aria-label="Hidden phrase">
      {words.map((word, wordIndex) => (
        <span className="pword" key={`${word}_${wordIndex}`}>
          {word.split("").map((char, charIndex) => {
            const upper = char.toUpperCase();
            const isLetter = /[A-Z]/.test(upper);
            if (!isLetter) {
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
      <div className="shell shell--flush">
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
          {session.bonusResult === "correct" ? (
            <p className="prose" style={{ color: "var(--green)", fontWeight: 600 }}>
              You named it. +{250}
            </p>
          ) : null}
          {puzzle.reveal.summary ? (
            <p className="prose" style={{ marginTop: 10 }}>
              {puzzle.reveal.summary}
            </p>
          ) : null}
        </div>

        {puzzle.reveal.ohMoment ? (
          <div className="section">
            <span className="kicker kicker--dim">The moment</span>
            <p className="case-question" style={{ marginTop: 8 }}>
              {puzzle.reveal.ohMoment}
            </p>
          </div>
        ) : null}

        <div className="section">
          <span className="kicker kicker--dim">The questions</span>
          <div className="pq-list" style={{ marginTop: 12 }}>
            {puzzle.questions.map((question, index) => {
              const status = session.questionStatus[question.id];
              return (
                <div className="pq-card pq-card--reveal" key={question.id}>
                  <div className="pq-head">
                    <span className="badge">
                      Q{index + 1}
                      {question.subject
                        ? ` · ${question.subject.toUpperCase()}`
                        : ""}{" "}
                      ·{" "}
                      {status === "correct"
                        ? "SOLVED"
                        : status === "wrong"
                          ? "MISSED"
                          : "UNTOUCHED"}
                    </span>
                    <span className="pletter pletter--small">
                      {question.letter}
                    </span>
                  </div>
                  <p className="pq-prompt">{question.prompt}</p>
                  <p className="pq-answer">→ {question.answer.primary}</p>
                  {question.factoid ? (
                    <p className="pq-factoid">{question.factoid}</p>
                  ) : null}
                  {question.connectionNote ? (
                    <p className="pq-note">{question.connectionNote}</p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <div className="section">
          <span className="kicker kicker--dim">Score</span>
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
    <div className="shell shell--flush">
      <div className="case-topbar">
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

      <header className="case-header">
        <p className="case-question" style={{ marginTop: 0 }}>
          Five answers share a secret. So does the phrase.
        </p>
      </header>

      <section className="section">{board(false)}</section>

      <section className="section">
        <div className="section-head">
          <span className="kicker kicker--dim">The questions</span>
          <span className="badge">ONE ATTEMPT EACH</span>
        </div>
        <div className="pq-list">
          {puzzle.questions.map((question, index) => {
            const status = session.questionStatus[question.id];
            const isActive = activeQuestionId === question.id;
            const hasSubject = question.subject.trim().length > 0;
            const isFlipped =
              !hasSubject || status !== "open" || flippedIds.includes(question.id);

            // Face-down subject card: the question hides behind its topic.
            if (!isFlipped) {
              return (
                <button
                  className="pq-card pq-card--facedown"
                  key={question.id}
                  onClick={() => {
                    setFlippedIds([...flippedIds, question.id]);
                    setActiveQuestionId(question.id);
                  }}
                >
                  <div className="pq-head">
                    <span className="badge">Q{index + 1}</span>
                    <span className="pq-status">+</span>
                  </div>
                  <span className="pq-subject">{question.subject}</span>
                  <span className="pq-flip-hint">Tap to reveal the question</span>
                </button>
              );
            }

            return (
              <div
                className={`pq-card${
                  status === "correct"
                    ? " pq-card--correct"
                    : status === "wrong"
                      ? " pq-card--wrong"
                      : isActive
                        ? " pq-card--active"
                        : " pq-card--tappable"
                }`}
                key={question.id}
                onClick={
                  status === "open"
                    ? () =>
                        setActiveQuestionId(isActive ? null : question.id)
                    : undefined
                }
              >
                <div className="pq-head">
                  <span className="badge">
                    Q{index + 1}
                    {hasSubject ? ` · ${question.subject.toUpperCase()}` : ""}
                  </span>
                  <span className="pq-status">
                    {status === "correct"
                      ? "✓"
                      : status === "wrong"
                        ? "✗"
                        : isActive
                          ? "—"
                          : "+"}
                  </span>
                </div>
                <p className="pq-prompt">{question.prompt}</p>
                {status === "open" && isActive ? (
                  <form
                    className="answer-row"
                    onClick={(event) => event.stopPropagation()}
                    onSubmit={(event) => {
                      event.preventDefault();
                      const value = inputs[question.id] ?? "";
                      if (!value.trim()) return;
                      act({
                        type: "ANSWER_QUESTION",
                        questionId: question.id,
                        answer: value,
                      });
                      setActiveQuestionId(null);
                    }}
                  >
                    <input
                      className="input"
                      placeholder="Your answer — one attempt"
                      value={inputs[question.id] ?? ""}
                      autoFocus
                      onChange={(event) =>
                        setInputs({
                          ...inputs,
                          [question.id]: event.target.value,
                        })
                      }
                    />
                    <button
                      className="btn"
                      type="submit"
                      disabled={!(inputs[question.id] ?? "").trim()}
                    >
                      Go
                    </button>
                  </form>
                ) : status === "correct" ? (
                  <>
                    <p className="pq-answer">✓ {question.answer.primary}</p>
                    {question.factoid ? (
                      <p className="pq-factoid">{question.factoid}</p>
                    ) : null}
                  </>
                ) : status === "wrong" ? (
                  <p className="pq-answer pq-answer--wrong">
                    ✗ Locked — its letters stay hidden.
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="action-row">
          <button
            className="btn btn--accuse-solid"
            onClick={() => setSolveOpen(true)}
          >
            Solve the phrase
          </button>
        </div>
        <p className="board-help" style={{ textAlign: "center", marginTop: 10 }}>
          {attemptsLeft} solve attempt{attemptsLeft === 1 ? "" : "s"} left ·
          fewer questions used = higher score
        </p>
      </section>

      {/* solve sheet */}
      {solveOpen && session.phase === "PLAYING" ? (
        <div className="overlay" onClick={() => setSolveOpen(false)}>
          <div className="sheet" onClick={(event) => event.stopPropagation()}>
            <span className="kicker">Solve the phrase</span>
            <div style={{ margin: "14px 0" }}>{board(false)}</div>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (!solveText.trim()) return;
                act({ type: "ATTEMPT_SOLVE", text: solveText });
                setSolveText("");
                setSolveOpen(false);
              }}
            >
              <input
                className="input"
                placeholder="Type the full phrase"
                value={solveText}
                onChange={(event) => setSolveText(event.target.value)}
                autoFocus
              />
              <div className="answer-row" style={{ marginTop: 12 }}>
                <button
                  className="btn"
                  type="button"
                  onClick={() => setSolveOpen(false)}
                >
                  Not yet
                </button>
                <button
                  className="btn btn--accuse-solid"
                  type="submit"
                  disabled={!solveText.trim()}
                >
                  Solve
                </button>
              </div>
            </form>
            {session.wrongSolves.length > 0 ? (
              <p
                className="board-help"
                style={{ marginTop: 10, color: "var(--red)" }}
              >
                Not it. {attemptsLeft} attempt{attemptsLeft === 1 ? "" : "s"}{" "}
                left.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

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
                <strong>Answer questions to earn letters.</strong> One attempt
                each — every correct answer lights up letters in the phrase.
              </li>
              <li>
                <strong>Find what connects the answers.</strong> All five —
                and the phrase itself — share one secret.
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
