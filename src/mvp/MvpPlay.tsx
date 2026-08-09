import { Link, useNavigate, useParams } from "react-router-dom";
import PhrasePlayer from "../phrase/PhrasePlayer";
import { getMvpPuzzle } from "./puzzles";

export default function MvpPlay() {
  const { puzzleId } = useParams();
  const navigate = useNavigate();
  const puzzle = puzzleId ? getMvpPuzzle(puzzleId) : null;

  if (!puzzle) {
    return (
      <div className="shell">
        <div className="fullpage">
          <h1>Puzzle not found</h1>
          <Link to="/" className="btn btn--primary btn--block">
            Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <PhrasePlayer puzzle={puzzle} onExit={() => navigate("/")} exitLabel="Home" />
  );
}
