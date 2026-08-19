# PROGRESS

> **Last updated: 19 Aug 2026. Phase 2 closed. D26 complete; D30–D40
> ruled and built. Latest batch: the sourceLine guard FLAGS instead of
> rejecting (D39, `citationUnverified`), run-end messages are true —
> declined vs discarded (D40), the generating screen shows the lyrics,
> and the first-RAW metric is live. D38 standing bias holds: until ~10
> judged maps, build only what makes the next songs cheaper. Q6
> ("explain this") approved but sequenced after one more song.
> Next: map songs.**
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

**D26 build status** (supersedes D25's judgment model; **amends Hard
Rule 1** — re-read it in CLAUDE.md):

- **Chunk 1 ✓ home base** (`5192203` + `0b80de8`). Library landing:
  songs most recent first, each row = title / sharpest RAW line (most
  recently committed RAW label, 15px serif) / date+time+descent-count
  meta. Hover-revealed delete with inline confirm. "Add a song" reveals
  the form. Opening only reads.
- **Chunk 2 ✓ opt-out judging** (`a7fd7a9`). Arrivals commit on
  finalize; the only control is "kill this descent" → whole path to
  `rejected[]` (shared ancestors spared); session undo stack +
  "undo kill" in the toolbar. Verified: kill→undo restores the file
  identically.
- **Chunk 3 ✓ continuous serial descents** (`54d3972`). Up to 10 per
  song (`DESCENT_TARGET` in `src/store.ts`), one at a time, appended+
  committed as each completes. First descend overlaps the seed tail
  (provisional focus id, links remapped via new `Proposal.refs`). When
  REALs run out, a new REAL is spawned from the least-used SAFE. Honest
  early stop; progress line "N of 10 · still going" → "done". Verified
  live: 10/10 distinct readings, no provisional-id leakage.
- **Chunk 4 ✓ three views** (`81d099e`). Readings (default) / Grid /
  Target; the toolbar shows only the two views you're *not* in, so every
  label names a destination by construction. Target = the RAW disc
  (**D30**, which cropped the spec's three-ring frame after a two-render
  comparison): committed RAW dots by category on `canvas/geometry.ts`
  positions (18 tests, untouched), one hairline circle + axes, corner
  labels in category ink, D22 treatment. The committed-only filter is
  load-bearing — pre-commit bubbles sit at (0,0) until `placeInRegion`
  runs, so a streaming descent would otherwise render a phantom centre
  dot. Verified on a synthetic 10-RAW map (5 identity / 3 fitness /
  1 love / 1 earnings, positioned by the real `placeInRegion`): reads
  Identity-heavy at a glance from position alone, all five clustered
  identity dots separated, no overlap. Synthetic map deleted after.

**Known facts not written anywhere else:**

- **Centring fix** (`src/styles.css`): the centred columns are flex
  children with auto margins, which disables stretch and shrink-wraps
  the box to its content — the column drifted with content width. Fix =
  explicit `width: 100%` under each `max-width` (`.start`, `.reading`,
  `.readings-empty`). Any new centred view needs the same pair.
- **Descend's input now includes all existing bubbles** (labels only,
  D17 #2) — the D8 argument applied to descend: it cannot avoid
  duplicating threads it cannot see. Implementer change in
  `server/ai.ts buildUserMessage`; it produced 10 distinct RAWs in the
  wire test. **Architect should ratify → DECISIONS entry.**
- **~20s first-RAW target is blocked on seed emission order.** Seed
  streams 3 SAFEs before the first REAL, so the overlapped descend can
  start only ~70% through a ~30s seed. Measured: first RAW committed
  47s; the metric now reports first *visible* (streamed) RAW. Fix needs
  seed to emit REALs earlier or a smaller seed — prompt/contract
  change, architect's call.
- **Readings derive one reading per RAW bubble** via its own ancestor
  chain (`parentOf` walk), NOT per thread — one SAFE now parents
  several descents, and a thread-based derivation hides all but the
  first.
