# strategy_that_worked.md

*Portable. Drop into any fresh chat with no other context.*

Distilled from *Good Strategy / Bad Strategy* (Rumelt), *Playing to Win*
(Lafley & Martin), and *Working Backwards* (Bryar & Carr) — but **not** a summary of
them. This is only the subset that actually changed a decision when the frameworks
were run live against a real engineering problem. Everything that sounded good and
did no work has been cut, and is listed at the end so you know it was considered.

**The test case:** a local tool that maps a song's meaning through three tiers of
honesty using an LLM. Output quality was excellent. It took 9–10 minutes per song.
The question was how to keep quality and kill latency.

---

## The five moves that did the work

### 1. Diagnose the mechanism before proposing anything (Rumelt)

Not "what's the goal" — *what is actually happening*. Get the numbers.

**In practice:** the run was 537 seconds and 36,390 output tokens. But the content
anyone would ever read totalled ~4,200 tokens. **Eighty-eight percent of the output
was reasoning, not artifact.**

That single number killed the obvious fix. "Shorten the outputs" would have saved
~12% of the time. "Use a faster model" would have destroyed the thing that made the
output good, because the quality *came from* the reasoning.

> **The move:** find the ratio that nobody has computed yet. The counterfeit
> diagnosis is always the one you can state without measuring.

### 2. Find the crux — the point where progress is both hard and decisive (Rumelt)

Not the biggest number. The *pivotal* one.

**In practice:** the crux wasn't tokens per second. It was that **the human sits idle
while the model thinks.** Nine minutes of waiting, zero minutes of working.

Once named, the fix inverts: don't make the thinking shorter, make the waiting
disappear. Overlap generation with reading. Same tokens, same quality, ~30 seconds of
felt latency.

> **The move:** when you find the constraint, check whether it's the *resource* that's
> scarce or the *serialisation* that's wasteful. Usually it's the second one.

### 3. Steer by controllable inputs, not outputs (Bryar & Carr)

Output metrics report the score after the fact and can't be moved directly. Input
metrics are the levers you actually hold.

**In practice:** "minutes per song" is an output metric. Unsteerable — it's an
emergent property of six other things. Replaced with three inputs:

| input | target |
|---|---|
| time to first visible content | < 5s |
| serial round-trip depth | ≤ 2 |
| seconds of blocked UI | < 30s |

Total time then falls out as a consequence. And each input maps to a specific action,
which the output metric never did.

> **The move:** if your metric can't be assigned to a single change, it's an output.
> Decompose it until each piece names something you can go and do.

### 4. "What would have to be true?" (Martin)

Don't argue for the option you like. State what the world must look like for it to
work, then go attack the shakiest condition.

**In practice:** for "parallelism fixes this":

- Descend calls must be independent of each other — **true**, each needs only the seed plus its own focus bubble.
- Streaming must deliver usable partial content — **true**, bubbles arrive whole as tool-use JSON streams.
- The human must spend ~60s reading the first batch — **unverified, and the weakest link.**

So the plan shipped with its own test attached: if the user scans the first batch in
15 seconds, they wait ~25s instead of 0. Still a 20× improvement, so the plan survives
its weakest assumption — which is the actual reason to trust it.

> **The move:** rank the assumptions by fragility, not importance, and check whether
> the plan survives the most fragile one being false. If it doesn't, you don't have a
> plan, you have a preference.

### 5. Decide what you will not trade (Lafley & Martin)

Strategy is choice, and choice means naming what you give up *before* the pressure
arrives.

**In practice:** written down as a standing commitment — **never trade RAW quality for
latency.** Latency gets solved by removing idle time, never by reducing reasoning.

This pre-commits the answer to a whole class of future proposals (cheaper model,
shorter thinking budget, fewer candidates) without having to relitigate each one.

> **The move:** name the one dimension you won't trade, in writing, while things are
> calm. Under deadline you will trade it and call it pragmatism.

---

## The procedure, compressed

1. **Measure the mechanism.** Find the ratio nobody has computed.
2. **Name the crux.** Hard *and* decisive. Ask whether the waste is scarcity or serialisation.
3. **Convert your metric to inputs.** If you can't assign it to one change, decompose it.
4. **List what would have to be true.** Rank by fragility. Check the weakest.
5. **Write down what you won't trade.** Before you're under pressure.

---

## What was considered and did nothing

Reported honestly, because a framework that fires on every problem isn't a framework,
it's a horoscope.

- **The five-question choice cascade** — too heavyweight for a single engineering decision. Built for portfolio-level bets.
- **Bad-strategy tells (fluff, goals-as-strategy)** — an auditing tool. There was no strategy document to audit.
- **Coherence as a source of power** — true, and it endorsed the answer after the fact. It didn't generate it.
- **Single-threaded leadership** — an org-design concept. One person, one project.
- **The Bar Raiser** — hiring. Irrelevant.
- **Six-page narratives over slides** — a meeting practice, not a decision tool. (Though writing the diagnosis in prose *did* surface the 88% figure, so partial credit.)
- **Write the press release first** — useful for framing the end state, but the input-metric decomposition did the actual work and got there faster.

**Hit rate: 5 of ~18 concepts.** That's normal and worth expecting. The value of a
framework is not that all of it applies; it's that you can find the 5 quickly.

---

## One line to keep

> Measure the mechanism, name the crux, steer by inputs you control, attack your
> shakiest assumption, and write down what you refuse to trade.
