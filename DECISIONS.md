# DECISIONS

**Append-only. Newest at the bottom. Never edit a past entry — supersede it.**
When an entry is fully replaced, move it to `DECISIONS-superseded.md` with a pointer.

**The architect assigns the number when issuing the ruling.** This file has two
writers — the architect editing directly and the implementer recording relayed
rulings — and on 20 Aug both computed "next number" from stale views and produced
two D45s. There is now one numbering authority: if a ruling arrives without a
number, ask for one rather than picking the next free integer.

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
*(Tripwire CLOSED by D48 — not by reverting to 3-candidates. The missing choice was
never a labelling gesture; it moved to where it produces something: building an arc.
Do not reopen.)*

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
   *Target* (the Jun Yuh circle — where this song's RAW landed, by category).
   *(Default later superseded, 20 Aug: TARGET is the landing view — it answers
   "what is this song about" at a glance and its provenance panel reaches the
   readings. A still-generating map lands on Readings; the dig is what there is
   to watch.)* The
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

**D30 — The Target view is the RAW disc alone, not the three-ring target.**
Rendered both before ruling. The three-ring frame leaves ~83% of its area empty
because every dot in this view is RAW *by construction* — the emptiness is a
consequence of what we chose to plot, not a finding about the song, so it carries no
information and costs the whole frame. Quadrant membership ended up read from hue
rather than position, and near-axis dots needed a squint.

The cropped disc passes the glance test on position alone.

**The clean statement of what the two views are for: Readings owns the depth axis,
Target owns the category axis.** SAFE → RAW is already expressed as a type crescendo,
which is where it reads best. What Readings cannot show is where a song's raw layer
sits across LIFE. One circle, four quadrants, all signal. *18 Aug.*

**D31 — Centring is closed. The architect was wrong.** Live DOM measurement:
216.0/216.0 at 992px, 210.8/210.2 at 1227px outer. The architect's 410/101 came from
eyeballing a 1.25×-scaled screenshot against the window frame rather than measuring
the page viewport.

*Standard sharpened:* "the specifier inspects the artifact" does not mean the
specifier may *measure* from a screenshot. Inspection catches what something feels
like; numbers come from the DOM. *18 Aug.*

**D32 — Repeated ancestors render at full text in muted ink.** Seven descents from
three SAFEs means shared roots repeat verbatim down the page. First occurrence
renders normally; later occurrences render the **same full text** at metadata weight.

Not truncated to a fragment — truncation makes the reader reconstruct what they're
looking at, while reduced weight lets them skip or read at no cost either way.

Grouping under a shared SAFE was rejected despite being the honest structure (the
repetition is a tree flattened into a list): making layout depend on tree shape means
the page reorganises as it streams, which is the churn we just removed. Preserves
arrival order, D29's unit, and the visible scope of a kill. *18 Aug.*

**D33 — Partial readings resolve, never vanish.** A REAL that produces no RAW must
end in a visible terminal state — muted, e.g. *no deeper reading found* — not
disappear. A thread that didn't go deeper is information, and vanishing content is
the defect this session was spent on. *18 Aug.*

**D34 — Rejections surface in the UI.** The server validates every proposed link and
rejects invalid ones; the client ignored `proposal.rejections`, so a malformed
proposal produced a quietly broken map — that is exactly how descent v lost its
ancestors and how the loop re-descended the same thread twice.

A quiet count in the toolbar (`2 proposals rejected`), expanding to reasons. Not a
toast, nothing modal. This is D23's principle — silent dropping hides regressions —
applied to the interface rather than the console. *18 Aug.*

**D35 — Exhausted state persists.** `Bubble.exhausted?: boolean`, set on a REAL when
a descend declines it. D33's "nothing disappears, ever" cannot be session-scoped:
after a reload an exhausted REAL would be indistinguishable from a never-asked one,
and state-lost-on-reload is the exact failure class that destroyed a whole map on
18 Aug. Optional field, backfills to `undefined`, no migration. *18 Aug.*

**D36 — The implementer decides without asking, except in four areas.** The architect
is the throughput constraint: the implementer builds in minutes and then waits
exchanges for rulings, routed through a human relay. The gate is not earning its cost
— the implementer has independently caught four specification errors and been right
every time, and most rulings have ratified its stated lean unchanged.

**Escalate only for:** the data model (`src/types.ts` and the map schema), the §8
system prompt, a hard rule in `CLAUDE.md`, or a `PRODUCT §3` non-goal.

**Everything else the implementer decides and reports** — layout, interaction,
wording, error handling, verb plumbing, test strategy, dependencies.

*Test of whether this was right:* if a ruling ever changes the implementer's lean,
that class of decision comes back under the gate. If rulings keep ratifying, widen
further. Ref: `field-guides/systems_that_worked.md` §1. *18 Aug.*

**D37 — One song ahead, never a queue.** Revives the crucible's parked idea C in
mutated form. The friction is the ~8 minutes of dead time between finishing song N
and having N+1 ready; across the eight songs a corpus needs, that is roughly an hour
of the remaining wall-clock and the largest single block left.

**Not a pipeline.** You may start N+1 while still reading N. Its arrivals stay
`proposed` until you open its map. You cannot queue a third.

A queue is unlimited WIP dumped in front of the constraint; a one-slot buffer is flow
control. Read-as-it-lands survives — you still open a map to an empty page and watch
it fill, you just don't watch a spinner first. Amended HR1 holds: nothing commits
off-screen. *18 Aug.*

**D38 — The value-creating direction is songs, not features.** `PRODUCT §7` names the
corpus view as probably the real product; it needs ~10 judged maps and there are two.
Every remaining feature is downstream of a corpus that does not exist.

**Standing bias until ~10 maps exist: build only what makes the next eight songs
cheaper to get through.** Anything else waits. The corpus Target builds itself as a
consequence — every judged song is a row in it. *18 Aug.*

**D39 — The sourceLine guard FLAGS, it does not reject. Amends D23.**

Evidence, "Be Her" run, 18 Aug: 20 rejections = **6 bubbles failing the sourceLine
match, plus 14 links that failed only because their endpoints had just been deleted.**
All six bubbles were strong material, not fabrications — including *"I offer the money
because I know nobody will take it"* and *"She isn't disciplined, she just has nothing
she needs to numb."*

**Proof the guard checks form, not truth:** the same insight appeared twice. *"I can
offer everything because nobody is able to take it"* cited a lyric verbatim and
survived; *"I offer the money because I know nobody will take it"* didn't and died.

D23 conflated two things. **The reading is the product; the citation is provenance.**
A bad citation makes provenance unverified — a fact to surface — not the reading
false. And D23 predates the D26 amendment to Hard Rule 1: silent rejection is the AI
deciding for the human, which we removed from every other path.

- A bubble whose `sourceLine` doesn't match **keeps its content**, gains
  `citationUnverified: true`, and renders with a visible quiet marker.
- Links resolve normally, since their endpoints now exist. 14 of 20 fixed for free.
- The **flag rate becomes the diagnostic** — if it stays high, that's a §8 problem
  about how the model cites, and it belongs to the architect. *18 Aug.*
  *(Sensor recalibrated 21 Aug by D52: slash-joined couplets now verify per
  segment, so the flag rate drops for a MECHANICAL reason on that date. Do not
  read the drop as the prompt improving. Pre-D52 flags on honest couplet
  citations — five on Kashmir alone — were matcher artifacts, not §8 signal.)*

**D40 — Run-end messages must be true.** The same run said *"no deeper reading found"*
on two descents whose RAW had been discarded, and *"stopped at 4 — the song ran out
of threads"* when the guard had eaten them. Three surfaces, all false, one cause.

A terminal state must distinguish **declined** (the model was asked and had nothing)
from **discarded** (something was produced and removed). Never report exhaustion the
system caused as exhaustion the song caused. *18 Aug.*

**D41 — The keeper: one chosen RAW per song. Answers D25's tripwire.**

At the end of a run the model **nominates three of the existing RAW bubbles**; the
human picks one. That bubble becomes `doc.keeperId` — the song's canonical raw thing,
and what the library row shows instead of "most recently committed."

**The model nominates, it does not synthesise.** Writing three new takeaways would be
a fifth verb, more latency, and more prose at the end of an already long read.
Nominating from what exists costs nothing and adds a diagnostic: **if the human
routinely picks one the model didn't nominate, that is a §8 finding.**

**Why this matters more than it looks.**

1. *It resolves the tripwire.* Two songs at zero kills, not because the readings were
   all strong but because killing a whole descent feels wasteful and nothing forced a
   preference. This restores PRODUCT §5's choose-one mechanic at a **better** level
   than D25 traded it from: choosing between three complete descents is a more
   meaningful judgment than choosing between three phrasings of one. D25's trade may
   have been correct; this is its missing half, not its reversal. **Do not revert to
   3-candidates on tripwire count three without trying this first.**
2. *It is the corpus primitive.* §7 names the cross-song view as probably the real
   product. Twenty songs × ten RAW bubbles is two hundred items and unusable. Twenty
   songs × one keeper is the finding. This is what makes the corpus legible, and it
   passes D38 for that reason.

Data model: `keeperId?: string` on `BubbleMapDoc`. Optional, backfills undefined.
Choosing is the natural end of a run, not a modal — and it must be re-choosable later
from the map. Human-supplied idea, 19 Aug. *19 Aug.*

**D42 — Nomination criteria are product copy; nominations persist.** Two boundary
calls raised by the implementer under D36, both ruled by the architect.

**1. The nomination ask moves into §8 as a per-verb suffix, verbatim.** It defines
what a keeper *is*, which makes it a criterion, and criteria are what §8 holds. In a
user message it drifts and nobody treats it as product copy. Ships as:

```
Nominate three of the RAW readings as candidates for this song's keeper — the
single raw thing the song is really about.

Choose for weight, not for variety. The keeper is the reading a person would
repeat to someone else, and the one that would still be true if every other
reading were deleted.

Do not nominate one per category for balance. If the three strongest all sit in
the same quadrant, nominate all three.
```

The final clause is load-bearing: without it the model will spread nominations
across LIFE for tidiness, and balance is the opposite of what a keeper is.

**2. `nominatedIds?: string[]` persists on `BubbleMapDoc`.** Session scope destroys
the diagnostic that justified nominating rather than synthesising — *does the human
keep picking off-list* only answers across sessions. Persisting also lets a
keeperless map show its block on reopen **without firing an AI call**, which keeps
D26 #1 intact (opening only reads). Optional, backfills undefined. *19 Aug.*

**D43 — ARCHITECTURE §12's Phases 3–5 are superseded. The plan is spent.**
They were written before the tool existed and six songs of use invalidated most of
them:

- **Phase 3 (authoring)** — inline editing, hand-drawn links, an Inspector. In six
  songs the user has never wanted to edit a bubble or draw a link; the Inspector
  became the Target provenance panel. **Dead unless use asks for it.**
- **Phase 4 (depth)** — `interrogate`, `relink`, cross-category. `relink` cut by D15;
  cross-category shipped in Phase 1; `interrogate` has no UI and has never been
  missed. **Largely done or dead.**
- **Phase 5 (cut list)** — still valid as a posture, not as a phase.

**What actually remains, in order:** Q6 (explain-this), the corpus view, and four
more songs. Phases are retired as a planning device — the queue is now
use-discovered, per PRODUCT §3's amendment. *20 Aug.*

**D44 — Q6 is unblocked by its own terms; build it next.** Q6 was sequenced "after
the current fix batch and one more song." The batch shipped and two songs have run
since (Been By Now, Mr. Brightside). Condition met.

It is also the only queued item that improves the thing the user actually does. The
corpus view needs ~4 more songs before it can exist; Q5's cheap answer already
shipped as the provenance panel. *20 Aug.*

*D44 addendum — the rest of the ruling as relayed, recorded by the implementer.*
The shape is the user's, from the "Be Her" run: highlight text in a RAW reading →
"explain this" appears → an AI answer in a hovering box → dismissed by clicking
away. It **is a fifth verb**, so its §8 suffix is product copy: the implementer
drafts the ask, the architect ratifies it before it ships — same path as the
nominate suffix (D42). What's selectable, how the box behaves, and whether the
answer persists are the implementer's under D36. One design constraint from
PRODUCT §1: it should feel like **digging, not being handed a report** — whatever
"explain this" returns must leave the reader somewhere they can push further, not
close the question. *20 Aug.*

**D45 — The explain suffix is ratified with three additions; the latency stands.**
The implementer's draft structure held (the three-part ask, "stay inside this
descent," "do not restate the reading," ending on a question, the plain-prose
clause). Three changes, all the architect's: *costs the narrator* → **implicates
the narrator** (matching §8's own criterion); a clause holding the explanation to
the reading's bar (*"a deeper layer that does not cost the narrator anything is
not deeper, it is longer"*); and **the honest-no clause** — §8's "padding is
failure" applied to the new verb. Without it every highlight gets a confident dig
whether or not there is anything under it: the fabrication risk in a new costume,
harder to catch because prose sounds like an answer even when it isn't one. Plus
a 200-word cap, since unbounded prose in a hover box sprawls.

**The 10–20s first-text latency is accepted, not tuned.** D28's standard is
blocked time, and a reader waiting for an answer they asked for is categorically
different from a page that hasn't loaded; "digging…" means never silent. **Do not
lower the effort setting** — depth is the entire product here, and trading it for
eight seconds on an opt-in action is a bad exchange. *20 Aug.*

**D46 — Descent and Return: a fifth verb and a fourth view.** User-discovered,
20 Aug. Take one chosen descent and have the model write it as a narrative arc —
RAW → REAL → SAFE → REAL → RAW — on the theory that this is the shape the best
songs, sets and sermons actually move in, because nobody can hold raw for eight
minutes.

**Opt-in only.** A button on the Target provenance panel; never automatic, never
batched. One AI call per arc, on request.

**Display: a dive profile as index, prose as body.**
- Y axis SAFE → REAL → RAW with **RAW at the bottom**, consistent with the target's
  bullseye. The arc becomes a dive: down, up for air, down again.
- The curve is an **index**, not a container. Prose reads linearly beneath it;
  wrapping text around a curve looks clever and reads badly.
- **The D22 type crescendo carries the arc.** RAW beats at 20px serif near-black,
  REAL at 16px, SAFE at 14px — and SAFE is set in **sans, not serif**. Serif carries
  the payload; the safe beat is the breath, not the payload. The reader feels the
  relief because the typeface relaxes. Roman numerals tie dot to passage.
- Prior art: Vonnegut's story shapes — an arc plotted on Beginning→End against a
  fortune axis. Ours needs no invention because SAFE→RAW is already vertical.

**Arcs persist.** `arcs?: Arc[]` on `BubbleMapDoc`, each referencing the RAW bubble
it was built from; a song may hold several. Same argument as D35: it costs an AI
call, it is the most expensive artifact the tool produces, and losing it on reload
would be the worst small failure available.

**Honest note on D38.** This fails D38's letter — it makes each song deeper, not the
next songs cheaper. Approved anyway under PRODUCT §3's amendment: a need discovered
in real use outranks a rule written before the thing existed. It is also the first
feature that makes the product *argue a thesis* rather than analyse a song. *20 Aug.*

*D46 amendment — ARC_SUFFIX ratified with three additions; ships verbatim.*
The draft's structure held. The architect's additions: **the do-not-invent-comfort
clause** — the form itself is a fabrication vector this verb uniquely creates,
because the structure DEMANDS a safe beat whether or not the song has one; the
clause is explain's honest-no shaped to preserve the form rather than break it
(*"find the moment it comes closest and say plainly that it does not hold"*).
**Unequal beat lengths** — the safe beat is the shortest (a breath, not a
chapter), the final raw beat has the most room; an arc where every movement is
the same size isn't an arc. **Standalone readability** — the view shows only the
arc, so it must be understood whole by someone who never saw the reading. Cap is
**500 words TOTAL, not per-beat** — per-beat caps would fight the unequal-length
instruction and flatten the shape. *"Go back down deeper, not louder"* kept
untouched. *20 Aug.*

*D46 amendment 2 — the 500-word cap is DELETED.* An architect number that was
never derived, killed by two runs of evidence — same class as D28's 20-second
target. The test arc ran 691 words and the Ariana arc ~645, and both are the
strongest prose the tool has produced: the cap never bound anything that needed
binding, and the only thing it could ever truncate is the final raw beat — the
beat the whole form exists to reach. The unequal-length clause is doing the real
shaping work (the Ariana safe beat is a real breath at ~70 words); the number
added nothing. Everything else in the suffix stays exactly as ratified. *21 Aug.*

**D47 — Build the corpus view now, at n=8. It is two pages, not an algorithm.**

The "~10 maps" threshold was invented by the architect and never derived — same
class as the 20-second latency target (D28) and the 500-word arc cap. The cheapest
disproof of the whole corpus thesis (read the eight keeper lines together, in plain
text, no build) was available all week, cost nothing, and **found a shape** — see
PRODUCT §7's n=8 reading.

The view is deliberately dumb. What produced the finding was *putting the lines
next to each other*, and that is all v1 does.

1. **The keeper wall.** Every song's keeper line, one per row, in the RAW serif at
   reading size, song title as quiet marginalia. No grouping, no sorting beyond
   recency, no clustering. This is the page that did the work manually.
2. **The stacked target.** Every song's RAW dots on one disc, using the existing
   geometry. Answers whether raw layers cluster by category across songs — the
   question PRODUCT §7 originally posed.

Reached from the library, not from inside a song — it is the view *across* maps.

**Deliberately not built:** an AI call that reads all keepers and names the shape.
That is a sixth verb, and a human reading eight lines worked fine. Revisit at twenty
if the wall stops being legible. *20 Aug.*

**D48 — The keeper is cut. The arc is the choosing act. Closes D25's tripwire.**

**Evidence:** five consecutive songs at zero kills and no keeper ever chosen — but
an arc was built the day arcs existed, unprompted. The keeper asked the human to
*declare* a preference; the arc asks them to *act* on one, at the cost of a call and
the production of an artifact.

**The principle, which is the real finding:** *judgment happens when it produces
something, not when it labels something.* That is why D25's tripwire never resolved
in either direction — neither killing nor keepering made anything, so neither
gesture was performed. Do not reintroduce a labelling gesture to capture preference.

**Cut:** `keeperId`, `nominatedIds`, the nominate AI call and its §8 suffix, the
end-of-run nomination block, the "this is the keeper" hover action, and the keeper
ring on the target.

**Replaced by:** the RAW reading an arc was built from becomes the song's line — the
library subtitle and its row on the corpus wall. Multiple arcs: most recent wins.

**A song with no arc contributes no line to the corpus.** This is deliberate. The
corpus becomes made of songs the human dug into rather than songs they ran, which
is a better filter than a click was ever going to be. The library row falls back to
the most recent RAW for identification only, never presented as a chosen line.

**D25's tripwire is closed** — not by reverting to 3-candidates, but by the choosing
act moving to where it produces something. First entry in Phase 5's cut list, and
evidence for that phase's posture: expect to cut most. *20 Aug.*

**D49 — The landing page is a question, not a list.** Crucible run, 20 Aug; won at
8.7, nothing cleared 9.5, proceeded eyes-open on the render.

**The problem:** "Add a song" sat below eight library rows and off-screen on load.
Standard practice is unambiguous — a screen's primary action must be reachable
regardless of scroll position.

**What shipped:** the page opens with *"What song?"* in the serif at title scale and
a hairline-underlined field beneath it; typing unfolds the paste target in place.
The library sits **at the fold**, not below it (measured: first row at 247px of a
573px viewport). The separate compose route is deleted — this promotes the compose
surface rather than duplicating it.

**The framing carried more than the layout.** A *question* fits the excavation
register (PRODUCT §1 — the raw layer is recovered, the going-down is the product).
A labelled form does not. `Song — Artist` survives only as a dim placeholder and
must never return as a header.

**The open risk, and the first dial if it fires.** Input-first can train the human
to always add, quietly demoting the library — the thing PRODUCT §1 calls home base.
The implementer's render judgment was that it does not read as a search engine,
because a search engine is a lone box over emptiness and this is a quiet question
over a bookshelf.

**If dogfooding shows reflexive adding instead of returning, the first change is
dropping the title field's autofocus — one line — not falling back to B.** The
autofocus is the arrive-and-type muscle and it is the cheapest thing to turn off.

**Parked:** *B* — "add a song" pinned in the header, always visible, ~20 minutes.
The fallback if A fails on use rather than on the autofocus dial. *C* — land on the
corpus wall instead of the library; right idea, precondition unmet, **revives on its
own at ~5 dug songs.** *20 Aug.*

**D50 — A verify gate on the lyrics. Optional LRCLIB prefill behind it.**

**The gate is the ruling; the fetch is a convenience.** Before a run starts, the
human sees what landed in `doc.source` and confirms it — *do these lyrics look
right?* This is valuable with pasting alone: you can paste the wrong song, a live
version, a partial set, or something with the chorus collapsed to "×2". D7 made
lyrics human-supplied because a title-only run fabricated; but pasting is not the
safety, **checking** is, and no moment currently exists for it.

**On fetching — the honest survey:**
- **Musixmatch** free tier returns ~30% of each lyric; full text requires a paid
  commercial licence. **Rejected** — partial ground truth would silently degrade
  every reading and make D23's guard flag almost everything.
- **Genius** serves metadata and annotations, not lyrics. Not an option.
- **LRCLIB** — free, community-run, full text, ~3M entries, throttled to one
  request per 30s. Fine for one human mapping one song. Accuracy varies by song,
  which is exactly why the gate comes first.

**Amends D7.** The implementer may wire a prefill; the *human still confirms*, so
D7's purpose — a human is accountable for the ground truth — survives intact. A
prefill that bypasses the gate would violate it. Empty or failed fetch falls back
to paste, silently and without ceremony. *20 Aug.*

**D51 — Seed's spine is enforced mechanically. The kind enum *and* a server check.**

**Diagnosis (Kashmir, 21 Aug):** seed produced its three SAFE and three REAL bubbles
correctly, then emitted five links of which **not one was `refines`** — all
`contradicts` or `assumes`. Readings walk `refines` parents per D29, so every chain
stopped at REAL and the SAFE tier vanished from the UI while sitting in the file.
The links weren't rejected; **they were never proposed.** Nothing constrained them:
bubble counts are schema-enforced and the 3+3 split is server-checked, but the link
kind enum is shared across all verbs.

**Two mechanisms, both mechanical, no prompt change — D16's principle:**

1. **Constrain seed's link enum to `['refines']`.** Seed's contract has always been
   the spine; argumentative links are descend's and interrogate's job (D15 observed
   they produce cross-links as a side effect). Losing `contradicts` at seed is small.
2. **Server-validate the spine after resolution:** exactly three `refines` links, and
   **each REAL has exactly one SAFE parent.** The enum forces the kind; it does not
   force completeness or prevent one SAFE parenting all three. Same class of check as
   the 3+3 split guard.

Rejected alternatives, and why: rejecting whole seeds for link sloppiness kills good
bubbles for a formatting fault; client-side repair is impossible, since only the
model knows which SAFE each REAL deepens.

**D52 — The citation matcher understands slash-joined couplets. Amends D23.**

Every flagged Kashmir citation was **two genuine lyric lines joined with " / "** —
the standard convention for quoting across a line break. Verified mechanically: each
slash-separated segment occurs verbatim in the source. The guard normalised the slash
away and then required the concatenation to appear *contiguously*, so a couplet only
passed when its two lines happened to be adjacent and in order. Kashmir's fragmented,
ad-libbed outro made that almost never true.

**This is not fabrication and not composite invention. The model cited honestly in a
format the matcher could not read.**

**Fix:** a citation containing `" / "` verifies **per segment** — each part must occur
in the source. Out-of-order joins will pass; that is acceptable, because every part is
still a real line and the guard's job is fabrication, not citation style.

**Annotate D39's sensor.** The flag rate is the §8 diagnostic, and this change lowers
it for a *mechanical* reason on 21 Aug. Record the baseline shift in D39 so a future
reader does not misread the drop as the prompt improving.

**Kashmir is re-run, not repaired.** Hand-adding the three missing links requires
guessing pairs the model never stated. Re-running also tests both fixes on the
material that broke them. *21 Aug.*

**D53 — D51's spine guard loosened; seeds re-sample before surfacing.** *(Relayed
ruling, recorded by the implementer.)* The architect overruled the implementer's
whole-rejection warning in D51 and the implementer was right; this corrects it.

