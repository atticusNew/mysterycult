# CULTURAL MYSTERY
## Cursor Master Product + Architecture Specification
### Prototype / Case Authoring System / Game Engine

---

# 1. PRODUCT DEFINITION

Build a mobile-first daily single-player game currently called:

**Cultural Mystery**

The name is temporary.

The game is a daily cultural mystery in which players:

1. Receive a mystery with an unknown answer.
2. Solve individual clues.
3. Each correctly solved clue unlocks a separate piece of evidence.
4. Evidence may be a word, phrase, image, cropped image, number, quote, object, location, date, sound, etc.
5. The clue answer and the evidence revealed by that clue do NOT necessarily have to be the same thing.
6. The player interprets the accumulating evidence.
7. The player forms hypotheses about the hidden answer.
8. New evidence may strengthen, weaken, or completely change the player's hypothesis.
9. The player eventually commits to a final answer.
10. The game reveals the complete case and explains how the evidence connects.

The central gameplay loop is:

SOLVE CLUE
→ UNLOCK EVIDENCE
→ INTERPRET EVIDENCE
→ FORM HYPOTHESIS
→ GATHER MORE EVIDENCE
→ REVISE HYPOTHESIS
→ SOLVE CASE
→ REVEAL

---

# 2. WHAT THIS GAME IS NOT

This distinction is extremely important.

Do NOT design this as:

- a trivia game
- a traditional quiz
- a crossword
- a word scramble
- an anagram game
- a category-matching game
- a Connections clone
- a grid puzzle
- a traditional Wordle clone
- a game where the player simply identifies a celebrity from trivia

The game should NOT present four groups of four items.

There should be NO grid-based category mechanic.

The player should NOT be asked:

"What do these four things have in common?"

Instead, the player should ask:

"Why am I being shown these things?"

The game is fundamentally about:

**investigation, inference, hypothesis formation, and discovery.**

---

# 3. CORE PLAYER FANTASY

The player should feel like they are solving a miniature cultural mystery.

The desired emotional progression is:

"Interesting."

"What does that have to do with anything?"

"I think I know..."

"Wait, that doesn't fit."

"Maybe it's..."

"Oh."

"I KNOW."

"CASE CLOSED."

The player should feel that THEY solved the mystery.

The game should provide evidence, not explanations.

The player makes the connections.

---

# 4. CULTURAL UNIVERSE

The original concept was too broadly defined as "pop culture."

Do not use "pop culture" as the primary conceptual framework.

Use:

**Cultural Mystery**

The cultural universe can include:

- music
- movies
- television
- sports
- literature
- art
- history
- science
- famous people
- technology
- places
- inventions
- brands
- cultural moments
- famous events
- fictional characters
- iconic objects
- entertainment
- historical figures
- major cultural movements

However, the universe is CURATED.

We are NOT trying to create an encyclopedia.

We are creating a collection of entities that can support excellent mysteries.

---

# 5. CULTURAL ENTITY CRITERIA

A candidate final answer should be evaluated on:

## Recognition

Would a reasonable portion of the intended audience recognize it?

## Longevity

Will it remain culturally relevant rather than being a temporary trend?

## Connection Density

Does it have many interesting relationships to other cultural entities?

## Multiple Entry Points

Can people with different interests or generations find a legitimate route toward it?

## Fairness

Can the mystery be solved through reasoning rather than requiring one extremely obscure fact?

## Mystery Potential

Can the entity support a progression from ambiguous evidence to strong evidence to a satisfying reveal?

A candidate that is famous but has few interesting relationships may be a poor final answer.

A candidate that is moderately famous but has enormous connection density may be an excellent final answer.

---

# 6. GENERATIONAL DESIGN PRINCIPLE

Do NOT require every player to know every clue.

Instead:

**Every player should have a possible entry point into the mystery.**

For example, a mystery involving QUEEN might be accessible through:

