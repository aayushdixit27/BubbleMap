# BubbleMap — Product

Read this before ARCHITECTURE.md. Architecture answers *how*; this answers *why*
and *what we're not doing*. When they conflict, this one wins — a correct
implementation of the wrong thing is still the wrong thing.

---

## 1. Problem statement

> I can tell when a song hits me. I cannot name what it's actually about.
>
> When I try to work it out myself I stall at "it's about heartbreak" — one
> layer under the surface and no further. The honest reading is precisely the
> one I'm motivated not to reach, because reaching it means admitting the same
> thing about myself. So I stop at REAL, call it analysis, and learn nothing
> transferable.

The pain is **the stall at REAL**, not the absence of a diagram. Everything in
this product exists to break that stall or it doesn't ship.

**The raw layer is recovered, not invented.** *(User, 19 Aug — the sharpest framing
of this product so far.)* The singer had to live in the raw to write the song at all.
It is already in there, under the safe reading, put there deliberately by someone who
paid for it. So the work is **excavation, not interpretation** — and that is why the
good outputs land as *findings* rather than opinions, and why a weak one feels like a
guess rather than a wrong answer.

Two consequences worth holding onto:

- **There is a right answer, roughly.** Not a single one, but a range the song
  supports and a wide field it doesn't. That is what makes the citation guard matter
  and what makes the flinch test meaningful rather than a taste poll.
- **It should feel like digging.** The user's word was *joy* — a game, a hustle. A
  tool that hands you a report has failed even if the report is correct. The act of
  going down a level yourself is part of the product, not overhead before the payoff.

**Who this is for:** one person — a creator who wants to make things that land,
using hit songs as the training corpus. Not a general-purpose mind-mapping tool.
Not for teams. If a feature only makes sense for a second user, it's out.

---

## 2. Desired outcome (behavior change, not feature list)

**Today:** I listen to a song I love, feel something, and can't say what.
**After:** In under ten minutes I can name the raw thing in that song, see it
sitting in a LIFE quadrant, and — after twenty songs — recognize the shape they
share well enough to aim at it in my own work.

**Signal it's working:** the number of maps whose RAW ring contains something
that made me flinch to type. That's the same test the framework applies to
songs, turned on the tool. Zero flinches after five maps means the product has
failed, no matter how good the canvas looks.

**Anti-signal:** a beautiful map I never look at again. Ten completed maps that
taught me nothing beats one gorgeous one.

**The keep-rate, and why it's not a bug.** The model's job is to propose candidates
I can reject (§5), so a low accept rate is the mechanism working, not failing.
Expect to keep roughly **half** of what `seed` proposes and **a third** of what
`interrogate` does — interrogation should overreach by design.

Two failure signals sit either side of that:

- **Keeping ~everything** means I've stopped reading, or the proposals are so
  hedged there's nothing to reject. The second is worse and looks like the first.
- **Keeping ~nothing** across several songs means the prompt is off, not that I'm
  discerning.

Phase 0's output sets the real number. Record it in PROGRESS.md, then treat large
deviations as a signal about the prompt rather than about my taste that day.

---

## 3. Non-goals (load-bearing — these kill scope creep before it starts)

