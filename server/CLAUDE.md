# server/ — CLAUDE.md

Read **ARCHITECTURE §7** (AI operations, tool schema, model routing), **§8** (the
system prompt), and **§11** (API routes) before changing anything here. Don't read
§6 or §9 — that's canvas geometry and rendering, irrelevant in this folder.

## The one rule that matters

**`prompts.ts` is product copy, not code.** The §8 prompt ships verbatim. Do not
reword it, compress it, fix its grammar, extract shared strings from it, or
"clean up" its formatting. If a lint rule complains, disable the rule.

Prompt changes are made by the architect and arrive as replacement text. If you
believe the prompt is wrong, say so and stop — don't demonstrate it by editing.

## Gotchas

- **Model string lives only in `ai.ts`**, read from `BUBBLEMAP_MODEL`. Never inline
  it, never default it in more than one place.
- **Bind `127.0.0.1`.** Never `0.0.0.0`.
- **Validate every link against the §5 invariants** after resolving refs. Reject
  invalid ones — but `console.warn` each rejection with the raw model output.
  Silent dropping hides prompt regressions, which is the failure mode that matters.
- **A `refines` link that changes category is valid.** It's the most valuable output
  the tool produces. Do not treat it as a validation failure.
- **Proposals never persist.** `PUT /api/maps/:id` strips anything with
  `status: 'proposed'` before writing.
- Atomic writes: `maps/.tmp-<id>.json`, then rename.
- Express 5 — async error handling differs from v4. Don't copy v4 patterns.

## Judging output

Rawness and accuracy are separate axes (§7.3). A bubble can be beautifully
self-implicating and still be about a lyric that isn't in the song. Fluent prose
about a song is not the same as a correct reading of it, and the two are almost
impossible to tell apart on a fast read.