- music
- Freddie Mercury
- Brian May
- astrophysics
- Bohemian Rhapsody
- Wayne's World
- Live Aid
- 1985
- stadium culture

A younger player might enter through a film.

An older player might enter through music.

A movie fan might enter through an actor.

A history-oriented player might enter through Live Aid.

The same mystery works for all of them.

This is the preferred form of universal difficulty.

---

# 7. NO DIFFICULTY LEVELS

Do NOT create:

- Easy
- Medium
- Hard

as puzzle modes.

Every player should receive the same daily case.

Difficulty should emerge naturally from:

- the player's knowledge
- when they form a hypothesis
- how quickly evidence converges
- how many clues they need
- whether their initial hypothesis was correct
- whether they recognize lateral relationships

This is part of the game's appeal.

The same case may be:

Very easy for one person.

Moderate for another.

Difficult for another.

But it is still the same case.

---

# 8. DAILY MODEL

The primary product should eventually be:

**ONE CASE PER DAY**

Everyone gets the same daily mystery.

There should be:

- Daily Case
- Practice Cases

But the Daily Case is the socially meaningful shared experience.

Eventually support:

- streaks
- statistics
- spoiler-free sharing

Do NOT prioritize these features in the first prototype.

---

# 9. CASE TYPES

The final answer may be:

- PERSON
- PLACE
- FILM
- TELEVISION
- SONG
- ALBUM
- BOOK
- CHARACTER
- EVENT
- OBJECT
- INVENTION
- BRAND
- SPORTING MOMENT
- CULTURAL MOMENT
- ARTWORK
- OTHER

All types use the same underlying game engine.

---

# 10. CASE STRUCTURE

Every case contains:

```text
CASE
├── Answer
├── Question
├── Clues
├── Evidence
├── Hypothesis metadata
├── Investigation paths
├── Reveal
└── Editorial validation
```

A case should generally contain approximately:

- 5–8 clues for the first prototype
- 5–8 evidence pieces
- 1 final answer
- 1–3 major entry points
- several lateral connections
- 1–2 high-confidence confirmation pieces

Do not hard-code these numbers into the engine.

They are authoring guidelines.

---

# 11. CLUE VS EVIDENCE

This is one of the most important architectural concepts.

## CLUE

A clue is something the player must solve.

Example:

"This British musician studied astrophysics."

Answer:

**Brian May**

The player enters Brian May.

If correct, the game unlocks evidence.

## EVIDENCE

Evidence is what the player receives after solving the clue.

The evidence might be:

- a photograph
- guitar
- 1985
- Live Aid
- a quote
- a location
- a cropped image
- a movie still
- a logo
- an object
- a word
- a phrase
- a number
- a sound
- a visual fragment

The evidence does NOT have to equal the clue answer.

For example:

CLUE:

"British musician who studied astrophysics."

ANSWER:

Brian May

REVEALED EVIDENCE:

A guitar.

The player must infer why the guitar matters.

---

# 12. IMPORTANT ENGINE RULE

The game engine must NOT automatically explain relationships to the player.

Do NOT display:

Brian May → Queen

Instead:

Player solves:

Brian May

Game reveals:

[GUITAR IMAGE]

The player must make the inference.

Relationship metadata exists for:

- authoring
- validation
- reveal
- debugging

but is hidden during gameplay.

---

# 13. EVIDENCE DIAGNOSTICITY

Every evidence item should have an editorial diagnosticity value:

```text
LOW
MEDIUM
HIGH
CONCLUSIVE
```

This is NOT a difficulty rating.

It controls the progression of the mystery.

## LOW

Interesting but ambiguous.

Could plausibly relate to many things.

## MEDIUM

Begins narrowing possibilities.

## HIGH

Strongly points toward the answer.

## CONCLUSIVE

Makes the answer essentially undeniable.

A typical case should progress roughly:

LOW
→ LOW
→ MEDIUM
→ MEDIUM
→ HIGH
→ HIGH
→ CONCLUSIVE

