# Cultural Mystery

A mobile-first daily cultural mystery game — plus the **Case Workshop**, the internal authoring system used to create cases.

The full product specification lives at [`MysteryCult/CULTURAL_MYSTERY_SPEC.md`](MysteryCult/CULTURAL_MYSTERY_SPEC.md).

## The core loop

```
SOLVE CLUE → UNLOCK EVIDENCE → INTERPRET EVIDENCE → FORM HYPOTHESIS
→ GATHER MORE EVIDENCE → REVISE HYPOTHESIS → SOLVE CASE → CASE REVEAL
```

The critical design distinction: a **clue** is something the player solves; **evidence** is what they receive for solving it — and the two are not necessarily the same thing. The engine never explains the relationship during gameplay. That inference is the game.

## Running it

```bash
npm install
npm run dev        # dev server at http://localhost:5173
npm test           # engine / validator / import-export tests
npm run build      # production build
```

## Project structure

```
src/
├── app/          Router
├── models/       Case, Clue, Evidence, Hypothesis, Solution, CulturalEntity
├── game/         CaseEngine, ClueEngine, EvidenceEngine, HypothesisEngine,
│                 AnswerEngine, ScoringEngine, RevealEngine, state machine
├── data/         Case schema + validation, case loader, case library,
│                 blank case JSON template
├── authoring/    Case Workshop logic: drafts, validator, JSON import/export,
│                 blank-case factories, worksheet template
├── player/       CasePlayer — the complete player experience
├── components/   EvidenceCard, CaseRevealView
└── screens/      Home, PlayCase, Workshop, WorkshopEditor, WorkshopPreview
```

The game is entirely **data-driven**: cases are JSON documents loaded through `src/data/caseLoader.ts`. No case-specific logic exists in game code.

## Creating a case (the intended workflow)

```
IDEA → CASE WORKSHEET → CASE WORKSHOP → VALIDATION → JSON → PLAYTEST → REVISION → FINAL CASE
```

1. Open **Case Workshop** from Home (or `/#/workshop`).
2. Optional: copy the **Blank worksheet** and draft the case on paper first.
3. Click **New Case** — this creates a draft from the blank case template.
4. Fill in the sections: Case, Cultural Entity, Entry Points, Clues, Evidence, Hypotheses, Investigation Paths, Hints, Reveal.
5. **Validate** — structural corruption shows as errors; editorial quality issues show as warnings.
6. **Preview Case** — plays the draft exactly like the live game (authoring metadata is structurally excluded from the player view).
7. **Export JSON** (copy or download), or **Publish** to make it playable from Home as Today's Case.

**Import JSON** (in the workshop home or inside the editor) loads any exported case back into the workshop for editing — the pipeline round-trips losslessly.

## Case JSON

The blank template lives at `src/data/cases/case_template.json` and loads successfully in the app while representing no real puzzle. See `src/models/types.ts` for the full schema (versioned via the `version` field; current version 1).

Player-facing fields: `title`, `question`, `clues` (prompt/answer/aliases), `evidence` (type/content/caption), `hints`, and the `reveal` (post-solve only).
Editorial-only fields, never shown during gameplay: `diagnosticity`, `relatedEntities`, `authorNotes`, `entity`, `investigationPaths`, `editorial` (entry points, hypothesis map, notes).

Evidence types rendered today: `text`, `image`, `number`, `quote`. The model and card component already accept the future set (`cropped_image`, `date`, `location`, `object`, `logo`, `audio`, `video`, `color`, `symbol`).

## Design principles enforced in code

- **No difficulty levels** — everyone gets the same case; difficulty emerges from knowledge and reasoning.
- **No grid** — the UI is a case file / evidence dossier, not a puzzle grid.
- **Theories don't end the case** — recording a hypothesis is gameplay; only "Solve case" commits.
- **A wrong final answer keeps the case open** — the player returns to investigating.
- **The engine never explains relationships** — clue→evidence→answer connections appear only in the final reveal.

## Note

There is deliberately **no Case #001** in this repository. The first real case is to be authored manually by the game designer through the Case Workshop.
