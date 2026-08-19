# DECISIONS

**Append-only. Newest at the bottom. Never edit a past entry — supersede it.**
When an entry is fully replaced, move it to `DECISIONS-superseded.md` with a pointer.

This is the architect's answer log. Its job is to stop a fresh session from
re-deciding something already settled, or guessing at something that looks open but
isn't.

**If you are a new session:** read `PROGRESS.md` for *where we are*, this file for
*what's been answered*, `PRODUCT.md` for *why*. Only then open `ARCHITECTURE.md`, and
only the sections you need.

**If you have a question this file doesn't answer, ask the architect. Do not guess.**
A wrong guess that gets built costs more than a round trip. Record the answer here.

**`DECISIONS-superseded.md` holds six dead decisions (D1, D12, D13, D18, D19, D24).**
Don't read it at session start. Read the relevant entry only if you're about to
propose something that resembles one — the reason it died is usually still true.

---

## Live

**D2 — API auth.** Local Express proxy holding the key. Not direct-from-browser, not
subscription auth via the Agent SDK — the Agent SDK runs the Claude Code harness,
which wraps its own system prompt around ours. *17 Aug.*

**D3 — Persistence.** JSON files in `maps/`, one per map. No database. *17 Aug.*

**D4 — Build order is pre-mortem-driven, not engineering-convenience-driven.** The
riskiest assumption goes first even when it's the awkward one to test. *17 Aug.*

**D5 — Probes run the full verb chain, not one verb.** `seed` stops at REAL by
contract, so a seed-only probe cannot test RAW. *17 Aug.*

**D6 — Probe one song, not six.** ~27 bubbles is readable; ~160 is not, and an unread
pass that reports "fine" is worse than no pass. Scale up only after RAW clears.
Supersedes an earlier reversal to six, which the architect made under social pressure
rather than on the merits. *17 Aug.*

**D7 — Lyrics are human-supplied and mechanically required.** Title-only running
produced at least one probable fabrication. The implementer must not fetch or
reconstruct lyrics. *17 Aug.*

**D8 — `interrogate` receives all committed bubbles, not just the focus.** It cannot
propose `contradicts` links against bubbles it cannot see. Corrects §7. Caught by the
implementer. *17 Aug.*

**D9 — Build cost is not a valid argument for deferring work.** Agent build time is
hours, not sessions. Any future argument of the form "that's too much to build" should
be rejected. The valid deferral arguments are data-model lock-in and reader-attention
budget. *17 Aug.*

**D10 — Human judgment is recorded in a file, never only in chat or browser storage.**
*17 Aug.*

**D11 — Assumptions are RAW. No fourth tier.** `interrogate` returned 18 of 19
assumption bubbles as RAW unprompted, and reading them the model is right: §1.1 says
interrogation is the mechanic that *produces* RAW, so the assumptions it surfaces are
the raw layer. Do not add a tier, do not constrain the model. *18 Aug.*

**D14 — The hard problem is reading, not geometry.** The payload is the `note` field,
four to five sentences. Labels are the index; notes are the product. Treat the reading
surface as Leverage and layout math as Neutral. *18 Aug.*

**D15 — `relink` is cut.** It consumed 130s of a 537s chain and 20 of its 22 proposals
were rejected, 16 as duplicates it structurally could not avoid. `descend` and
`interrogate` already produce cross-links as a side effect. Three verbs, not four.
Revisit only if maps start feeling under-connected in real use. *18 Aug.*

**D16 — Verb counts are enforced in the schema, not the prompt.** §8 stays verbatim;
schema constraints are free. Applies to every count. *18 Aug.*

**D17 — Latency budget.** No single AI call may exceed ~15s to first content.
1. Stream responses — content renders as it arrives.
2. Trim context — non-focus bubbles go in as `label` + `tier` + `category` only.
3. Parallelise independent calls.
*18 Aug.*

**D20 — The workspace is a grid; the target is a signature.**
The target inverts space against content: RAW sits at the centre, the smallest region,
and RAW is where all the reading happens. Standard radial practice is the reverse —
deeper levels get *more* area. No packing algorithm fixes a region too small by design.

- **Workspace:** threads as rows, tiers as columns, RAW widest. Overlap becomes
  impossible rather than managed. Cross-category renders as a badge, not a traced line.
- **Signature:** the target, dots only, no text. Bad at prose, good at a glance.
- **Degree-of-interest:** scale detail to attention. Ref: Card & Nation, AVI 2002.

*Honest note:* superseded D13, which was decided from JSON without seeing it rendered.
**Render before committing to a layout.** *18 Aug.*

**D21 — Expansion happens at the row, not the bubble.** Selected row shows full notes
across all tiers; other rows show labels. React Flow and the canvas components are
deleted — a CSS grid and a static SVG need neither. `geometry.ts` and its 18 tests
survive, positioning signature dots. *18 Aug.*

**D22 — Editorial treatment. Supersedes ARCHITECTURE §9 entirely.**
The build read as generic AI output, and the tells are documented rather than a matter
of taste: permanent dark mode (the most common single tell), Tailwind indigo, Inter,
rounded cards with soft shadows, an even grid of tiles.

