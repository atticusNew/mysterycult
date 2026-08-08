/**
 * Preview a Tagline draft exactly as a player would experience it.
 */
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getPuzzleDraft } from "./store";
import PhrasePlayer from "./PhrasePlayer";

export default function PhrasePreview() {
  const { draftId } = useParams();
  const navigate = useNavigate();
  const draft = useMemo(
    () => (draftId ? getPuzzleDraft(draftId) : null),
    [draftId],
  );
  const [runKey, setRunKey] = useState(0);

  if (!draft) {
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

  return (
    <PhrasePlayer
      key={runKey}
      puzzle={draft.puzzle}
      onExit={() => navigate(`/tagline/workshop/${draftId}`)}
      exitLabel="Editor"
      onRestart={() => setRunKey((value) => value + 1)}
    />
  );
}
