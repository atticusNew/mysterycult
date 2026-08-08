/**
 * Preview Case mode — simulates the actual player experience for a draft.
 * The CasePlayer only ever renders player-safe data, so authoring metadata
 * (diagnosticity, notes, paths, hypotheses) is structurally excluded here.
 */
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getDraft } from "../authoring/draftStore";
import CasePlayer from "../player/CasePlayer";

export default function WorkshopPreview() {
  const { draftId } = useParams();
  const navigate = useNavigate();
  const draft = useMemo(() => (draftId ? getDraft(draftId) : null), [draftId]);
  // Bumping the key remounts the player, restarting the session.
  const [runKey, setRunKey] = useState(0);

  if (!draft) {
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

  return (
    <CasePlayer
      key={runKey}
      caseData={draft.caseData}
      caseNumber="Preview"
      onExit={() => navigate(`/workshop/${draftId}`)}
      exitLabel="Editor"
      onRestart={() => setRunKey((value) => value + 1)}
    />
  );
}
