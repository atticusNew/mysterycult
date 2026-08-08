import { Link, useNavigate } from "react-router-dom";
import { getTodaysCase } from "../data/caseLibrary";
import { getTodaysPuzzle } from "../phrase/store";
import { PHRASE_GAME_TITLE } from "../phrase/model";
import { isCleanHome } from "../app/settings";

export default function Home() {
  const navigate = useNavigate();
  const todaysCase = getTodaysCase();
  const todaysPuzzle = getTodaysPuzzle();
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

      <div className="game-list">
        {/* Game one: the line-up */}
        <div className="game-row">
          <div className="game-row-info">
            <h2>The Line-Up</h2>
            <p>Evidence, suspects, one accusation.</p>
          </div>
          {todaysCase ? (
            <button
              className="btn btn--primary"
              onClick={() => navigate(`/play/${todaysCase.id}`)}
            >
              Play
            </button>
          ) : clean ? null : (
            <Link to="/workshop" className="btn">
              Author
            </Link>
          )}
        </div>

        {/* Game two: the hidden phrase */}
        <div className="game-row">
          <div className="game-row-info">
            <h2>{PHRASE_GAME_TITLE}</h2>
            <p>Earn letters, uncover the phrase.</p>
          </div>
          {todaysPuzzle ? (
            <button
              className="btn btn--primary"
              onClick={() => navigate(`/tagline/play/${todaysPuzzle.id}`)}
            >
              Play
            </button>
          ) : clean ? null : (
            <Link to="/tagline/workshop" className="btn">
              Author
            </Link>
          )}
        </div>
      </div>

      {clean ? (
        <Link to="/workshop" className="home-footnote">
          Workshop
        </Link>
      ) : (
        <div className="title-links">
          <Link to="/workshop" className="btn btn--ghost btn--small">
            Case Workshop
          </Link>
          <Link to="/tagline/workshop" className="btn btn--ghost btn--small">
            {PHRASE_GAME_TITLE} Workshop
          </Link>
        </div>
      )}
    </div>
  );
}
