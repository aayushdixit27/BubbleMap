# PROGRESS

> **Last updated: 18 Aug 2026, end of Phase 1.**
> If today is well past that date, treat everything below as suspect — check
> `git log --oneline` for the real state before trusting this file.

**This is the state-reload file.** Read it first, every session. It exists so that
clearing context at a phase boundary costs ~2k tokens instead of re-reading 40k of
spec. Fable updates it at every phase boundary, before committing.

---

## Where we are

**Phase 1 — rebuilt per D20 as the thread grid, verified in Chrome. Phase 0
closed (gate passed, D11–D17).**

What runs: `npm run dev` → Express on `127.0.0.1:8787` (`/api/health` green,
reports the model) + Vite on `127.0.0.1:5173`, proxied. The Phase 0 chain
output (`probe-runs/mr-brightside.json`) renders as the D20 grid: threads as
rows (derived from the doc's links in `src/grid/threads.ts` — refines >
assumes > evidence parenting, contradicts never parents), tiers as columns
with RAW widest and flowing multi-column. Cards carry category hue on the
left border, tier intensity, labels always whole. Cross-category descent is
a gradient badge on the card (`LOVE → IDENTITY`), not a line. DOI: clicking
a row expands every card in it to full notes; other rows stay labels-only.
The target survives as a 96px dots-only signature in the header (D20),
positioned by the same geometry. Overlap is structurally impossible.

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

Phase 2 — the loop, first usable version. Apply D18's verb counts (seed 3+3,
descend 3-candidates-keep-1, interrogate on-demand max 3) and D17 #3
(parallelise descends) with the verb wiring. Done when a new song maps start
to finish in under ten minutes, timed.

Then run PRODUCT §6.5's five-question phase gate in writing before opening Phase 1.

---

## Phase log

| phase | status | commit | note |
|---|---|---|---|
| 0 — probe v1 | superseded | `a106b70`, `6dda483` | seed-only, 6 songs, title-only. Category spread cleared; RAW untestable by construction |
| 0 — probe v2 | **closed — gate passed** | `d2a95d1` | RAW implicates the narrator, lyrics grounding worked, no fabrications (architect read). Decisions D11–D18 |
| 1 — walking skeleton | **built (D20 grid)** | `474051d` + D20 rebuild commit | geometry + 18 tests kept; target canvas replaced by thread grid + signature (D20/D21); React Flow deleted. Renders pre-filter firehose; thins at Phase 2 |
| 2 — the loop | not started | — | first usable version |
| 3 — authoring | not started | — | |
| 4 — depth | not started | — | |
| 5 — cut list | not started | — | expect to cut most |
