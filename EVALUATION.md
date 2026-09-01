# Evaluation

The core quality question — *is this reading actually raw, or is it just
well-written?* — has no automated metric. What follows is what was measured instead,
with the raw results, so the figures cited in the README have a source.

---

## 1. The blind descent test

**What it tests.** The system prompt's central rule is that each step down must add
information that could be wrong — *"never restate the parent tier with stronger
adjectives."* Paraphrase is the failure mode, and it is invisible when you read a
descent normally, because a well-written restatement reads like an insight.

**Method.** Twelve SAFE→REAL pairs from four songs, with the REAL step **hidden**.
Read the SAFE step, decide what's underneath, then reveal. The question is *could I
have predicted this?* — because anything predictable is paraphrase.

It was run inside a purpose-built stepper rather than by scrolling, for a reason that
matters: **you cannot un-see an answer.** Any test where the result is visible while
you form your judgment measures nothing.

**Result: 9 of 12 added information. 3 were restatements.**

| # | song | verdict |
|---|---|---|
| 1 | Mr. Brightside | adds |
| 2 | Mr. Brightside | adds *(crosses category)* |
| 3 | Mr. Brightside | adds |
| 4 | Runaway | adds |
| 5 | Runaway | **restates** |
| 6 | Runaway | adds *(crosses category)* |
| 7 | Hurt | **restates** *(crosses category)* |
| 8 | Hurt | adds |
| 9 | Hurt | adds |
| 10 | Super Rich Kids | adds |
| 11 | Super Rich Kids | **restates** *(crosses category)* |
| 12 | Super Rich Kids | adds |

**What was concluded, and what wasn't.** Nine of twelve rules out the fatal case — a
prompt producing paraphrase as its default mode would have scored two or three. But
SAFE→REAL is the *easy* jump; the framework's hard jump is REAL→RAW. **The result was
recorded as a ceiling estimate, not a floor**, and no prompt changes were made on it:
twelve samples, one judge, one sitting cannot distinguish 9 from 7.

**A pattern that was found and then discarded.** Same-category descents scored 7 of 8;
cross-category scored 2 of 4. That looks dramatic and is statistically meaningless at
n=4 — a coin landing twice. It was written down and explicitly not acted on.

**What did survive** was a single item read closely. Item 11 moved a claim from
EARNINGS to IDENTITY while saying the same thing more forcefully — **the category
change did the work the content should have done.** That named a specific failure
mode: *crossing as a substitute for depth.*

---

## 2. The flinch test

Binary, and the only gate that ever blocked a phase: **does any RAW reading make you
uncomfortable to have written down?**

It is the same criterion the prompt applies to songs, turned on the tool. It cannot
be automated and it does not need to be — the answer arrives in under a second and
does not require expertise, only honesty.

Phase 0 was gated on it and did not proceed until it passed on a song that had never
been analysed.

---

## 3. Citation verification — the fabrication guard

Every reading must cite the lyric it derives from. The server checks that citation
against the source text.

**What it caught, and what it cost:**

| run | outcome | what it meant |
|---|---|---|
| *Be Her* | **6 readings deleted** | Guard rejected on mismatch. All six were strong; none was a fabrication. |
| *Go Your Own Way* | **1 flag / 23 kept readings** | After the fix. The one flag was a real composite citation. |
| *Kashmir* (first run) | **5 flags** | All five were genuine couplets joined with a line break the matcher couldn't parse. |

**Two changes came out of this**, and they're the substance of the section:

**The guard flags rather than rejects.** The reading is the product; the citation is
provenance. A bad citation makes provenance *unverified* — a fact to show the reader —
not the reading false. Silent deletion is the machine deciding on the human's behalf,
which is exactly what the rest of the design had removed.

**The matcher learned how people quote.** Every Kashmir flag was two real lyric lines
joined with a slash. The matcher normalised the slash away and then required the
result to appear *contiguously*, so a couplet only passed if its lines happened to be
adjacent and in order. **The model was citing honestly in a format the checker
couldn't read.**

**The flag rate is now a live diagnostic.** If it climbs, that is a signal about how
the model cites, not about the interface. Its baseline shift on 21 Aug was mechanical
and is recorded as such, so a future reader doesn't credit the prompt for it.

---

## 4. Structural guards — for what humans read past

Verb contracts, tier counts and link kinds are enforced in the **tool schema**, not
the prompt, on the principle that a constraint the model *cannot* violate beats one
it is asked to respect. Prose criteria live in the prompt; countable ones don't.

One failure showed why this matters. A seed produced its six bubbles correctly and
then emitted **no `refines` links at all** — every link was argumentative. Readings
walk `refines` parents, so every chain stopped one tier short and the SAFE tier
silently vanished from the interface while sitting intact in the file. Nothing had
constrained the link *kind*.

The fix was two mechanisms, not one: constrain the enum **and** validate the result,
because forcing the kind doesn't force completeness. And the first version of that
validation was too strict — it rejected whole seeds for shape violations that broke
nothing — so it was narrowed to reject only the condition that actually breaks a
reading: an orphaned REAL.

---

## What is not measured

Stated plainly, because an evaluation section that claims full coverage is lying.

**Whether a reading is *true of the song*.** Citation verification proves a lyric
exists; it cannot prove the reading follows from it. A confident, well-cited,
internally consistent misreading passes every check here.

**Whether the corpus finding is real.** Across fourteen songs the raw layer looks like
a self-protective arrangement the narrator won't dismantle — but most of the sampled
lines are defaults rather than deliberate choices, and the sample is one listener's
taste in songs. It is recorded as suggestive, not evidence.

**Whether the model's judgment matches the human's at scale.** Twelve items, one
judge, one session. Every number here is a signal, not a measurement.
