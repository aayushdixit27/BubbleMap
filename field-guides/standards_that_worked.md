# standards_that_worked.md

*Portable. Drop into any fresh chat with no other context.*
*Companion to `strategy_that_worked.md` — that one is about deciding, this one is
about holding a standard while building.*

Distilled from *The Score Takes Care of Itself* (Walsh), *Amp It Up* (Slootman), and
*The 15 Commitments of Conscious Leadership* (Dethmer, Chapman & Klemp) — but **not**
a summary. Only the subset that changed a decision when run live against a real
two-agent build (an architect model specifying, an implementer model building, one
human deciding).

Worked examples are from that build. Everything that sounded good and did no work is
listed at the end.

---

## The seven that did the work

### 1. Install the standard before the result — and check *which* standard you installed (Walsh)

Walsh's 49ers had a Standard of Performance before they had a win. The claim is
causal: the standard produces the result, not the reverse.

**What we got right:** the model's output standard — a verbatim system prompt defining
what counts as honest at each depth — was written before a single output existed, and
was never edited under pressure. It is the single reason the output is good, and it is
the one artifact that survived twenty-six decisions untouched.

**What we got wrong, and it cost two rebuilds:** there was **no standard for our own
work.** The interface had no spec, so it defaulted to the statistical mean of the
training set — dark mode, indigo, glowing rounded cards. Both subsequent design
documents were standards written *after* the failure they should have prevented.

> **The move:** list every surface the project produces. For each, ask whether a
> standard exists that was written *before* anything was built. The surfaces without
> one are where slop appears, and you will mistake it for a taste problem.

### 2. Blueprints don't carry load — render it and look (Walsh + Slootman)

Slootman puts execution before strategy: an organisation earns the right to a grander
design by proving it can build. Walsh manufactured poise through preparation, not
theory.

**In practice:** the layout decision was made twice. First from reading the data
structure — 60+ links, dense cross-references, "a grid can't render this." Wrong.
Then from looking at a screenshot of it rendered — the layout inverted space against
content, giving the least room to the material that needed the most. Obvious in two
seconds, invisible in the JSON.

> **The move:** a decision about how something *looks or feels* cannot be made from a
> description of it. Render the cheap version first. The screenshot is evidence the
> specification is not.

### 3. Route signal to where it can correct (15 Commitments)

The candor commitment: say the true thing to the person who can act on it. Gossip is
feedback leaking into channels with no actuator attached.

**In practice:** the implementer reported to the human, who relayed to the architect.
That channel is lossy in a specific way — it carries *what was built*, not *what it
feels like*. The finding that the most important action in the product was an 11px
grey link, revealed on hover, at the bottom of a cell, never made it through. It
arrived only when the architect opened the app and looked.

> **The move:** the specifier must inspect the artifact directly, not the report of
> the artifact. Build the inspection into the loop rather than relying on the
> implementer to notice what the specifier would have cared about — they can't,
> because they don't hold the intent.

### 4. Hold hypotheses, not positions (15 Commitments)

Wanting to be right isn't the problem. *Fighting* to be right is. Above the line is
open and curious; below it is defensive and committed to having been correct.

**In practice:** across two days the architect reversed itself on the canvas library,
the layout, the probe scope, the judgment model, and the default state of new content
— the last of which had been formally scored and rejected hours earlier.

That looks like incompetence and mostly wasn't. It was cheap because **every decision
was written down with its reasoning, so reversing it cost one entry rather than an
argument.** A position defends itself against evidence. A hypothesis with its
reasoning attached invites the evidence that kills it.

> **The move:** record the *reason*, not just the ruling. A decision with its argument
> visible can be overturned by anyone who finds the argument false. A bare ruling can
> only be overturned by whoever made it, which means it usually isn't.

### 5. Leave nothing to chance — precompute the hot path (Walsh)

Walsh planned contingencies in calm so that under pressure, execution was recall
rather than improvisation.

**In practice, negatively.** An API content filter killed a nine-minute generation
mid-flight. There was no protocol, so the response was improvised. It happened a
second time before a rule got written — *don't load the raw material into context,
chunk the work, clear and resume* — and that rule took ninety seconds to write.

> **The move:** the second occurrence of anything is the signal you should have
> written the runbook after the first. Cheap to write in calm, expensive to invent
> mid-failure.

