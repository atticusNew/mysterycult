# Cultural Mystery

Two mobile-first daily puzzle games plus the internal authoring workshops used to create their content. Everything is data-driven: game code contains no puzzle-specific logic, and all content is JSON.

The original product specification lives at [`MysteryCult/CULTURAL_MYSTERY_SPEC.md`](MysteryCult/CULTURAL_MYSTERY_SPEC.md).

## The two games

### ThruLines (the current focus, and the MVP)

A hidden phrase — a famous quote or lyric — sits behind a grid of letter tiles. Five general-knowledge questions surround it; every correct answer reveals that answer's letters wherever they appear in the phrase, and every answer is itself a clue pointing at the same source. The real goal is naming the **ThruLine** (the movie, show, or song everything traces back to, worth 50 points); solving the phrase afterward is a 25-point bonus, and each correct question is worth 5.

Key play rules, all enforced in `src/phrase/engine.ts`:

- One guess per question, one guess at the ThruLine, one guess at the phrase.
- When the last question resolves (right or wrong), the final ThruLine takeover pops automatically.
- A correct ThruLine drops the player straight into bonus solve mode; a wrong one ends the game.
- Score is out of 100: 5 × 5 questions + 50 ThruLine + 25 phrase.

The player uses a custom in-game keyboard (no OS keyboard, no viewport jumps) and the whole game fits a phone screen with no scrolling, down to iPhone SE size.

### The Line-Up

A closed line-up of ~10 suspects (the answer plus designed decoys) and a stack of exhibits that flip one at a time. Every exhibit truthfully connects to the answer; each decoy dies on a specific exhibit; exactly one smoking gun fits only the answer. One wrong accusation and the case goes cold. The design rule is the **suspect funnel**, enforced by the validator in `src/authoring/CaseValidator.ts`.

## Running it

```bash
npm install
npm run dev        # full app (both games + workshops) at http://localhost:5173
npm run dev:mvp    # ThruLines-only MVP build (what testers see)
npm test           # engine / validator / import-export tests
npm run build      # full production build
npm run build:mvp  # MVP production build (deployed to Render)
```

To play on a phone on the same network, run the dev server with `--host` and open the `Network:` URL Vite prints.

## The MVP build

`npm run build:mvp` produces a stripped, tester-facing build containing only ThruLines: a landing page, a puzzle picker, and the player. No workshops, no Line-Up game, no editor routes — the full app's code is excluded from the bundle via mode-conditional lazy entry points in `src/main.tsx`. The bundled MVP puzzles live in `src/mvp/puzzles.ts`. `render.yaml` is a Render Blueprint that builds and serves it as a static site; pushes to the deployed branch auto-redeploy.

## Project structure

```
src/
├── app/          Router, settings, device-transfer encoding
├── phrase/       ThruLines: model, engine (pure reducer), validator, store,
│                 player, workshop (editor / preview), bundled puzzles JSON
├── mvp/          ThruLines-only MVP: landing, picker, play screens, bundled puzzles
├── models/       Line-Up case model: Case, Suspect, Exhibit, CulturalEntity
├── game/         Line-Up engines: CaseEngine, AnswerEngine, EvidenceEngine,
│                 ScoringEngine, RevealEngine
├── data/         Case schema + validation, loader, library, blank template
├── authoring/    Case Workshop: drafts, validator, JSON import/export, worksheet
├── player/       CasePlayer — the Line-Up player experience
├── components/   EvidenceCard, CaseRevealView
└── screens/      Home, PlayCase, Workshop screens, TransferReceive
```

`src/game/AnswerEngine.ts` is shared by both games: answer matching is case-, punctuation-, diacritic-, and leading-"The"-insensitive.

## Authoring

Both games have in-app workshops (full build only, never in the MVP):

- **ThruLines Workshop** at `/#/phrase/workshop` — edit the phrase, five questions with categories and aliases, the ThruLine answer, and hints; the validator (`src/phrase/validator.ts`) errors on structural problems and warns on editorial ones (phrase outside the 18–35-letter target band, answers that leak the ThruLine, letters of the phrase no question ever reveals).
- **Case Workshop** at `/#/workshop` — the Line-Up equivalent, with the suspect-funnel rules checked by `src/authoring/CaseValidator.ts`.

Both round-trip losslessly through JSON export/import, and content can be sent between devices with the **Transfer** link (puzzle JSON encoded into a URL, received at `/#/transfer`).

Editorial rule learned the hard way: phrases must be **verbatim, famous, canonical lines** — players type what the film actually says, so paraphrases read as wrong answers. Keep phrases in the 18–35-letter band; shorter plays better on small screens.

## Content

Blank templates: `src/phrase/puzzles/puzzle_template.json` and `src/data/cases/case_template.json`. Nine ThruLines demo puzzles ship in `src/phrase/puzzles/`; the five MVP puzzles (Girls featured first) are re-exported through `src/mvp/puzzles.ts`.
