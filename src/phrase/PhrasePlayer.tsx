/**
 * Tagline player v6 — the locked stage.
 *
 * The game is a truly fixed viewport: nothing scrolls, ever. The stage
 * resizes itself to the browser's visual viewport, so when the mobile
 * keyboard opens the whole game slides up as one piece.
 *
 * Family-Feud spatial logic, top to bottom: board → earned answers →
 * category pills → Solve/Theme → question panel (reveals beneath the
 * category you tapped) → the single input. Cause above, effect below.
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
  type PuzzleAction,
} from "./engine";

type Mode =
  | { kind: "idle" }
  | { kind: "question"; index: number }
  | { kind: "solve" }
  | { kind: "theme" };

/** Trivial Pursuit homage: stable category colors by question position. */
const CATEGORY_COLORS = ["#4e7fc4", "#c75d94", "#d97f35", "#8a63b3", "#3f8f7d"];

/** Delay before tiles cascade, so the ✓ in the panel lands first. */
const CASCADE_DELAY_MS = 300;

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
  const [stageHeight, setStageHeight] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevRevealed = useRef<Set<number>>(new Set());
  const advanceTimer = useRef<number | null>(null);

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
  const revealRatio = letters.length > 0 ? revealed.size / letters.length : 0;
  const earnedAnswers = puzzle.questions.filter(
    (question) => session.questionStatus[question.id] === "correct",
  );

  const typed =
    mode.kind === "solve"
      ? value
          .toUpperCase()
          .replace(/[^A-Z]/g, "")
          .slice(0, hiddenSlots.length)
      : "";

  // ---- fixed viewport: track the visual viewport (keyboard-aware) --------
  useEffect(() => {
    if (gameOver) return;
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      setStageHeight(vv.height);
      window.scrollTo(0, 0);
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, [gameOver]);

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

  function act(action: PuzzleAction) {
    dispatch(action);
  }

  function switchMode(next: Mode) {
    if (advanceTimer.current) {
      window.clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    }
    setMode(next);
    setValue("");
    setFlash(null);
    inputRef.current?.focus();
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
    mode.kind === "question"
      ? session.questionStatus[puzzle.questions[mode.index].id]
      : "open";

  const canSubmit =
    session.phase === "PLAYING" &&
    (mode.kind === "solve"
      ? typed.length === hiddenSlots.length && hiddenSlots.length > 0
      : mode.kind === "theme"
        ? value.trim().length > 0 && session.connectionResult === null
        : mode.kind === "question"
          ? value.trim().length > 0 && activeStatus === "open"
          : false);

  function submit() {
    if (!canSubmit) return;
    if (mode.kind === "question") {
      const index = mode.index;
      const question = puzzle.questions[index];
      const correct = looseAnswerMatches(value, question.answer);
      act({ type: "ANSWER_QUESTION", questionId: question.id, answer: value });
      setValue("");
      setFlash(correct ? "ok" : "bad");
      if (correct) {
        // Let the ✓ land, then move on to the next open category.
        advanceTimer.current = window.setTimeout(() => {
          setFlash(null);
          const next = nextOpenQuestion(index);
          setMode(next >= 0 ? { kind: "question", index: next } : { kind: "solve" });
          advanceTimer.current = null;
        }, 1100);
      }
      inputRef.current?.focus();
      return;
    }
    if (mode.kind === "solve") {
      act({ type: "ATTEMPT_SOLVE", text: assembleGuess() });
      setValue("");
      inputRef.current?.focus();
      return;
    }
    act({ type: "ATTEMPT_CONNECTION", text: value });
    setValue("");
    inputRef.current?.focus();
  }

  // ------------------------------------------------------------- the board
  const board = (revealAll: boolean, wave: boolean) => {
    let letterIndex = -1;
    let hiddenIndex = -1;
    const cursorSlot = typed.length;
    return (
      <div
        className={`phrase-board${shake ? " phrase-board--shake" : ""}`}
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
                mode.kind === "solve" && slot === cursorSlot && !gameOver;
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

        <div className="section">{board(true, session.solved)}</div>

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
  const panel = () => {
    if (mode.kind === "idle") {
      return (
        <p className="qpanel-hint">
          Pick a category — every answer is a clue to the phrase.
        </p>
      );
    }
    if (mode.kind === "solve") {
      return (
        <>
          <span className="prompt-tag prompt-tag--solve">Solve</span>
          <p className="prompt-text">
            Type the phrase into the tiles — {attemptsLeft} attempt
            {attemptsLeft === 1 ? "" : "s"} left.
            {session.wrongSolves.length > 0 ? " Not it — look again." : ""}
          </p>
        </>
      );
    }
    if (mode.kind === "theme") {
      return (
        <>
          <span className="prompt-tag prompt-tag--conn">Theme</span>
          <p className="prompt-text">
            One guess: what links all five answers — and the phrase? (+25)
          </p>
        </>
      );
    }
    const index = mode.index;
    const question = puzzle.questions[index];
    const color = CATEGORY_COLORS[index % CATEGORY_COLORS.length];
    const status = session.questionStatus[question.id];
    return (
      <>
        <span className="prompt-tag" style={{ background: color }}>
          {question.subject.trim() || `Question ${index + 1}`}
        </span>
        <p className="prompt-text">
          {question.prompt}
          {status === "correct" ? (
            <strong className="prompt-result prompt-result--ok">
              {" "}
              ✓ {question.answer.primary}
            </strong>
          ) : status === "wrong" ? (
            <strong className="prompt-result prompt-result--bad"> ✗ locked</strong>
          ) : null}
        </p>
      </>
    );
  };

  return (
    <div
      className="fstage"
      style={{ height: stageHeight ? `${stageHeight}px` : undefined }}
    >
      <div className="fstage-inner">
        {/* header */}
        <div className="pstage-top">
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

        {board(false, false)}

        {/* earned answers */}
        {earnedAnswers.length > 0 ? (
          <div className="achips achips--slim">
            {earnedAnswers.map((question) => (
              <span key={question.id} className="achip achip--ok">
                {question.answer.primary}
              </span>
            ))}
            {session.connectionResult === "correct" ? (
              <span className="achip achip--conn-ok">
                {puzzle.connection.primary} ✓
              </span>
            ) : null}
          </div>
        ) : null}

        {/* categories */}
        <div className="cat-row">
          {puzzle.questions.map((question, index) => {
            const status = session.questionStatus[question.id];
            const active = mode.kind === "question" && mode.index === index;
            const color = CATEGORY_COLORS[index % CATEGORY_COLORS.length];
            return (
              <button
                key={question.id}
                className={`cat-pill${active ? " cat-pill--active" : ""}${
                  status === "correct" ? " cat-pill--ok" : ""
                }${status === "wrong" ? " cat-pill--bad" : ""}`}
                style={{ background: color }}
                onClick={() => switchMode({ kind: "question", index })}
              >
                {question.subject.trim() || `Q${index + 1}`}
                {status === "correct" ? " ✓" : status === "wrong" ? " ✗" : ""}
              </button>
            );
          })}
        </div>

        {/* modes */}
        <div className="mode-row">
          <button
            className={`qchip qchip--solve${
              mode.kind === "solve" ? " qchip--solve-active" : ""
            }${revealRatio >= 0.6 && mode.kind !== "solve" ? " qchip--tempt" : ""}`}
            onClick={() => switchMode({ kind: "solve" })}
          >
            Solve the phrase
          </button>
          <button
            className={`qchip qchip--conn${
              session.connectionResult === "correct" ? " qchip--conn-ok" : ""
            }${session.connectionResult === "wrong" ? " qchip--bad" : ""}`}
            disabled={session.connectionResult !== null}
            onClick={() => switchMode({ kind: "theme" })}
          >
            {session.connectionResult === "correct"
              ? `${puzzle.connection.primary} ✓`
              : session.connectionResult === "wrong"
                ? "Theme ✗"
                : "Theme +25"}
          </button>
        </div>

        {/* question panel — reveals beneath the category you tapped */}
        <div
          className={`qpanel${flash === "ok" ? " qpanel--ok" : ""}${
            flash === "bad" ? " qpanel--bad" : ""
          }`}
        >
          {panel()}
        </div>

        {/* the single input */}
        <form
          className="input-bar"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <input
            ref={inputRef}
            className="input input-bar-field"
            placeholder={
              mode.kind === "idle"
                ? "Pick a category above"
                : mode.kind === "solve"
                  ? "Type the phrase…"
                  : mode.kind === "theme"
                    ? "The theme is…"
                    : activeStatus === "open"
                      ? "Your answer — one attempt"
                      : "Pick another category"
            }
            value={value}
            disabled={
              mode.kind === "idle" ||
              (mode.kind === "question" && activeStatus !== "open")
            }
            onChange={(event) => setValue(event.target.value)}
            autoCapitalize={mode.kind === "solve" ? "characters" : "words"}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          <button
            className={`btn ${
              mode.kind === "solve" ? "btn--accuse-solid" : "btn--primary"
            }`}
            type="submit"
            disabled={!canSubmit}
          >
            {mode.kind === "solve" ? "Solve" : mode.kind === "theme" ? "+25" : "Go"}
          </button>
        </form>
      </div>

      {/* bonus crescendo */}
      {session.phase === "BONUS" ? (
        <div className="overlay">
          <div className="sheet">
            <span className="verdict verdict--solved">Solved</span>
            <div style={{ margin: "16px 0" }}>{board(true, true)}</div>
            <h2>One more thing.</h2>
            <p className="prose">
              What's the theme — the link between the phrase and all five
              answers? (+25)
            </p>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (!value.trim()) return;
                act({ type: "ATTEMPT_CONNECTION", text: value });
                setValue("");
              }}
            >
              <input
                className="input"
                placeholder="The theme is…"
                value={value}
                onChange={(event) => setValue(event.target.value)}
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
                  disabled={!value.trim()}
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
                <strong>Pick a category, answer the question.</strong> One
                attempt each — correct answers light up letters.
              </li>
              <li>
                <strong>Spot the theme.</strong> All five answers — and the
                phrase — share one secret. Name it any time for +25.
              </li>
              <li>
                <strong>Solve the phrase.</strong> Tap Solve and type into the
                tiles. {SOLVE_ATTEMPTS} attempts. A perfect game is 100.
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
