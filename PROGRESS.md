# PROGRESS

> **Last updated: 20 Aug 2026, pre-clear. Phase 2 closed; everything
> through D42 is built, plus the compose surface, Target-as-landing, and
> the keeper frame. Five maps exist; the corpus view waits for ~10.
> D38's standing bias is live: build ONLY what makes the next songs
> cheaper to get through. The next song answers three questions at once
> — see "The three live questions" below. Next: map songs, not
> features.**
> If today is well past that date, treat everything below as suspect — check
> `git log --oneline` for the real state before trusting this file.

**This is the state-reload file.** Read it first, every session. It exists so that
clearing context at a phase boundary costs ~2k tokens instead of re-reading 40k of
spec. Fable updates it at every phase boundary, before committing.

---

## Where we are

**Phase 2 closed (gate passed on "Beautiful", 18 Aug — flinch test
cleared, lyric-grounded).** Since then the loop has been hardened
through live dogfooding, D26–D42 all ruled and built. The current flow:

**Compose** (own mode, not a library row): title + one enormous lyrics
paste target; drafts survive navigation via localStorage; "Map this
song" starts the run. → **Seed** (3 SAFE + 3 REAL, schema+server
enforced) with the first descend overlapping the seed tail →
**up to 10 serial descents** (`DESCENT_TARGET`, src/store.ts), each
exactly one RAW, landing committed as they arrive (amended Hard Rule 1
— opt-out judging; the only gestures are "kill this descent" and, at
run end, choosing **the keeper**). While generating, the pasted lyrics
render as a quiet sheet (never a blank screen) and the first-RAW metric
ticks live. At run end the model **nominates three RAWs** (D41/D42,
`NOMINATE_SUFFIX` in prompts.ts, persisted as `doc.nominatedIds`); the
human picks one → `doc.keeperId`, the song's canonical raw thing,
re-choosable forever, shown in the library row and ringed on the
Target. **D37 one-ahead**: "next song" starts N+1 while reading N; a
third is structurally impossible.

**Views**: Target (RAW disc, D30) is the LANDING view — it answers
"what is this song about" at a glance; click a dot for its SAFE→REAL→
RAW provenance panel. A still-generating map lands on Readings (the dig
is what there is to watch). Readings: one reading per RAW via its
ancestor chain (D29), tier named in the marginalia ("safe · Love"),
repeated ancestors full-text in muted ink (D32), terminal slots that
never vanish ("no deeper reading found" = declined, persisted D35;
"discarded — see rejections" = system-caused, D40), keeper frame on
top. Grid: presentation-only toggle. Rejections surface as a quiet
toolbar count (D34); the sourceLine guard FLAGS (`citationUnverified`)
instead of rejecting (D39).

## The three live questions — the next song answers all of them

1. **Tripwire count three (D25's live clause).** Two songs at ZERO
   kills. If the third is also all-keeps, D25's own terms say the
   descent-choice trade was wrong — **but D41 ships first per its own
   entry**: the keeper restores choose-one at a better level, so do NOT
   revert to 3-candidates without seeing whether forced keeper
   preference was the missing choice. The library rows show kills at a
   glance ("N kept · M killed").
2. **The keeper's first real outing.** Does the end-of-run nomination
   block feel like a natural close, does the standing frame read, does
   choosing feel like the most important act (it is)?
3. **The first on-list/off-list data point.** `keeperId` vs
   `nominatedIds` is now persisted; a human picking off-list is the §8
   diagnostic D41 was built to collect (belongs to the architect if it
   recurs).

## Corpus status

**Five maps**: Beautiful, Money, Be Her, Go your own way, Been By Now.
The corpus view is worth building at **~10**; it then costs about a
day. **D38 standing bias until then: build only what makes the next
songs cheaper to get through** — say so out loud if anything else is
proposed. PRODUCT §7 carries the architect's five-song corpus reading
(19 Aug), including a corrected architect error about IDENTITY
plurality — **do not re-derive it, read it**. PRODUCT §1 carries the
excavation reframe (raw is recovered, not invented; it should feel
like digging) — design register for everything.

**Known facts not written anywhere else (operational traps first):**

- **Dev servers run DETACHED** (started 19 Aug with `nohup … & disown`
  at the user's request, after session-owned background tasks died with
  their sessions twice). **Never host the servers as a session
  background task** — they die when the session does. The human owns
  them; check `curl 127.0.0.1:8787/api/health`; stop via
  `lsof -ti tcp:8787 | xargs kill`.
- **Compose drafts** live in localStorage keys `bubblemap.compose.*`
  and `bubblemap.next.*`; cleared only by successful submit. Input
  protection, not judgment — no D10 conflict.
- **View landing rules**: finished map → `target`; still-generating map
  → `readings`; probe run → `readings`; otherwise the view is
  human-only state in the store — nothing that mutates doc may touch
  it (a run must never move the human off the kill gesture).
- **The nominate call** reuses §8 + `NOMINATE_SUFFIX` (architect copy,
  verbatim — as product-copy as the §8 prompt itself). Skipped when a
  map has ≤3 RAWs (all become candidates locally). Failure never fails
  a run. Killing the keeper's descent clears `keeperId`.
- **Pre-D39/D42 maps carry scars**: "Be Her" lost 6 bubbles to the old
  rejecting guard (not recoverable); maps run before D42 have no
  `nominatedIds`, so they reopen without a nomination block — the hover
  gesture ("this is the keeper") is their path. Money contains one
  hand-authored `repair:` link (descent v, 19 Aug).

- **Centring fix** (`src/styles.css`): the centred columns are flex
  children with auto margins, which disables stretch and shrink-wraps
  the box to its content — the column drifted with content width. Fix =
  explicit `width: 100%` under each `max-width` (`.start`, `.reading`,
  `.readings-empty`). Any new centred view needs the same pair.
- **Descend's input includes all existing bubbles** (labels only,
  D17 #2) — ratified as **D27**. Dedup is load-bearing once one SAFE
  parents several REALs.
- **Latency standard is D28** (blocked time, not first-RAW time — the
  20s target was killed as underived): readable content within ~10s,
  page never silent, first RAW under 60s. Currently met; the first-RAW
  metric ticks live and freezes at the true number.
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

**Map songs, not features (D38).** The next run answers the three live
questions above. Deferred by ruling, do not start: **Q5** (three-tier
paths on the Target — the provenance panel was the cheap answer; the
full version waits), **Q6** ("explain this" on a highlighted RAW line —
approved in principle, sequenced after the keeper's first outing; it
makes songs deeper, not cheaper). The corpus view builds itself at ~10
maps. If a ruling arrives that isn't in DECISIONS yet, record it there
before building.

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
