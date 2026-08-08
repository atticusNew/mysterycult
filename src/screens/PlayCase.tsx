import { Link, useNavigate, useParams } from "react-router-dom";
import { getPublishedCase, getTodaysCase, listPublishedCases } from "../data/caseLibrary";
import CasePlayer from "../player/CasePlayer";

export default function PlayCase() {
  const { caseId } = useParams();
  const navigate = useNavigate();

  const caseData = caseId ? getPublishedCase(caseId) : getTodaysCase();

  if (!caseData) {
    return (
      <div className="shell">
        <div className="fullpage">
          <span className="kicker">Case not found</span>
          <h1>Nothing to investigate</h1>
          <p className="prose">
            This case isn't in the library. Publish a case from the Case
            Workshop first.
          </p>
          <Link to="/" className="btn btn--primary btn--block">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const caseNumber = `Case ${
    listPublishedCases().findIndex((entry) => entry.caseData.id === caseData.id) +
    1
  }`;

  return (
    <CasePlayer
      caseData={caseData}
      caseNumber={caseNumber}
      onExit={() => navigate("/")}
      exitLabel="Home"
    />
  );
}
