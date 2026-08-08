import { Route, Routes } from "react-router-dom";
import Home from "../screens/Home";
import PlayCase from "../screens/PlayCase";
import Workshop from "../screens/Workshop";
import WorkshopEditor from "../screens/WorkshopEditor";
import WorkshopPreview from "../screens/WorkshopPreview";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/play" element={<PlayCase />} />
      <Route path="/play/:caseId" element={<PlayCase />} />
      <Route path="/workshop" element={<Workshop />} />
      <Route path="/workshop/:draftId" element={<WorkshopEditor />} />
      <Route path="/workshop/:draftId/preview" element={<WorkshopPreview />} />
    </Routes>
  );
}
