# PROGRESS

> **Last updated: 22 Aug 2026. THIRTEEN maps; everything through D56
> is built and verified. The tool is deep in dogfooding: explain
> (D44/45), arcs (D46), the corpus view (D47), the keeper cut (D48 —
> the arc is the choosing act), the input-first landing (crucible A,
> D49), the Kashmir bug fixed three ways (D51/52/53), ceiling 12
> (D54, verified after the HMR trap below), grid citations (D55),
> descent paths on the header signature, RAW disc back on the Target
> (D56 + amendment, closes Q5). OPEN: D57 discoverability pass —
> items 1 (hover labels, BUILT) and 2 (disc clip, COULD NOT REPRODUCE
> — see below) await the human's look; items 3–7 gated behind it.
> Fifteen maps. Next: D57 tail, songs, arcs, watch items below.**
> If today is well past that date, treat everything below as suspect — check
> `git log --oneline` for the real state before trusting this file.

**This is the state-reload file.** Read it first, every session. Fable updates it
at every boundary, before committing.

---

## Where we are

**The flow**: the landing asks "What song?" (crucible A — typing unfolds
the compose surface in place; library at the fold beneath; drafts in
localStorage `bubblemap.compose.*` / `bubblemap.next.*`, cleared only by
submit). → Seed (3 SAFE + 3 REAL, enum + orphan-guard + up-to-2
re-samples, D51/D53) with the first descend overlapping the seed tail →
up to **12** serial descents (`DESCENT_TARGET`, src/store.ts, D54), one
RAW each, landing committed as they arrive (amended Hard Rule 1;
gestures: kill descent / kill arc, both session-undoable via one union
stack). **D37 one-ahead**: next song starts while reading this one; a
third is structurally impossible.

**Five verbs**: seed, descend (interrogate exists server-side, unwired),
**explain** (D44/45 — select words in a landed RAW step in Readings →
"explain this" → streamed prose in a hover box; chained digs carry a
trail; EPHEMERAL by design; suffix carries the honest-no clause; latency
10–20s to first text is ACCEPTED, do not lower effort, D45), and **arc**
(D46 — "descent and return" button on the Target provenance panel; five
beats RAW→REAL→SAFE→REAL→RAW; suffix carries do-not-invent-comfort; no
word cap, deleted by evidence; persists as `doc.arcs`).

**Views** (each answers a question the others cannot, D55): Target =
landing view, the cropped RAW disc titled "the raw" (D56 amendment —
twelve paths rendered as a hairball on a surface read deliberately, so
the three-tier path view moved to the HEADER SIGNATURE, where density
is texture; two surfaces, two treatments — do not re-unify).
Provenance panel per RAW dot; arc button lives there. The corpus disc
stays RAW-only — deliberately undecided until looked at. Readings = "what does this descent say" (the
judgment surface; explain lives here). Grid = "how is the song's weight
distributed across its lines" — every entry shows its sourceLine (D55);
lineage-highlight interaction deferred until scanning proves
insufficient (implementer's call). Arc = "how would this move as a
piece" (dive profile index, prose beneath, SAFE beat in sans). Corpus
(from the landing, 2+ maps) = across maps: the wall of DUG lines only +
all RAW dots on one disc.

**D48, load-bearing**: the keeper is cut; *judgment happens when it
produces something*. A song's LINE = the RAW its most recent arc was
built from. No arc → no corpus wall row; the library falls back to the
latest RAW, rendered DIM (`.library-raw.undug`) — never presented as
chosen. `keeperId`/`nominatedIds` survive on disk in 4 pre-D48 files,
deliberately unread/unmigrated (spreads round-trip them forever).

## The Kashmir episode (D51/52/53) — the most recent real bug

One run, three faults: (1) seed emitted ZERO refines links — all
contradicts/assumes — so every reading chain stopped at REAL and the
SAFE tier vanished from the UI while sitting in the file; (2) the
citation matcher couldn't read slash-joined couplets ("line A / line B"
— the standard lyric quoting convention), flagging five honest
citations; (3) the first spine guard (exactly-3, one-parent-each) was
too strict — the implementer warned whole-rejection kills good bubbles,
was overruled, and was right. Fixes: seed's link enum is `['refines']`
(D51); the guard rejects ONLY orphaned REALs — breakage, not tidiness
(D53); whole-rejected seeds re-sample up to twice before failing loudly
(D53); citations verify per slash segment (D52, D39's sensor annotated
— flag-rate baseline shifted 21 Aug mechanically). **Verified: Kashmir
re-ran clean — full spine, 10 kept, a line the broken version never
produced.**

