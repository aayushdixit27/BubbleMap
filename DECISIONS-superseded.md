# DECISIONS — superseded

**Do not read this at session start.** Nothing here is live.

It exists for one reason: so that a decision that was made, tried, and replaced
cannot be quietly reintroduced by someone who never knew it had been tried. If you
find yourself about to propose something that sounds like one of these, read that
entry first — the reason it died is usually still true.

Each entry keeps its original wording and carries a pointer to what replaced it.

---

**D1 — Canvas library: React Flow v12.**
→ *Superseded by D21.* React Flow and the canvas components were deleted; a CSS grid
and a static SVG need neither.

> React Flow v12 (`@xyflow/react`), not tldraw or Excalidraw. Nodes must be real DOM
> so bubble text stays selectable and editable. *17 Aug.*

**Why it doesn't come back:** the layout is a grid, not a node canvas. Reintroducing
React Flow means reintroducing the overlap problem D20 solved structurally.

---

**D12 — The 27-RAW count was a probe artefact, not a geometry failure.**
→ *Superseded by D20.* The geometry it was defending no longer holds content; the
target renders dots only.

> The probe auto-accepts every proposal as a stand-in for the human accept step, so
> its output is the **unfiltered firehose**. At PRODUCT §2's expected keep-rate that's
> ~12 accepted RAW per song, which is what the rings were specced for. Do not resize
> the geometry on the strength of pre-filter counts. *18 Aug.*

**What survives:** the underlying caution is still sound — never resize anything on
counts taken before the human filter runs.

---

**D13 — Build the target canvas. Columns are rejected.**
→ *Superseded by D20*, decided from JSON without having seen it rendered.

> One song produced 60+ links, `contradicts` edges running sideways and upward, and
> 17 of 38 bubbles crossing category. A three-column layout cannot render any of it,
> and the contradiction mechanic — an assumption visibly killed by another bubble —
> is the product working. *18 Aug.*

**Why it doesn't come back:** the target inverts space against content. RAW sits at
the centre, the smallest region, and RAW is where all the reading happens. This was
decided on reasoning and reversed on a screenshot.

---

**D18 — The map is a spine, not a bush.**
→ *Judgment model superseded by D24 → D25 → D26. The spine principle survives; the
3-candidates-keep-1 mechanic does not.*

> - `seed` → 3 SAFE + 3 REAL
> - `descend` → 3 RAW *candidates* for one REAL bubble; human keeps **one**
> - `interrogate` → on-demand only, max 3
> - Target map: ~9 bubbles.
>
> **Process note.** The architect treated "how many RAW bubbles" as a measurement
> question when it was a display question, and should have asked what 27 looks like on
> a four-quadrant target *before* running anything. Bubble counts are a design
> constraint, not an outcome to be observed. *18 Aug.*

**What survives:** the process note, permanently. And the spine instinct — though D26
raised the ceiling to 10 descents because they now arrive one at a time.

**Live tripwire:** D25 traded candidate-choice for descent-choice. If three songs pass
where every descent is kept, the choice is missing and 3-candidates returns.

---

**D19 — Notes are read by expanding the bubble in place on select.**
→ *Absorbed by D21.* Expansion happens at the row, not the bubble.

> Default bubble shows label + first sentence; selecting grows it in place to the full
> note, raised above siblings. Rejected: full notes always visible at quadrant zoom
> (becomes a wall of overlapping text), and a fixed reading rail (pulls the eye off
> the map). *18 Aug.*

**What survives:** both rejections. A wall of always-on notes and a fixed side rail
were tried on paper and both fail for reasons that haven't changed.

---

**D24 — The accept/reject loop, per bubble.**
→ *Superseded by D25 (unit became the descent) and D26 (default became keep).*

> 1. `seed` streams 3 SAFE + 3 REAL as ghosts. 2. Human keeps or kills each.
> 3. For each kept REAL, `descend` proposes 3 RAW candidates; human picks one.
> 4. `interrogate` on demand. ~15 proposed, ~9 committed. *18 Aug.*

**Why it doesn't come back:** it put RAW — the entire product — behind nine-plus
clicks. The user saw a map with an empty RAW column and read it as a broken app.

**What survives:** `rejected: Bubble[]` in the map file. Killed content is retained
but never rendered; across songs the rejection set is its own signal.
