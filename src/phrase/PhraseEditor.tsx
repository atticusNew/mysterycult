/**
 * Tagline puzzle editor — phrase, connection, five questions with letter
 * assignments, reveal, validation, preview, export/import, publish.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { PhrasePuzzle } from "./model";
import {
  blankQuestion,
  exportPuzzleToJson,
  loadPuzzleFromJson,
  PHRASE_GAME_TITLE,
} from "./model";
import { getPuzzleDraft, publishPuzzle, savePuzzleDraft } from "./store";
import { validatePuzzle, type PuzzleReport } from "./validator";

function csv(list: string[]): string {
  return list.join(", ");
}

function parseCsv(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function CsvInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (list: string[]) => void;
}) {
  const joined = csv(value);
  const [text, setText] = useState(joined);
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setText(joined);
  }, [joined, focused]);
  return (
    <input
      className="input"
      value={text}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
        setText(csv(parseCsv(text)));
      }}
      onChange={(event) => {
        setText(event.target.value);
        onChange(parseCsv(event.target.value));
      }}
    />
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="form-field">
      <label>{label}</label>
      {children}
      {hint ? (
        <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 4 }}>
          {hint}
        </div>
      ) : null}
    </div>
  );
}

export default function PhraseEditor() {
  const { draftId } = useParams();
  const navigate = useNavigate();
  const draft = useMemo(
    () => (draftId ? getPuzzleDraft(draftId) : null),
    [draftId],
  );
  const [puzzle, setPuzzle] = useState<PhrasePuzzle | null>(
    draft ? draft.puzzle : null,
  );
  const [savedAt, setSavedAt] = useState<number | null>(draft?.savedAt ?? null);
  const [dirty, setDirty] = useState(false);
  const [report, setReport] = useState<PuzzleReport | null>(null);
  const [modal, setModal] = useState<"export" | "import" | null>(null);
  const [importText, setImportText] = useState("");
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (report && puzzle) setReport(validatePuzzle(puzzle));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzle]);

  if (!draftId || !puzzle) {
    return (
      <div className="shell">
        <div className="fullpage">
          <h1>Draft not found</h1>
          <Link to="/tagline/workshop" className="btn btn--primary">
            Back to Workshop
          </Link>
        </div>
      </div>
    );
  }

  function update(patch: Partial<PhrasePuzzle>) {
    setPuzzle((current) => (current ? { ...current, ...patch } : current));
    setDirty(true);
  }

  function updateQuestion(
    index: number,
    patch: Partial<PhrasePuzzle["questions"][number]>,
  ) {
    update({
      questions: puzzle!.questions.map((question, i) =>
        i === index ? { ...question, ...patch } : question,
      ),
    });
  }

  function handleSave() {
    savePuzzleDraft(draftId!, puzzle!);
    setDirty(false);
    setSavedAt(Date.now());
  }

  function handleValidate() {
    setReport(validatePuzzle(puzzle!));
    document.getElementById("p-validation")?.scrollIntoView({ behavior: "smooth" });
  }

  function handlePublish() {
    const result = validatePuzzle(puzzle!);
    setReport(result);
    if (result.errors.length > 0) {
      alert(`Cannot publish: ${result.errors.length} structural error(s).`);
      return;
    }
    if (
      result.warnings.length > 0 &&
      !confirm(`${result.warnings.length} warning(s). Publish anyway?`)
    ) {
      return;
    }
    handleSave();
    publishPuzzle(puzzle!);
    alert("Published. The puzzle is now playable from Home.");
  }

  return (
    <div className="shell shell--wide shell--flush">
      <div className="ws-toolbar">
        <Link to="/tagline/workshop" className="btn btn--ghost btn--small">
          ← {PHRASE_GAME_TITLE}
        </Link>
        <button className="btn btn--small btn--primary" onClick={handleSave}>
          Save Draft{dirty ? " *" : ""}
        </button>
        <button className="btn btn--small" onClick={handleValidate}>
          Validate
        </button>
        <button
          className="btn btn--small"
          onClick={() => {
            handleSave();
            navigate(`/tagline/workshop/${draftId}/preview`);
          }}
        >
          Preview
        </button>
        <button className="btn btn--small" onClick={() => setModal("export")}>
          Export JSON
        </button>
        <button
          className="btn btn--small"
          onClick={() => {
            setModal("import");
            setImportErrors([]);
          }}
        >
          Import JSON
        </button>
        <button className="btn btn--small" onClick={handlePublish}>
          Publish
        </button>
        {savedAt ? (
          <span className="badge" style={{ alignSelf: "center" }}>
            SAVED {new Date(savedAt).toLocaleTimeString()}
          </span>
        ) : null}
      </div>

      {/* PUZZLE */}
      <section className="ws-section">
        <h2>Puzzle</h2>
        <div className="form-row">
          <Field label="Puzzle ID" hint="Neutral — never the connection's name.">
            <input
              className="input"
              value={puzzle.id}
              onChange={(event) => update({ id: event.target.value })}
            />
          </Field>
          <Field label="Title">
            <input
              className="input"
              value={puzzle.title}
              onChange={(event) => update({ title: event.target.value })}
              placeholder="Tagline #001"
            />
          </Field>
        </div>
        <Field
          label="The phrase"
          hint="The solve target. Famous once you know the connection. Aim for 18–35 letters (4–8 words)."
        >
          <input
            className="input"
            value={puzzle.phrase}
            onChange={(event) => update({ phrase: event.target.value })}
          />
        </Field>
        <Field
          label="Genre"
          hint="Player-visible pill that sets the arena: Movie, TV Show, Song…"
        >
          <input
            className="input"
            value={puzzle.genre}
            onChange={(event) => update({ genre: event.target.value })}
          />
        </Field>
        <div className="form-row">
          <Field label="The connection (bonus answer)">
            <input
              className="input"
              value={puzzle.connection.primary}
              onChange={(event) =>
                update({
                  connection: {
                    ...puzzle.connection,
                    primary: event.target.value,
                  },
                })
              }
            />
          </Field>
          <Field label="Connection aliases" hint="Comma-separated.">
            <CsvInput
              value={puzzle.connection.aliases}
              onChange={(aliases) =>
                update({ connection: { ...puzzle.connection, aliases } })
              }
            />
          </Field>
        </div>
        <div className="form-row">
          <Field label="Hint — category" hint="Purchasable for 10 pts, e.g. 'A movie'.">
            <input
              className="input"
              value={puzzle.hints.category}
              onChange={(event) =>
                update({ hints: { ...puzzle.hints, category: event.target.value } })
              }
            />
          </Field>
          <Field label="Hint — decade" hint="Optional, e.g. 'The 1980s'.">
            <input
              className="input"
              value={puzzle.hints.decade}
              onChange={(event) =>
                update({ hints: { ...puzzle.hints, decade: event.target.value } })
              }
            />
          </Field>
        </div>
      </section>

      {/* QUESTIONS */}
      <section className="ws-section">
        <h2>Questions</h2>
        <p className="section-note">
          Self-contained trivia; never name the connection. AT MOST ONE answer
          may come from inside the work's own story — the rest must connect
          laterally, or the theme announces itself by question two. ORDER
          MATTERS: question 1 reveals letter positions 1, 6, 11…; question 2
          reveals 2, 7, 12…; and so on. Put the easiest questions first. One
          attempt each in play.
        </p>
        {puzzle.questions.map((question, index) => (
          <div className="item-card" key={question.id}>
            <div className="item-card-head">
              <span className="kicker">Question {index + 1}</span>
              <div className="item-card-actions">
                <button
                  className="icon-btn"
                  title="Move up"
                  onClick={() => {
                    if (index === 0) return;
                    const questions = [...puzzle.questions];
                    [questions[index - 1], questions[index]] = [
                      questions[index],
                      questions[index - 1],
                    ];
                    update({ questions });
                  }}
                >
                  ↑
                </button>
                <button
                  className="icon-btn"
                  title="Move down"
                  onClick={() => {
                    if (index === puzzle.questions.length - 1) return;
                    const questions = [...puzzle.questions];
                    [questions[index], questions[index + 1]] = [
                      questions[index + 1],
                      questions[index],
                    ];
                    update({ questions });
                  }}
                >
                  ↓
                </button>
                <button
                  className="icon-btn icon-btn--danger"
                  title="Remove"
                  onClick={() =>
                    update({
                      questions: puzzle.questions.filter((_, i) => i !== index),
                    })
                  }
                >
                  ×
                </button>
              </div>
            </div>
            <Field
              label="Category"
              hint="Shown on the row, Trivial Pursuit style — e.g. History, Movies, Food."
            >
              <input
                className="input"
                value={question.subject}
                onChange={(event) =>
                  updateQuestion(index, { subject: event.target.value })
                }
              />
            </Field>
            <Field label="Prompt" hint="Keep it short — it renders as one compact row in play.">
              <textarea
                className="textarea"
                style={{ minHeight: 52 }}
                value={question.prompt}
                onChange={(event) =>
                  updateQuestion(index, { prompt: event.target.value })
                }
              />
            </Field>
            <div className="form-row">
              <Field label="Answer">
                <input
                  className="input"
                  value={question.answer.primary}
                  onChange={(event) =>
                    updateQuestion(index, {
                      answer: {
                        ...question.answer,
                        primary: event.target.value,
                      },
                    })
                  }
                />
              </Field>
              <Field label="Aliases" hint="Comma-separated.">
                <CsvInput
                  value={question.answer.aliases}
                  onChange={(aliases) =>
                    updateQuestion(index, {
                      answer: { ...question.answer, aliases },
                    })
                  }
                />
              </Field>
            </div>
            <Field label="Connection note" hint="How the answer ties to the connection. Reveal-only.">
              <textarea
                className="textarea"
                style={{ minHeight: 52 }}
                value={question.connectionNote}
                onChange={(event) =>
                  updateQuestion(index, { connectionNote: event.target.value })
                }
              />
            </Field>
          </div>
        ))}
        <button
          className="btn btn--small"
          onClick={() =>
            update({ questions: [...puzzle.questions, blankQuestion()] })
          }
        >
          + Add question
        </button>
      </section>

      {/* REVEAL */}
      <section className="ws-section">
        <h2>Reveal</h2>
        <Field label="Summary" hint="How the answers and the phrase fit the connection.">
          <textarea
            className="textarea"
            value={puzzle.reveal.summary}
            onChange={(event) =>
              update({ reveal: { ...puzzle.reveal, summary: event.target.value } })
            }
          />
        </Field>
        <Field label='"OH!" moment'>
          <textarea
            className="textarea"
            value={puzzle.reveal.ohMoment}
            onChange={(event) =>
              update({
                reveal: { ...puzzle.reveal, ohMoment: event.target.value },
              })
            }
          />
        </Field>
        <Field label="Editorial notes">
          <textarea
            className="textarea"
            value={puzzle.editorial.notes}
            onChange={(event) =>
              update({ editorial: { notes: event.target.value } })
            }
          />
        </Field>
      </section>

      {/* VALIDATION */}
      <section className="ws-section" id="p-validation">
        <h2>Validation</h2>
        {!report ? (
          <button className="btn" onClick={handleValidate}>
            Validate puzzle
          </button>
        ) : (
          <>
            {report.errors.length === 0 && report.warnings.length === 0 ? (
              <div className="issue issue--clean">
                <span className="tag">Clean</span>
                <span>No issues found.</span>
              </div>
            ) : null}
            {report.errors.map((error, index) => (
              <div className="issue issue--error" key={`e_${index}`}>
                <span className="tag">Error</span>
                <span>{error.message}</span>
              </div>
            ))}
            {report.warnings.map((warning, index) => (
              <div className="issue issue--warning" key={`w_${index}`}>
                <span className="tag">Warning</span>
                <span>{warning.message}</span>
              </div>
            ))}
          </>
        )}
      </section>

      {/* EXPORT / IMPORT */}
      {modal === "export" ? (
        <div className="overlay" onClick={() => setModal(null)}>
          <div className="sheet" onClick={(event) => event.stopPropagation()}>
            <span className="kicker">Export JSON</span>
            <textarea
              className="json-box"
              readOnly
              value={exportPuzzleToJson(puzzle)}
            />
            <div className="answer-row" style={{ marginTop: 12 }}>
              <button
                className="btn"
                onClick={async () => {
                  await navigator.clipboard?.writeText(exportPuzzleToJson(puzzle));
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
              >
                {copied ? "Copied ✓" : "Copy"}
              </button>
              <button className="btn btn--primary" onClick={() => setModal(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {modal === "import" ? (
        <div className="overlay" onClick={() => setModal(null)}>
          <div className="sheet" onClick={(event) => event.stopPropagation()}>
            <span className="kicker">Import JSON</span>
            <p className="prose">Replaces this draft's contents.</p>
            <textarea
              className="json-box"
              value={importText}
              onChange={(event) => setImportText(event.target.value)}
            />
            {importErrors.map((error) => (
              <div className="issue issue--error" key={error}>
                <span className="tag">Error</span>
                <span>{error}</span>
              </div>
            ))}
            <div className="answer-row" style={{ marginTop: 12 }}>
              <button className="btn" onClick={() => setModal(null)}>
                Cancel
              </button>
              <button
                className="btn btn--primary"
                disabled={!importText.trim()}
                onClick={() => {
                  const { puzzle: imported, errors } =
                    loadPuzzleFromJson(importText);
                  if (!imported) {
                    setImportErrors(errors);
                    return;
                  }
                  setPuzzle(imported);
                  setDirty(true);
                  setModal(null);
                  setImportText("");
                }}
              >
                Import
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