Do not make every case follow this exact sequence.

---

# 14. CASE GRAPH

Each case should have an internal relationship graph.

The player does not see this graph.

The author does.

Example:

```text
                         QUEEN
                           |
             +-------------+-------------+
             |             |             |
           MUSIC          FILM         CULTURE
             |             |             |
         Brian May     Bohemian       Live Aid
             |          Rhapsody          |
        Astrophysics    Rami Malek       1985
```

The graph is used to verify that the case has multiple legitimate routes.

---

# 15. ENTRY POINTS

Every strong case should ideally have at least 2–3 independent entry points.

Example:

### Entry Point A
Music

### Entry Point B
Film

### Entry Point C
Historical/cultural event

The player should not need to use all of them.

They are alternate routes into the same mystery.

---

# 16. LATERAL CONNECTIONS

Cases should contain interesting associations that are not immediately obvious.

Examples:

- musician → science
- actor → unrelated film
- film → famous quote
- song → sports culture
- place → historical event
- actor → television character
- artist → invention
- brand → cultural moment

The connection should be:

1. factually valid
2. discoverable
3. relevant
4. interesting
5. not arbitrary

Avoid "six degrees of separation" simply for the sake of being clever.

Every relationship should contribute to the mystery.

---

# 17. RED HERRINGS

Use ambiguity rather than false information.

A red herring should be legitimate evidence that initially supports more than one hypothesis.

Do NOT use false facts.

Example:

Evidence:

CHICAGO

Possible hypotheses:

- The Blues Brothers
- Ferris Bueller
- The Bear
- Michael Jordan
- other cultural entities

Additional evidence should eventually disambiguate.

The player should be able to say:

"I thought it was X, but this new evidence changed my mind."

That is good gameplay.

---

# 18. HYPOTHESIS SYSTEM

Hypothesis is a core game mechanic.

The player should have a persistent:

**THEORY**

At any point, the player can enter:

"I think this is..."

The game records the theory.

Example:

```text
THEORY HISTORY

1. The Beatles
2. Queen
3. Queen ✓
```

The player can change their theory as evidence accumulates.

---

# 19. THEORY VS FINAL ANSWER

A theory should not necessarily end the case.

Preferred model:

PLAYER:

"I think this is Queen."

GAME:

"Theory recorded."

Player continues investigating.

Eventually:

**SOLVE CASE**

Player commits to final answer.

This makes hypothesis formation part of the gameplay rather than simply being an answer box.

---

# 20. INITIAL SCORING MODEL

Keep scoring simple for the prototype.

Start with:

```text
BASE SCORE = 1000
```

Possible deductions:

- incorrect clue answers
- hints used
- incorrect final guesses
- number of evidence pieces required

The primary performance metric should be:

**How early did the player solve the mystery?**

Do not over-engineer scoring initially.

---

# 21. HINTS

Hints should be investigative.

Do NOT use:

"The answer starts with Q."

Instead:

"Look again at the relationship between Evidence #2 and Evidence #5."

Or:

"One of your solved clues may be more important than its answer suggests."

Or:

"Two pieces of evidence may belong to the same story."

Hints should improve reasoning rather than simply give away information.

---

# 22. CASE REVEAL

When the player solves the mystery:

**CASE CLOSED**

Then reveal:

1. final answer
2. complete evidence
3. how each clue produced evidence
4. why the evidence pointed toward the answer
5. major connections
6. alternate legitimate paths

Example:

```text
CASE CLOSED

QUEEN

CLUE 1
Brian May
↓
Guitar

CLUE 3
Live Aid
↓
1985

CLUE 5
Wayne's World
↓
Bohemian Rhapsody

Together:

QUEEN
```

The reveal should explain the mystery without making the player feel like the game solved it for them.

---

# 23. VISUAL DESIGN

Do NOT use a traditional puzzle grid.

Do NOT make the primary UI resemble Connections.

Use a mobile-first:

