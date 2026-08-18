# Cold Review

*Reusable skeleton for reviewing a document, a spec, or a piece of output.
Extracted from the NEVER-SHIP review (see `COLD-REVIEW-worked-example.md`), with
that review's two self-refutations fixed.*

**Run it cold.** Fresh context, no source material, no author present. If a claim
isn't defensible from the artifact alone, it isn't defensible for the reader either.

**What cold review does not catch: factual error.** A confident, cleanly written,
internally consistent falsehood sails straight through. Cold review tests clarity,
completeness, and defensibility. Accuracy is a separate, source-loaded pass. Never
let "validated" be mistaken for "verified."

---

## The eight sections

**1. Real idea, or repackaged common sense?**
Split into *non-obvious* and *dressed-up truism*. **Count the claims and report
`N of M`** — never a percentage you didn't derive. If you didn't count, say
"impressionistically" and give no number at all.

**2. Asserted without evidence — ranked by cost if wrong.**
Not by how wrong. By what it costs to act on and be mistaken. The load-bearing
economic or mechanical claim goes first, whether or not it's the most incorrect.

**3. What breaks on a Tuesday with four meetings.**
*The highest-value section. Do not skip it.* Walk the actual adoption path under
real constraints — three 25-minute gaps, competing priorities, no ideal conditions.
Name the unbudgeted cost, the step with no mechanism, and the point where the
practice degrades silently rather than failing loudly. Silent degradation is how
this dies; loud failure is survivable.

**4. Invented vocabulary audit.**
Three buckets: *earns its keep* (names a real state with no existing crisp term),
*marginal* (renaming, redeemed by a checkable heuristic), *pure branding — cut it*.
Renaming an established concept costs credibility. Note voice tics that signal the
thing was written to be read rather than used.

**5. What's missing that would make it usable.**
Not "more detail." The specific operational parts a practitioner needs and doesn't
get. Standing candidates:
- a false-positive protocol — what fraction of findings to expect are wrong, and explicit permission to reject them
- a stop rule that can be checked by someone else
- a **don't-bother list** — when is this overkill? Uniform application of a practice
  worth it on 5% of cases is the most common way rollouts die
- one complete worked artifact, not a fragment
- what still requires a human, and why

**6. Does the worked example prove the thesis, or a different one?**
The sharpest move available. Check three things: does the example *demonstrate the
mechanism being sold*, or something adjacent that would have worked anyway? Does it
run the **full** loop, or stop at the exciting first pass? Are its scores anchored
to a stated rubric? A number without a scale is an opinion wearing a lab coat.

**7. Who is this for, and does it know?**
Compare *written for* (implied prerequisites, undefined jargon) against *positioned
for* (the examples and framing). A gap between them is the failure mode. Name the
line number where your actual reader bounces.

**8. Verdict.**
- **What changes tomorrow** — specific behaviors, or the review found nothing.
- **Why not higher / why not lower** — bracket the score from both sides. This forces
  calibration and is the part most reviews skip.
- **What you'd forward, and in what form** — the doc, an excerpt, or three paragraphs
  you'd write yourself.

---

## The rubric

Score **"changed how I work," 0–10**, against this scale. Do not give a number
without naming the band.

| band | meaning |
|---|---|
| **0–2** | Nothing changes. Read as entertainment. |
| **3–4** | One marginal habit shifts. Wouldn't re-read. |
| **5–6** | Two or three specific behaviors change tomorrow. Keep for myself. |
| **7–8** | Changes a default I apply broadly. Worth forwarding. |
| **9–10** | Changes how I decide what to work on, not just how I do it. |

---

## Reviewer discipline

- **No unverifiable war stories.** "In my experience this always fails" is an appeal
  to authority the reader can't check. Argue from the artifact.
- **No fake precision.** Percentages, ratios, and scores are either derived or absent.
- **Credit honestly and specifically.** A review that finds nothing good is a lens
  problem, not a quality finding. Name the best line and say why.
- **A review that produces no edits was an expensive way to feel diligent.**
- Stop when a new lens produces no severity-1 finding — not when findings "get
  boring," which can equally mean the lens stopped being adversarial.

---

## Applying this to BubbleMap

The natural target is **Phase 0 output**. Run §6 against it specifically: does the
probe result prove *the prompt reaches RAW*, or merely that *the model writes
fluent prose about songs*? Those look identical on a first read and only one of
them is the product.

Second target: any phase where the spec and the build diverge. §3's Tuesday test is
the right lens on the ten-minute loop requirement in PRODUCT.md §4 #4.
