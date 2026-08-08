/**
 * Case Workshop editor — visual authoring of a complete case, no raw JSON
 * required. Sections mirror the spec (§42): CASE, CULTURAL ENTITY, ENTRY
 * POINTS, CLUES, EVIDENCE, HYPOTHESES, INVESTIGATION PATHS, HINTS, REVEAL,
 * VALIDATION — plus Save Draft, Validate, Preview, Export JSON, Import JSON
 * and Publish.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type {
  CaseData,
  Clue,
  Evidence,
  EvidenceType,
} from "../models/types";
import {
  CASE_TYPE_VALUES,
  CLUE_STAGE_VALUES,
  DIAGNOSTICITY_VALUES,
  EVIDENCE_TYPE_VALUES,
  SUPPORTED_EVIDENCE_TYPES,
} from "../models/types";
import { getDraft, saveDraft } from "../authoring/draftStore";
import {
  blankClue,
  blankEntryPoint,
  blankEvidence,
  blankHint,
  blankHypothesis,
  blankPath,
} from "../authoring/newCase";
import { downloadCaseJson, exportCaseToJson, importCaseFromJson } from "../authoring/io";
import { validateCase, type ValidationReport } from "../authoring/CaseValidator";
import { CASE_WORKSHEET_TEMPLATE } from "../authoring/worksheetTemplate";
import { publishCase } from "../data/caseLibrary";

const SECTIONS = [
  ["case", "Case"],
  ["entity", "Cultural Entity"],
  ["entry-points", "Entry Points"],
  ["clues", "Clues"],
  ["evidence", "Evidence"],
  ["hypotheses", "Hypotheses"],
  ["paths", "Investigation Paths"],
  ["hints", "Hints"],
  ["reveal", "Reveal"],
  ["validation", "Validation"],
] as const;

function csv(list: string[]): string {
  return list.join(", ");
}

function parseCsv(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function lines(list: string[]): string {
  return list.join("\n");
}

function parseLines(value: string): string[] {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * Comma-separated list input. Keeps the raw text the author is typing in
 * local state (so commas/spaces aren't stripped mid-keystroke) and only
 * normalizes the display when the field loses focus.
 */
function CsvInput({
  value,
  onChange,
  placeholder,
  disabled,
}: {
  value: string[];
  onChange: (list: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
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
      placeholder={placeholder}
      disabled={disabled}
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

/** One-item-per-line textarea with the same free-typing behaviour as CsvInput. */
function LinesTextarea({
  value,
  onChange,
}: {
  value: string[];
  onChange: (list: string[]) => void;
}) {
  const joined = lines(value);
  const [text, setText] = useState(joined);
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setText(joined);
  }, [joined, focused]);
  return (
    <textarea
      className="textarea"
      value={text}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
        setText(lines(parseLines(text)));
      }}
      onChange={(event) => {
        setText(event.target.value);
        onChange(parseLines(event.target.value));
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
        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
          {hint}
        </div>
      ) : null}
    </div>
  );
}