**CASE FILE / EVIDENCE DOSSIER**

Conceptually:

```text
CASE #014

WHAT ARE WE LOOKING FOR?

[ mystery / hidden visual area ]

----------------------------

EVIDENCE

[image]    [1985]

[quote]

[object]   [location]

----------------------------

YOUR THEORY

[ Queen                 ]

[UPDATE THEORY]

----------------------------

NEXT CLUE
```

The final implementation should feel modern, editorial, clean, and premium.

Do not make it look like a literal police investigation board with red string.

Think:

- modern magazine
- investigative journalism
- elegant case file
- mystery dossier
- premium mobile puzzle

---

# 24. IMAGE-FIRST EVIDENCE

Images are a major part of the concept.

Evidence can include:

- photographs
- movie stills
- cropped photographs
- objects
- locations
- logos
- visual fragments
- illustrations
- artwork
- diagrams

Images should sometimes be intentionally incomplete or ambiguous.

The player should ask:

"What am I looking at?"

rather than simply reading a list of text clues.

---

# 25. FUTURE EVIDENCE TYPES

The architecture should support:

```text
text
image
cropped_image
number
date
quote
location
object
logo
audio
video
color
symbol
```

For the first prototype, implement:

- text
- image
- number
- quote

Architecture should allow the others later.

---

# 26. APPLICATION ARCHITECTURE

Recommended structure:

```text
src/
│
├── app/
│   ├── router
│   ├── state
│   └── config
│
├── game/
│   ├── CaseEngine
│   ├── EvidenceEngine
│   ├── ClueEngine
│   ├── HypothesisEngine
│   ├── AnswerEngine
│   ├── ScoringEngine
│   └── RevealEngine
│
├── models/
│   ├── Case
│   ├── Clue
│   ├── Evidence
│   ├── Hypothesis
│   ├── Solution
│   └── CulturalEntity
│
├── screens/
│   ├── Home
│   ├── DailyCase
│   ├── CaseComplete
│   ├── Practice
│   └── Statistics
│
├── components/
│   ├── CaseHeader
│   ├── CaseQuestion
│   ├── EvidenceBoard
│   ├── EvidenceCard
│   ├── ClueCard
│   ├── AnswerInput
│   ├── TheoryInput
│   ├── TheoryHistory
│   ├── SolveButton
│   ├── HintButton
│   ├── Timer
│   └── CaseReveal
│
├── authoring/
│   ├── CaseBuilder
│   ├── ClueBuilder
│   ├── EvidenceBuilder
│   ├── ConnectionGraph
│   ├── CaseValidator
│   └── CasePreview
│
├── data/
│   ├── cases/
│   ├── entities/
│   └── schemas/
│
└── assets/
    ├── images/
    ├── audio/
    └── video/
```

---

# 27. GAME STATE MACHINE

Implement the game around explicit states:

```text
CASE_INTRO
    ↓
CLUE_ACTIVE
    ↓
CLUE_SOLVED
    ↓
EVIDENCE_REVEALED
    ↓
INVESTIGATING
    ↓
THEORY_CREATED
    ↓
CLUE_ACTIVE
    ↓
...
    ↓
SOLVING
    ↙       ↘
WRONG      CORRECT
  ↓           ↓
INVESTIGATING
              ↓
        CASE_COMPLETE
              ↓
           REVEAL
```

The player should be able to move repeatedly between:

INVESTIGATING
→ THEORY
→ CLUE
→ EVIDENCE
→ INVESTIGATING

until they solve the case.

---

# 28. CASE DATA MODEL

Use a structure along these lines:

```json
{
  "id": "case_001",
  "version": 1,

  "title": "Case #001",

  "question": "What are we looking for?",

  "answer": {
    "primary": "Queen",
    "aliases": [
      "queen",
      "the queen"
    ]
  },

  "type": "cultural_entity",

  "category": "music",

  "entityId": "queen",

  "clues": [],

  "evidence": [],

  "investigationPaths": [],

  "hints": [],

  "reveal": {},

  "editorial": {}
}
```

