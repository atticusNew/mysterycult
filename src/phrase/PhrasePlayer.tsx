/**
 * Tagline player v8 — zero native inputs.
 *
 * The OS keyboard is never invoked: a built-in game keyboard lives at the
 * bottom of a fixed stage, so the screen cannot jump — on any device.
 * Physical keyboards work too (desktop types straight in).
 *
 * Layout, all locked: header → board → category rows (question reveals
 * inside the tapped row) → Solve/Theme → entry line → game keyboard.
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
const DIGIT_ROW = "1234567890";
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
  const [digits, setDigits] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shake, setShake] = useState(false);
  const [flash, setFlash] = useState<"ok" | "bad" | null>(null);
  const [lastBatch, setLastBatch] = useState<number[]>([]);
  const activeRowRef = useRef<HTMLDivElement>(null);
  const prevRevealed = useRef<Set<number>>(new Set());
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
  const attemptsLeft = SOLVE_ATTEMPTS - session.wrongSolves.length;
  const themeAttemptsLeft = THEME_ATTEMPTS - session.wrongThemes.length;
  const correctAnswers = Object.values(session.questionStatus).filter(
    (status) => status === "correct",
  ).length;
  const score = liveScore(puzzle, session);
  const dense = letters.length > 30;

  const effectiveMode: Mode = bonus ? { kind: "solve" } : mode;

  const typed =
    effectiveMode.kind === "solve"
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

  useEffect(() => {
    if (session.wrongSolves.length > 0) {
      setShake(true);
      const timer = setTimeout(() => setShake(false), 450);
      return () => clearTimeout(timer);
    }
  }, [session.wrongSolves.length]);

  useEffect(() => {
    if (!localStorage.getItem("cm.tagline.help")) {
      setShowHelp(true);
      localStorage.setItem("cm.tagline.help", "1");
    }
    return () => {
      if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
    };
  }, []);

  useEffect(() => {
    activeRowRef.current?.scrollIntoView({ block: "nearest" });
  }, [mode]);

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
      if (/^[a-zA-Z0-9 ']$/.test(event.key)) {
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
    if (bonus) return; // bonus locks entry to the theme
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
      ? session.phase === "PLAYING" &&
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
      if (correct) {
        advanceTimer.current = window.setTimeout(() => {
          setFlash(null);
          const next = nextOpenQuestion(index);
          setMode(next >= 0 ? { kind: "question", index: next } : { kind: "solve" });
          advanceTimer.current = null;
        }, 1100);
      }
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
    if (key === "GO") {
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
        className={`phrase-board${dense ? " phrase-board--dense" : ""}${
          shake ? " phrase-board--shake" : ""
        }`}
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
                effectiveMode.kind === "solve" && slot === cursorSlot && !gameOver;
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
          className={`verdict ${
            session.connectionResult === "correct"
              ? "verdict--solved"
              : "verdict--cold"
          }`}
        >
          {session.connectionResult === "correct" ? "Theme named" : "It went cold"}
        </span>
        <p className="badge" style={{ display: "block", marginTop: 6 }}>
          {puzzleResultLine(puzzle, session).toUpperCase()}
        </p>

        <div className="section">{board(true, session.connectionResult === "correct")}</div>

        <div className="section">
          <span className="kicker kicker--gold">The theme</span>
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
  const entryPlaceholder = bonus
    ? "Finish the line (+25) — or skip"
    : effectiveMode.kind === "idle"
      ? "Pick a category above"
      : effectiveMode.kind === "solve"
        ? "Type the phrase into the tiles (+25)"
        : effectiveMode.kind === "theme"
          ? `The theme is… (${themeAttemptsLeft} guess${
              themeAttemptsLeft === 1 ? "" : "es"
            })`
          : activeStatus === "open"
            ? "Type your answer — one attempt"
            : "Pick another category";

  return (
    <div className="fstage">
      <div className="fstage-inner">
        {/* header */}
        <div className="fhead">
          <span className="fhead-title">{puzzle.title || "Tagline"}</span>
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

        {board(session.solved, false)}

        {bonus ? (
          <div className="solved-strip">
            <span className="verdict verdict--solved">
              {puzzle.connection.primary}
            </span>
            <span>
              You got it! Finish the line for +25 — {attemptsLeft} attempt
              {attemptsLeft === 1 ? "" : "s"}.
            </span>
            <button
              className="btn btn--small"
              onClick={() => act({ type: "SKIP_BONUS" })}
            >
              Skip
            </button>
          </div>
        ) : (
          <>
            {/* vertical category stack */}
            <div className="cat-stack">
              {puzzle.questions.map((question, index) => {
                const status = session.questionStatus[question.id];
                const active =
                  mode.kind === "question" && mode.index === index;
                const color = CATEGORY_COLORS[index % CATEGORY_COLORS.length];
                return (
                  <div
                    key={question.id}
                    ref={active ? activeRowRef : undefined}
                    className={`cat-item${active ? " cat-item--active" : ""}${
                      status === "correct" ? " cat-item--ok" : ""
                    }${status === "wrong" ? " cat-item--bad" : ""}${
                      active && flash === "ok" ? " cat-item--flash-ok" : ""
                    }${active && flash === "bad" ? " cat-item--flash-bad" : ""}`}
                    onClick={() => switchMode({ kind: "question", index })}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="cat-item-head">
                      <span className="cat-name" style={{ background: color }}>
                        {question.subject.trim() || `Question ${index + 1}`}
                      </span>
                      <span className="cat-state">
                        {status === "correct" ? (
                          <strong className="cat-state--ok">
                            {question.answer.primary}
                          </strong>
                        ) : status === "wrong" ? (
                          <span className="cat-state--bad">✗</span>
                        ) : active ? (
                          ""
                        ) : (
                          "+"
                        )}
                      </span>
                    </div>
                    {active ? (
                      <p className="cat-question">
                        {question.prompt}
                        {status === "correct" ? (
                          <strong className="prompt-result prompt-result--ok">
                            {" "}
                            ✓ {question.answer.primary}
                          </strong>
                        ) : status === "wrong" ? (
                          <strong className="prompt-result prompt-result--bad">
                            {" "}
                            ✗ locked
                          </strong>
                        ) : null}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>

            {/* modes: the THEME is the goal, the phrase is the bonus */}
            <div className="mode-row">
              <button
                className={`qchip qchip--theme${
                  mode.kind === "theme" ? " qchip--theme-active" : ""
                }${
                  correctAnswers >= 2 &&
                  mode.kind !== "theme" &&
                  session.connectionResult === null
                    ? " qchip--tempt-gold"
                    : ""
                }`}
                disabled={session.connectionResult !== null}
                onClick={() => switchMode({ kind: "theme" })}
              >
                {session.connectionResult === "correct"
                  ? `${puzzle.connection.primary} ✓`
                  : `Name the theme${
                      mode.kind === "theme"
                        ? ` · ${themeAttemptsLeft} left`
                        : ""
                    }`}
              </button>
              <button
                className={`qchip qchip--solve${
                  mode.kind === "solve" ? " qchip--solve-active" : ""
                }`}
                disabled={
                  session.solved ||
                  session.wrongSolves.length >= SOLVE_ATTEMPTS
                }
                onClick={() => switchMode({ kind: "solve" })}
              >
                {session.solved
                  ? "Phrase ✓"
                  : session.wrongSolves.length >= SOLVE_ATTEMPTS
                    ? "Phrase ✗"
                    : `Solve the phrase +25${
                        mode.kind === "solve" ? ` · ${attemptsLeft} left` : ""
                      }`}
              </button>
            </div>
          </>
        )}

        {/* entry line */}
        <div
          className={`entry${
            effectiveMode.kind === "solve" ? " entry--solve" : ""
          }${effectiveMode.kind === "theme" ? " entry--theme" : ""}`}
        >
          <span className={`entry-text${value ? "" : " entry-text--ghost"}`}>
            {effectiveMode.kind === "solve"
              ? typed || entryPlaceholder
              : value || entryPlaceholder}
          </span>
          <button
            className={`btn btn--small ${
              effectiveMode.kind === "solve"
                ? "btn--accuse-solid"
                : "btn--primary"
            }`}
            disabled={!canSubmit}
            onClick={submit}
          >
            {effectiveMode.kind === "solve"
              ? "Solve"
              : effectiveMode.kind === "theme"
                ? "+25"
                : "Go"}
          </button>
        </div>

        {/* the game keyboard */}
        <div className="kb" aria-label="Keyboard">
          {(digits ? [DIGIT_ROW] : KEY_ROWS).map((row) => (
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
            <button
              className="kb-key kb-key--wide"
              onClick={() => setDigits((current) => !current)}
            >
              {digits ? "ABC" : "123"}
            </button>
            <button
              className="kb-key kb-key--space"
              onClick={() => pressKey("SPACE")}
            >
              ␣
            </button>
            <button className="kb-key kb-key--wide" onClick={() => pressKey("BACK")}>
              ⌫
            </button>
            <button
              className="kb-key kb-key--wide kb-key--go"
              disabled={!canSubmit}
              onClick={() => pressKey("GO")}
            >
              GO
            </button>
          </div>
        </div>
      </div>

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
                <strong>Name the theme — that's the win.</strong> All five
                answers and the phrase share one secret. {THEME_ATTEMPTS}{" "}
                guesses.
              </li>
              <li>
                <strong>Bonus: solve the phrase</strong> (+25), before or
                after. A perfect game is 100.
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
