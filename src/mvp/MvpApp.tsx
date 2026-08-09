/**
 * The ThruLines MVP — a self-contained tester build.
 *
 * Routes: landing → puzzle picker → game. Nothing else exists in this
 * app: no workshops, no editors, no other game — those routes are not
 * registered, so testers cannot reach them by URL.
 */
import { Route, Routes } from "react-router-dom";
import MvpLanding from "./MvpLanding";
import MvpPicker from "./MvpPicker";
import MvpPlay from "./MvpPlay";

export default function MvpApp() {
  return (
    <Routes>
      <Route path="/" element={<MvpLanding />} />
      <Route path="/puzzles" element={<MvpPicker />} />
      <Route path="/play/:puzzleId" element={<MvpPlay />} />
      <Route path="*" element={<MvpLanding />} />
    </Routes>
  );
}