**The retryable test (D53), the rule for ALL future error handling:**
*would a re-sample plausibly succeed?* 529 — yes. Bad spine — yes.
Rejected sourceLine — yes. Malformed request / schema violation the
model can't fix — no.

## Watch items — no action until use decides

- **Landing autofocus**: the title field autofocuses on load — the
  arrive-and-type muscle. If dogfooding shows reflexive adding over
  returning, drop the autoFocus (one line) before falling back to
  parked option B (header-pinned "add a song"). Option C (land on the
  corpus wall) revives itself at ~5 dug songs; there are 2.
- **Corpus caveat (architect's, in PRODUCT §7 n=11)**: most library
  lines are fallbacks, not choices, since D48 — findings read off the
  wall are suggestive, not evidence, until more songs are dug.
- **Q5** (three-tier paths on Target) stays deferred; the provenance
  panel was the cheap answer. **Q3** (kill-rate numbers) still open.

## Corpus status

**Thirteen maps**: Beautiful, Money, Be Her, Go Your Own Way, Been By
Now, Mr. Brightside, stupid song, hate that i made you love me
(+arc), Kashmir (re-run), Misty Mountain Hop, Going to California,
Immigrant Song, Whole Lotta Love (first 12-descent run, D54 verified).
Two songs dug (arcs): Ariana + stupid song. PRODUCT §7 carries the
n=8 authorship finding and the n=11 update with its fallback caveat —
read, don't re-derive.

## Known facts not written anywhere else (operational traps first)

- **Dev servers run DETACHED** (`nohup … & disown`); their stdout goes
  to a pipe — THERE IS NO SERVER LOG FILE to read after the fact. The
  human owns them; check `curl 127.0.0.1:8787/api/health`; stop via
  `lsof -ti tcp:8787 | xargs kill`. **Never host them as a session
  background task.**
- **HMR does not reliably apply changes to module-level constants
  captured by the store** (e.g. `DESCENT_TARGET`): Vite swaps the
  module but the Zustand store keeps the old closure. Any constant
  change needs a hard reload of the tab before it can be verified —
  "HMR live" is NOT evidence the new value is running. CONFIRMED on
  D54: nine consecutive runs landed on exactly 10 with the const at
  12; after a hard reload the next run produced 12. This probably
  cost a verification before, unnoticed.
- **D57 #2 (disc clipped at ~630px) does not reproduce against the
  committed code.** Measured via getBoundingClientRect across
  simulated 380–630px viewports: the Target svg tracks its container
  at every height (scale 0.24→0.50), ring and labels always inside
  the viewport; the corpus disc sits in `.corpus`, which scrolls.
  Meet-scaled square viewBox + `height:100%` cannot clip vertically
  by construction. Likeliest cause of the observation: a stale-HMR
  tab holding pre-amendment target code (the D54 trap again). Await
  a hard-reload re-check; if it still clips, get exact window size
  AND browser zoom (the observing browser runs 125% — dpr 2.5).
- **Screenshot-tool coordinates are raw-capture px = CSS × ~1.27 at
  this zoom.** Two false "the disc is clipped" readings and one
  false "label overflows" came from eyeballing captures this
  session; every one dissolved under getBoundingClientRect. D31.
- **The Signature filters to committed** (since D56) — it previously
  plotted proposed bubbles too, which sit at (0,0) until commit and
  stack into a phantom centre dot mid-run. The "2 dots vs 10 RAW"
  observation on Immigrant Song was mid-run state, not a bug: the
  file holds 10 committed RAWs at distinct positions and renders 10.
- **Do not edit `src/` or `server/` while a generation runs** — Vite
  HMR reloads the client (killing the in-flight loop: the run is
  CLIENT-side; a refresh also kills it, which truncated Kashmir v1 and
  wiped the session-scoped rejections counter — neither was a bug);
  tsx watch restarts the server under its API calls.
- **One owner per mutable resource**: dev servers — the human; map
  files — the running app exclusively (no hand-edits while a tab has
  the map open; a stale tab's autosave clobbers). Creating a NEW file
  in `maps/` is safe (synthetic-map recipe: emit committed bubbles via
  `placeInRegion` under tsx into `maps/<slug>-<id>.json` — filename
  MUST end `-<id>.json` — delete when done; `maps/` is gitignored, no
  VCS net; copy to scratchpad before risky ops).
- **Opus 5 thinks by default and thinking counts against max_tokens.**
  A 400 cap starved explain to zero text (`stop_reason: max_tokens`).
  Caps: explain 3000, arc 8000, verbs 16000. Never starve a cap; never
  lower effort to chase latency (D45).
- **Any view stacking multiple maps' dots must re-place them**:
  per-map `placeInRegion` is deterministic, so the i-th RAW of every
  song lands on the SAME coordinates — 62 corpus dots drew as 16 until
  the corpus disc re-placed at corpus scope (display only).
- **Seed re-samples stream over the prior attempt's ghosts** (same
  runId, `replaceRun` swaps in place). Edge: the early-overlap descend
  may start against attempt 1's REAL and remap onto the final
  attempt's same ref slot — rare, self-heals via the kill gesture.
- **Explain UI**: offer button needs z-index above the box (31 vs 30);
  selections inside the box dig deeper with a trail; readOnly (probe
  run) disables explain and arcs entirely.
- **Arc plumbing**: `Arc.rawId` resolution falls back to `rejected[]`
  (a killed descent's arc still names the song's line); if the human
  navigates away mid-write the finished arc lands on disk directly
  (fetch+PUT) — never dropped; killing the keeper... (gone); killing
  an arc goes on the same session undo stack as descents (union type).
- **Never measure layout from screenshot pixels** (D31): browser
  scaling lies; use `getBoundingClientRect` vs `window.innerWidth/
  Height`; screenshots are for feel. (Re-proven on the corpus panel.)
- **Autosave is immediate/serialized/coalescing with keepalive PUTs**
  — do not reintroduce a debounce (one lost a whole map).
- **Streamed content must neither move nor remount once visible**
  (`replaceRun` + `stableKey`); don't filter+append on `doc.bubbles`.
- `descend`'s parent link is guaranteed client-side
  (`ensureParentLink`); descend receives all bubble labels (D27).
- `sourceLineOccurs` splits citations on `/` and verifies per segment
  (D52) — don't "simplify" it back to whole-string.
- **Numbering**: the architect assigns decision numbers; a ruling
  arriving unnumbered → ASK (rule in DECISIONS' header; born of the
  double-D45). The landing crucible ruling is recorded as **D49**.
- Tests: 43 in three files (`ai.test.ts` — invariants, seed split +
  spine, D52 matcher; `storage.test.ts`; `geometry.test.ts` 18). The
  D37 headless-harness recipe: patch fetch to a scratch server on
  `BUBBLEMAP_PORT=8899`, `BUBBLEMAP_MAPS_DIR` scratch, cheap model,
  drive the real store.
- ARCHITECTURE was cross-referenced to current truth 21 Aug (§5 types,
  §6/§9 live-dead notes, §7 verb roster, §10/§12 supersession notes,
  §11 routes). `probe-runs/*.json` stays out of context (content
  filter, twice).

## Next

**Songs and arcs (D38's bias, still standing).** The corpus instrument
exists; what it needs is dug songs — arcs are the choosing act and only
two exist. The three watch items above decide themselves in use. If a
ruling arrives that isn't in DECISIONS yet, record it there (numbered
by the architect; ask if unnumbered).

---

## Phase log (historical)

| phase | status | commit | note |
|---|---|---|---|
| 0 — probe v2 | closed — gate passed | `d2a95d1` | RAW implicates the narrator, lyrics-grounded. D11–D18 |
| 1 — walking skeleton | built | `474051d`+ | D20 grid, D22 editorial; React Flow deleted |
| 2 — the loop | closed — gate passed | `1df5aad`+ | "Beautiful" cleared the flinch test; D26 amended HR1 |
| 3–5 | retired (D43) | — | phases are dead as a planning device; the queue is use-discovered |