- **Do not edit `src/` or `server/` while a generation runs.** Vite HMR
  reloads the client (killing the in-flight loop mid-run); tsx watch
  restarts the server under its API calls.
- **`maps/` is gitignored — no VCS safety net.** Copy a map to the
  scratchpad before any risky operation on it (that's how kill/undo was
  tested against the real Beautiful map).
- **D37 one-ahead buffer** (`src/store.ts`): the active run OWNS its doc
  (module-level `activeRun`); every run mutation targets `run.doc` and
  publishes to the store only while that map is open. Unopened arrivals
  queue as `proposed` (nothing on disk); `openMap` adopts — commits the
  queue in the frame it first renders. The loop keys off ARRIVED (final
  id), not committed, so an unopened run never stalls. Kill/undo write
  through to `run.doc` — one truth. One run total; a third song is
  structurally impossible. **Verified live** by a headless harness
  (scratchpad `d37-harness.mts` pattern: patch fetch to a scratch server
  on `BUBBLEMAP_PORT=8899`, `BUBBLEMAP_MAPS_DIR` scratch, cheap
  `BUBBLEMAP_MODEL`, drive the real store, assert gate/adoption/
  no-orphans/disk-parity). Rebuild it from this note if needed.
- **One owner per mutable resource** (field-guides/systems #5, written
  down as instructed): dev servers — **the human**, implementer never
  relaunches; map files — **the running app exclusively**, no hand-edits
  while any tab has the map open (a stale tab's autosave clobbers them;
  the 19 Aug descent-v repair was done file-first and only survived
  because the tab was reloaded after).
- **No native dialogs** (`window.confirm` etc.) — they hang browser
  automation and read as chrome; use inline two-step confirms (see the
  library delete).
- Killed paths park in `rejected[]` with their committed status;
  `readMap` backfills `rejected: []` for pre-D24 files;
  `BUBBLEMAP_MAPS_DIR` env redirects storage for tests.
- The probe run (`src/loadProbeRun.ts`) is read-only design-test data,
  pre-D23 (no sourceLines) — lyric-line slots render empty there only.
- Autosave is immediate/serialized/coalescing with `keepalive` PUTs —
  the 800ms debounce starved under rapid clicks and lost whole maps.
  Do not reintroduce a debounce.
- **Never measure layout from screenshot pixels** (D31) — browser-
  extension screenshots compound device-pixel scaling, page zoom, and
  side-panel width, and on 18 Aug the capture path also served stale
  frames that contradicted the live DOM. Measure with
  `getBoundingClientRect` against `window.innerWidth/Height`; use
  screenshots for *feel*, and when the two disagree, trust the DOM and
  confirm with human eyes.
- **descend's parent link is guaranteed client-side** (`ensureParentLink`
  in `src/store.ts`): the focus is the parent by construction, so a
  model-fumbled link can no longer orphan a RAW or make the loop
  re-descend the same focus (Money descent v, 19 Aug — one wasted
  descent). Underlying gap still open: the server console.warns link
  rejections but the client ignores `proposal.rejections`; surfacing
  them in the UI is unowned.
- **Streamed content must neither move nor remount once visible**:
  `replaceRun` swaps a run's ghosts in place, and readings keep their
  ghost-era React key (`stableKey`). Don't reintroduce filter+append on
  `doc.bubbles` — tail-appending re-sorted readings mid-run.
- A synthetic map for view-testing is ~20 lines: import `placeInRegion`
  from `src/canvas/geometry.ts` under `tsx`, emit committed bubbles into
  `maps/<slug>-<id>.json` — the filename **must** end `-<id>.json` or
  `storage.ts` can't find it. Delete the file when done (`maps/` is
  gitignored; the library shows it immediately).

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

**Run a real song end-to-end under the full D26 flow.** D26 is complete
(all four chunks committed — see status above). The dogfood run answers
Q3's kill-rate question with real numbers and is the first time the
Target view meets real data at ten descents. Q5 (three-tier inward
paths in the Target) is logged and deliberately deferred — do not start
it before the dogfood run. After that: the architect's next call.

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