Not a general mind-mapping tool. Not multiplayer, not shareable, no accounts.
No mobile. No rich text. No audio playback, no lyrics API, no Spotify anything.
No multiple maps open at once. No `subject: 'self'` prompt variant in v1 — the
field exists in the data model, the prompt comes later. No export in v1. No
corpus/cross-map view in v1 (see §7 — that's the trajectory, deliberately deferred).
No AI that writes to the map without a human accept, ever, at any scope.

**The rule:** if a proposed feature does not shorten the path from *"I like this
song"* to *"here is the raw thing,"* it is a non-goal by default. Argue it back
in explicitly or leave it out.

**What this rule is not for.** It blocks *speculative* building — things argued for
from a whiteboard, before anyone has used the tool. It does **not** block findings
from real use. "I was reading a map and wanted X" is the strongest evidence this
project has, and it outranks a non-goal written before the thing existed.

Roughly 80% of the design is settled. The remaining 20% surfaces only in use, and it
is additive as often as subtractive. Anyone invoking §3 against a use-discovered need
is using it backwards.

---

## 4. Pre-mortem

*It's three weeks from now and BubbleMap failed. Why?*

**#1 — The RAW output was just SAFE with stronger adjectives.**
The model produced "he is devastated by betrayal" instead of "I need her to have
been the villain so I don't have to be." Confident, well-formatted, useless. The
whole product collapses to a diagram generator and I stop opening it.
*Likelihood: high. Impact: fatal.*

> **Mitigation — this drives the entire build order.** Phase 0 is a CLI probe
> that tests the §8 prompt against real songs with **zero UI**. If the prompt
> can't reach RAW in a terminal, no canvas will save it. Do not write a line of
> React until Phase 0 passes. This is the single most important decision in the
> plan.

**#2 — Everything landed in one category.**
Every bubble came back LOVE because it's a song, making the LIFE axis pure
decoration and the target a worse version of three horizontal lanes.
*Likelihood: medium. Impact: severe — it invalidates the canvas design.*

> **Mitigation:** Phase 0 measures category distribution across ~6 songs, not
> just depth quality. Two songs I'd expect to be non-LOVE go in the probe set on
> purpose. If the spread doesn't materialize, the geometry decision comes back to
> the architect *before* it's built, not after.

**#3 — I burned three sessions on canvas polish and never ran the AI.**
Geometry, ring labels, drag physics, minimap. All satisfying, all yak-shaving.
Three weeks in there's a beautiful empty target.
*Likelihood: high — this is the default failure mode of an interesting canvas.*

> **Mitigation:** phase boundaries are hard stops with a report back to this
> window. Phase 2 is defined as *the first version I can actually use on a real
> song*, and everything after it is negotiable. The §6 LNO list names the
> yak-shaving explicitly so it's recognizable when I'm doing it.

**#4 — I used it for three songs and stopped.**
It worked, and it was a novelty. One map is a party trick; the insight only
exists across twenty.
*Likelihood: medium. Impact: slow death.*

> **Mitigation:** the loop must be **under ten minutes end to end** — that's a
> requirement, not an aspiration, and it's why `seed` proposes 4–6 bubbles at
> once and `Shift+A` exists. Secondary: maps are plain JSON in `maps/`, so the
> corpus view (§7) stays cheap to build later. Accumulation must have a payoff
> even if the payoff isn't built yet.

---

**#5 — I measured what was available instead of what mattered.** *(Observed, 17 Aug,
not predicted.)* The Phase 0 probe ran `seed` only, which stops at REAL by contract.
Rather than fix the chain, the architect ran two judgment passes over the SAFE→REAL
half — the easy jump — and produced a finding at n=4 that was then correctly
dismissed as noise. Two audits, zero movement on the question the phase exists to
answer.

> **Mitigation — the stop rule.** Before analysing any output, ask: *does this data
> answer the gate question, or is it merely the data I have?* If the second, stop
> and go get the right data. Analysis of the wrong dataset is Overhead that feels
> like Leverage, because it produces charts.
>
> The tell is a second pass over the same material. One read is diligence; a second
> read of the same twelve items means the first read already told you everything it
> could, and the honest next step is elsewhere.

This is Doshi's three levels: the audits were **execution-level** work (are we
measuring correctly?) while the open question was **impact-level** (does the tool do
the thing?). Under a clock, execution rigour on the wrong artifact is indistinguishable
from progress. It is not progress.

---

## 5. Why AI at all (vs. an Excalidraw template)

Worth answering honestly, because "we added AI" is product theater and this is
the question a good judge — or my own six-months-from-now self — asks first.

A static template gives me the target grid. It does not give me the thing I
lack. **I stall at REAL because the deeper reading is the one I'm defended
against.** A tool that hands me an empty ring labeled RAW just relocates the
stall.

The model's job is not to produce the map. It is to **propose three candidate
deeper readings so I can reject two.** Rejecting is easy; generating from a
standing start against my own defenses is not. That's the whole value
proposition, and it's why the human-accept gate isn't a safety feature bolted on
— it *is* the product. Generation is free now; choosing and cutting is the
scarce skill, and the design deliberately puts me on the choosing side of that
line every single time.

