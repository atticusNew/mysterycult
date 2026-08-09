import { Link } from "react-router-dom";
import { PHRASE_GAME_TITLE } from "../phrase/model";
import { MVP_PUZZLES } from "./puzzles";

export default function MvpPicker() {
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
        Each one is five answers, one hidden line, one thruline.
      </p>

      <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 10 }}>
        {MVP_PUZZLES.map((puzzle) => (
          <Link
            key={puzzle.id}
            to={`/play/${puzzle.id}`}
            className="game-row"
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div className="game-row-info">
              <h2>{puzzle.title}</h2>
              <p>{puzzle.genre || "Mystery"}</p>
            </div>
            <span className="btn btn--primary">Play</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
