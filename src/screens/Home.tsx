import { Link, useNavigate } from "react-router-dom";
import { getTodaysCase, listPublishedCases } from "../data/caseLibrary";

export default function Home() {
  const navigate = useNavigate();
  const todaysCase = getTodaysCase();
  const publishedCount = listPublishedCases().length;

  return (
    <div className="shell shell--flush">
      <header className="masthead">
        <span className="kicker">Daily investigation</span>
        <h1>Cultural Mystery</h1>
        <p className="tagline">
          Solve clues. Unlock evidence. Form a theory. Close the case.
        </p>
      </header>

      <div className="home-card">
        <span className="kicker kicker--dim">Today's Case</span>
        {todaysCase ? (
          <>
            <h2>{todaysCase.title || "Untitled Case"}</h2>
            <p className="meta">
              {todaysCase.question || "What are we looking for?"}
            </p>
            <button
              className="btn btn--primary btn--block"
              onClick={() => navigate(`/play/${todaysCase.id}`)}
            >
              Start Case
            </button>
          </>
        ) : (
          <>
            <h2>No case published yet</h2>
            <p className="meta">
              The first case hasn't been authored. Open the Case Workshop to
              create it — write the clues, attach the evidence, validate, and
              publish.
            </p>
            <Link to="/workshop" className="btn btn--primary btn--block">
              Open the Case Workshop
            </Link>
          </>
        )}
      </div>

      <div className="home-card">
        <span className="kicker kicker--dim">Practice</span>
        <h2>Practice Cases</h2>
        <p className="meta">
          Replay past mysteries at your own pace. Coming soon.
        </p>
        <button className="btn btn--block" disabled>
          Coming soon
        </button>
      </div>

      <hr className="rule" />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="badge">
          {publishedCount} CASE{publishedCount === 1 ? "" : "S"} IN LIBRARY
        </span>
        <Link to="/workshop" className="btn btn--ghost btn--small">
          Case Workshop →
        </Link>
      </div>
    </div>
  );
}
