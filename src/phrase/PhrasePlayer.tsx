/**
 * ThroughLines player v9 — final polish pass.
 *
 * Fixed stage, custom keyboard (no OS keyboard, no jumping). Category
 * select is a compact 2-column grid — nothing scrolls; picking one swaps
 * the grid for a single focused question card (✕ to go back). Answers
 * collect in a labeled list under the board. The entry line is display
 * only; ENTER on the keyboard is the one submit. Naming the THROUGHLINE
 * wins (+50, two guesses); completing the phrase is the +25 bonus — and a
 * fully revealed phrase completes itself.
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
  looseAnswerMatches,
  puzzleReducer,
  puzzleResultLine,
  SOLVE_ATTEMPTS,
  THEME_ATTEMPTS,
  type PuzzleAction,
} from "./engine";

type Mode =
  | { kind: "idle" }
  | { kind: "question"; index: number }
  | { kind: "solve" }
  | { kind: "theme" };

/** Trivial Pursuit homage: stable category colors by question position. */
const CATEGORY_COLORS = ["#4e7fc4", "#c75d94", "#d97f35", "#8a63b3", "#3f8f7d"];

/** Delay before tiles cascade, so the ✓ lands first. */
const CASCADE_DELAY_MS = 300;

const KEY_ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];
const MAX_ENTRY = 48;

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
  const [mode, setMode] = useState<Mode>({ kind: "idle" });
  const [value, setValue] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shake, setShake] = useState(false);
  const [flash, setFlash] = useState<"ok" | "bad" | null>(null);
  const [lastBatch, setLastBatch] = useState<number[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [midWave, setMidWave] = useState(false);
  const prevRevealed = useRef<Set<number>>(new Set());
  const prevSolved = useRef(false);
  const advanceTimer = useRef<number | null>(null);
  const submitRef = useRef<() => void>(() => {});

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
  const bonus = session.phase === "BONUS";
  const score = liveScore(puzzle, session);
  const dense = letters.length > 30;
  const ultraDense = letters.length > 48;
  const correctAnswers = puzzle.questions.filter(
    (question) => session.questionStatus[question.id] === "correct",
  );

  const effectiveMode: Mode = bonus ? { kind: "solve" } : mode;

  const typed =
    effectiveMode.kind === "solve" && !session.solved
      ? value
          .toUpperCase()
          .replace(/[^A-Z]/g, "")
          .slice(0, hiddenSlots.length)
      : "";

  // Lock the document while playing.
  useEffect(() => {
    if (gameOver) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [gameOver]);

  // Track newly revealed positions for the cascade animation.
  useEffect(() => {
    const current = allRevealedPositions(session);
    const fresh = [...current].filter((i) => !prevRevealed.current.has(i));
    prevRevealed.current = current;
    if (fresh.length > 0) {
      setLastBatch(fresh.sort((a, b) => a - b));
      if (mode.kind === "solve") setValue("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.revealedPositions.length, session.hintPositions.length]);

  // Celebrate the phrase completing mid-game (typed or auto-revealed).
  useEffect(() => {
    if (session.solved && !prevSolved.current && !gameOver) {
      setToast("Phrase complete ⭐ +25");
      setMidWave(true);
      const timer = setTimeout(() => setMidWave(false), 1800);
      return () => clearTimeout(timer);
    }
    prevSolved.current = session.solved;
  }, [session.solved, gameOver]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 1600);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (session.wrongSolves.length > 0 || session.wrongThemes.length > 0) {
      setShake(true);
      const timer = setTimeout(() => setShake(false), 450);
      return () => clearTimeout(timer);
    }
  }, [session.wrongSolves.length, session.wrongThemes.length]);

  useEffect(() => {
    if (!localStorage.getItem("cm.tagline.help")) {
      setShowHelp(true);
      localStorage.setItem("cm.tagline.help", "1");
    }
    return () => {
      if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
    };
  }, []);

  // Physical keyboards feed the same entry.
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "Enter") {
        submitRef.current();
        return;
      }
      if (event.key === "Backspace") {
        setValue((current) => current.slice(0, -1));
        return;
      }
      if (/^[a-zA-Z ']$/.test(event.key)) {
        setValue((current) =>
          current.length < MAX_ENTRY ? current + event.key : current,
        );
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  function act(action: PuzzleAction) {
    dispatch(action);
  }

  function switchMode(next: Mode) {
    if (bonus) return;
    if (advanceTimer.current) {
      window.clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    }
    setMode(next);
    setValue("");
    setFlash(null);
  }

  function nextOpenQuestion(after: number): number {
    const count = puzzle.questions.length;
    for (let step = 1; step <= count; step++) {
      const index = (after + step) % count;
      if (session.questionStatus[puzzle.questions[index].id] === "open") {
        return index;
      }
    }
    return -1;
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
        return typed[hiddenIndex++] ?? "_";
      })
      .join("");
  }

  const activeStatus =
    effectiveMode.kind === "question"
      ? session.questionStatus[puzzle.questions[effectiveMode.index].id]
      : "open";

  const canSubmit =
    effectiveMode.kind === "solve"
      ? !session.solved &&
        session.wrongSolves.length < SOLVE_ATTEMPTS &&
        typed.length === hiddenSlots.length &&
        hiddenSlots.length > 0
      : effectiveMode.kind === "theme"
        ? value.trim().length > 0 && session.connectionResult === null
        : effectiveMode.kind === "question"
          ? session.phase === "PLAYING" &&
            value.trim().length > 0 &&
            activeStatus === "open"
          : false;

  function submit() {
    if (!canSubmit) return;
    if (effectiveMode.kind === "question") {
      const index = effectiveMode.index;
      const question = puzzle.questions[index];
      const correct = looseAnswerMatches(value, question.answer);
      act({ type: "ANSWER_QUESTION", questionId: question.id, answer: value });
      setValue("");
      setFlash(correct ? "ok" : "bad");
      advanceTimer.current = window.setTimeout(
        () => {
          setFlash(null);
          const next = nextOpenQuestion(index);
          // No questions left → straight to the thruline guess.
          setMode(
            next >= 0
              ? { kind: "question", index: next }
              : session.connectionResult === null
                ? { kind: "theme" }
                : { kind: "idle" },
          );
          advanceTimer.current = null;
        },
        correct ? 1100 : 1400,
      );
      return;
    }
    if (effectiveMode.kind === "solve") {
      act({ type: "ATTEMPT_SOLVE", text: assembleGuess() });
      setValue("");
      return;
    }
    act({ type: "ATTEMPT_CONNECTION", text: value });
    setValue("");
  }
  submitRef.current = submit;

  function pressKey(key: string) {
    if (key === "BACK") {
      setValue((current) => current.slice(0, -1));
      return;
    }
    if (key === "ENTER") {
      submit();
      return;
    }
    if (key === "SPACE") {
      setValue((current) =>
        current.length < MAX_ENTRY ? current + " " : current,
      );
      return;
    }
    setValue((current) =>
      current.length < MAX_ENTRY ? current + key : current,
    );
  }

  // ------------------------------------------------------------- the board
  const board = (revealAll: boolean, wave: boolean) => {
    let letterIndex = -1;
    let hiddenIndex = -1;
    const cursorSlot = typed.length;
    return (
      <div
        className={`phrase-board${dense ? " phrase-board--dense" : ""}${ultraDense ? " phrase-board--ultra" : ""}${
          shake ? " phrase-board--shake" : ""
        }${!gameOver && !session.solved ? " phrase-board--tappable" : ""}`}
        onClick={
          !gameOver && !bonus && !session.solved
            ? () => switchMode({ kind: "solve" })
            : undefined
        }
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
              if (wave) {
                return (
                  <span
                    className="ptile ptile--shown ptile--wave"
                    style={{ animationDelay: `${idx * 45}ms` }}
                    key={charIdx}
                  >
                    {letters[idx]}
                  </span>
                );
              }
              if (revealAll) {
                return (
                  <span className="ptile ptile--shown" key={charIdx}>
                    {letters[idx]}
                  </span>
                );
              }
              const isHint = session.hintPositions.includes(idx);
              if (revealed.has(idx)) {
                const batchOrder = lastBatch.indexOf(idx);
                return (
                  <span
                    className={`ptile ${isHint ? "ptile--hint" : "ptile--shown"}`}
                    style={
                      batchOrder >= 0
                        ? {
                            animationDelay: `${CASCADE_DELAY_MS + batchOrder * 80}ms`,
                          }
                        : { animation: "none" }
                    }
                    key={charIdx}
                  >
                    {letters[idx]}
                  </span>
                );
              }
              hiddenIndex += 1;
              const slot = hiddenIndex;
              const typedChar = typed[slot] ?? "";
              const isCursor =
                effectiveMode.kind === "solve" &&
                !session.solved &&
                slot === cursorSlot &&
                !gameOver;
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
          <span className="kicker">{puzzle.title || "ThruLines"}</span>
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
          className={`verdict ${
            session.connectionResult === "correct"
              ? "verdict--solved"
              : "verdict--cold"
          }`}
        >
          {session.connectionResult === "correct"
            ? "ThruLine found"
            : "It went cold"}
        </span>
        <p className="badge" style={{ display: "block", marginTop: 6 }}>
          {puzzleResultLine(puzzle, session).toUpperCase()}
        </p>

        <div className="section">
          {board(true, session.connectionResult === "correct")}
        </div>

        <div className="section">
          <span className="kicker kicker--gold">The thruline</span>
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
                    style={{
                      boxShadow: `inset 0 -3px 0 ${CATEGORY_COLORS[index % CATEGORY_COLORS.length]}`,
                    }}
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
  const entryGhost = bonus
    ? "Finish the line (+25)"
    : effectiveMode.kind === "idle"
      ? "Pick a category"
      : effectiveMode.kind === "solve"
        ? session.solved
          ? "Phrase complete ⭐"
          : `Fill the empty tiles — ${Math.max(hiddenSlots.length - typed.length, 0)} to go`
        : effectiveMode.kind === "theme"
          ? "The thruline is…"
          : activeStatus === "open"
            ? "Type your answer"
            : "Pick another category";

  const showRawValue =
    effectiveMode.kind === "question" || effectiveMode.kind === "theme";

  return (
    <div className="fstage">
      <div className="fstage-inner">
        {/* header */}
        <div className="fhead">
          <span className="fhead-left">
            <span className="fhead-title">{puzzle.title || "ThruLines"}</span>
            {puzzle.genre.trim() ? (
              <span className="genre-pill">{puzzle.genre}</span>
            ) : null}
          </span>
          <span className="fhead-tools">
            <span className="score-chip" key={score}>
              {score}
            </span>
            <button
              className="icon-round icon-round--sm"
              aria-label="How to play"
              onClick={() => setShowHelp(true)}
            >
              ?
            </button>
            {onRestart ? (
              <button
                className="icon-round icon-round--sm"
                title="Restart"
                onClick={onRestart}
              >
                ↺
              </button>
            ) : null}
            <button
              className="icon-round icon-round--sm"
              title={exitLabel ?? "Exit"}
              onClick={onExit}
            >
              ✕
            </button>
          </span>
        </div>

        {board(session.solved, midWave)}

        {/* the answers, collecting as you earn them */}
        {correctAnswers.length > 0 && mode.kind !== "theme" && !bonus ? (
          <div className={`answers-line${effectiveMode.kind === "solve" ? " dim" : ""}`}>
            <span className="answers-label">Answers</span>
            <span className="answers-items">
              {correctAnswers.map((question) => (
                <span key={question.id} className="apill">
                  {question.answer.primary}
                </span>
              ))}
            </span>
          </div>
        ) : null}

        {bonus ? (
          <div className="solved-strip">
            <span className="verdict verdict--solved">
              {puzzle.connection.primary}
            </span>
            <span>You found it! Finish the line for +25.</span>
            <button
              className="btn btn--small"
              onClick={() => act({ type: "SKIP_BONUS" })}
            >
              Skip
            </button>
          </div>
        ) : mode.kind === "theme" ? (
          /* the final round — weight, answers front and center */
          <div className="final-panel">
            <div className="final-head">
              <span className="final-tag">Final</span>
              <span className="final-title">The ThruLine</span>
            </div>
            <p className="final-question">
              What connects everything{puzzle.genre ? ` — which ${puzzle.genre.toLowerCase()}` : ""}?
            </p>
            {correctAnswers.length > 0 ? (
              <div className="final-answers">
                {correctAnswers.map((question) => (
                  <span key={question.id} className="final-answer">
                    {question.answer.primary}
                  </span>
                ))}
              </div>
            ) : (
              <p className="final-none">No answers earned — going on instinct.</p>
            )}
          </div>
        ) : mode.kind === "question" ? (
          /* focused question card — other categories step aside */
          (() => {
            const index = mode.index;
            const question = puzzle.questions[index];
            const color = CATEGORY_COLORS[index % CATEGORY_COLORS.length];
            const status = session.questionStatus[question.id];
            return (
              <div
                className={`focus-card${
                  flash === "ok" ? " cat-item--flash-ok" : ""
                }${flash === "bad" ? " cat-item--flash-bad" : ""}`}
              >
                <div className="cat-item-head">
                  <span className="cat-name" style={{ background: color }}>
                    {question.subject.trim() || `Question ${index + 1}`}
                  </span>
                  <button
                    className="icon-round icon-round--sm"
                    title="Back to categories"
                    onClick={() => switchMode({ kind: "idle" })}
                  >
                    ✕
                  </button>
                </div>
                {status === "open" ? (
                  <p className="focus-question">{question.prompt}</p>
                ) : (
                  <div
                    className={`focus-result ${
                      status === "correct"
                        ? "focus-result--ok"
                        : "focus-result--bad"
                    }`}
                  >
                    <span className="focus-result-mark">
                      {status === "correct" ? "✓" : "✗"}
                    </span>
                    <span className="focus-result-answer">
                      {question.answer.primary}
                    </span>
                  </div>
                )}
              </div>
            );
          })()
        ) : (
          /* category select — a compact grid, nothing scrolls */
          <div className={`cat-grid${effectiveMode.kind === "solve" ? " dim" : ""}`}>
            {puzzle.questions.map((question, index) => {
              const status = session.questionStatus[question.id];
              const color = CATEGORY_COLORS[index % CATEGORY_COLORS.length];
              return (
                <button
                  key={question.id}
                  className={`cat-cell${
                    status === "correct" ? " cat-cell--ok" : ""
                  }${status === "wrong" ? " cat-cell--bad" : ""}`}
                  style={{ background: color }}
                  onClick={() => switchMode({ kind: "question", index })}
                >
                  <span className="cat-cell-name">
                    {question.subject.trim() || `Question ${index + 1}`}
                  </span>
                  <span className="cat-cell-state">
                    {status === "correct" ? "✓" : status === "wrong" ? "✗" : ""}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* the goal + the bonus */}
        {!bonus && mode.kind !== "theme" ? (
          <div className={`mode-row${effectiveMode.kind === "solve" && !bonus ? " mode-row--solving" : ""}`}>
            <button
              className={`qchip qchip--theme${
                correctAnswers.length >= 2 && session.connectionResult === null
                  ? " qchip--tempt-gold"
                  : ""
              }`}
              disabled={session.connectionResult !== null}
              onClick={() => switchMode({ kind: "theme" })}
            >
              {session.connectionResult === "correct"
                ? `${puzzle.connection.primary} ✓`
                : "ThruLine +50"}
            </button>
            <button
              className={`qchip qchip--solve${
                mode.kind === "solve" ? " qchip--solve-active" : ""
              }`}
              disabled={
                session.solved || session.wrongSolves.length >= SOLVE_ATTEMPTS
              }
              onClick={() =>
                switchMode(
                  mode.kind === "solve" ? { kind: "idle" } : { kind: "solve" },
                )
              }
            >
              {session.solved
                ? "Phrase ⭐"
                : session.wrongSolves.length >= SOLVE_ATTEMPTS
                  ? "Phrase ✗"
                  : "Phrase +25"}
            </button>
          </div>
        ) : null}

        {/* entry — display only; ENTER submits */}
        <div
          className={`entry${
            effectiveMode.kind === "solve" ? " entry--solve" : ""
          }${effectiveMode.kind === "theme" ? " entry--theme" : ""}`}
        >
          <span
            className={`entry-text${
              showRawValue && value ? "" : " entry-text--ghost"
            }`}
          >
            {showRawValue && value ? value : entryGhost}
          </span>
          {!bonus && effectiveMode.kind === "solve" ? (
            <button
              className="icon-round icon-round--sm"
              title="Back"
              onClick={() => switchMode({ kind: "idle" })}
            >
              ✕
            </button>
          ) : null}
        </div>

        {/* the game keyboard */}
        <div className="kb" aria-label="Keyboard">
          {KEY_ROWS.map((row) => (
            <div className="kb-row" key={row}>
              {row.split("").map((key) => (
                <button
                  key={key}
                  className="kb-key"
                  onClick={() => pressKey(key)}
                >
                  {key}
                </button>
              ))}
            </div>
          ))}
          <div className="kb-row">
            <button className="kb-key kb-key--wide" onClick={() => pressKey("BACK")}>
              ⌫
            </button>
            <button
              className="kb-key kb-key--space"
              onClick={() => pressKey("SPACE")}
            >
              ␣
            </button>
            <button
              className="kb-key kb-key--wide kb-key--go"
              disabled={!canSubmit}
              onClick={() => pressKey("ENTER")}
            >
              ENTER
            </button>
          </div>
        </div>
      </div>

      {/* toast */}
      {toast ? <div className="toast">{toast}</div> : null}

      {/* help */}
      {showHelp ? (
        <div className="overlay" onClick={() => setShowHelp(false)}>
          <div className="sheet" onClick={(event) => event.stopPropagation()}>
            <span className="kicker">How to play</span>
            <ol className="howto" style={{ marginTop: 14 }}>
              <li>
                <strong>Pick a category, answer its question.</strong> One
                attempt each — correct answers light up letters in the phrase.
              </li>
              <li>
                <strong>Find the thruline — that's the win.</strong> All
                five answers and the phrase share one secret.{" "}
                {THEME_ATTEMPTS === 1 ? "One guess" : `${THEME_ATTEMPTS} guesses`},
                +50.
              </li>
              <li>
                <strong>Bonus: complete the phrase</strong> (+25) — type it, or
                reveal every letter. A perfect game is 100.
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
