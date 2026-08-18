# CLAUDE.md — BubbleMap

Read `PRODUCT.md` then `ARCHITECTURE.md` in full at the start of every session.

PRODUCT.md answers *why* and *what we're not building*. ARCHITECTURE.md answers
*how*. If code and spec disagree, the spec wins until a human amends it. If
ARCHITECTURE and PRODUCT disagree, PRODUCT wins — a correct implementation of the
wrong thing is still the wrong thing.

## What this project is

A local Chrome-based canvas that maps a song's meaning along two axes: depth
(SAFE → REAL → RAW) and category (LIFE: Love, Identity, Fitness, Earnings).
Rendered as a target — four quadrants, three concentric rings, RAW at the
bullseye. AI proposes bubbles and links; the human accepts them.

## Hard rules

1. **AI never mutates the map.** Every AI-produced bubble or link arrives with
   `status: 'proposed'` and requires a human accept. There is no code path where
   an API response writes committed state.
2. **The system prompt in ARCHITECTURE.md §8 is verbatim.** Do not reword,
   compress, reformat, or "clean up" it in `server/prompts.ts`. It is product
   copy. Changing it is a product decision made by the architect.
3. **Never write outside this directory.** No global installs, no writes to the
   home directory, no touching other repos.
4. **The server binds `127.0.0.1`.** Never `0.0.0.0`, never a LAN interface.
5. **`.env` and `maps/` stay gitignored.** Confirm this before the API key exists
   on disk.
6. **The model string lives only in `server/ai.ts`, read from `BUBBLEMAP_MODEL`.**
   Never hardcode it elsewhere.
7. **Never clip or ellipsize bubble text.** Nodes size to their content. This is a
   reading tool; unreadable is broken.
8. **Cross-category descent is a feature, not a bug.** A `refines` link whose
   source and target categories differ must render with the §9.3 treatment. Do not
   "fix" it by constraining the category.
9. **Phase 0 gates everything.** No React, no Vite, no canvas until the prompt
   probe passes on real songs. Building the UI first is the comfortable order and
   the wrong one — see PRODUCT.md §4.
10. **Check PRODUCT.md §3 before adding anything.** If a feature doesn't shorten
    the path from "I like this song" to "here is the raw thing," it's a non-goal
    by default. Say so out loud rather than quietly building it.

## Conventions

- TypeScript strict mode. No `any` in committed code.
- Types live in `src/types.ts` and are imported by the server. One source of truth.
- No CSS framework. Plain CSS + the variables in §9.1.
- No state library beyond Zustand. No React Router — this is one screen.
- Before adding a dependency, ask whether ~30 lines would do it. Usually yes.
  Blessed exceptions: `tsx` and `concurrently` as devDeps (§3).
- Pin versions by running `npm view <pkg> version`. Take current stable for
  everything — React 19 and Express 5 are expected, not a deviation.
- React Flow v12 imports from `@xyflow/react` and requires
  `import '@xyflow/react/dist/style.css'`.
- **All geometry works in bubble-CENTER coordinates** (§6.1). React Flow's
  `node.position` is top-left. Convert at the boundary, every time.

## Testing

- `canvas/geometry.ts` has real unit tests:
  - `regionForPoint` — every quadrant × every ring; both dead-zone types
    (ring gaps, axis gutters) return `null`; out-of-bounds returns `null`.
  - `assignRegion` — never returns `null`; ring gaps and axis gutters snap to the
    nearest region; `r` beyond the SAFE outer radius snaps back into SAFE.
  - `toCenter` / `toTopLeft` round-trip to the original point.
  - `placeInRegion` output always satisfies `regionForPoint(result) === input`.

  This file is pure trig that everything else depends on — a sign error is
  invisible until it's expensive.
- The §5 invariants have tests. Especially: no upward `refines`, no orphan link
  endpoints, no duplicate `(source, target, kind)`.
- Everything else can be verified by hand in Chrome.

## Workflow

- Commit at every phase boundary in §12 with a message naming the phase.
- Build phases in order. Do not start the next phase until the current one runs.
- Stop and report at each phase boundary rather than rolling forward.
- If you find yourself patching the same symptom a third time, stop. That means
  the design is wrong, and the fix belongs to the architect, not the implementer.

## Escalate to the architect (Opus 5) rather than deciding

- The RAW output reads like a stronger-worded SAFE output → prompt problem.
- A new AI verb seems necessary.
- The data model needs a new field, tier, category, or link kind.
- Two designs both look fine and the spec doesn't choose.
