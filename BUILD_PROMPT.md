# Build prompts

**This repo's architect is the Cowork window, not Claude Code.** Fable 5 implements
and reports back; design decisions come back here. The live prompt blocks are in
that conversation — this file is the durable copy.

## Setup (once)

```bash
cd ~/Downloads/BubbleMap
git init && git add -A && git commit -m "spec: product + architecture"
claude --dangerously-skip-permissions
```

Then `/model` → **Fable 5**.

## Phase order

Driven by PRODUCT.md §4's pre-mortem, not by engineering convenience:

| Phase | What | Gate |
|---|---|---|
| **0** | Prompt probe, CLI only, no UI | RAW clears the bar on 6 songs; categories spread |
| **1** | Walking skeleton — geometry + target renders a hardcoded map | A real Phase 0 result on screen, drag-to-reassign works |
| **2** | The loop — seed + descend + ghosts + accept + save | Map a new song solo in **under 10 minutes** |
| **3** | Authoring — inline edit, hand links, Inspector | Map stops being read-only |
| **4** | Depth — interrogate, relink, cross-category rendering, undo | At least one cross-category descent visible |
| **5** | Cut list — only what survived real use | Shipping none of it is acceptable |

Full phase definitions in ARCHITECTURE.md §12. Prompts for each phase are issued
from the architect window one at a time — don't run ahead.

## Model routing

Come back to the architect (Opus 5) when:

- **RAW reads like stronger-worded SAFE.** Prompt problem. Bring the actual outputs.
- **Everything lands in one category.** The second axis isn't earning its place.
- **You want a fifth AI verb**, or the data model needs a new field/tier/category/link kind.
- **Two approaches both look fine** and the spec doesn't choose.
- **Fable patches the same symptom three times.** Design is wrong, not the code.
- **A feature feels necessary that PRODUCT.md §3 lists as a non-goal.** Argue it back in explicitly; don't quietly build it.

Stay in Fable 5 for implementation, bug fixes, refactors, styling, dependency
problems, build errors, and tests.

**Rule of thumb:** *"what should this do?"* → Opus. *"make it do that"* → Fable.

## Guardrails for `--dangerously-skip-permissions`

1. **Commit at every phase boundary.** That's your only undo.
2. **`.gitignore` covers `.env` and `maps/`** before the API key exists on disk.
3. **Never write above `~/Downloads/BubbleMap`.**
4. **Read `git diff --stat` at each boundary.** The one place you *should* be a bottleneck.
5. **Watch for `0.0.0.0`** in any server diff.

## Context hygiene

Phase boundaries are `/clear` points by construction. What makes clearing cheap:

- **`PROGRESS.md` is the state-reload file.** Fable updates it at every boundary,
  *before* committing. Read it first, every session.
- **Root `CLAUDE.md` stays phase-agnostic** and under ~100 lines. Anything true only
  this week goes in PROGRESS.md; anything true only in one folder goes in that
  folder's CLAUDE.md, where it costs nothing until you're there.
- **ARCHITECTURE.md is read by section, not in full.** It's a reference, not a
  briefing. Loading 28KB of geometry constants into a prompt-tuning session is the
  clutter that buries the rules that matter.
- Clear on **task boundaries, not token counts**. Degradation is cliff-shaped, and
  spent context that resembles current work is the worst kind.


## Reporting back

At each phase boundary, bring the architect: what runs, what you cut, the actual
Phase 0 outputs or the actual Phase 2 stopwatch time, and anything the spec told
you to do that turned out wrong. **Bring raw output, not summaries** — the question
is usually whether the words are good, so the words have to survive the trip.

Update PROGRESS.md's phase log and PRODUCT.md §9's status table.

## Reviewing

`reference/COLD-REVIEW.md` is the review skeleton. The section that earns its keep
is §6 — *does the worked example prove the thesis, or a different one?* Point it at
Phase 0's output first: does the probe prove **the prompt reaches RAW**, or merely
that **the model writes fluent prose about songs**? Those look identical on a first
read and only one of them is the product.