This is a reading tool about lyrics and self-deception. Reference class is liner notes
and literary magazines, not dashboards.

1. **Tier is typographic, not chrome.** SAFE 13px grey sans → REAL 15px darker sans →
   RAW 21px serif near-black, note in 14px serif. The crescendo deletes the cards,
   colour bars, glow and tier tokens in one move.
2. **Paper, not dark.** Ground `#f6f3ec`, ink `#1a1814`.
3. **Category is marginalia**, small caps in muted ink above each **entry** (not each
   cell — a RAW cell holds several categories). love `#8c3a52`, identity `#4a4270`,
   fitness `#3d5c48`, earnings `#7a5c2e`. Cross-category reads `Love → Identity`.
4. **Hairline rules `#ddd7ca`, never containers.** Nothing is a card.
5. **Serif carries prose, sans is labels only.** Source Serif 4. **Not Inter.**

Every item removes elements. The chrome removal *is* the design. *18 Aug.*

**D23 — Every bubble carries a required `sourceLine`, validated.** The verbatim lyric
fragment it derives from, rendered in the marginalia. Two jobs: you can see which line
produced the reading, and the server rejects any bubble whose `sourceLine` doesn't
occur in `doc.source`. That converts §7.3's accepted risk — a beautifully raw bubble
about a lyric that isn't in the song — into something mechanically impossible.
Normalise whitespace and case; don't require punctuation to match. *18 Aug.*

**D25 — The unit of judgment is the DESCENT, not the bubble.**
*(Judgment default later changed by D26; everything else here is live.)*

1. **seed returns → descend fires automatically**, no human gate between verbs.
2. **The result presents as complete descents** — SAFE → REAL → RAW as one unit, in
   the readings layout. Readings is the judgment surface; grid is presentation.
3. **One decision per descent.** A SAFE or REAL that another surviving path hangs off
   is spared from parking.
4. **`descend` proposes exactly ONE bubble one tier deeper**, schema-enforced.

*Live tripwire:* this traded candidate-choice for descent-choice. **If three songs pass
where every descent is kept, the choice is missing and 3-candidates returns.** *18 Aug.*

**D26 — Home base, opt-out, continuous descents, three views. Amends Hard Rule 1.**

1. **Home base, not a form.** The landing screen is the library — songs most recent
   first. "Add a song" is one option on it, not the whole screen.
2. **Descents land by default; killing is the gesture.** Hard Rule 1's letter is
   amended to: *the AI never commits anything the human has not seen, and anything
   committed can be killed in one gesture.* With one descent arriving at a time, read
   as it lands, the human judges everything — by exception rather than approval.
   *The architect scored this 6.0 and killed it in a crucible run the same day, on the
   un-amended rule. The context changed when the unit of arrival became one descent
   instead of a batch. The reversal is deliberate.*
3. **Up to 10 descents, generated one at a time, appended as they complete.** Serial
   generation, but never blocked — you read descent 3 while 4 is written. First RAW
   in ~20s. Requires an always-visible progress state (`4 of 10 · still going` →
   `done`). Silence is what made the blank seeding screen read as broken.
4. **Three views, clearly labelled.** *Readings* (default), *Grid* (compare),
   *Target* (the Jun Yuh circle — where this song's RAW landed, by category). The
   toggle names the destination, not the current state. The target was an ornament at
   three descents; at ten it plots the song's shape. *18 Aug.*

**D27 — `descend` receives the map's existing bubbles, labels only. Ratified.**
This is D8's argument applied to a second verb: a verb cannot avoid duplicating
threads it cannot see, and once one SAFE parents several REALs, dedup becomes
load-bearing. Ten distinct RAW readings out of ten is the evidence. Labels + tier +
category only, no notes, per D17 #2. Raised and implemented by the implementer;
the architect ratified. *18 Aug.*

**D28 — The latency standard is blocked time, not first-RAW time. Kills the 20s
target.** The 20-second figure was invented by the architect and never derived. The
metric that matters is whether the human is ever waiting with nothing to read.

Standard: **readable content on screen within ~10s, the page never silent, first RAW
under 60s.** Measured at 47s with continuous streaming — that passes.

Reaching 20s would require changing the seed contract so REALs emit before SAFEs, or
shrinking the seed. Both are product changes made to satisfy a number nobody derived.
Rejected. *18 Aug.*

**D29 — A reading is derived per RAW bubble via its own ancestor chain**, not per
thread. Required once a single SAFE parents several descents. This is also the unit
the Target view plots. *18 Aug.*

---

## Open — architect owes an answer

**Q3 — What is the expected keep-rate, in real numbers?** `PRODUCT.md §2` guesses
~half for `seed`, ~a third for `interrogate`. Those are priors, not measurements. The
first real judgment run under D26 replaces them. **Not blocking, but confirm early** —
and note D26 inverts the default, so the number to watch is now the *kill* rate.