If I ever find myself hitting `Shift+A` on everything without reading it, the
tool has failed in exactly the way this section was written to prevent.

---

## 6. LNO — where the hours go

**Leverage** — deserves the best energy, do not delegate to speed:
- The system prompt (ARCHITECTURE.md §8). This is the product.
- `geometry.ts` and its tests. Everything sits on it and a sign error is silent.
- The accept/reject loop. The core interaction.
- Cross-category edge rendering. The most valuable output the tool produces.

**Neutral** — necessary, do adequately, don't gold-plate:
- Persistence, the Inspector, manual editing and hand-drawn links, error toasts,
  undo (including bulk-accept-as-one-step — accepting six bad bubbles with no
  undo is genuinely painful).

**Overhead** — do fast and sloppy, or cut entirely:
- Minimap. PNG/SVG export. Lyric bubbles. Animated quadrant-focus transitions.
- Empty states. Onboarding of any kind. Anything that looks like polish before
  Phase 5.

**Opportunity-cost check at every phase boundary:** not *"is this a good use of
the next session?"* but *"is this the best one?"* The answer is almost always the
prompt.

---

## 6.5 The phase gate — five questions, answered in writing, every boundary

Frameworks in prose don't prevent rabbit holes. On 17 Aug the architect cited LNO
in one message and violated it in the next. What prevents it is a checklist someone
else can audit. Any "no" stops the phase.

1. **Did this phase produce an outcome or an output?** Name the behaviour that
   changed. "The code runs" and "the tests pass" are outputs. *(Cagan, Torres)*