### 6. Teach the standard until it outlives you (Walsh)

Walsh's measure was his coaching tree, not his record. A standard living only in the
leader dies with their attention.

**In practice:** with a fixed context window, "outlives its author" is not a metaphor.
Every session ends. What survives is three files — where we are, what's been decided
and why, what the thing is for — that reload the entire working state in about 5k
tokens.

The sharpest version is a **fourth file holding superseded decisions**, each with its
original wording, what replaced it, and *why it doesn't come back*. The risk was never
forgetting a decision. It was someone six weeks later proposing something that had
already been tried and had failed for reasons still true.

> **The move:** write the graveyard, not just the ledger. And treat updating it as
> part of finishing the task, not paperwork after it — a state file that has gone
> stale is worse than none, because it is confidently wrong.

### 7. Success Disease — the standard sags hardest right after the win (Walsh)

Walsh's discovery after the first Super Bowl: mastery breeds complacency and the quiet
lowering of the standard that produced it. His prescription is to celebrate formally,
then deliberately reset.

**In practice — live, right now.** This project just cleared its existential gate: the
output is genuinely good, confirmed on a song nobody had analysed. Everything after
this point is easier, which is exactly the condition Walsh warns about. The prediction
is specific: **the next few decisions will be made with less rigour because the
pressure is off**, and nobody will notice at the time.

> **The move:** at the moment a gate clears, write down what standard held during the
> hard part and is now unenforced by circumstance. Ours: render before deciding;
> record reasoning with rulings; the specifier inspects the artifact. Those were held
> under pressure. They are now optional, which is the danger.

---

## The procedure, compressed

1. **Name every surface. Find the ones with no standard.** That's where slop lives.
2. **Render before deciding.** Descriptions can't answer questions about feel.
3. **Inspect the artifact yourself.** Reports carry what was built, not what it's like.
4. **Record reasoning, not rulings.** It's what makes reversal cheap.
5. **Write the runbook on the first failure, not the second.**
6. **Write the graveyard, not just the ledger.**
7. **Reset the standard when you win.** That's when it sags.

---

## What was considered and did nothing

- **Drivers, not passengers** — a staffing concept. Two agents and one human; nobody gets moved off the bus.
- **You already have what you need, amp it up** — assumes underutilised capacity. Not the failure mode here; ours was misdirected effort, not slack.
- **Culture precedes results** — true, and it collapses into #1 for a project this size. The standard *is* the culture when there are three participants.
- **Lead from your zone of genius** — a career-shape idea. The one transferable fragment is running within rated capacity, which maps to the context window: past a threshold, output degrades whether or not it looks like it.
- **Declare war on mediocrity** — real, but it restates #1 and #7 with more volume.
- **Everyone is a 49er** — an organisational-tolerance point with no analogue at this scale.
- **Time is the enemy / urgency as a mindset** — the failure here was over-analysis, and `strategy_that_worked.md`'s stop rule already handles it better.

**Hit rate: 7 of ~18.** Higher than the strategy volume's 5, and that tracks — standards and teaching map more directly onto a two-agent build than corporate strategy does.

---

## Live recommendations

Applying the above to what's actually open. The human decides; this is the argument.

**Write the interaction standard now, before the next four chunks land.** Principle #1.
There's a visual standard and no interaction standard, which is why the most important
control in the product ended up as an 11px hover-revealed link and nobody caught it in
spec. One page: what's always visible, what's revealed, what a destructive action
looks like, what the app says while it's thinking. Written before, not after.

**Add an inspection step to every chunk boundary.** Principle #3. The specifier opens
the app and looks before approving the next chunk. Two minutes, and it's the step that
found the empty RAW column, the invisible descend link, and the orphaned thread — none
of which appeared in any report.

**Name the Success Disease guard while it's still uncomfortable.** Principle #7. The
gate cleared today. The three standards that held under pressure — render before
deciding, reasoning with rulings, specifier inspects — are now unenforced by anything
except memory. Put them in the always-loaded file this week, not after the first one
quietly lapses.

---

## One line to keep

> Install the standard for your own work as carefully as the one you install for the
> machine's, look at the artifact yourself, write down why — and reset the standard
> the day you win.
