# systems_that_worked.md

*Portable. Drop into any fresh chat with no other context.*
*Third in a set — `strategy_that_worked.md` is about deciding, `standards_that_worked.md`
is about holding a standard, this one is about the machine you're standing inside.*

Distilled from *The Goal* (Goldratt), *The Great CEO Within* (Mochary), and
*Scaling People* (Hughes Johnson) — but **not** a summary. Only the subset that
changed a decision when run live against a real build: one human deciding, an
architect model specifying, an implementer model building.

Worked examples are from that build. Everything that did no work is listed at the end.

---

## The six that did the work

### 1. Find the constraint — and notice when it's you (Goldratt, Mochary)

Throughput is set by the single slowest step. Mochary's version is blunter: the
founder who touches every decision caps the organisation at their own bandwidth.
Goldratt calls that person Herbie.

**In practice: the architect is Herbie.** The implementer stops and waits on rulings —
four separate times in one day. Each stop costs a full round trip through a human
relay. The implementer builds in minutes; the architect answers in exchanges.

The uncomfortable part is that the architect has been *wrong* often enough that its
gatekeeping is not obviously earning its cost. The implementer independently caught
four specification errors and was right every time.

> **The move:** if one node is a gate, measure how often the gate *changes* the
> outcome. If a reviewer approves nearly everything unchanged, the review is latency
> wearing the costume of quality. Widen the other node's latitude and reserve the
> gate for the classes of decision where it has actually reversed something.

### 2. Fix the constraint and the constraint moves (Goldratt)

The Five Focusing Steps end by repeating, because once you break one constraint
another appears — and the real danger is letting inertia become the new one.

**In practice, the constraint has moved four times and nobody named it:**

| stage | constraint | how it was broken |
|---|---|---|
| 1 | Would the prompt reach RAW at all? | probe, before any UI |
| 2 | Model latency — 9 minutes per song | pipelining, not faster generation |
| 3 | Layout — content unreadable | grid, then editorial typography |
| 4 | **Human reading capacity** | *unaddressed* |

Stage 4 is where it sits now, and it went unnoticed because every previous stage was
a machine problem and this one isn't.

> **The move:** after any significant fix, ask explicitly where the constraint went.
> It is never where it was, and the instinct is to keep optimising the thing you just
> got good at.

### 3. A balanced plant is a bankrupt plant (Goldratt)

Activating a resource and usefully utilising it are not the same thing. Running
non-constraints flat out only piles up work-in-progress.

**In practice, this is a live self-inflicted wound.** After fixing latency, the spec
raised output from three descents per song to **ten**. Seven descents produced
roughly two thousand words of dense prose, every one of which has to be read
carefully to be judged at all.

That is production increased at a non-constraint, dumping WIP in front of the
constraint — the reader. It felt like a generosity. It's a queue.

> **The move:** when you make a producer faster, check what it now feeds. Raising
> output ahead of the bottleneck doesn't raise throughput, it raises inventory —
> and unread output is inventory.

*Override, 21 Aug (D54): the ceiling rose 10 → 12 at the reader's own request,
after ten descents read comfortably across nine songs. The concern above was a
theory about the reading constraint; nine songs of use is evidence against it at
this scale. The PRINCIPLE stands — watch what a faster producer feeds — but do
not cite this entry against the current ceiling; the constraint was measured,
not guessed.*

### 4. Suppressed feedback is a broken sensor (Hughes Johnson)

The reading you're most afraid to report is the one the system most needs.

**In practice, literally, in code.** The server validated proposed links and rejected
invalid ones. Rejections went to the server console. The client ignored them entirely.

A malformed proposal therefore produced a silently broken map — a reading with no
ancestors — *and* a second failure downstream, where the generation loop saw an
undescended node and re-did the same thread twice. Two visible defects, one invisible
cause, and no surface anywhere could have told either party.

> **The move:** every place your system decides to discard something, ask where that
> decision is visible. Silent rejection is the highest-leverage bug class there is,
> because it produces symptoms arbitrarily far from the cause.

### 5. No diffuse points of accountability (Mochary)

Every function needs one directly responsible owner. Ambiguity about who owns what is
where work quietly dies.

**In practice, twice in one hour.** The dev servers were started by an old background
task, killed, restarted by the implementer, killed again, and the human was probably
running their own — two processes contending for the same ports, no owner, two wasted
round trips. Separately, the map file on disk had two writers: the implementer
hand-repairing it, and any stale browser tab whose autosave would silently clobber
the repair.

> **The move:** for every mutable resource — a port, a file, a running process —
> name the single owner out loud before anyone touches it. "Who owns this right now"
> takes five seconds and it is the cheapest question in operations.

### 6. Check your assumptions, not your numbers (Goldratt)

Jonah never gives answers. He asks until the flawed assumption underneath surfaces.
When the numbers look wrong, go up a level rather than recomputing.

**In practice:** a layout was reported as off-centre based on measurements taken from
a screenshot. The response was to re-measure — from another screenshot. The
assumption nobody questioned was *that a screenshot is a measuring instrument.* It
isn't: it was scaled 1.25×, and captured against a window frame rather than the page
viewport. The answer came from measuring the live DOM, which is a different level,
not a more careful version of the same level.

> **The move:** when a number is disputed, don't recompute it. Ask what instrument
> produced it and whether that instrument can produce that kind of number at all.

---

## The procedure, compressed

1. **Name the constraint.** Then check whether it's you.
2. **After every fix, ask where the constraint went.** It moved.
3. **Don't raise output ahead of the bottleneck.** Unread output is inventory.
4. **Find every silent discard and give it a surface.**
5. **Name one owner per mutable resource, out loud, before touching it.**
6. **When a number is disputed, interrogate the instrument, not the arithmetic.**

---

## What was considered and did nothing

- **Operating cadence / the metronome** — synchronising independent teams to a shared clock. One human, two agents, fully serial. Nothing to synchronise.
- **Hiring rubrics, scorecards, DACI** — no hiring.
- **Founding documents** — already exist here and were covered by an earlier volume. Endorsed the practice; changed nothing.
- **Throughput / inventory / operating expense** — the specific triad doesn't map to a single-user tool, though "inventory" turned out to be the right metaphor for unread output (see #3).
- **Inbox zero, journaling, energy management** — human-operator practices with no agent analogue.
- **RAPID and named deciders** — already unambiguous. The human decides; nobody has ever been confused about that.
- **Debug the operator** — the closest analogue is that a model's context state degrades decision quality well before it's obvious, which is real but already handled by the clear-context protocol.

**Hit rate: 6 of ~18.** Consistent with the other two volumes. The value of a framework isn't that all of it applies — it's finding the six quickly.

---

## Live recommendations

**Reduce the architect's gate.** Principle #1. The implementer has caught four
specification errors and been right every time; it currently stops for rulings it
could make. Pre-authorise classes of decision — anything that doesn't change the data
model, the system prompt, or a hard rule — and reserve the round trip for decisions
where the architect has historically reversed something. Measure it: if a ruling
approves the implementer's lean unchanged, that round trip was pure latency.

**Reconsider ten descents.** Principle #3. Seven produced two thousand words. The
constraint is now the reader, and the spec raised production in front of it. Either
lower the ceiling or give the reader a way to triage — but don't raise it further
because generation got cheap.

**Name the owner of every mutable resource.** Principle #5. Dev servers: the human.
Map files: the running app, exclusively — no hand-editing while a tab is open. Write
both down before the next session forgets.

---

## One line to keep

> Find the slowest step, check whether it's you, and remember that every fix moves
> it somewhere new — usually somewhere you're not looking.
