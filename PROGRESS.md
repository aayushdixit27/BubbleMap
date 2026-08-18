# PROGRESS

> **Last updated: 17 Aug 2026, after Phase 0 probe runs.**
> If today is well past that date, treat everything below as suspect — check
> `git log --oneline` for the real state before trusting this file.

**This is the state-reload file.** Read it first, every session. It exists so that
clearing context at a phase boundary costs ~2k tokens instead of re-reading 40k of
spec. Fable updates it at every phase boundary, before committing.

---

## Where we are

**Phase 0 — built and run on six songs; gate still open pending the human read.**

Probe output for all six songs is in `probe-runs/*.json` (raw model output
included); mechanical counts are in `probe-runs/SUMMARY.md`. Nobody has yet
judged the output against the two tests below.

Committed as `a106b70` — "Phase 0: prompt probe — types, verbatim §8 prompt, seed
via tool use, CLI". 425 lines across four files. No React, no Vite, no canvas,
which is correct.

| file | lines | job |
|---|---|---|
| `src/types.ts` | 49 | ARCHITECTURE §5 types, single source of truth |
| `server/prompts.ts` | 81 | the §8 system prompt, verbatim |
| `server/ai.ts` | 218 | Anthropic client, §7.1 tool schema, ref resolution |
| `scripts/probe.ts` | 77 | `npm run probe -- "<song> — <artist>"` |

**The gate is not passed.** Building the probe was the easy half. Phase 0 only
clears when the *output* has been read by a human against the two tests below.

---

## The open question — everything is blocked on this

Run the probe on six songs, at least two expected **not** to be LOVE. Then judge:

1. **Does RAW implicate the narrator**, or is it REAL wearing a bigger coat?
   (PRODUCT.md §4 #1 — the fatal risk.)
2. **Do categories spread**, or does everything come back LOVE because it's a song?
   (PRODUCT.md §4 #2 — invalidates the target geometry if it fails.)

Suggested set: Mr. Brightside · Runaway (Kanye — the cross-category test) ·
Super Rich Kids · Landslide · two of your own.

**Both failures are prompt problems and belong to the architect, not the
implementer.** Do not fix them in code. Do not soften the tests to make the output
pass.

---

## Decisions already made — do not relitigate

- Target geometry (4 quadrants × 3 rings, RAW at centre) over horizontal lanes.
  Contingent on test #2 above passing.
- React Flow v12 over tldraw/Excalidraw. Nodes must be real DOM for editable text.
- Local Express proxy holding the key; no direct-from-browser API calls.
- JSON files in `maps/`, no database.
- Build order is pre-mortem-driven, not engineering-convenience-driven.
  See ARCHITECTURE §12 — the reasoning matters more than the sequence.

## Known gaps in the spec, accepted for now

- **No expected keep-rate for proposals.** If `seed` returns 6 and you kill 5 every
  time, nothing tells us whether that's the tool working or failing. Phase 0's
  output is the data that sets this number — record it.
- **No accuracy pass.** A beautifully self-implicating RAW bubble about a lyric that
  doesn't exist passes every gate we wrote. See ARCHITECTURE §7.3.

---

## Next

Read the probe output. Report back to the architect with the **raw JSON**, not a
summary — the whole question is whether the words are good, so the words have to
survive the trip.

Then: Phase 1, walking skeleton. Not before.

---

## Phase log

| phase | status | commit | note |
|---|---|---|---|
| 0 — prompt probe | runs done, **gate open** | `a106b70` + probe-runs commit | 6 songs seeded, title-only. Category spread: love 11, identity 11, fitness 10, earnings 9 (41 bubbles; every song touched ≥3 quadrants). Tiers: 25 SAFE, 16 REAL, 0 RAW (seed doesn't request RAW). Needs human read of output — see `probe-runs/SUMMARY.md` |
| 1 — walking skeleton | not started | — | |
| 2 — the loop | not started | — | first usable version |
| 3 — authoring | not started | — | |
| 4 — depth | not started | — | |
| 5 — cut list | not started | — | expect to cut most |