export default function WorkshopEditor() {
  const { draftId } = useParams();
  const navigate = useNavigate();
  const draft = useMemo(() => (draftId ? getDraft(draftId) : null), [draftId]);

  const [caseData, setCaseData] = useState<CaseData | null>(
    draft ? draft.caseData : null,
  );
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(draft?.savedAt ?? null);
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [modal, setModal] = useState<"export" | "import" | "worksheet" | null>(
    null,
  );
  const [importText, setImportText] = useState("");
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Live-refresh the validation panel once it has been opened.
  useEffect(() => {
    if (report && caseData) setReport(validateCase(caseData));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseData]);

  if (!draftId || !caseData) {
    return (
      <div className="shell">
        <div className="fullpage">
          <h1>Draft not found</h1>
          <Link to="/workshop" className="btn btn--primary">
            Back to Workshop
          </Link>
        </div>
      </div>
    );
  }

  function update(patch: Partial<CaseData>) {
    setCaseData((current) => (current ? { ...current, ...patch } : current));
    setDirty(true);
  }

  function updateClue(index: number, patch: Partial<Clue>) {
    const clues = caseData!.clues.map((clue, i) =>
      i === index ? { ...clue, ...patch } : clue,
    );
    update({ clues });
  }

  function updateEvidence(index: number, patch: Partial<Evidence>) {
    const evidence = caseData!.evidence.map((item, i) =>
      i === index ? { ...item, ...patch } : item,
    );
    update({ evidence });
  }

  function move<T>(list: T[], index: number, delta: number): T[] {
    const target = index + delta;
    if (target < 0 || target >= list.length) return list;
    const next = [...list];
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  }

  function handleSave() {
    saveDraft(draftId!, caseData!);
    setDirty(false);
    setSavedAt(Date.now());
  }

  function handleValidate() {
    setReport(validateCase(caseData!));
    document
      .getElementById("validation")
      ?.scrollIntoView({ behavior: "smooth" });
  }

  function handlePreview() {
    handleSave();
    navigate(`/workshop/${draftId}/preview`);
  }

  function handlePublish() {
    const result = validateCase(caseData!);
    setReport(result);
    if (result.errors.length > 0) {
      alert(
        `Cannot publish: the case has ${result.errors.length} structural error(s). See the Validation section.`,
      );
      document
        .getElementById("validation")
        ?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    if (
      result.warnings.length > 0 &&
      !confirm(
        `The case has ${result.warnings.length} editorial warning(s). Publish anyway?`,
      )
    ) {
      return;
    }
    handleSave();
    publishCase(caseData!);
    alert("Published. The case is now playable from Home.");
  }

  function handleImport(text: string) {
    const { caseData: imported, errors } = importCaseFromJson(text);
    if (!imported) {
      setImportErrors(errors);
      return;
    }
    setCaseData(imported);
    setDirty(true);
    setModal(null);
    setImportText("");
    setImportErrors([]);
  }

  const evidenceOptions = caseData.evidence.map((item, index) => ({
    id: item.id,
    label: `Evidence ${index + 1} — ${item.type}${
      item.content ? ` — ${item.content.slice(0, 32)}` : ""
    }`,
  }));

  const nodeOptions = [
    ...caseData.clues.map((clue, index) => ({
      id: clue.id,
      label: `Clue ${index + 1}`,
    })),
    ...caseData.evidence.map((item, index) => ({
      id: item.id,
      label: `Evidence ${index + 1}`,
    })),
  ];

  return (
    <div className="shell shell--wide shell--flush">
      <div className="ws-toolbar">
        <Link to="/workshop" className="btn btn--ghost btn--small">
          ← Workshop
        </Link>
        <button className="btn btn--small btn--primary" onClick={handleSave}>
          Save Draft{dirty ? " *" : ""}
        </button>
        <button className="btn btn--small" onClick={handleValidate}>
          Validate
        </button>
        <button className="btn btn--small" onClick={handlePreview}>
          Preview Case
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
        <button
          className="btn btn--small btn--ghost"
          onClick={() => setModal("worksheet")}
        >
          Worksheet
        </button>
        {savedAt ? (
          <span className="badge" style={{ alignSelf: "center" }}>
            SAVED {new Date(savedAt).toLocaleTimeString()}
          </span>
        ) : null}
      </div>

      <nav className="ws-nav">
        {SECTIONS.map(([id, label]) => (
          <a key={id} href={`#${id}`}>
            {label}
          </a>
        ))}
      </nav>

      {/* ================================================================ CASE */}
      <section className="ws-section" id="case">
        <h2>Case</h2>
        <div className="form-row">
          <Field label="Case ID">
            <input
              className="input"
              value={caseData.id}
              onChange={(event) => update({ id: event.target.value })}
            />
          </Field>
          <Field label="Title">
            <input
              className="input"
              value={caseData.title}
              onChange={(event) => update({ title: event.target.value })}
              placeholder="Case #001"
            />
          </Field>
        </div>
        <Field label="Mystery question">
          <input
            className="input"
            value={caseData.question}
            onChange={(event) => update({ question: event.target.value })}
            placeholder="What are we looking for?"
          />
        </Field>
        <div className="form-row">
          <Field label="Final answer">
            <input
              className="input"
              value={caseData.answer.primary}
              onChange={(event) =>
                update({
                  answer: { ...caseData.answer, primary: event.target.value },
                })
              }
            />
          </Field>
          <Field
            label="Answer aliases"
            hint="Comma-separated accepted variants."
          >
            <CsvInput
              value={caseData.answer.aliases}
              onChange={(aliases) =>
                update({ answer: { ...caseData.answer, aliases } })
              }
            />
          </Field>
        </div>
        <div className="form-row">
          <Field label="Case type">
            <select
              className="select"
              value={caseData.type}
              onChange={(event) => update({ type: event.target.value })}
            >
              <option value="">— select —</option>
              {CASE_TYPE_VALUES.map((value) => (
                <option key={value} value={value}>
                  {value.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Category" hint="Primary domain, e.g. music, film…">
            <input
              className="input"
              value={caseData.category}
              onChange={(event) => update({ category: event.target.value })}
            />
          </Field>
        </div>
      </section>

      {/* ====================================================== CULTURAL ENTITY */}
      <section className="ws-section" id="entity">
        <h2>Cultural Entity</h2>
        <p className="section-note">
          Editorial metadata about the answer. Never shown to the player.
        </p>
        <div className="form-row">
          <Field label="Entity name">
            <input
              className="input"
              value={caseData.entity?.name ?? ""}
              onChange={(event) => {
                const name = event.target.value;
                const id = name
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "_")
                  .replace(/^_+|_+$/g, "");
                update({
                  entity: {
                    id: id || "entity",
                    name,
                    type: caseData.entity?.type ?? "",
                    recognition: caseData.entity?.recognition ?? "",
                    longevity: caseData.entity?.longevity ?? "",
                    connectionDensity: caseData.entity?.connectionDensity ?? "",
                    eras: caseData.entity?.eras ?? [],
                    domains: caseData.entity?.domains ?? [],
                  },
                  entityId: id || null,
                });
              }}
            />
          </Field>
          <Field label="Recognition">
            <select
              className="select"
              value={caseData.entity?.recognition ?? ""}
              onChange={(event) =>
                caseData.entity &&
                update({
                  entity: { ...caseData.entity, recognition: event.target.value },
                })
              }
              disabled={!caseData.entity}
            >
              <option value="">— select —</option>
              <option value="niche">niche</option>
              <option value="moderate">moderate</option>
              <option value="broad">broad</option>
              <option value="universal">universal</option>
            </select>
          </Field>
        </div>
        <div className="form-row">
          <Field label="Longevity">
            <select
              className="select"
              value={caseData.entity?.longevity ?? ""}
              onChange={(event) =>
                caseData.entity &&
                update({
                  entity: { ...caseData.entity, longevity: event.target.value },
                })
              }
              disabled={!caseData.entity}
            >
              <option value="">— select —</option>
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
            </select>
          </Field>
          <Field label="Connection density">
            <select
              className="select"
              value={caseData.entity?.connectionDensity ?? ""}
              onChange={(event) =>
                caseData.entity &&
                update({
                  entity: {
                    ...caseData.entity,
                    connectionDensity: event.target.value,
                  },
                })
              }
              disabled={!caseData.entity}
            >
              <option value="">— select —</option>
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
            </select>
          </Field>
        </div>
        <div className="form-row">
          <Field label="Domains" hint="Comma-separated, e.g. music, film, history.">
            <CsvInput
              value={caseData.entity?.domains ?? []}
              onChange={(domains) =>
                caseData.entity &&
                update({ entity: { ...caseData.entity, domains } })
              }
              disabled={!caseData.entity}
            />
          </Field>
          <Field label="Eras" hint="Comma-separated, e.g. 1970s, 1980s.">
            <CsvInput
              value={caseData.entity?.eras ?? []}
              onChange={(eras) =>
                caseData.entity &&
                update({ entity: { ...caseData.entity, eras } })
              }
              disabled={!caseData.entity}
            />
          </Field>
        </div>
      </section>

      {/* ========================================================= ENTRY POINTS */}
      <section className="ws-section" id="entry-points">
        <h2>Entry Points</h2>
        <p className="section-note">
          Legitimate cultural pathways into the mystery — music, film, history,
          sports, science… Add as many as the case supports (aim for at least
          2–3).
        </p>
        {caseData.editorial.entryPoints.map((entry, index) => (
          <div className="item-card" key={entry.id}>
            <div className="item-card-head">
              <span className="kicker">Entry Point {index + 1}</span>
              <div className="item-card-actions">
                <button
                  className="icon-btn icon-btn--danger"
                  title="Remove"
                  onClick={() =>
                    update({
                      editorial: {
                        ...caseData.editorial,
                        entryPoints: caseData.editorial.entryPoints.filter(
                          (_, i) => i !== index,
                        ),
                      },
                    })
                  }
                >
                  ×
                </button>
              </div>
            </div>
            <div className="form-row">
              <Field label="Domain">
                <input
                  className="input"
                  placeholder="e.g. Music"
                  value={entry.domain}
                  onChange={(event) =>
                    update({
                      editorial: {
                        ...caseData.editorial,
                        entryPoints: caseData.editorial.entryPoints.map(
                          (item, i) =>
                            i === index
                              ? { ...item, domain: event.target.value }
                              : item,
                        ),
                      },
                    })
                  }
                />
              </Field>
              <Field label="Relevant clue">
                <select
                  className="select"
                  value={entry.clueId ?? ""}
                  onChange={(event) =>
                    update({
                      editorial: {
                        ...caseData.editorial,
                        entryPoints: caseData.editorial.entryPoints.map(
                          (item, i) =>
                            i === index
                              ? { ...item, clueId: event.target.value || null }
                              : item,
                        ),
                      },
                    })
                  }
                >
                  <option value="">— none —</option>
                  {caseData.clues.map((clue, clueIndex) => (
                    <option key={clue.id} value={clue.id}>
                      Clue {clueIndex + 1}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Why someone might recognize it">
              <textarea
                className="textarea"
                value={entry.description}
                onChange={(event) =>
                  update({
                    editorial: {
                      ...caseData.editorial,
                      entryPoints: caseData.editorial.entryPoints.map(
                        (item, i) =>
                          i === index
                            ? { ...item, description: event.target.value }
                            : item,
                      ),
                    },
                  })
                }
              />
            </Field>
          </div>
        ))}
        <button
          className="btn btn--small"
          onClick={() =>
            update({
              editorial: {
                ...caseData.editorial,
                entryPoints: [
                  ...caseData.editorial.entryPoints,
                  blankEntryPoint(),
                ],
              },
            })
          }
        >
          + Add entry point
        </button>
      </section>

      {/* ================================================================ CLUES */}
      <section className="ws-section" id="clues">
        <h2>Clues</h2>
        <p className="section-note">
          A clue is something the player solves. The evidence it unlocks does
          NOT have to be the clue's answer.
        </p>
        {caseData.clues.map((clue, index) => (
          <div className="item-card" key={clue.id}>
            <div className="item-card-head">
              <span className="kicker">Clue {index + 1}</span>
              <div className="item-card-actions">
                <button
                  className="icon-btn"
                  title="Move up"
                  onClick={() => update({ clues: move(caseData.clues, index, -1) })}
                >
                  ↑
                </button>
                <button
                  className="icon-btn"
                  title="Move down"
                  onClick={() => update({ clues: move(caseData.clues, index, 1) })}
                >
                  ↓
                </button>
                <button
                  className="icon-btn icon-btn--danger"
                  title="Remove"
                  onClick={() =>
                    update({
                      clues: caseData.clues.filter((_, i) => i !== index),
                    })
                  }
                >
                  ×
                </button>
              </div>
            </div>
            <Field label="Clue text">
              <textarea
                className="textarea"
                value={clue.prompt}
                onChange={(event) =>
                  updateClue(index, { prompt: event.target.value })
                }
              />
            </Field>
            <div className="form-row">
              <Field label="Expected answer">
                <input
                  className="input"
                  value={clue.answer.primary}
                  onChange={(event) =>
                    updateClue(index, {
                      answer: { ...clue.answer, primary: event.target.value },
                    })
                  }
                />
              </Field>
              <Field label="Accepted aliases" hint="Comma-separated.">
                <CsvInput
                  value={clue.answer.aliases}
                  onChange={(aliases) =>
                    updateClue(index, {
                      answer: { ...clue.answer, aliases },
                    })
                  }
                />
              </Field>
            </div>
            <div className="form-row">
              <Field label="Clue type">
                <select
                  className="select"
                  value={clue.type}
                  onChange={(event) =>
                    updateClue(index, { type: event.target.value })
                  }
                >
                  <option value="text">text</option>
                </select>
              </Field>
              <Field label="Stage">
                <select
                  className="select"
                  value={clue.stage}
                  onChange={(event) =>
                    updateClue(index, {
                      stage: event.target.value as Clue["stage"],
                    })
                  }
                >
                  {CLUE_STAGE_VALUES.map((stage) => (
                    <option key={stage} value={stage}>
                      {stage}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field
              label="Linked evidence"
              hint="Unlocked when the clue is solved."
            >
              <select
                className="select"
                value={clue.evidenceId ?? ""}
                onChange={(event) =>
                  updateClue(index, { evidenceId: event.target.value || null })
                }
              >
                <option value="">— none —</option>
                {evidenceOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
            <div className="form-row">
              <Field label="Author note — why fair">
                <textarea
                  className="textarea"
                  style={{ minHeight: 52 }}
                  value={clue.authorNotes.whyFair ?? ""}
                  onChange={(event) =>
                    updateClue(index, {
                      authorNotes: {
                        ...clue.authorNotes,
                        whyFair: event.target.value,
                      },
                    })
                  }
                />
              </Field>
              <Field label="Author note — connection">
                <textarea
                  className="textarea"
                  style={{ minHeight: 52 }}
                  value={clue.authorNotes.connection ?? ""}
                  onChange={(event) =>
                    updateClue(index, {
                      authorNotes: {
                        ...clue.authorNotes,
                        connection: event.target.value,
                      },
                    })
                  }
                />
              </Field>
            </div>
          </div>
        ))}
        <button
          className="btn btn--small"
          onClick={() => update({ clues: [...caseData.clues, blankClue()] })}
        >
          + Add clue
        </button>
      </section>

      {/* ============================================================= EVIDENCE */}
      <section className="ws-section" id="evidence">
        <h2>Evidence</h2>
        <p className="section-note">
          What the player receives after solving a clue. Diagnosticity controls
          the mystery's progression: LOW is ambiguous, CONCLUSIVE is
          undeniable.
        </p>
        {caseData.evidence.map((item, index) => (
          <div className="item-card" key={item.id}>
            <div className="item-card-head">
              <span className="kicker">Evidence {index + 1}</span>
              <div className="item-card-actions">
                <button
                  className="icon-btn"
                  title="Move up"
                  onClick={() =>
                    update({ evidence: move(caseData.evidence, index, -1) })
                  }
                >
                  ↑
                </button>
                <button
                  className="icon-btn"
                  title="Move down"
                  onClick={() =>
                    update({ evidence: move(caseData.evidence, index, 1) })
                  }
                >
                  ↓
                </button>
                <button
                  className="icon-btn icon-btn--danger"
                  title="Remove"
                  onClick={() =>
                    update({
                      evidence: caseData.evidence.filter((_, i) => i !== index),
                      clues: caseData.clues.map((clue) =>
                        clue.evidenceId === item.id
                          ? { ...clue, evidenceId: null }
                          : clue,
                      ),
                    })
                  }
                >
                  ×
                </button>
              </div>
            </div>
            <div className="form-row">
              <Field label="Evidence type">
                <select
                  className="select"
                  value={item.type}
                  onChange={(event) =>
                    updateEvidence(index, {
                      type: event.target.value as EvidenceType,
                    })
                  }
                >
                  {EVIDENCE_TYPE_VALUES.map((type) => (
                    <option key={type} value={type}>
                      {type.replace(/_/g, " ")}
                      {SUPPORTED_EVIDENCE_TYPES.includes(type)
                        ? ""
                        : " (future)"}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Diagnosticity">
                <select
                  className="select"
                  value={item.diagnosticity}
                  onChange={(event) =>
                    updateEvidence(index, {
                      diagnosticity: event.target
                        .value as Evidence["diagnosticity"],
                    })
                  }
                >
                  {DIAGNOSTICITY_VALUES.map((level) => (
                    <option key={level} value={level}>
                      {level.toUpperCase()}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field
              label={
                item.type === "image" || item.type === "cropped_image"
                  ? "Image URL / path"
                  : "Content"
              }
              hint={
                item.type === "quote"
                  ? "The quote text, without quotation marks."
                  : item.type === "number"
                    ? "The number, e.g. 1985."
                    : undefined
              }
            >
              <textarea
                className="textarea"
                style={{ minHeight: 52 }}
                value={item.content}
                onChange={(event) =>
                  updateEvidence(index, { content: event.target.value })
                }
              />
            </Field>
            {(item.type === "image" || item.type === "cropped_image") &&
            item.content ? (
              <img
                src={item.content}
                alt="Evidence preview"
                style={{ maxWidth: 200, borderRadius: 8, marginBottom: 12 }}
              />
            ) : null}
            <div className="form-row">
              <Field label="Caption (optional, player-visible)">
                <input
                  className="input"
                  value={item.caption ?? ""}
                  onChange={(event) =>
                    updateEvidence(index, {
                      caption: event.target.value || null,
                    })
                  }
                />
              </Field>
              <Field label="Related entities" hint="Comma-separated. Editorial only.">
                <CsvInput
                  value={item.relatedEntities}
                  onChange={(relatedEntities) =>
                    updateEvidence(index, { relatedEntities })
                  }
                />
              </Field>
            </div>
            <Field label="Why it matters (author explanation)">
              <textarea
                className="textarea"
                style={{ minHeight: 52 }}
                value={item.authorNotes.meaning ?? ""}
                onChange={(event) =>
                  updateEvidence(index, {
                    authorNotes: {
                      ...item.authorNotes,
                      meaning: event.target.value,
                    },
                  })
                }
              />
            </Field>
          </div>
        ))}
        <button
          className="btn btn--small"
          onClick={() =>
            update({ evidence: [...caseData.evidence, blankEvidence()] })
          }
        >
          + Add evidence
        </button>
      </section>

      {/* =========================================================== HYPOTHESES */}
      <section className="ws-section" id="hypotheses">
        <h2>Hypotheses</h2>
        <p className="section-note">
          The suspect pool. Every early piece of evidence should fit more than
          one suspect; each suspect should die on a specific later piece.
          Document at least two plausible wrong theories, what supports them,
          which evidence breaks them — and keep exactly one smoking gun for
          the end.
        </p>
        {caseData.editorial.hypotheses.map((hypothesis, index) => (
          <div className="item-card" key={hypothesis.id}>
            <div className="item-card-head">
              <span className="kicker">Hypothesis {index + 1}</span>
              <div className="item-card-actions">
                <button
                  className="icon-btn icon-btn--danger"
                  title="Remove"
                  onClick={() =>
                    update({
                      editorial: {
                        ...caseData.editorial,
                        hypotheses: caseData.editorial.hypotheses.filter(
                          (_, i) => i !== index,
                        ),
                      },
                    })
                  }
                >
                  ×
                </button>
              </div>
            </div>
            <Field label="Plausible hypothesis">
              <input
                className="input"
                value={hypothesis.hypothesis}
                onChange={(event) =>
                  update({
                    editorial: {
                      ...caseData.editorial,
                      hypotheses: caseData.editorial.hypotheses.map((item, i) =>
                        i === index
                          ? { ...item, hypothesis: event.target.value }
                          : item,
                      ),
                    },
                  })
                }
              />
            </Field>
            <div className="form-row">
              <Field label="Supporting evidence">
                <textarea
                  className="textarea"
                  style={{ minHeight: 52 }}
                  value={hypothesis.supportingEvidence}
                  onChange={(event) =>
                    update({
                      editorial: {
                        ...caseData.editorial,
                        hypotheses: caseData.editorial.hypotheses.map(
                          (item, i) =>
                            i === index
                              ? { ...item, supportingEvidence: event.target.value }
                              : item,
                        ),
                      },
                    })
                  }
                />
              </Field>
              <Field label="Weakening evidence">
                <textarea
                  className="textarea"
                  style={{ minHeight: 52 }}
                  value={hypothesis.weakeningEvidence}
                  onChange={(event) =>
                    update({
                      editorial: {
                        ...caseData.editorial,
                        hypotheses: caseData.editorial.hypotheses.map(
                          (item, i) =>
                            i === index
                              ? { ...item, weakeningEvidence: event.target.value }
                              : item,
                        ),
                      },
                    })
                  }
                />
              </Field>
            </div>
            <Field label="Eventual resolution">
              <textarea
                className="textarea"
                style={{ minHeight: 52 }}
                value={hypothesis.resolution}
                onChange={(event) =>
                  update({
                    editorial: {
                      ...caseData.editorial,
                      hypotheses: caseData.editorial.hypotheses.map((item, i) =>
                        i === index
                          ? { ...item, resolution: event.target.value }
                          : item,
                      ),
                    },
                  })
                }
              />
            </Field>
          </div>
        ))}
        <button
          className="btn btn--small"
          onClick={() =>
            update({
              editorial: {
                ...caseData.editorial,
                hypotheses: [
                  ...caseData.editorial.hypotheses,
                  blankHypothesis(),
                ],
              },
            })
          }
        >
          + Add hypothesis
        </button>
      </section>

      {/* ================================================== INVESTIGATION PATHS */}
      <section className="ws-section" id="paths">
        <h2>Investigation Paths</h2>
        <p className="section-note">
          Alternate legitimate routes through the case. The player never sees
          these; they verify the case supports multiple approaches.
        </p>
        {caseData.investigationPaths.map((path, index) => (
          <div className="item-card" key={path.id}>
            <div className="item-card-head">
              <span className="kicker">Path {index + 1}</span>
              <div className="item-card-actions">
                <button
                  className="icon-btn icon-btn--danger"
                  title="Remove"
                  onClick={() =>
                    update({
                      investigationPaths: caseData.investigationPaths.filter(
                        (_, i) => i !== index,
                      ),
                    })
                  }
                >
                  ×
                </button>
              </div>
            </div>
            <div className="form-row">
              <Field label="Path name">
                <input
                  className="input"
                  placeholder="e.g. Music route"
                  value={path.name}
                  onChange={(event) =>
                    update({
                      investigationPaths: caseData.investigationPaths.map(
                        (item, i) =>
                          i === index
                            ? { ...item, name: event.target.value }
                            : item,
                      ),
                    })
                  }
                />
              </Field>
              <Field label="Starting point">
                <input
                  className="input"
                  placeholder="Where this route begins"
                  value={path.startingPoint}
                  onChange={(event) =>
                    update({
                      investigationPaths: caseData.investigationPaths.map(
                        (item, i) =>
                          i === index
                            ? { ...item, startingPoint: event.target.value }
                            : item,
                      ),
                    })
                  }
                />
              </Field>
            </div>
            <Field label="Clues & evidence on this route">
              <div className="checkbox-chips">
                {nodeOptions.length === 0 ? (
                  <span className="badge">ADD CLUES AND EVIDENCE FIRST</span>
                ) : (
                  nodeOptions.map((option) => {
                    const checked = path.nodes.includes(option.id);
                    return (
                      <label
                        key={option.id}
                        className={checked ? "checked" : ""}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            update({
                              investigationPaths:
                                caseData.investigationPaths.map((item, i) =>
                                  i === index
                                    ? {
                                        ...item,
                                        nodes: checked
                                          ? item.nodes.filter(
                                              (node) => node !== option.id,
                                            )
                                          : [...item.nodes, option.id],
                                      }
                                    : item,
                                ),
                            })
                          }
                        />
                        {option.label}
                      </label>
                    );
                  })
                )}
              </div>
            </Field>
            <Field label="Target" hint="What this route converges on.">
              <input
                className="input"
                value={path.target}
                onChange={(event) =>
                  update({
                    investigationPaths: caseData.investigationPaths.map(
                      (item, i) =>
                        i === index
                          ? { ...item, target: event.target.value }
                          : item,
                    ),
                  })
                }
              />
            </Field>
          </div>
        ))}
        <button
          className="btn btn--small"
          onClick={() =>
            update({
              investigationPaths: [...caseData.investigationPaths, blankPath()],
            })
          }
        >
          + Add investigation path
        </button>
      </section>

      {/* ================================================================ HINTS */}
      <section className="ws-section" id="hints">
        <h2>Hints</h2>
        <p className="section-note">
          Investigative hints that improve reasoning, e.g. "Two pieces of
          evidence may belong to the same story." Never "the answer starts
          with…".
        </p>
        {caseData.hints.map((hint, index) => (
          <div className="item-card" key={hint.id}>
            <div className="item-card-head">
              <span className="kicker">Hint {index + 1}</span>
              <div className="item-card-actions">
                <button
                  className="icon-btn icon-btn--danger"
                  title="Remove"
                  onClick={() =>
                    update({
                      hints: caseData.hints.filter((_, i) => i !== index),
                    })
                  }
                >
                  ×
                </button>
              </div>
            </div>
            <textarea
              className="textarea"
              style={{ minHeight: 52 }}
              value={hint.text}
              onChange={(event) =>
                update({
                  hints: caseData.hints.map((item, i) =>
                    i === index ? { ...item, text: event.target.value } : item,
                  ),
                })
              }
            />
          </div>
        ))}
        <button
          className="btn btn--small"
          onClick={() => update({ hints: [...caseData.hints, blankHint()] })}
        >
          + Add hint
        </button>
      </section>

      {/* =============================================================== REVEAL */}
      <section className="ws-section" id="reveal">
        <h2>Reveal</h2>
        <p className="section-note">
          The reveal is the reward. Explain the case without making the player
          feel the game solved it for them.
        </p>
        <Field label="Final explanation (answer explanation)">
          <textarea
            className="textarea"
            value={caseData.reveal.summary}
            onChange={(event) =>
              update({
                reveal: { ...caseData.reveal, summary: event.target.value },
              })
            }
          />
        </Field>
        {caseData.clues.map((clue, index) => {
          const existing = caseData.reveal.clueExplanations.find(
            (item) => item.clueId === clue.id,
          );
          return (
            <Field
              key={clue.id}
              label={`Clue ${index + 1} → evidence explanation`}
              hint={clue.prompt ? `Clue: "${clue.prompt.slice(0, 60)}"` : undefined}
            >
              <textarea
                className="textarea"
                style={{ minHeight: 52 }}
                value={existing?.explanation ?? ""}
                onChange={(event) => {
                  const rest = caseData.reveal.clueExplanations.filter(
                    (item) => item.clueId !== clue.id,
                  );
                  update({
                    reveal: {
                      ...caseData.reveal,
                      clueExplanations: [
                        ...rest,
                        { clueId: clue.id, explanation: event.target.value },
                      ],
                    },
                  });
                }}
              />
            </Field>
          );
        })}
        <Field label="Evidence → answer explanation">
          <textarea
            className="textarea"
            value={caseData.reveal.evidenceToAnswer}
            onChange={(event) =>
              update({
                reveal: {
                  ...caseData.reveal,
                  evidenceToAnswer: event.target.value,
                },
              })
            }
          />
        </Field>
        <div className="form-row">
          <Field label="Major cultural connections" hint="One per line.">
            <LinesTextarea
              value={caseData.reveal.majorConnections}
              onChange={(majorConnections) =>
                update({ reveal: { ...caseData.reveal, majorConnections } })
              }
            />
          </Field>
          <Field label="Alternate paths" hint="One per line.">
            <LinesTextarea
              value={caseData.reveal.alternatePaths}
              onChange={(alternatePaths) =>
                update({ reveal: { ...caseData.reveal, alternatePaths } })
              }
            />
          </Field>
        </div>
        <Field label='Intended "OH!" moment'>
          <textarea
            className="textarea"
            value={caseData.reveal.ohMoment}
            onChange={(event) =>
              update({
                reveal: { ...caseData.reveal, ohMoment: event.target.value },
              })
            }
          />
        </Field>
      </section>

      {/* =========================================================== VALIDATION */}
      <section className="ws-section" id="validation">
        <h2>Validation</h2>
        {!report ? (
          <button className="btn" onClick={handleValidate}>
            Validate case
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
            <p className="section-note" style={{ marginTop: 12 }}>
              Errors are structural and block publishing. Warnings are
              editorial guidance — they never block saving, previewing or
              exporting.
            </p>
          </>
        )}
      </section>

      {/* ======================================================== EXPORT MODAL */}
      {modal === "export" ? (
        <div className="overlay" onClick={() => setModal(null)}>
          <div className="sheet" onClick={(event) => event.stopPropagation()}>
            <span className="kicker">Export JSON</span>
            <h2>{caseData.title || "Untitled Case"}</h2>
            <textarea
              className="json-box"
              readOnly
              value={exportCaseToJson(caseData)}
            />
            <div className="answer-row" style={{ marginTop: 12 }}>
              <button
                className="btn"
                onClick={async () => {
                  await navigator.clipboard?.writeText(
                    exportCaseToJson(caseData),
                  );
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
              >
                {copied ? "Copied ✓" : "Copy"}
              </button>
              <button
                className="btn btn--primary"
                onClick={() => downloadCaseJson(caseData)}
              >
                Download .json
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ======================================================== IMPORT MODAL */}
      {modal === "import" ? (
        <div className="overlay" onClick={() => setModal(null)}>
          <div className="sheet" onClick={(event) => event.stopPropagation()}>
            <span className="kicker">Import JSON</span>
            <h2>Replace this draft</h2>
            <p className="prose">
              Paste case JSON or choose a file. It replaces the current draft
              contents (save afterwards to keep it).
            </p>
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
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              style={{ display: "none" }}
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                handleImport(await file.text());
              }}
            />
            <div className="answer-row" style={{ marginTop: 12 }}>
              <button
                className="btn"
                onClick={() => fileInputRef.current?.click()}
              >
                Choose file…
              </button>
              <button
                className="btn btn--primary"
                disabled={!importText.trim()}
                onClick={() => handleImport(importText)}
              >
                Import
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ===================================================== WORKSHEET MODAL */}
      {modal === "worksheet" ? (
        <div className="overlay" onClick={() => setModal(null)}>
          <div className="sheet" onClick={(event) => event.stopPropagation()}>
            <span className="kicker">New-case worksheet</span>
            <h2>Blank Case Worksheet</h2>
            <pre className="worksheet">{CASE_WORKSHEET_TEMPLATE}</pre>
            <div className="answer-row" style={{ marginTop: 12 }}>
              <button
                className="btn"
                onClick={() =>
                  navigator.clipboard?.writeText(CASE_WORKSHEET_TEMPLATE)
                }
              >
                Copy worksheet
              </button>
              <button className="btn btn--primary" onClick={() => setModal(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
