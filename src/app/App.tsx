import { Route, Routes } from "react-router-dom";
import Home from "../screens/Home";
import PlayCase from "../screens/PlayCase";
import Workshop from "../screens/Workshop";
import WorkshopEditor from "../screens/WorkshopEditor";
import WorkshopPreview from "../screens/WorkshopPreview";
import PlayPuzzle from "../phrase/PlayPuzzle";
import PhraseWorkshop from "../phrase/PhraseWorkshop";
import PhraseEditor from "../phrase/PhraseEditor";
import PhrasePreview from "../phrase/PhrasePreview";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      {/* Game one: the line-up */}
      <Route path="/play" element={<PlayCase />} />
      <Route path="/play/:caseId" element={<PlayCase />} />
      <Route path="/workshop" element={<Workshop />} />
      <Route path="/workshop/:draftId" element={<WorkshopEditor />} />
      <Route path="/workshop/:draftId/preview" element={<WorkshopPreview />} />
      {/* Game two: the hidden phrase */}
      <Route path="/tagline/play" element={<PlayPuzzle />} />
      <Route path="/tagline/play/:puzzleId" element={<PlayPuzzle />} />
      <Route path="/tagline/workshop" element={<PhraseWorkshop />} />
      <Route path="/tagline/workshop/:draftId" element={<PhraseEditor />} />
      <Route
        path="/tagline/workshop/:draftId/preview"
        element={<PhrasePreview />}
      />
    </Routes>
  );
}
