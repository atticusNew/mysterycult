/**
 * Tagline player v3 — one screen, Wordle discipline.
 *
 * Tiles up top (tap to type the phrase directly into the board), earned
 * answers as chips, five inline questions, a connection slot you can fill
 * at any time, three purchasable hints, and a live score out of 100.
 *
 * Color is semantic: green = confirmed, gold = hints & the connection
 * layer, red = commitment & misses, gray = unknown.
 */
import { useEffect, useMemo, useRef, useState, useReducer } from "react";
import type { PhrasePuzzle } from "./model";
import {
  allRevealedPositions,
  buildPuzzleShareText,
  computePuzzleScore,
  createPuzzleSession,
  letterSequence,
  liveScore,
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
  const [typed, setTyped] = useState("");
  const [connOpen, setConnOpen] = useState(false);
  const [connText, setConnText] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shake, setShake] = useState(false);
  const typeRef = useRef<HTMLInputElement>(null);

  const letters = useMemo(() => letterSequence(puzzle.phrase), [puzzle.phrase]);
  const words = useMemo(
    () => puzzle.phrase.trim().split(/\s+/).filter(Boolean),
    [puzzle.phrase],
  );
  const revealed = allRevealedPositions(session);
  const hiddenSlots = useMemo(
    () =>
      Array.from({ length: letters.length }, (_, i) => i).filter(
        (i) => !revealed.has(i),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [letters.length, session.revealedPositions, session.hintPositions],
  );
  const gameOver = session.phase === "COMPLETE" || session.phase === "COLD";
  const attemptsLeft = SOLVE_ATTEMPTS - session.wrongSolves.length;
  const score = liveScore(puzzle, session);

  // New reveals shift the typed→slot mapping; clear the draft.
  useEffect(() => {
    setTyped("");
  }, [session.revealedPositions.length, session.hintPositions.length]);

  // Shake on a wrong solve.
  useEffect(() => {
    if (session.wrongSolves.length > 0) {
      setShake(true);
      const timer = setTimeout(() => setShake(false), 450);
      return () => clearTimeout(timer);
    }
  }, [session.wrongSolves.length]);

  // First play: show the rules once.
  useEffect(() => {
    if (!localStorage.getItem("cm.tagline.help")) {
      setShowHelp(true);
      localStorage.setItem("cm.tagline.help", "1");
    }
  }, []);

  function act(action: PuzzleAction) {
    dispatch(action);
  }

  function assembleGuess(): string {
    let letterIndex = 0;
    let hiddenIndex = 0;
    return puzzle.phrase
      .split("")
      .map((char) => {
        if (!/[a-z]/i.test(char)) return char;
        const index = letterIndex++;
        if (revealed.has(index)) return letters[index];
        const typedChar = typed[hiddenIndex++] ?? "";
        return typedChar || "_";
      })
      .join("");
  }

  const canSubmit =
    !gameOver &&
    session.phase === "PLAYING" &&
    hiddenSlots.length > 0 &&
    typed.length === hiddenSlots.length;

  function submitSolve() {
    if (!canSubmit) return;
    act({ type: "ATTEMPT_SOLVE", text: assembleGuess() });
  }

  // ------------------------------------------------------------- the board
  const board = (revealAll: boolean, interactive: boolean) => {
    let letterIndex = -1;
    let hiddenIndex = -1;
    const cursorSlot = typed.length; // next hidden slot to fill
    return (
      <div
        className={`phrase-board${shake ? " phrase-board--shake" : ""}${
          interactive ? " phrase-board--tappable" : ""
        }`}
        onClick={interactive ? () => typeRef.current?.focus() : undefined}
        aria-label="Hidden phrase"
      >
        {words.map((word, wordIdx) => (
          <span className="pword" key={`${word}_${wordIdx}`}>
            {word.split("").map((char, charIdx) => {
              const upper = char.toUpperCase();
              if (!/[A-Z]/.test(upper)) {
                return (
                  <span className="ppunct" key={charIdx}>
                    {char}
                  </span>
                );
              }
              letterIndex += 1;
              const idx = letterIndex;
              if (revealAll) {
                return (
                  <span className="ptile ptile--shown" key={charIdx}>
                    {upper}
                  </span>
                );
              }
              if (session.hintPositions.includes(idx)) {
                return (
                  <span className="ptile ptile--hint" key={charIdx}>
                    {letters[idx]}
                  </span>
                );
              }
              if (revealed.has(idx)) {
                return (
                  <span className="ptile ptile--shown" key={charIdx}>
                    {letters[idx]}
                  </span>
                );
              }
              hiddenIndex += 1;
              const slot = hiddenIndex;
              const typedChar = typed[slot] ?? "";
              const isCursor = interactive && slot === cursorSlot;
              return (
                <span
                  className={`ptile${typedChar ? " ptile--typed" : ""}${
                    isCursor ? " ptile--cursor" : ""
                  }`}
                  key={charIdx}
                >
                  {typedChar}
                </span>
              );
            })}
          </span>
        ))}
      </div>
    );
  };

  // ---------------------------------------------------- COMPLETE / COLD
  if (gameOver) {
    const finalScore = computePuzzleScore(puzzle, session);
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
        <p className="badge" style={{ display: "block", marginTop: 6 }}>
          {puzzleResultLine(puzzle, session).toUpperCase()}
        </p>

        <div className="section">{board(true, false)}</div>

        <div className="section">
          <span className="kicker kicker--gold">The connection</span>
          <h1 className="display" style={{ marginTop: 6 }}>
            {puzzle.connection.primary || "—"}
            {session.connectionResult === "correct" ? " ✓" : ""}
          </h1>
          {puzzle.reveal.summary ? (
            <p className="prose" style={{ marginTop: 8 }}>
              {puzzle.reveal.summary}
            </p>
          ) : null}
        </div>

        <div className="section">
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
            {finalScore.lines.map((line) => (
              <li key={line.label}>
                <span>{line.label}</span>
                <span className="amt">{line.amount}</span>
              </li>
            ))}
          </ul>
          <div className="score-total">
            <span>Final score</span>
            <span className="amt">{finalScore.total}/100</span>
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
  const connChipLabel =
    session.connectionResult === "correct"
      ? `${puzzle.connection.primary} ✓`
      : session.connectionResult === "wrong"
        ? "✗"
        : "?";

  return (
    <div className="shell shell--flush pshell">
      <div className="case-topbar">
        <span className="kicker">{puzzle.title || "Tagline"}</span>
        <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span className="score-chip" key={score}>
            {score} pts
          </span>
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

      {board(false, true)}

      {/* offscreen input that powers tap-to-type */}
      <input
        ref={typeRef}
        className="ghost-input"
        value={typed}
        inputMode="text"
        autoCapitalize="characters"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        onChange={(event) => {
          const clean = event.target.value
            .toUpperCase()
            .replace(/[^A-Z]/g, "")
            .slice(0, hiddenSlots.length);
          setTyped(clean);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") submitSolve();
        }}
        aria-label="Type the phrase"
      />

      <div className="psolve-bar">
        {canSubmit ? (
          <button className="btn btn--accuse-solid btn--small" onClick={submitSolve}>
            Solve ↵
          </button>
        ) : (
          <span className="psolve-note">
            {session.wrongSolves.length > 0
              ? `Not it — ${attemptsLeft} attempt${attemptsLeft === 1 ? "" : "s"} left`
              : "Tap the board to type your solve"}
          </span>
        )}
      </div>

      {/* earned answers + the connection slot */}
      <div className="achips">
        {puzzle.questions.map((question, index) => {
          const status = session.questionStatus[question.id];
          return (
            <span
              key={question.id}
              className={`achip${
                status === "correct"
                  ? " achip--ok"
                  : status === "wrong"
                    ? " achip--bad"
                    : ""
              }`}
            >
              {status === "correct"
                ? question.answer.primary
                : status === "wrong"
                  ? "✗"
                  : `${index + 1}?`}
            </span>
          );
        })}
        <button
          className={`achip achip--conn${
            session.connectionResult === "correct" ? " achip--conn-ok" : ""
          }${session.connectionResult === "wrong" ? " achip--bad" : ""}`}
          disabled={session.connectionResult !== null}
          onClick={() => setConnOpen(true)}
          title="Name the connection (+25)"
        >
          ⚡ {connChipLabel}
        </button>
      </div>

      {/* questions */}
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

      {/* hints */}
      <div className="hint-bar">
        {puzzle.hints.category.trim() ? (
          session.usedHints.includes("category") ? (
            <span className="hint-chip">{puzzle.hints.category}</span>
          ) : (
            <button
              className="hint-buy"
              onClick={() => act({ type: "USE_HINT", hint: "category" })}
            >
              Category −10
            </button>
          )
        ) : null}
        {puzzle.hints.decade.trim() ? (
          session.usedHints.includes("decade") ? (
            <span className="hint-chip">{puzzle.hints.decade}</span>
          ) : (
            <button
              className="hint-buy"
              onClick={() => act({ type: "USE_HINT", hint: "decade" })}
            >
              Decade −10
            </button>
          )
        ) : null}
        {!session.usedHints.includes("letter") && hiddenSlots.length > 0 ? (
          <button
            className="hint-buy"
            onClick={() => act({ type: "USE_HINT", hint: "letter" })}
          >
            A letter −10
          </button>
        ) : null}
      </div>

      {/* connection sheet (anytime, and forced at BONUS) */}
      {connOpen || session.phase === "BONUS" ? (
        <div
          className="overlay"
          onClick={
            session.phase === "BONUS" ? undefined : () => setConnOpen(false)
          }
        >
          <div className="sheet" onClick={(event) => event.stopPropagation()}>
            {session.phase === "BONUS" ? (
              <>
                <span className="verdict verdict--solved">Solved</span>
                <div style={{ margin: "16px 0" }}>{board(true, false)}</div>
                <h2>One more thing.</h2>
              </>
            ) : (
              <h2>Name the connection</h2>
            )}
            <p className="prose">
              What links all five answers — and the phrase itself? One attempt,
              +25 points.
            </p>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (!connText.trim()) return;
                act({ type: "ATTEMPT_CONNECTION", text: connText });
                setConnText("");
                setConnOpen(false);
              }}
            >
              <input
                className="input"
                placeholder="The connection is…"
                value={connText}
                onChange={(event) => setConnText(event.target.value)}
                autoFocus
              />
              <div className="answer-row" style={{ marginTop: 12 }}>
                <button
                  className="btn"
                  type="button"
                  onClick={() => {
                    setConnOpen(false);
                    if (session.phase === "BONUS") act({ type: "SKIP_BONUS" });
                  }}
                >
                  {session.phase === "BONUS" ? "Skip" : "Not yet"}
                </button>
                <button
                  className="btn btn--primary"
                  type="submit"
                  disabled={!connText.trim()}
                >
                  Name it (+25)
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
                the phrase — share one secret. Name it any time for +25.
              </li>
              <li>
                <strong>Solve the phrase.</strong> Tap the board and type.
                {" "}{SOLVE_ATTEMPTS} attempts. A perfect game is 100 points.
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
