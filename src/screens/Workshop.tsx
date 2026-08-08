/**
 * Case Workshop home: draft list, New Case (with the blank worksheet
 * template), and JSON import.
 */
import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { blankCase } from "../authoring/newCase";
import { deleteDraft, listDrafts, saveDraft } from "../authoring/draftStore";
import { importCaseFromJson } from "../authoring/io";
import { CASE_WORKSHEET_TEMPLATE } from "../authoring/worksheetTemplate";
import { listPublishedCases, unpublishCase } from "../data/caseLibrary";
import { parseCase } from "../data/schema";
import { isCleanHome, setCleanHome } from "../app/settings";
import jonStewartTestCase from "../data/cases/case_jon_stewart_test.json";
import caseTwo from "../data/cases/case_002.json";
import caseThree from "../data/cases/case_003.json";
import caseFour from "../data/cases/case_004.json";
import caseFive from "../data/cases/case_005.json";

export default function Workshop() {
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState(listDrafts);
  const [published, setPublished] = useState(listPublishedCases);
  const [showWorksheet, setShowWorksheet] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [cleanHome, setCleanHomeState] = useState(isCleanHome);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleNewCase() {
    const caseData = blankCase();
    saveDraft(caseData.id, caseData);
    navigate(`/workshop/${caseData.id}`);
  }

  function handleLoadBundled(raw: unknown) {
    const { caseData } = parseCase(raw);
    if (!caseData) return;
    saveDraft(caseData.id, caseData);
    navigate(`/workshop/${caseData.id}`);
  }

  function handleImport(text: string) {
    const { caseData, errors } = importCaseFromJson(text);
    if (!caseData) {
      setImportErrors(errors);
      return;
    }
    saveDraft(caseData.id, caseData);
    navigate(`/workshop/${caseData.id}`);
  }

  return (
    <div className="shell shell--wide shell--flush">
      <div className="case-topbar">
        <span className="kicker">Case Workshop</span>
        <Link to="/" className="btn btn--ghost btn--small">
          Home
        </Link>
      </div>

      <h1 className="display">Case Workshop</h1>
      <p className="prose" style={{ maxWidth: "56ch" }}>
        Author cases without touching raw JSON. Create a case, validate it,
        preview it exactly as a player would experience it, then export or
        publish.
      </p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 18 }}>
        <button className="btn btn--primary" onClick={handleNewCase}>
          + New Case
        </button>
        <button
          className="btn"
          onClick={() => {
            setShowImport(true);
            setImportErrors([]);
          }}
        >
          Import JSON
        </button>
        <button className="btn" onClick={() => setShowWorksheet(true)}>
          Blank worksheet
        </button>
        <button className="btn" onClick={() => handleLoadBundled(jonStewartTestCase)}>
          Load test case #001
        </button>
        <button className="btn" onClick={() => handleLoadBundled(caseTwo)}>
          Load test case #002
        </button>
        <button className="btn" onClick={() => handleLoadBundled(caseThree)}>
          Load test case #003
        </button>
        <button className="btn" onClick={() => handleLoadBundled(caseFour)}>
          Load test case #004
        </button>
        <button className="btn" onClick={() => handleLoadBundled(caseFive)}>
          Load test case #005
        </button>
        <button
          className="btn"
          onClick={() => {
            setCleanHome(!cleanHome);
            setCleanHomeState(!cleanHome);
          }}
        >
          Home screen: {cleanHome ? "Clean ✓" : "Full"}
        </button>
      </div>

      <section className="ws-section">
        <h2>Drafts</h2>
        {drafts.length === 0 ? (
          <div className="empty-state">
            No drafts yet. Start with <strong>New Case</strong> — it opens a
            blank case template.
          </div>
        ) : (
          drafts.map((draft) => (
            <div className="draft-row" key={draft.draftId}>
              <div>
                <div className="title">
                  {draft.caseData.title || "Untitled Case"}
                </div>
                <div className="meta">
                  {draft.caseData.id} · saved{" "}
                  {new Date(draft.savedAt).toLocaleString()}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <Link
                  to={`/workshop/${draft.draftId}`}
                  className="btn btn--small"
                >
                  Edit
                </Link>
                <button
                  className="btn btn--small btn--ghost btn--danger"
                  onClick={() => {
                    if (confirm("Delete this draft?")) {
                      deleteDraft(draft.draftId);
                      setDrafts(listDrafts());
                    }
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      <section className="ws-section">
        <h2>Published cases</h2>
        <p className="section-note">
          Published cases are playable from Home as Today's Case.
        </p>
        {published.length === 0 ? (
          <div className="empty-state">Nothing published yet.</div>
        ) : (
          published.map((entry) => (
            <div className="draft-row" key={entry.caseData.id}>
              <div>
                <div className="title">
                  {entry.caseData.title || "Untitled Case"}
                </div>
                <div className="meta">
                  {entry.caseData.id} · published{" "}
                  {new Date(entry.publishedAt).toLocaleString()}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <Link
                  to={`/play/${entry.caseData.id}`}
                  className="btn btn--small"
                >
                  Play
                </Link>
                <button
                  className="btn btn--small btn--ghost btn--danger"
                  onClick={() => {
                    if (confirm("Remove this case from the library?")) {
                      unpublishCase(entry.caseData.id);
                      setPublished(listPublishedCases());
                    }
                  }}
                >
                  Unpublish
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      {/* worksheet modal */}
      {showWorksheet ? (
        <div className="overlay" onClick={() => setShowWorksheet(false)}>
          <div className="sheet" onClick={(event) => event.stopPropagation()}>
            <span className="kicker">New-case worksheet</span>
            <h2>Blank Case Worksheet</h2>
            <p className="prose">
              Draft the case on paper or in a doc first, then enter it through
              the workshop forms.
            </p>
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
              <button
                className="btn btn--primary"
                onClick={() => setShowWorksheet(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* import modal */}
      {showImport ? (
        <div className="overlay" onClick={() => setShowImport(false)}>
          <div className="sheet" onClick={(event) => event.stopPropagation()}>
            <span className="kicker">Import JSON</span>
            <h2>Import a case</h2>
            <p className="prose">
              Paste case JSON below or choose a file. The case opens as a
              workshop draft.
            </p>
            <textarea
              className="json-box"
              placeholder='{ "id": "case_…", … }'
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
    </div>
  );
}
