# PROGRESS

> **Last updated: 18 Aug 2026, Phase 2 closed (gate passed); D26 build starting.**
> If today is well past that date, treat everything below as suspect — check
> `git log --oneline` for the real state before trusting this file.

**This is the state-reload file.** Read it first, every session. It exists so that
clearing context at a phase boundary costs ~2k tokens instead of re-reading 40k of
spec. Fable updates it at every phase boundary, before committing.

---

## Where we are

**Phase 2 — the loop, rebuilt around D25: the unit of judgment is the
DESCENT, not the bubble.** Flow: paste title + lyrics → seed (3 SAFE +
3 REAL, split schema- and server-enforced) → the moment seed returns,
descend fires on all three REALs in parallel, each returning exactly one
RAW (D25 changed this from 3-candidates-keep-1) → three complete descents
present in the READINGS view (SAFE → REAL → RAW vertically, D22 type
crescendo, sourceLine as a serif citation under each entry) → keep/kill
per descent: keep commits the whole path, kill parks it in rejected[]
(shared ancestors spared while another path uses them). Per-bubble
keep/kill, the descend button, and Shift+A/X are gone. The grid remains
as a presentation-only toggle. Autosave is immediate (a debounce-starvation
bug lost whole maps on 18 Aug — fixed, round-trip tested). D23 sourceLine
validation live. Target being tested: lyrics → RAW on screen < 1 minute.

**Phase 2 gate: PASSED.** The dogfood run on Carole King's "Beautiful"
(18 Aug) produced genuinely raw output — the flinch test cleared —
correctly categorised and lyric-grounded, with RAW on screen in 53s.

**Now building D26** (supersedes D25's judgment model; **amends Hard
Rule 1** — re-read it in CLAUDE.md): library home base, opt-out judging
(descents land committed, kill is the gesture, undoable), up to 10
continuous serial descents with always-visible progress, three views
(Readings / Grid / Target). Building in four committed chunks, in that
order.

Superseded today: D24's per-bubble flow (→ D25), ARCHITECTURE §7's verb
table (amended in place, note at §7 top).

Earlier state, still true underneath:

**Phase 1 — D20 thread grid with the D22 editorial treatment, verified in
Chrome. Phase 0 closed (gate passed, D11–D17).**

What runs: `npm run dev` → Express on `127.0.0.1:8787` (`/api/health` green,
reports the model) + Vite on `127.0.0.1:5173`, proxied. The Phase 0 chain
output (`probe-runs/mr-brightside.json`) renders as the D20 grid: threads as
rows (derived from the doc's links in `src/grid/threads.ts` — refines >
assumes > evidence parenting, contradicts never parents), tiers as columns
with RAW widest and flowing multi-column. DOI: clicking a row expands every
entry in it to full notes; other rows stay labels-only. Overlap is
structurally impossible.

Visual layer is D22 (supersedes ARCHITECTURE §9): paper `#f6f3ec`, ink
`#1a1814`, no dark mode. Tier is typographic — SAFE 13px grey sans, REAL
15px darker sans, RAW 21px Source Serif 4 near-black with 14px serif notes.
Category is small-caps marginalia in muted inks; cross-category reads
`Identity → Love` in the marginalia, no pills. Hairline rules `#ddd7ca`
between rows; nothing is a card — no radius, shadow, or glow. The signature
is hairline circles + category-ink dots. Font ships locally via
`@fontsource/source-serif-4` (no CDN). The old §9.1 tokens are deleted.

React Flow and the canvas components are **deleted** (D21) — grid + static
SVG need neither. `src/canvas/geometry.ts` + 18 passing tests untouched.