---

# 29. CLUE DATA MODEL

```json
{
  "id": "clue_001",

  "type": "text",

  "prompt": "This British musician studied astrophysics.",

  "answer": {
    "primary": "Brian May",
    "aliases": [
      "brian may"
    ]
  },

  "evidenceId": "evidence_001",

  "stage": "opening",

  "authorNotes": {
    "whyFair": "Widely documented fact.",
    "connection": "Brian May is associated with Queen."
  }
}
```

Author notes are never shown during normal gameplay.

---

# 30. EVIDENCE DATA MODEL

```json
{
  "id": "evidence_001",

  "type": "image",

  "content": "/assets/cases/001/guitar.jpg",

  "caption": null,

  "diagnosticity": "low",

  "relatedEntities": [
    "brian_may",
    "queen"
  ],

  "authorNotes": {
    "meaning": "The guitar points toward Brian May and Queen."
  }
}
```

---

# 31. CULTURAL ENTITY DATA MODEL

```json
{
  "id": "queen",

  "name": "Queen",

  "type": "music",

  "recognition": "broad",

  "longevity": "high",

  "connectionDensity": "high",

  "eras": [
    "1970s",
    "1980s",
    "1990s",
    "2000s",
    "2010s",
    "2020s"
  ],

  "domains": [
    "music",
    "film",
    "television",
    "sports",
    "history"
  ]
}
```

These are editorial metadata.

They are not intended to represent scientifically measured values.

---

# 32. INVESTIGATION PATH MODEL

A case should be able to document multiple legitimate routes toward the same answer.

Example:

```json
{
  "id": "path_music",

  "name": "Music route",

  "nodes": [
    "clue_001",
    "evidence_001",
    "clue_004",
    "evidence_004"
  ],

  "target": "queen"
}
```

Another:

```json
{
  "id": "path_film",

  "name": "Film route",

  "nodes": [
    "clue_002",
    "evidence_002",
    "clue_005",
    "evidence_005"
  ],

  "target": "queen"
}
```

The player does not see the paths.

The author uses them to verify case quality.

---

# 33. AUTHORING / CASE WORKSHOP

This is a priority feature.

Build a simple internal Case Workshop so the game author can create and preview a case without manually editing raw JSON.

The author should be able to enter:

## CASE

Final answer:

Question:

Type:

Primary category:

---

## CULTURAL ENTITY

Recognition:

Longevity:

Connection density:

Domains:

Era:

---

## ENTRY POINTS

Entry Point 1:

Entry Point 2:

Entry Point 3:

---

## CLUES

For each clue:

Clue text:

Expected answer:

Accepted aliases:

Clue type:

Stage:

---

## EVIDENCE

For each clue:

Evidence type:

Evidence content:

Image:

Quote:

Number:

Diagnosticity:

Why this evidence matters:

What entities does it relate to?

---

## INVESTIGATION PATHS

Path name:

Starting clue:

Intermediate evidence:

Possible hypothesis:

Target answer:

---

## HINTS

Hint 1:

Hint 2:

Hint 3:

---

## REVEAL

Answer explanation:

Clue → evidence explanation:

Major cultural connections:

Alternate solution paths:

---

# 34. CASE WORKSHOP VALIDATION

The authoring tool should automatically warn about:

### Missing final answer

### Missing clue answer

### Missing evidence

### Duplicate clues

### Duplicate evidence

### No accepted aliases

### Too few entry points

### No low-diagnosticity evidence

### No high-diagnosticity evidence

### No conclusive evidence

### Only one investigation path

### Evidence that has no documented relationship

### Final answer not in cultural entity registry

### Clue that directly gives away the final answer

### Evidence that directly gives away the final answer too early

These should be WARNINGS, not necessarily hard errors, except for structurally invalid cases.

---

