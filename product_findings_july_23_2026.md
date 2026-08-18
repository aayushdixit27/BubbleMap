# Product Findings — July 23, 2026

Research compiled from current writing and interviews by the most-cited product leaders in the industry: Marty Cagan (SVPG), Shreyas Doshi (ex-Stripe/Google/Twitter), Lenny Rachitsky (Lenny's Newsletter), Teresa Torres (Continuous Discovery Habits), plus 2026-era synthesis on AI-product craft and hackathon-specific judging realities. Each section ends with a single sayable sentence — the compressed version you can retrieve out loud.

---

## 1. Marty Cagan — Outcomes over outputs, and the death of "product theater"

Cagan's core message has sharpened in the AI era rather than changed. His warning is against "product management theater" — people who hold the PM title but aren't actually responsible for outcomes. Real product managers are creators, accountable for two things simultaneously: **value** (does the product meet a real customer need?) and **viability** (does it work for the business?). If you're gathering requirements and managing a backlog, you're not doing product management.

His 2026 "new standard" talk pushed this further: in the age of AI, if you're just building outputs without a clear strategy and a focus on what actually matters to users, AI makes your problem worse, not better — you just ship the wrong thing faster. AI has made it "easier to do less process, more thinking and more achieving."

His first-principles model, distilled: empowered teams solve real problems rather than execute tasks; strategy is driven by focus, insight, and bold bets; discovery is about reducing waste and testing risks cheaply; delivery thrives on rapid, small, decoupled releases; and culture means principles over process, trust over control, learning over failure.

**Sayable sentence:** *"I'm responsible for value and viability — did I solve a real problem, and does the solution hold up?"*

---

## 2. Shreyas Doshi — Pre-mortems, LNO, and the three levels of product work

Three frameworks, all directly usable under time pressure:

**Pre-mortems.** Before starting, ask: "It's the end of the day and this project failed — why?" Run it before building, not after failing. At Stripe, this practice made failure modes intuitive; Doshi argues product sense itself is largely trained pattern-recognition built by running pre-mortems rigorously. Best practice: everyone silently writes failure reasons, then the group discusses and assigns mitigations to the top risks.

**LNO Framework.** Every task is Leverage (disproportionate impact — deserves your best energy), Neutral (necessary, do adequately), or Overhead (do fast and sloppy, or eliminate). The discipline: overhead is never reduced by trying harder — only by naming it and cutting it. Defend Leverage hours ruthlessly.

**Three levels of product work.** Impact level (does this matter to users and the business?), execution level (are we building it right?), and optics level (does it look good?). Most teams over-invest in execution and optics while under-investing in impact. Corollary: **most execution problems are actually strategy problems** — when a team is thrashing, the cause is usually an unclear "why," not a slow "how."

**Opportunity cost over ROI.** Learned from Patrick Collison: in a high-leverage situation, stop asking "is this a good use of my time?" and ask "is this the *best* use of my time?" ROI thinking fills your plate with quick wins; opportunity-cost thinking clears it for the one thing that matters.

**Sayable sentence:** *"Kill the project in your head before it kills itself in real life — then spend the saved hours only on leverage."*

---

## 3. Teresa Torres — Outcomes as north star, assumptions tested early

Continuous discovery is a habit, not a phase. The core moves:

Start from a **desired outcome, not an output** — define the change you want in user behavior before exploring solutions, then let multiple solution candidates compete for that outcome. Use an **Opportunity Solution Tree**: outcome at the top, customer opportunities (needs, pains) branching below, solutions mapped to opportunities — so every build traces to a real need.

Torres's central warning: the common failure is interviewing users once at the start, building for months, then showing them the result. The earlier feedback arrives, the cheaper it is to act on. Test your riskiest assumptions first, with the smallest possible experiment — not the whole product.

**Sayable sentence:** *"Outcome at the top of the tree; every feature must trace to a real user pain or it gets cut."*

---

## 4. Lenny Rachitsky — Problem statements, prototypes, and taste

Lenny's most-repeated line: **"Nailing the problem statement is the single most important step in solving any problem. It's deceptively easy to get wrong, and when done well it's a superpower of the best leaders."**

On building: create the smallest possible product that enables user feedback, then improve iteratively — don't over-invest upfront in an untested solution. His analysis of elite PRD templates (Intercom, Asana, Shape Up, his own 1-pager) found two universal elements: **problem before solution** (always separated), and **explicit non-goals** — defining what you will *not* do is as important as defining what you will, because it kills scope creep before it starts.

His "habits of highly effective PMs" that travel well: hold the bar high, and always have a point of view — but loosely held.

The 2025–2026 shift in his ecosystem: **the prototype is replacing the PRD as the primary artifact.** Survey data from his newsletter shows prototyping is now the #2 use of AI by PMs, and PMs increasingly go from idea to working prototype without waiting on design or engineering. The role boundary is dissolving; builders who can also do product thinking are the new center of gravity.

**Sayable sentence:** *"Nail the problem statement, write the non-goals, then build the smallest thing that generates real feedback."*

---

## 5. The AI-era craft consensus (Chennapragada, Butterfield, and the 2026 synthesis)

A synthesis of ~638 practitioner voices across Lenny's ecosystem surfaced a consistent theme: AI raises the bar on judgment rather than lowering it. Aparna Chennapragada (CPO, Microsoft) warns that without editorial judgment and taste at the heart of the process, the result is inevitably "a Frankenstein product" — more prototypes don't automatically produce better products; they raise the threshold at which discernment becomes indispensable. Stewart Butterfield's complementary point: taste is a durable competitive advantage precisely because most people don't invest in it.

Practical translation: generating ten versions is now free; *choosing and cutting* is the scarce skill. Conviction is the fuel; taste is the steering.

**Sayable sentence:** *"AI made building cheap and judgment expensive — taste is the moat."*

---

## 6. Hackathon-specific findings (2026 judging realities)

Current guidance from hackathon organizers and judges converges on a few hard truths:

**Judges probe the gap between demo and build.** The strongest 2026 judging cultures explicitly score whether the underlying agent actually works — line-by-line review that "catches where a clever demo and its underlying build diverge." Trace logs and evaluation frameworks are increasingly what separates winners. Be transparent about what's fully working versus mocked; judges respect honesty and punish discovered fakery.

**Prepare answers for the four questions judges ask in almost every round:** Who is the user? Why is AI necessary here (vs. simpler tech)? What makes your approach different? What tradeoffs did you make to ship on time?

**Rehearse with an outsider.** If someone outside your team can't explain the project back to you after your demo, the story is too abstract.

**Keep a backup path.** Screenshots, seeded data, and a local screen recording in case the live demo fails at the worst moment.

**Judges reward trajectory, not just state.** Good judges ask what a rough prototype *becomes*, not only what it is on submission day — so end your pitch with the credible next step.

**Sayable sentence:** *"Judges score the gap between the demo and the build — close it, name your tradeoffs, and show where it goes next."*

---

## The seven laws (cross-thinker synthesis)

1. **Problem first.** The problem statement is the highest-leverage artifact you'll produce all day. (Rachitsky)
2. **Outcome, not output.** Define the user-behavior change you want before touching code. (Torres, Cagan)
3. **Pre-mortem before you build.** List the top three ways today fails; mitigate the top one immediately. (Doshi)
4. **Non-goals are load-bearing.** Write what you won't build; scope creep is the default failure mode. (Rachitsky, Shape Up)
5. **Leverage only.** Under a clock, everything is LNO — do Overhead sloppily or not at all. (Doshi)
6. **Value AND viability.** A cool demo that solves nothing real is product theater. (Cagan)
7. **Taste is the differentiator.** When everyone can generate, the winner is whoever cuts best. (Chennapragada, Butterfield)

---

*Sources: SVPG (svpg.com), Lenny's Newsletter and Podcast (2022–2026 archive, incl. Cagan and Doshi episodes), Doshi's LNO and pre-mortem frameworks, Torres's Continuous Discovery Habits, Cagan's 2026 "new standard" AI-era talk, Lenny's Newsletter AI productivity survey (Dec 2025), practitioner-voice synthesis (Mar 2026), and 2026 hackathon judging guides (AngelHack, DeepStation, AITEX Summit coverage).*