1. **Guard on BREAKAGE, not shape.** The only condition that breaks anything is an
   **orphaned REAL** — no SAFE refines parent, the original Kashmir bug. "Exactly
   three links" and "exactly one SAFE parent per REAL" were tidiness; every shape
   they reject renders fine. New rule: every REAL has at least one SAFE refines
   parent. Nothing else.
2. **Retry the seed before surfacing a spine failure** — up to two re-attempts,
   then fail loudly. A bad spine is a sampling outcome, not a deterministic fault.
   The line for retryable-vs-not: *would a re-sample plausibly succeed?* 529 —
   yes. Bad spine — yes. Rejected sourceLine — yes. A malformed request or a
   schema violation the model cannot fix — no.
3. **The `['refines']` enum stays.** Working, costs nothing.

**Distinct-SAFEs stays permitted** — one SAFE parenting all three REALs renders
fine under D32's repeat treatment and arises legitimately mid-run via spawns; the
implementer flagged rather than adding the stricter rule, and that was right.

If Kashmir still fails after three attempts under the loosened rule, **that is the
finding** — the material genuinely resists the contract — and it returns to the
architect as a §8 question, not a code one. *21 Aug.*

**D54 — Descent ceiling raised from 10 to 12.** Requested after reading ten descents
comfortably across nine songs. **Overrides** the architect's concern in
`field-guides/systems_that_worked.md` §3 that raising output in front of the reading
constraint dumps inventory — that was a theory; nine songs of use is evidence
against it. The guide's entry is annotated accordingly. *21 Aug.*