# 35. CASE QUALITY CHECKLIST

Every case should be evaluated on:

```text
[ ] Final answer is culturally recognizable
[ ] Final answer has strong connection density
[ ] At least 2 legitimate entry points
[ ] Preferably 3 entry points
[ ] Clues are independently solvable
[ ] Clues do not require impossible trivia
[ ] Evidence is not simply the clue answer
[ ] Early evidence is ambiguous
[ ] Middle evidence narrows possibilities
[ ] Late evidence confirms
[ ] No false information
[ ] Red herrings are legitimate
[ ] At least one hypothesis change is possible
[ ] Final answer is satisfying
[ ] Reveal explains the case
[ ] Player can understand why the answer is correct
[ ] Case does not resemble Connections
[ ] Case does not feel like ordinary trivia
[ ] Case does not depend on one obscure fact
```

---

# 36. CASE AUTHORING WORKSHEET

Use this worksheet before creating JSON.

## CASE ID

____________________________

## FINAL ANSWER

____________________________

## WHAT KIND OF THING IS IT?

☐ Person  
☐ Place  
☐ Film  
☐ TV  
☐ Song  
☐ Album  
☐ Book  
☐ Character  
☐ Event  
☐ Object  
☐ Invention  
☐ Brand  
☐ Sporting Moment  
☐ Cultural Moment  
☐ Artwork  
☐ Other

---

## THE MYSTERY QUESTION

What exactly is the player trying to identify?

____________________________________

____________________________________

---

# CULTURAL ENTRY POINTS

## Entry Point 1

Domain:

____________________________

Why someone might recognize it:

____________________________

Relevant clue:

____________________________

---

## Entry Point 2

Domain:

____________________________

Why someone might recognize it:

____________________________

Relevant clue:

____________________________

---

## Entry Point 3

Domain:

____________________________

Why someone might recognize it:

____________________________

Relevant clue:

____________________________

---

# CLUE WORKSHEET

## CLUE 1

### Clue

____________________________________

### Answer

____________________________________

### Accepted answers / aliases

____________________________________

### What evidence does this unlock?

____________________________________

### Evidence type

☐ Image  
☐ Word  
☐ Phrase  
☐ Number  
☐ Date  
☐ Quote  
☐ Location  
☐ Object  
☐ Other

### Diagnosticity

☐ LOW  
☐ MEDIUM  
☐ HIGH  
☐ CONCLUSIVE

### Why does this evidence matter?

____________________________________

---

## CLUE 2

### Clue

____________________________________

### Answer

____________________________________

### Accepted answers / aliases

____________________________________

### Evidence unlocked

____________________________________

### Diagnosticity

☐ LOW  
☐ MEDIUM  
☐ HIGH  
☐ CONCLUSIVE

### Why does it matter?

____________________________________

---

## CLUE 3

### Clue

____________________________________

### Answer

____________________________________

### Accepted answers / aliases

____________________________________

### Evidence unlocked

____________________________________

### Diagnosticity

☐ LOW  
☐ MEDIUM  
☐ HIGH  
☐ CONCLUSIVE

### Why does it matter?

____________________________________

---

## CLUE 4

### Clue

____________________________________

### Answer

____________________________________

### Accepted answers / aliases

____________________________________

### Evidence unlocked

____________________________________

### Diagnosticity

☐ LOW  
☐ MEDIUM  
☐ HIGH  
☐ CONCLUSIVE

### Why does it matter?

____________________________________

---

## CLUE 5

### Clue

____________________________________

### Answer

____________________________________

### Accepted answers / aliases

____________________________________

### Evidence unlocked

____________________________________

### Diagnosticity

☐ LOW  
☐ MEDIUM  
☐ HIGH  
☐ CONCLUSIVE

### Why does it matter?

____________________________________

---

## CLUE 6

### Clue

____________________________________

### Answer

____________________________________

### Accepted answers / aliases

____________________________________

### Evidence unlocked