Carry-overs done earlier: relink cut (D15), interrogate schema-capped (D16),
streaming + context trim (D17 #1–2). D17 #3 (parallel descends) and D18
(spine-not-bush verb counts, ~9-bubble maps) apply at Phase 2 with the verbs.
The grid currently shows the unfiltered firehose; Phase 2's keep-1-of-3 thins it.

### The gate — one question

Read the RAW bubbles. **Does any of them make you uncomfortable to have written
down?** Binary. That's PRODUCT §2's flinch test and it is the whole reason the
project exists.

Read in this order, because judgment degrades and the most important question
deserves the freshest attention:

1. RAW bubbles only. Ignore everything else.
2. What tier `interrogate` assigned its assumption bubbles — see open questions below.
3. Everything else, **only if 1 and 2 went well.**

If RAW is soft, that is a §8 prompt problem and it belongs to the architect. Do not
fix it in code.

---

## What the superseded run taught us

The first probe (commit `a106b70`, six songs, `seed` only, title-only) is kept as
evidence but does **not** clear the gate — `seed` stops at REAL by contract, so it
could never test RAW. Three things survive from it:

- **Categories spread.** love 11, identity 11, fitness 10, earnings 9 across 41
  bubbles; every song touched at least three quadrants. Nothing collapsed into LOVE.
  PRODUCT §4 #2 is provisionally cleared.
- **SAFE→REAL is not paraphrase.** Human read: 9 of 12 descents add information
  that could be wrong. This is the *easy* jump, so treat it as a ceiling estimate
  for RAW, not a floor.
- **Probable fabrication under title-only running.** "Explain the emails" appeared
  in a Runaway descent; there are no emails in that song. This is why the rebuilt
  probe requires lyrics. ARCHITECTURE §7.3.

Mr. Brightside was run title-only in that batch, so re-running it with lyrics gives
an **unplanned controlled comparison on identical material** — the cleanest way to
separate "weak prompt" from "model working off recall."

---

## Open architectural questions — architect owns these, do not patch

- **`interrogate`'s assumption bubbles have no defined tier.** An assumption isn't
  SAFE, REAL or RAW; it's orthogonal to the axis. The schema forces a tier anyway,
  so the model picks arbitrarily. Geometry makes it worse: a RAW quadrant holds 2–3
  bubbles and `interrogate` can produce twelve for one song. **Deliberately left
  unresolved so the raw behaviour is visible in this run.** Outcome decides whether
  assumptions get their own tier, sit outside the rings, or get cut.
- **The target canvas: cheap to build, expensive to undo.** The architect first
  argued against it on build cost — "2–3 sessions" — which was wrong. Agent build
  time is hours, so *construction* cost is not a reason to defer anything, and any
  future argument resting on it should be rejected.

  What remains is lock-in, not labour. Ring capacity (2–3 RAW per quadrant), a
  forced `tier` on every bubble including assumptions, and drag-to-reassign
  semantics are **data-model commitments**. Once maps exist in that shape, changing
  them means migrating maps — a cost that does not fall as codegen gets faster.
  So: build the canvas, but settle the assumption-tier question above *first*,
  because it's the one that would force a migration.

---

## Decisions reversed on 17 Aug — do not restore without reading why

- Phase 0 was `seed`-only → now all four verbs. A partial chain cannot test RAW.
- Phase 0 was six songs → **one**. ~27 bubbles is readable; ~160 is not, and an
  unread pass that says "fine" is worse than no pass.
- Phase 0 was title-only → **lyrics required**, enforced mechanically.
- `interrogate` input was "focus + source" → **focus + all committed bubbles +
  source**. It cannot propose `contradicts` links against bubbles it cannot see.
  (Caught by the implementer, not the architect.)

## Decisions holding — do not relitigate

React Flow v12 over tldraw/Excalidraw. Local Express proxy holding the key. JSON
files in `maps/`, no database. Build order driven by the pre-mortem. AI never
mutates the map.

---

## Next

The D26 build, four chunks, committed and stopped between each:

1. **Home base** — the landing screen is the library (songs, most recent
   first: title, date made, descent count); "Add a song" is one option on
   it; opening a song only reads.
2. **Opt-out judging** — descents land committed; the only gesture is
   "kill this descent" → rejected[], undoable for the session.
3. **Continuous descents** — up to 10 per song, serial, appended as each
   completes; first RAW ~20s; always-visible progress (`4 of 10 · still
   going` → `done`); stop early honestly if the song runs out of threads.
4. **Three views** — Readings (default), Grid, Target (Jun Yuh circle:
   RAW dots by category on geometry.ts, D22 dots-and-hairlines).

---

## Phase log

| phase | status | commit | note |
|---|---|---|---|
| 0 — probe v1 | superseded | `a106b70`, `6dda483` | seed-only, 6 songs, title-only. Category spread cleared; RAW untestable by construction |
| 0 — probe v2 | **closed — gate passed** | `d2a95d1` | RAW implicates the narrator, lyrics grounding worked, no fabrications (architect read). Decisions D11–D18 |
| 1 — walking skeleton | **built (D20 grid, D22 editorial)** | `474051d`, `bb280b0`, + D22 commit | geometry + 18 tests kept; thread grid + signature (D20/D21); React Flow deleted; editorial restyle (D22). Renders pre-filter firehose; thins at Phase 2 |
| 2 — the loop | **closed — gate passed** | `1df5aad` + gate run | D25 descent flow; "Beautiful" (Carole King) cleared the flinch test, lyric-grounded, RAW in 53s. D26 supersedes the judgment model next |
| 3 — authoring | not started | — | |
| 4 — depth | not started | — | |
| 5 — cut list | not started | — | expect to cut most |