**D55 — The grid shows `sourceLine` on every entry. It is the grid's whole purpose.**

Readings shows the citation under every entry; the grid shows none, on any tier, and
expanding a row gives the note rather than the line. That guts what the grid is *for*.

**Each view must answer a question the others cannot.** Readings answers *what does
this descent say*. Target answers *where did the raw layer land*. Arc answers *how
would this move as a piece*. The grid's unique question is **how is the song's weight
distributed across its lines** — which lyric spawned four REALs and three RAWs, and
where those went. Without citations visible it cannot answer that, and it degrades
into a worse Readings.

Every grid entry renders its `sourceLine` in the Readings treatment — italic serif
beneath the label, with the `citation unverified` marker where it applies. SAFE
especially: that column is the emptiest and it is where tracing starts.

**Optional, implementer's call:** hovering or clicking a citation highlighting its
whole lineage across the columns. Ship the visible citation first — it may be
sufficient alone. *21 Aug.*

**D56 — The target plots all three tiers, with descent paths. Answers Q5.**

**The argument, from use:** at one glance you should see *the surface scatters, the
raw converges.* A song can present across Fitness and Identity in the outer ring
while every RAW dot lands in a single quadrant. That is the corpus finding rendered
per-song, and no existing view shows it.

**Why this is not a reversal of D20 or D30.** Both were right about conditions that
no longer apply:

- **D20** rejected the three-ring target because it inverts space against content —
  RAW at the centre has the least area and holds the most text. **That objection was
  about text.** Dots need no area.
- **D30** cropped to the RAW disc because the outer rings were empty *by
  construction*, plotting only RAW. **Plot all three tiers and the rings carry data.**

**Shape:** SAFE outer ring, REAL middle, RAW inner — the original geometry, which
`geometry.ts` still computes. Each descent draws a path SAFE → REAL → RAW. Shared
SAFEs mean fewer origin points than descents.

**Q5's stated risk stands: twelve paths may be a hairball.** Do not solve it by
guessing. Render and look. If it is illegible, the first move is **paths faint by
default, solid on hover or selection** — the mass reads as convergence, and any
single descent stays traceable. Do not thin the data to fit the frame.

The cropped RAW-only disc may still be the right *corpus* view, where hundreds of
dots make paths impossible. Decide that separately, after looking. *21 Aug.*

*Amendment after rendering, 21 Aug — the outcome D56 asked for.* **Twelve paths read
as a hairball.** The resolution is not to thin the data but to place the dense
version where density is acceptable:

- **Header signature: keep the three-ring path view, hairball permitted.** It is
  peripheral — glanced at while doing something else — so it works as *texture*. A
  dense tangle still says *this song has a lot of movement*, which is all a
  signature needs to say.