____________________________________

### Diagnosticity

☐ LOW  
☐ MEDIUM  
☐ HIGH  
☐ CONCLUSIVE

### Why does it matter?

____________________________________

---

# HYPOTHESIS MAP

Before seeing all evidence, what might a player reasonably think?

### Hypothesis A

____________________________

What evidence supports it?

____________________________

What evidence eventually disproves or weakens it?

____________________________

---

### Hypothesis B

____________________________

What evidence supports it?

____________________________

What evidence eventually disproves or weakens it?

____________________________

---

### Correct hypothesis

____________________________

What makes it ultimately compelling?

____________________________

---

# EVIDENCE PROGRESSION

Put the evidence in intended order.

| Order | Evidence | Diagnosticity | What might player think? |
|---|---|---|---|
| 1 | | LOW | |
| 2 | | LOW | |
| 3 | | MEDIUM | |
| 4 | | MEDIUM | |
| 5 | | HIGH | |
| 6 | | HIGH | |
| 7 | | CONCLUSIVE | |

---

# LATERAL CONNECTIONS

List interesting connections that make the mystery richer.

### Connection 1

A:

________________

B:

________________

Why legitimate:

________________

---

### Connection 2

A:

________________

B:

________________

Why legitimate:

________________

---

### Connection 3

A:

________________

B:

________________

Why legitimate:

________________

---

# RED HERRING / ALTERNATE HYPOTHESIS

Is there a legitimate alternative interpretation?

____________________________________

Why might someone initially believe it?

____________________________________

What evidence resolves it?

____________________________________

---

# FINAL REVEAL

## Answer

____________________________

## Why the answer is correct

____________________________________

____________________________________

## How the evidence fits

1. ________________________________
2. ________________________________
3. ________________________________
4. ________________________________
5. ________________________________

## The "OH!" moment

What should make the player suddenly understand?

____________________________________

____________________________________

---

# CASE QUALITY TEST

Score each 1–5.

Recognition: _____

Connection density: _____

Multiple entry points: _____

Cross-generational accessibility: _____

Clue fairness: _____

Evidence quality: _____

Hypothesis potential: _____

Reveal satisfaction: _____

Mystery feeling: _____

Uniqueness from existing games: _____

TOTAL: _____ / 50

A strong case should generally score at least 40/50.

---

# 37. FIRST PROTOTYPE REQUIREMENTS

Do NOT build the entire product yet.

Build a functional prototype around ONE CASE.

The prototype should support:

### Home

- Today's Case
- Start Case
- optional Practice button

### Case Screen

- case number
- mystery question
- current evidence
- current theory
- current clue
- answer input
- submit
- hint
- solve case

### Clue Solving

- text clue
- answer validation
- aliases
- incorrect answer feedback
- correct answer feedback

### Evidence

- reveal animation
- text
- image
- number
- quote

### Hypothesis

- create theory
- edit theory
- theory history

### Final Answer

- solve
- correct
- incorrect
- continue investigating after incorrect final guess if desired

### Case Complete

- CASE CLOSED
- final answer
- score
- clues used
- theories
- reveal explanation

---

# 38. DO NOT BUILD YET

Do not spend time initially on:

- user accounts
- backend authentication
- multiplayer
- leaderboards
- subscriptions
- advertisements
- social network
- push notifications
- complex analytics
- AI-generated puzzles
- automatic cultural graph generation
- audio
- video
- large content library

First prove the core loop.

---

# 39. PROTOTYPE SUCCESS CRITERIA

The prototype succeeds if a tester can:

1. Understand what they are supposed to do without explanation.
2. Solve individual clues.
3. Understand that solving a clue unlocks evidence.
4. Look at the evidence and wonder what it means.
5. Form a hypothesis.
6. Change the hypothesis when new evidence appears.
7. Eventually identify the final answer.
8. Understand the final reveal.
9. Experience an "OH!" moment.
10. Want to play another case.

The most important question is:

> **Was solving the mystery fun?**

Not:

> Was the UI polished?

---

# 40. IMPORTANT DESIGN PRINCIPLE

Protect this distinction throughout development:

## If the clues are too obscure:

It becomes trivia.

## If the evidence is too obvious:

It becomes Connections.

## If the clues themselves are too difficult:

It becomes a crossword.

## If the answer requires one obscure fact:

It becomes frustrating.

## If the player can solve every individual clue but still has to determine what the clues mean together:

That is the game.

---

# 41. CURSOR IMPLEMENTATION INSTRUCTION

First inspect the existing repository and determine the current framework and structure.

Do not unnecessarily replace an existing working stack.

Then implement the prototype architecture above.

Create:

1. Game state model
2. Case data model
3. Clue model
4. Evidence model
5. Hypothesis model
6. Cultural entity model
7. Case engine
8. Clue engine
9. Evidence engine
10. Hypothesis engine
11. Answer engine
12. Scoring engine
13. Reveal engine
14. Case screen
15. Evidence UI
16. Theory UI
17. Case completion UI
18. Case authoring/workshop UI
19. Case validation system
20. JSON import/export

The Case Workshop must allow an author to create a case visually and export valid JSON.

The game must also be able to load a case from JSON.

The same case should therefore be usable through:

AUTHORING TOOL
→ JSON
→ GAME ENGINE

This is important because eventually cases may be created externally and imported into the game.

---

# 42. CASE WORKSHOP UX

The authoring interface should have sections:

```text
CASE
CULTURAL ENTITY
ENTRY POINTS
CLUES
EVIDENCE
HYPOTHESES
INVESTIGATION PATHS
HINTS
REVEAL
VALIDATION
PREVIEW
EXPORT
```

Include:

**Save Draft**

**Validate Case**

**Preview Case**

**Export JSON**

**Import JSON**

The Preview mode should simulate the actual player experience.

---

# 43. AUTHORING MODE VS PLAYER MODE

Never expose:

- author notes
- diagnosticity
- connection graph
- related entities
- intended hypotheses
- solution path metadata

to the player.

These are editorial tools.

Player mode sees only:

- clues
- clue answers after solving
- evidence
- their own theories
- hints
- final reveal

---

# 44. JSON EXPORT

The authoring system should export a clean case JSON matching the game schema.

Example:

```json
{
  "id": "case_001",
  "version": 1,
  "title": "Case #001",
  "question": "What are we looking for?",

  "answer": {
    "primary": "Queen",
    "aliases": ["queen", "the queen"]
  },

  "type": "music",

  "clues": [
    {
      "id": "clue_001",
      "type": "text",
      "prompt": "This British musician studied astrophysics.",
      "answer": {
        "primary": "Brian May",
        "aliases": ["brian may"]
      },
      "evidenceId": "evidence_001"
    }
  ],

  "evidence": [
    {
      "id": "evidence_001",
      "type": "image",
      "content": "/assets/cases/001/guitar.jpg",
      "diagnosticity": "low"
    }
  ],

  "hints": [],

  "reveal": {
    "summary": "..."
  }
}
```

---

# 45. DO NOT OVERBUILD THE FIRST VERSION

The immediate objective is not to create a commercial game.

The immediate objective is to answer one question:

> **Does the Cultural Mystery mechanic produce a genuinely satisfying "I figured it out" experience?**

Build one excellent case.

Then test it.

Then revise the mechanic.

Then build five cases.

Then test again.

Only after that should the project expand into a daily content platform.

---

# 46. FINAL PRODUCT PRINCIPLE

The game should always feel like:

**INVESTIGATION**

not:

**TESTING**

The player should feel clever because they interpreted evidence correctly, not because they happened to memorize obscure trivia.

The player's cultural knowledge is the raw material.

Their reasoning is the gameplay.

Their hypothesis is the engine.

The reveal is the reward.

---

# END OF SPECIFICATION