/**
 * Tagline workshop home: drafts, published puzzles, new/import, demo loader.
 */
import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { blankPuzzle, loadPuzzleFromJson, parsePuzzle, PHRASE_GAME_TITLE } from "./model";
import {
  deletePuzzleDraft,
  listPublishedPuzzles,
  listPuzzleDrafts,
  savePuzzleDraft,
  unpublishPuzzle,
} from "./store";
import demoPuzzle from "./puzzles/puzzle_001.json";
import demoPuzzleTwo from "./puzzles/puzzle_002.json";
import demoPuzzleThree from "./puzzles/puzzle_003.json";

export default function PhraseWorkshop() {
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState(listPuzzleDrafts);
  const [published, setPublished] = useState(listPublishedPuzzles);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function openDraft(puzzle: ReturnType<typeof blankPuzzle>) {
    savePuzzleDraft(puzzle.id, puzzle);
    navigate(`/tagline/workshop/${puzzle.id}`);
  }

  function handleImport(text: string) {
    const { puzzle, errors } = loadPuzzleFromJson(text);
    if (!puzzle) {
      setImportErrors(errors);
      return;
    }
    openDraft(puzzle);
  }

  return (
    <div className="shell shell--wide shell--flush">
      <div className="case-topbar">
        <span className="kicker">{PHRASE_GAME_TITLE} Workshop</span>
        <span style={{ display: "flex", gap: 6 }}>
          <Link to="/workshop" className="btn btn--ghost btn--small">
            Case Workshop
          </Link>
          <Link to="/" className="btn btn--ghost btn--small">
            Home
          </Link>
        </span>
      </div>

      <h1 className="display">{PHRASE_GAME_TITLE} Workshop</h1>
      <p className="prose" style={{ maxWidth: "56ch" }}>
        Author hidden-phrase puzzles: a phrase, a connection, and five
        questions that earn letters. Validate, preview, export, publish.
      </p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 18 }}>
        <button className="btn btn--primary" onClick={() => openDraft(blankPuzzle())}>
          + New Puzzle
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
        {[demoPuzzle, demoPuzzleTwo, demoPuzzleThree].map((raw, index) => (
          <button
            key={index}
            className="btn"
            onClick={() => {
              const { puzzle } = parsePuzzle(raw);
              if (puzzle) openDraft(puzzle);
            }}
          >
            Load demo #{`00${index + 1}`}
          </button>
        ))}
      </div>

      <section className="ws-section">
        <h2>Drafts</h2>
        {drafts.length === 0 ? (
          <div className="empty-state">
            No drafts yet. Start with <strong>New Puzzle</strong>.
          </div>
        ) : (
          drafts.map((draft) => (
            <div className="draft-row" key={draft.draftId}>
              <div>
                <div className="title">{draft.puzzle.title || "Untitled"}</div>
                <div className="meta">
                  {draft.puzzle.id} · saved {new Date(draft.savedAt).toLocaleString()}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <Link
                  to={`/tagline/workshop/${draft.draftId}`}
                  className="btn btn--small"
                >
                  Edit
                </Link>
                <button
                  className="btn btn--small btn--ghost btn--danger"
                  onClick={() => {
                    if (confirm("Delete this draft?")) {
                      deletePuzzleDraft(draft.draftId);
                      setDrafts(listPuzzleDrafts());
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
        <h2>Published puzzles</h2>
        {published.length === 0 ? (
          <div className="empty-state">Nothing published yet.</div>
        ) : (
          published.map((entry) => (
            <div className="draft-row" key={entry.puzzle.id}>
              <div>
                <div className="title">{entry.puzzle.title || "Untitled"}</div>
                <div className="meta">
                  {entry.puzzle.id} · published{" "}
                  {new Date(entry.publishedAt).toLocaleString()}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <Link
                  to={`/tagline/play/${entry.puzzle.id}`}
                  className="btn btn--small"
                >
                  Play
                </Link>
                <button
                  className="btn btn--small btn--ghost btn--danger"
                  onClick={() => {
                    if (confirm("Remove this puzzle from the library?")) {
                      unpublishPuzzle(entry.puzzle.id);
                      setPublished(listPublishedPuzzles());
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

      {showImport ? (
        <div className="overlay" onClick={() => setShowImport(false)}>
          <div className="sheet" onClick={(event) => event.stopPropagation()}>
            <span className="kicker">Import JSON</span>
            <h2>Import a puzzle</h2>
            <textarea
              className="json-box"
              placeholder='{ "id": "puzzle_…", … }'
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
              <button className="btn" onClick={() => fileInputRef.current?.click()}>
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
