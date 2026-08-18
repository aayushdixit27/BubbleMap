# CLAUDE.md — BubbleMap

**Read in this order, every session:**

1. `PROGRESS.md` — where the build actually is, what's blocked. ~90 lines.
2. `DECISIONS.md` — what's already been answered. Do not re-decide these.
3. `PRODUCT.md` — the *why*. Short.

`ARCHITECTURE.md` is a reference document, not a briefing. **Read the sections you
need, when you need them**, not the whole file at session start. Subfolders carry
their own CLAUDE.md pointing at the relevant sections.

**When you hit a question none of those answer: ask the architect, don't guess.**
A guess that gets built costs more than a round trip. Record the answer in
`DECISIONS.md` when it comes back.

**When something feels wrong but you can't name why, search for prior art first.**
Find what adjacent tools do and what the established technique is called. This is
not research for its own sake — it converts taste into an argument. "This feels
cramped" is unarguable and costs three exchanges; "radial layouts are chosen
*because* they give more area at depth, and ours gives less" is decidable in ten
seconds. Do this before proposing a redesign, not after defending one.

**Never load `probe-runs/*.json` into context.** The app reads those at runtime. They
are large, and their contents are deliberately raw material that has twice tripped an
API content filter mid-generation. If a turn dies with `Output blocked by content
filtering policy`, clear context and resume in smaller chunks — one file or one
concern per turn — rather than retrying the same long generation.

**Clearing context.** Effective context degrades well before the window fills —
plan to `/clear` around 400–500k, and always at a phase boundary. Before clearing,
update `PROGRESS.md` and `DECISIONS.md`; those two files plus `PRODUCT.md` reload
the working state in about 2k tokens. If they're stale, clearing loses real work,
so treat updating them as part of finishing a task rather than paperwork after it.

Precedence when things disagree: **PRODUCT > ARCHITECTURE > code.** A correct
implementation of the wrong thing is still the wrong thing.

## What this project is

A local Chrome-based canvas that maps a song's meaning along two axes: depth
(SAFE → REAL → RAW) and category (LIFE: Love, Identity, Fitness, Earnings).
Rendered as a target — four quadrants, three concentric rings, RAW at the
bullseye. AI proposes bubbles and links; the human accepts them.

One user. Local only. No accounts, no cloud, no collaboration, ever.

## Hard rules

1. **AI never mutates the map.** Every AI-produced bubble or link arrives with
   `status: 'proposed'` and requires a human accept. There is no code path where
   an API response writes committed state.
2. **The system prompt in ARCHITECTURE §8 is verbatim.** Do not reword, compress,
   reformat, or "clean up" it. It is product copy. Changing it is a product
   decision made by the architect.
3. **Never write outside this directory.** No global installs, no writes to the
   home directory, no touching other repos.
4. **The server binds `127.0.0.1`.** Never `0.0.0.0`, never a LAN interface.
5. **`.env` and `maps/` stay gitignored.**
6. **The model string lives only in `server/ai.ts`, read from `BUBBLEMAP_MODEL`.**
7. **Never clip or ellipsize bubble text.** Nodes size to their content, at every
   zoom level. This is a reading tool; unreadable is broken.
8. **Cross-category descent is a feature, not a bug.** Do not "fix" it by
   constraining the category.
9. **Phases are gates, not milestones.** Build in order, stop at each boundary,
   update PROGRESS.md, commit, report. Do not roll forward into the next phase.
10. **Check PRODUCT §3 before adding anything.** If a feature doesn't shorten the
    path from "I like this song" to "here is the raw thing," it's a non-goal by
    default. Say so out loud rather than quietly building it.

## Conventions

- TypeScript strict mode. No `any` in committed code.
- Types live in `src/types.ts` and are imported by the server. One source of truth.
- No CSS framework, no state library beyond Zustand, no router — this is one screen.
- Before adding a dependency, ask whether ~30 lines would do it. Usually yes.
  Blessed: `tsx`, `concurrently`, `nanoid`.
- Pin versions with `npm view <pkg> version`. Current stable for everything.

## Escalate to the architect rather than deciding

The architect is a separate Opus 5 window. Escalate — don't guess — when:

- RAW output reads like stronger-worded SAFE. **Prompt problem.**
- Everything lands in one category. The second axis isn't earning its place.
- The data model needs a new field, tier, category, or link kind.
- A fifth AI verb seems necessary.
- Two designs both look fine and the spec doesn't choose.
- A PRODUCT §3 non-goal starts feeling necessary.
- You've patched the same symptom three times. The design is wrong, not the code.

Bring raw output, not summaries. The whole question is usually whether the words
are good, so the words have to survive the trip.
