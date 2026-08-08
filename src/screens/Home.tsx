import { Link, useNavigate } from "react-router-dom";
import { getTodaysCase, listPublishedCases } from "../data/caseLibrary";
import { isCleanHome } from "../app/settings";

export default function Home() {
  const navigate = useNavigate();
  const todaysCase = getTodaysCase();
  const publishedCount = listPublishedCases().length;
  const clean = isCleanHome();

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="shell title-screen">
      <div className="mark" aria-hidden />
      <h1>Cultural Mystery</h1>
      <p className="date">{today}</p>
      <p className="tagline">
        A line-up of suspects. A stack of evidence. One accusation.
      </p>

      {todaysCase ? (
        <>
          <button
            className="btn btn--primary btn--big"
            onClick={() => navigate(`/play/${todaysCase.id}`)}
          >
            Play
          </button>
          <span className="case-label">
            {todaysCase.title || "Today's Case"}
          </span>
        </>
      ) : (
        <>
          <Link to="/workshop" className="btn btn--primary btn--big">
            Open the Case Workshop
          </Link>
          <span className="case-label">
            No case published yet — author the first one.
          </span>
        </>
      )}

      {clean ? (
        <Link to="/workshop" className="home-footnote">
          Workshop
        </Link>
      ) : (
        <>
          <div className="title-links">
            <button className="btn btn--small" disabled>
              Practice — soon
            </button>
            <Link to="/workshop" className="btn btn--ghost btn--small">
              Case Workshop
            </Link>
          </div>
          <span className="badge" style={{ marginTop: 18 }}>
            {publishedCount} CASE{publishedCount === 1 ? "" : "S"} IN LIBRARY
          </span>
        </>
      )}
    </div>
  );
}