2. **Does the data in hand answer the gate question, or is it merely the data I
   have?** If the second — stop, go get the right data. Analysis of the wrong
   dataset produces numbers, and numbers feel like findings. *(§4 #5)*
3. **What did I cut?** A phase that cut nothing had no scope. Name the thing you
   didn't build and why. *(Rachitsky — non-goals are load-bearing)*
4. **Pre-mortem the next phase in three lines:** most likely failure, its
   mitigation, who owns it. Before starting, not after failing. *(Doshi)*
5. **Is the next phase the best use of the next session, or merely a good one?**
   The build order is a plan, not a commitment. If something higher-leverage has
   surfaced, take it. *(Collison via Doshi — opportunity cost over ROI)*

**Stop rule, checkable by anyone:** a second analytical pass over the same material
means stop. One read is diligence. A second read of the same items means the first
read already told you everything it could, and the honest next step is elsewhere.

---

## 7. Trajectory (deliberately not built in v1)

Where this goes if it works, in order of conviction:

1. **The corpus view.** Twenty maps overlaid on one target. If the RAW cores
   cluster in IDENTITY across songs I love, that's a finding about me, not about
   the songs. *This is probably the real product; v1 is the instrument that
   collects the data for it.*

   **First five-song reading, 19 Aug — and a corrected architect error.** Across
   Beautiful, Money, Be Her, Go Your Own Way and Been By Now, the architect read the
   *plurality* quadrant of each song and claimed the raw layer always collapses into
   IDENTITY — possibly a §8 artifact, since "it must implicate the narrator" is
   definitionally identity-adjacent.

   **Wrong.** The Target view for one song showed 4 identity / 3 love / 2 fitness /
   1 earnings. Real scatter. The architect diagnosed from a text dump when the view
   built to answer that exact question was one click away — the third time
   *render before deciding* has caught the same mistake.

   The user's correction stands: **a flat distribution was never the right null
   hypothesis.** Songwriting is disproportionately about who the singer is. That's
   the craft, not a prompt bias.

   **What would actually be a warning sign** is not IDENTITY being the plurality.
   It's IDENTITY being the *only* thing, or the identity readings across songs
   converging on the **same insight**. Neither is happening — five songs produced
   five distinct mechanisms, so the model is reading each song rather than
   pattern-matching.

   **So the real corpus question is sharper than "does it spread."** It's whether
   twenty keeper lines share a *shape* — and if they do, whether that's a fact about
   hit songs or a fact about which songs this listener chooses.

   ### First corpus reading at n=8 — 20 Aug

   Run as the cheapest possible disproof of the corpus view: read the eight keeper
   lines together, in plain text, with no view built. If no shape survives that, no
   visualisation manufactures one.

   > *I need their faces grim so my empty day looks chosen* · *The people here are the
   > temporary set and they know it* · *I don't want her life, I want to keep singing
   > about it* · *The lonely day is mine and I put it in her mouth* · *I keep telling
   > her what's in her eyes so she says it* · *I joke about it first so no one can make
   > me stop* · *I want proof my wanting can do damage to somebody* · *I'd rather speak
   > for wronged women than admit he chose otherwise*

   **A shape survived, and it is more specific than expected.**

   **Six of eight are the narrator authoring another person's experience.** Not losing
   them, not being refused by them — *casting* them. Putting his own lonely day in her
   mouth. Telling her what is in her eyes so she will say it. Needing strangers' faces
   grim. Claiming the role of spokesman for wronged women. Filing the room as a
   temporary set. Joking first so the mockery belongs to him.

   **And none of the eight is about the other person.** Four are love songs. Every raw
   layer is about the singer's standing.

   **The caveat, which is the IDENTITY trap in a new costume:** §8 says *"if it does
   not implicate the narrator, it is not raw yet,"* so *the raw layer is about the
   narrator* may be tautological — forced by the prompt rather than found in the songs.

   **What is not forced:** nothing in §8 asks for *authorship of another person's
   role*. Six of eight arriving there independently, across four decades and both
   genders, is a finding rather than an artifact. **That is the thing the corpus view
   should be built to test at twenty.**

   *Method note: this reading cost nothing and was available at any point in the
   previous week. The corpus view was deferred behind "~10 maps" — a threshold the
   architect invented and never derived, same class as the 20-second latency target
   and the 500-word arc cap.*

   ### Update at n=11 — 21 Aug. The shape held, but generalised.

   Three Led Zeppelin maps joined the corpus. **None of the three fits the
   *authoring-another-person* pattern.** They are about the narrator's own machinery
   — training himself not to hear, never moving until made to move, becoming someone
   who has to leave anyone who knows him long enough.

   **What covers all eleven is broader: every line is a self-protective arrangement
   the narrator built and refuses to dismantle.** Not *I was hurt* but *I set this up
   so I can't be, and I know it.* Authorship-of-another was a subset that happened to
   dominate the first eight.

   ### The caveat that weakens both readings

   **Most of these lines are fallbacks, not choices.** D48 cut the keeper, so a
   library line is the RAW an *arc* was built from — and only two or three songs have
   arcs. Everything else shows its most recent RAW. *Been By Now*'s line already
   changed for this mechanical reason alone.

   So the n=8 reading was also built on lines that were mostly fallbacks. **Both
   findings are suggestive, not evidence, until a majority of songs have been dug
   into.** Do not treat the shape as established. The corpus wall's own counter —
   *"the lines · N of M songs dug into"* — is the number that says when to trust it.
2. **`subject: 'self'`.** Same target, pointed at my own LIFE quadrants. The
   data model already supports it; it's one prompt variant.
3. **Descent-shape comparison.** Do hits share a path through the rings?

Naming these now is what makes it safe to say no to them in v1.

---

## 8. The four questions, answered

*(Standard judging set — useful discipline even for a tool of one.)*

**Who is the user?** One creator who can feel that a song lands but can't name
why, and wants the naming skill to transfer to their own work.

**Why is AI necessary here?** Because the stall is motivated, not informational.
I need candidate readings I'm defended against generating myself. See §5.

**What makes the approach different?** Two axes instead of one. Every other
canvas is freeform; forcing an explicit `(category, tier)` on every bubble is
what makes cross-category descent *visible* — and that crossing is the insight,
not a byproduct.

**What did you trade away to ship?** Corpus view, self-mapping, export, multiple
open maps, and every collaboration feature. Single user, single map, local disk.

---

## 9. Honest status

Keep this section current. It's the "gap between the demo and the build," and
the gap is only dangerous when it's undocumented.

| Component | Status |
|---|---|
| Prompt validated on real songs | ☐ not started |
| Target renders, geometry correct | ☐ not started |
| seed → descend → accept loop usable | ☐ not started |
| Persistence | ☐ not started |
| interrogate / relink | ☐ not started |
| Ten-minute loop verified end to end | ☐ not started |