- **Main Target view: the cropped RAW disc, as before D56.** A view you deliberately
  switch to must answer one question cleanly, and that question is *where did the raw
  land*. D30's original reasoning applies again at this surface: plot only RAW and
  the outer rings are empty by construction.
- **Title it.** Something like *the raw*. Nothing on screen currently states that the
  dots are RAW; that was only knowable by having built it.

Neither D30 nor D56 was wrong. The mistake was assuming one treatment had to serve
both surfaces.

**D57 — Discoverability and feedback pass. Norman, Cooper, Krug applied to the app.**

The build is strong on typography and restraint and weak on **signifiers and
feedback** — capabilities exist with no perceivable cue, and two states have no
explanation. Ranked by value.

1. **Target dots have no hover state and no click cue.** They open the provenance
   panel; hovering one produces nothing — no cursor change, no highlight. *An
   affordance nobody can perceive does not exist* (Norman). The architect only knows
   it is clickable because it commissioned it.

   **The fix does more than signal.** Hover reveals the dot's label on a leader line,
   so **the disc becomes readable by sweeping rather than clicking.** That converts
   the Target from a picture into something you can actually read, and it is worth
   more than the rest of this entry combined.

2. **The disc is clipped at the bottom and the page does not scroll.** At a ~630px
   viewport the FITNESS and EARNINGS labels and the lower dots are unreachable. This
   is a correctness bug on the one view whose job is *one glance* — the Gulf of
   Evaluation, in Norman's terms. "Fits if the window is tall enough" is not a design.

