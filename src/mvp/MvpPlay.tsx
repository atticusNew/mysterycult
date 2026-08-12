import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PhrasePlayer from "../phrase/PhrasePlayer";
import { getMvpPuzzle } from "./puzzles";
import { nextUnplayed, recordPlayed } from "./played";

export default function MvpPlay() {
  const { puzzleId } = useParams();
  const navigate = useNavigate();
  const puzzle = puzzleId ? getMvpPuzzle(puzzleId) : null;
  // Recompute "up next" only when the game ends, not while playing.
  const [finished, setFinished] = useState(false);
  const upNext = useMemo(
    () => (finished && puzzle ? nextUnplayed(puzzle.id) : null),
    [finished, puzzle],
  );

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
    <PhrasePlayer
      key={puzzle.id}
      puzzle={puzzle}
      onExit={() => navigate("/")}
      exitLabel="Home"
      onComplete={({ total }) => {
        recordPlayed(puzzle.id, total);
        setFinished(true);
      }}
      endSlot={
        upNext ? (
          <div className="upnext">
            <div className="upnext-info">
              <span className="upnext-label">Up next</span>
              <span className="upnext-title">
                {upNext.title}
                {upNext.genre ? ` · ${upNext.genre}` : ""}
              </span>
            </div>
            <button
              className="btn btn--primary"
              onClick={() => {
                setFinished(false);
                navigate(`/play/${upNext.id}`);
              }}
            >
              Play
            </button>
          </div>
        ) : (
          <div className="upnext">
            <div className="upnext-info">
              <span className="upnext-label">That's all of them</span>
              <span className="upnext-title">Replay any puzzle</span>
            </div>
            <Link to="/puzzles" className="btn">
              Puzzles
            </Link>
          </div>
        )
      }
    />
  );
}
