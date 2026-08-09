import { Link, useNavigate } from "react-router-dom";
import { PHRASE_GAME_TITLE } from "../phrase/model";
import { getTodaysMvpPuzzle } from "./puzzles";

export default function MvpLanding() {
  const navigate = useNavigate();
  const today = getTodaysMvpPuzzle();

  const date = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="shell title-screen">
      <div className="mark-tiles" aria-hidden>
        <span>T</span>
        <span>H</span>
        <span>R</span>
        <span>U</span>
      </div>
      <h1>{PHRASE_GAME_TITLE}</h1>
      <p className="date">{date}</p>
      <p className="tagline">
        Five answers. One hidden line. Find the thruline that connects them
        all.
      </p>

      <button
        className="btn btn--primary btn--big"
        onClick={() => navigate(`/play/${today.id}`)}
      >
        Play
      </button>
      <span className="case-label">
        {today.title}
        {today.genre ? ` · ${today.genre}` : ""}
      </span>

      <div className="title-links">
        <Link to="/puzzles" className="btn btn--ghost btn--small">
          All puzzles
        </Link>
      </div>

      <span className="build-stamp">build {__BUILD_ID__}</span>
    </div>
  );
}