3. **A category legend.** Four colours mean four categories and nothing says so.
   Quadrant labels give position, not the colour mapping, and the colour is what the
   eye is actually reading.

4. **The title belongs to the disc.** `THE RAW` sits alone top-left while the disc is
   centred, so they do not read as one object. Krug's grouping principle.

5. **`Loser by Tame Impala — no descents yet` is a dead end.** A map with nothing in
   it, no retry, no explanation, no indication whether a run failed or never started.
   A state the app can reach and has no answer for.

6. **`next song` is greyed with no reason given.** Disabled without explanation is a
   question mark (Krug).

7. **Full ink vs dim ink in the library means dug vs fallback** — a genuinely
   meaningful distinction, encoded in a contrast difference, with no legend anywhere.

**Considered and deliberately not ruled:** the view names (`readings · grid · arc ·
target`) are implementation vocabulary rather than goal vocabulary — Cooper's
represented model. Real by his standard, but the human has internalised them and
there is no evidence it costs anything. **Becomes live if this is ever pointed at
`subject: 'self'`.** *25 Aug.*

---

## Open — architect owes an answer

*(Q5 — three-tier paths on the Target — answered by D56 and settled by its
amendment after rendering: the paths live on the header signature, where
density is texture; the Target view is the cropped RAW disc, titled.)*

**Q3 — What is the expected keep-rate, in real numbers?** `PRODUCT.md §2` guesses
~half for `seed`, ~a third for `interrogate`. Those are priors, not measurements. The
first real judgment run under D26 replaces them. **Not blocking, but confirm early** —
and note D26 inverts the default, so the number to watch is now the *kill* rate.
