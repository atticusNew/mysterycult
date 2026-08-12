import { Link } from "react-router-dom";
import { PHRASE_GAME_TITLE } from "../phrase/model";
import { getTodaysMvpPuzzle, MVP_PUZZLES } from "./puzzles";
import { getPlayed } from "./played";

export default function MvpPicker() {
  const today = getTodaysMvpPuzzle();
  const played = getPlayed();
  const ordered = [today, ...MVP_PUZZLES.filter((p) => p.id !== today.id)];

  return (
    <div className="shell shell--flush">
      <div className="case-topbar">
        <span className="kicker">{PHRASE_GAME_TITLE}</span>
        <Link to="/" className="btn btn--ghost btn--small">
          Home
        </Link>
      </div>

      <h1 className="display">Pick a puzzle</h1>
      <p className="prose" style={{ marginTop: 6 }}>
        Each one is five answers, one hidden line, one thruline. A new
        puzzle takes the top spot every day.
      </p>

      <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 10 }}>
        {ordered.map((puzzle) => {
          const record = played[puzzle.id];
          const isToday = puzzle.id === today.id;
          return (
            <Link
              key={puzzle.id}
              to={`/play/${puzzle.id}`}
              className="game-row"
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div className="game-row-info">
                <h2>
                  {puzzle.title}
                  {isToday ? <span className="row-pill">Today</span> : null}
                </h2>
                <p>
                  {puzzle.genre || "Mystery"}
                  {record ? ` · Best ${record.best}/100` : ""}
                </p>
              </div>
              <span className={`btn${record ? "" : " btn--primary"}`}>
                {record ? "Replay" : "Play"}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
