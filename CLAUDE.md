# CLAUDE.md — BubbleMap

**Read in this order, every session:**

1. `PROGRESS.md` — where the build actually is, what's blocked. ~90 lines.
2. `DECISIONS.md` — what's already been answered. Do not re-decide these.
3. `PRODUCT.md` — the *why*. Short.

`DECISIONS-superseded.md` is **not** part of that read. It holds dead decisions so
they can't be quietly reintroduced. Open the relevant entry only when you're about to
propose something that resembles one — the reason it died is usually still true.

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

1. **AI never commits anything the human has not seen, and anything committed can
   be killed in one gesture.** *(Amended by D26 — was: every bubble requires an
   explicit accept.)* Descents land by default because they arrive one at a time and
   are read as they land. What survives unchanged: nothing may be committed
   off-screen, in bulk, or without a visible way to remove it. If you find yourself
   writing a code path that adds content the human could not have seen, stop.
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

## Standards that held under pressure — keep holding them

These were earned during the hard part of the build. Phase 2's gate has now cleared,
which means nothing but this file enforces them. That is exactly when standards sag.

- **Render before deciding.** A question about how something looks or feels cannot be
  answered from a description of it. Build the cheap version and look. Two layout
  decisions were made from data structures and both were wrong within a day.
- **Record the reasoning, not just the ruling.** A decision with its argument attached
  can be overturned by anyone who finds the argument false. A bare ruling can only be
  overturned by whoever made it, which means it usually isn't.
- **The specifier inspects the artifact, not the report.** Reports carry what was
  built; they cannot carry what it feels like. Every significant UI defect in this
  project — the empty RAW column, the invisible descend link, the off-centre column —
  was found by opening the app, and none appeared in any written report.
- **The architect reports impressions; the implementer reports measurements.** Not a
  discipline, a division of labour — D31 wrote the rule and the architect broke it
  twice more anyway, reporting pixel figures read off screenshots scaled by browser
  zoom. Both the off-centre column and the clipped disc were phantoms produced this
  way, and each cost a round trip. *This reads cramped* is a valid architect finding.
  *This is 410px from the left* is not; that number comes from the DOM or not at all.
- **Write the runbook on the first failure, not the second.** The API content filter
  killed two long generations before anyone wrote down what to do about it.

## Conventions

- TypeScript strict mode. No `any` in committed code.
- Types live in `src/types.ts` and are imported by the server. One source of truth.
- No CSS framework, no state library beyond Zustand, no router — this is one screen.
- Before adding a dependency, ask whether ~30 lines would do it. Usually yes.
  Blessed: `tsx`, `concurrently`, `nanoid`.
- Pin versions with `npm view <pkg> version`. Current stable for everything.

## Escalate to the architect rather than deciding

**Default: decide it yourself and report.** Per D36, only four areas require a ruling
— the data model, the §8 prompt, a hard rule in this file, or a PRODUCT §3 non-goal.
Layout, interaction, wording, error handling, plumbing, tests and dependencies are
yours. The architect is the slowest step in this system; don't queue behind it for a
decision it would have ratified.

Beyond those four, escalate — don't guess — when:

- RAW output reads like stronger-worded SAFE. **Prompt problem.**
- Everything lands in one category. The second axis isn't earning its place.
- The data model needs a new field, tier, category, or link kind.
- A fifth AI verb seems necessary.
- Two designs both look fine and the spec doesn't choose.
- A PRODUCT §3 non-goal starts feeling necessary.
- You've patched the same symptom three times. The design is wrong, not the code.

Bring raw output, not summaries. The whole question is usually whether the words
are good, so the words have to survive the trip.
