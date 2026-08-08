/**
 * Play a published Tagline puzzle (today's, or by id).
 */
import { Link, useNavigate, useParams } from "react-router-dom";
import { getPublishedPuzzle, getTodaysPuzzle } from "./store";
import PhrasePlayer from "./PhrasePlayer";

export default function PlayPuzzle() {
  const { puzzleId } = useParams();
  const navigate = useNavigate();
  const puzzle = puzzleId ? getPublishedPuzzle(puzzleId) : getTodaysPuzzle();

  if (!puzzle) {
    return (
      <div className="shell">
        <div className="fullpage">
          <span className="kicker">Puzzle not found</span>
          <h1>Nothing to solve</h1>
          <p className="prose">
            This puzzle isn't in the library. Publish one from the Tagline
            Workshop first.
          </p>
          <Link to="/" className="btn btn--primary btn--block">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return <PhrasePlayer puzzle={puzzle} onExit={() => navigate("/")} exitLabel="Home" />;
}
