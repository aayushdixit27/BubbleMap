# BubbleMap — Architecture Spec

**Author:** Opus 5 (architect). **Implementer:** Fable 5.
**Status:** authoritative. If code and this doc disagree, this doc wins until amended.
**Rev 2** — adds the LIFE category axis and replaces horizontal lanes with the target geometry.

---

## 1. What this is

A local, browser-based infinite canvas for mapping a song's meaning along two axes:

- **Depth** — SAFE → REAL → RAW. How honest the idea is.
- **Category** — LIFE: Love, Identity, Fitness, Earnings. What domain of life it's about.

Bubbles hold ideas. Lines hold relationships. AI *proposes* bubbles and lines;
the human *commits* them. The AI never mutates the map directly — every AI output
lands as a reviewable ghost.

The point is to watch an idea get stripped down until it hits the thing that
actually hurts, and to see that descent laid out spatially.

### 1.1 The depth axis

| Tier | Definition | Test |
|---|---|---|
| **SAFE** | The message the song can state out loud. General, defensible, true of many songs. Nobody is exposed by it. | Could be a caption. |
| **REAL** | The specific human situation underneath. Names a concrete want, fear, or failure. Answers *why does this land?* | Could be said to a friend. |
| **RAW** | What the narrator would not admit even to themselves. Unflattering, specific, costly to say. Implicates the speaker. | Could only be said at 3am. |

REAL → RAW is the hard jump and the whole reason the tool exists. The mechanic
that gets you there: ask *what would have to be true for this to be raw?*, surface
every underlying assumption, kill the ones that don't survive, and what remains is
raw. That mechanic is a first-class feature — see `interrogate` in §7.

### 1.2 The category axis (LIFE)

| Category | Covers |
|---|---|
| **Love** | relationships & hobbies |
| **Identity** | culture, sex, age, faith |
| **Fitness** | mind, body & spirit |
| **Earnings** | career, clients, skills |

Source: jun_yuh's LIFE framework, drawn as concentric rings inside four quadrants.
That drawing is the canvas.

### 1.3 Why both axes matter

Depth alone tells you *how* honest a bubble is. Category tells you *what it's about*.
The interesting finding is when they disagree — a breakup song whose SAFE layer is
Love but whose RAW layer is Identity. That's the narrator admitting the song was
never about her, it was about who he thinks he is. **Cross-category descent is the
single most valuable output this tool can produce**, so it gets first-class
rendering (§9.3), not an error message.

---

## 2. Constraints (non-negotiable)

1. Runs in **Chrome**, at `localhost`. Not an Electron app, not a packaged binary.
2. **Local only.** No accounts, no cloud, no subscription, no telemetry.
3. **Human-in-the-loop.** AI output is always a proposal. No silent writes.
4. The human is never the bottleneck: **batch accept** must be one keystroke.
5. Bubbles must be **dragged, edited, deleted, and hand-linked** without AI.
6. Text in bubbles must be **large and legible**. This is a reading tool.

---

## 3. Stack decision

| Layer | Choice | Why |
|---|---|---|
| Canvas | **`@xyflow/react`** (React Flow v12) | Nodes are real DOM, so bubble text is selectable, editable, and styleable with plain CSS. Edges, handles, drag, zoom, minimap built in. Excalidraw/tldraw are drawing tools — they'd fight us on structured node data. |
| Framework | **React 19 + TypeScript + Vite** (latest stable of each) | Fastest local dev loop; the Vite dev server *is* the "Chrome window" delivery mechanism. React Flow v12 peers `react >= 17`, so take the current release. |
| Styling | **Plain CSS + CSS variables** | No Tailwind build step. Category hues and tier intensities live in one `:root` block so they're trivially tunable. |
| State | **Zustand** | React Flow's own examples use it; avoids prop-drilling the doc through the canvas. |
| Server | **Express 5 (Node 22)** on `:8787` | Holds the API key, calls Anthropic, reads/writes map files. ~200 lines. Note Express 5 changed async error handling and removed some v4 middleware — take the current major and write to it, don't pin back to v4. |
| Dev runner | **`tsx`** + **`concurrently`**, both devDeps | Node 22 will not execute `.ts` directly. These two are explicitly blessed exceptions to CLAUDE.md's "prefer 30 lines to a dependency" rule. `npm run dev` = `concurrently "tsx watch server/index.ts" "vite"`. |
| AI SDK | **`@anthropic-ai/sdk`** (server-side only) | Tool-use gives schema-guaranteed JSON proposals. |
| Persistence | **`.json` files** in `./maps/` | Greppable, diffable, git-friendly. No database. |

**Rejected:** Excalidraw (freeform shapes, no structured graph), tldraw (same),
Cytoscape/D3 (canvas-rendered, text editing is painful), Next.js (needless build
complexity for a localhost tool).

### Prior art surveyed
- [React Flow's mind-map tutorial](https://reactflow.dev/learn/tutorials/mind-map-app-with-react-flow) — closest existing pattern; reference for node/edge ergonomics, not a base.
- [learn-thing](https://github.com/aotakeda/learn-thing) — Next.js + React Flow + LLM-generated mind maps. Confirms the approach works. No approval gate, no tier model; we have both.
- [tldraw](https://github.com/tldraw/tldraw) — excellent SDK, wrong shape for structured tiered nodes.

---

## 4. Project layout

```
BubbleMap/
├─ ARCHITECTURE.md        ← this file
├─ BUILD_PROMPT.md        ← kickoff prompts for the implementer
├─ CLAUDE.md              ← repo guardrails, read every session
├─ .env                   ← ANTHROPIC_API_KEY=...   (gitignored)
├─ .env.example
├─ package.json           ← "dev" runs server + client together
├─ maps/                  ← saved maps, one .json per map (gitignored)
├─ server/
│  ├─ index.ts            ← Express app, binds 127.0.0.1
│  ├─ ai.ts               ← Anthropic calls, tool schemas, ref resolution
│  ├─ prompts.ts          ← THE SYSTEM PROMPT (§8). Product surface, not code.
│  └─ storage.ts          ← read/write maps/*.json, atomic writes
└─ src/
   ├─ main.tsx
   ├─ App.tsx             ← layout: toolbar / canvas / inspector
   ├─ store.ts            ← zustand: doc, proposals, selection, undo stack
   ├─ types.ts            ← shared types, imported by server/
   ├─ canvas/
   │  ├─ Canvas.tsx       ← <ReactFlow>, drop-to-reassign
   │  ├─ TargetBackground.tsx  ← the SVG rings + quadrants
   │  ├─ BubbleNode.tsx   ← node renderer (inline-editable)
   │  ├─ LinkEdge.tsx     ← custom edge, kind styling + crossing badge
   │  └─ geometry.ts      ← polar math: regionForPoint(), placeInRegion()
   ├─ panels/
   │  ├─ Toolbar.tsx      ← map picker, AI ops, accept/reject all
   │  └─ Inspector.tsx    ← selected bubble/link detail + rationale
   └─ styles.css
```

---

## 5. Data model

`src/types.ts` — **the server imports these same types.** Single source of truth.

```ts
export type Tier = 'safe' | 'real' | 'raw';
export type Category = 'love' | 'identity' | 'fitness' | 'earnings';

export type LinkKind =
  | 'refines'      // target is a deeper cut of source. The descent spine.
  | 'assumes'      // source only holds if target is true. The interrogation edge.
  | 'contradicts'  // target undercuts source. How assumptions die.
  | 'evidence';    // target is a lyric/moment supporting source.

export type Origin = 'user' | 'ai';
export type Status = 'committed' | 'proposed';

export interface Bubble {
  id: string;                 // nanoid
  kind: 'idea' | 'lyric';     // 'lyric' lives in the outer margin, has no tier
  tier: Tier | null;          // null only when kind === 'lyric'
  category: Category | null;  // null only when kind === 'lyric'
  label: string;              // ≤ 12 words. Renders in the bubble.
  note?: string;              // longer expansion, shown in Inspector.
  position: { x: number; y: number };
  origin: Origin;
  status: Status;
  createdAt: string;          // ISO
}

export interface Link {
  id: string;
  source: string;             // Bubble.id
  target: string;             // Bubble.id
  kind: LinkKind;
  rationale?: string;         // one-sentence "why". Shown in Inspector.
  origin: Origin;
  status: Status;
}

export interface BubbleMapDoc {
  version: 2;
  id: string;
  title: string;              // e.g. "Mr. Brightside — The Killers"
  subject: 'song' | 'self';   // v1 always 'song'; swaps the prompt variant
  source?: string;            // free text: lyrics, notes, your analysis
  bubbles: Bubble[];
  links: Link[];
  createdAt: string;
  updatedAt: string;
}
```

**Invariants** — enforce in the store, assert in tests:

- No link may reference a missing bubble id. No self-links.
- No duplicate `(source, target, kind)` triple.
- `kind: 'idea'` ⟹ `tier` and `category` are both non-null. `kind: 'lyric'` ⟹ both null.
- A `refines` link must go strictly **deeper**: `safe→real`, `real→raw`, or `safe→raw`. Reject upward. `refines` **may** change category — that's §1.3, not a violation.
- Only `evidence` links may target a `lyric` bubble, and a lyric bubble is never a link source.
- `proposed` items never persist. Saving strips them.

`version: 2` is the first shipped version. There is no v1 on disk; if a loader
ever sees `version: 1`, fail loudly rather than guessing a migration.

---

## 6. Geometry — the target

The canvas is jun_yuh's drawing: four quadrants, three concentric rings. **RAW is
the bullseye.** Descent means moving inward.

Origin `(0,0)` is the center of the target. Screen coordinates, so **+y is down**.

```ts
// canvas/geometry.ts

export const RINGS = {
  raw:  { inner: 0,   outer: 380 },
  real: { inner: 420, outer: 640 },
  safe: { inner: 680, outer: 920 },
} as const;

export const LYRIC_MARGIN = 1000;          // lyric bubbles live beyond this

// Quadrant center angles in degrees, clockwise from +x, y-down screen space.
// Matches the notebook: Love top-left, Identity top-right,
//                       Fitness bottom-left, Earnings bottom-right.
export const QUADRANTS = {
  love:     { center: 225, hue: 340 },   // up-left
  identity: { center: 315, hue: 275 },   // up-right
  fitness:  { center: 135, hue: 150 },   // down-left
  earnings: { center:  45, hue:  42 },   // down-right
} as const;

export const WEDGE = 90;        // degrees per quadrant
export const GUTTER = 7;        // degrees of dead space either side of an axis
```

### 6.1 Coordinate convention — read this before writing a line of geometry

**Every function in `geometry.ts` takes and returns the bubble's CENTER point in
canvas space.** React Flow's `node.position` is the **top-left corner**, so the
canvas layer converts at both boundaries:

```ts
toCenter(pos, measured) → { x: pos.x + measured.width / 2,  y: pos.y + measured.height / 2 }
toTopLeft(ctr, measured) → { x: ctr.x - measured.width / 2, y: ctr.y - measured.height / 2 }
```

Use React Flow v12's `node.measured.{width,height}` (populated after first render;
fall back to 236×92 if undefined). `Bubble.position` in the persisted doc stores the
**center**, so maps survive font and padding changes. Getting this wrong produces a
uniform ~(-118, -46) offset that misclassifies every drop near a boundary and is
invisible until it's expensive — this is the sign error Phase 2's tests exist to catch.

### 6.2 The three geometry functions

```ts
// Strict lookup. Returns null for dead zones and for anything outside the target.
regionForPoint(c: Point): { category: Category; tier: Tier } | null

// Total function. Never returns null: snaps dead zones and out-of-bounds points
// to the nearest valid region. This is what drag-end calls.
assignRegion(c: Point): { category: Category; tier: Tier }

// Where should a bubble go? Spreads along the wedge arc, avoiding overlap with
// siblings already in that region. Returns a CENTER point.
placeInRegion(category, tier, existing: Bubble[]): Point
```

`assignRegion` is `regionForPoint` plus a fallback; both get their own tests.

Dead zones and snapping:

- Ring gaps (380–420, 640–680) and the ±7° bands around each axis are dead zones.
- `r > RINGS.safe.outer` — including beyond `LYRIC_MARGIN` — snaps **back into the
  SAFE ring**. Dragging an idea bubble outward never converts it to a lyric.
  `kind` is set at creation and is never changed by dragging.
- `lyric` bubbles are created explicitly as lyrics, live beyond `LYRIC_MARGIN`, and
  are exempt from `assignRegion` entirely — they keep `tier: null, category: null`
  wherever you drop them. Dragging one inward does not give it a tier.
- A drag never fails or snaps back to origin. `assignRegion` always yields a home.

Interaction:

- On drag-end, `assignRegion(toCenter(...))` recomputes `category` and `tier`.
  **Dragging is how you retier and recategorize.**
- The Inspector's tier and category selects are **authoritative over position**:
  changing either re-runs `placeInRegion` and moves the node into the new region.
  Position never disagrees with the fields.

Capacity, honestly: a RAW quadrant is ~113,000px² and a bubble is ~236×92px, so
each RAW wedge holds **2–3 bubbles** comfortably. That is the intended ceiling, not
a limitation — if you need five RAW bubbles in one quadrant, the map is padded.
`placeInRegion` for RAW biases toward the wedge's outer edge to keep the very
center clear.

### 6.3 Rendering the background

Render `TargetBackground` as a **custom React Flow node** of type `targetBg` at
position `(-1100, -1100)`, `draggable: false`, `selectable: false`, `zIndex: -1`,
containing a 2200×2200 SVG. This transforms correctly with pan and zoom, which a
CSS-only background does not.

Three things this node will break unless you handle them explicitly:

1. **`pointer-events`.** React Flow's base rule is `.react-flow__node { pointer-events: all }`,
   and `draggable: false` does **not** clear it. A 2200px node under the cursor
   everywhere swallows `onPaneClick`, the selection box, and quadrant focus. Set
   `pointer-events: none` on the node's own root element, not just on the labels.
2. **`zoomOnDoubleClick` defaults to `true`** and will fight both §6.4 quadrant
   focus and §9.2 double-click-to-edit. Pass `zoomOnDoubleClick={false}`.
   React Flow v12 has no `onPaneDoubleClick` prop — hand-roll it on the pane element.
3. **The minimap.** Exclude `targetBg` from minimap bounds or it dominates them and
   every real bubble collapses to a dot.

The SVG draws: three ring outlines, two axis lines through the center, and the
four category names in the outer margin at the notebook's positions — large,
`--text-dim`, `pointer-events: none`. Ring labels (SAFE / REAL / RAW) sit along
the upper-left diagonal, rotated to follow the arc, exactly like the drawing.

### 6.4 Quadrant focus, and the zoom/legibility trade

The full target is 1840px across. In a ~1300px viewport that fits at **~0.65 zoom**,
where a 15px label renders at ~10px — too small to read. So:

- **The default landing view is one quadrant, not the whole target** (`fitView` on
  the active quadrant's bounds, ~1.0 zoom). This is the working view.
- Double-clicking empty space inside a quadrant focuses it. `0` or Esc zooms out to
  the **overview** — the whole target, ~0.65. Overview is for orientation and for
  spotting cross-category edges, not for reading.
- Below **0.55 zoom**, bubbles drop their `note` preview and shrink padding to
  `8px 10px`. They **never** truncate or ellipsize the label — Constraint 6 is
  absolute. A bubble may get taller as it gets narrower; that's fine.
- Edge labels render only above 0.7 zoom (§9.3).

---

## 7. AI operations

> **Superseded in part — see DECISIONS D15–D18, D23, D25.** What still holds
> below: proposals-only, the one-tool schema shape, ref resolution, §7.2
> routing, and §7.3. What changed:
> - `relink` is **cut** (D15). Three verbs, not four.
> - Counts are **schema-enforced**, not prose: seed exactly 3 SAFE + 3 REAL
>   (split validated server-side), `descend` exactly **one** bubble one tier
>   deeper, `interrogate` max 3 (D16, D18, D25).
> - Every bubble carries a required **`sourceLine`**, validated against
>   `doc.source`; non-occurring lines are rejected (D23).
> - **The verb chain is automatic** (D25): seed returns → `descend` fires on
>   all three REAL bubbles in parallel, no human gate between verbs. The
>   human judgment moved to the end of the chain and its unit is the
>   **descent** — keep/kill an entire SAFE → REAL → RAW path, one decision
>   per descent. `descend` and `interrogate` as user-triggered verbs are gone
>   from the flow; `interrogate` remains server-side, unwired.

Four verbs. Every one returns **proposals only**.

| Verb | Trigger | Input | Returns |
|---|---|---|---|
| `seed` | "New map from analysis" | `doc.source` | 4–6 SAFE bubbles spread across whichever LIFE categories the song actually touches, 2–3 REAL, `refines` links between them |
| `descend` | Select a bubble → **D** | focus bubble + its ancestor chain + `doc.source` | 2–3 bubbles one tier deeper + `refines` links from the focus. May change category. |
| `interrogate` | Select a bubble → **I** | focus bubble + **all committed bubbles on the map** + `doc.source` | 3–5 `assumes` bubbles — *what would have to be true for this to hold?* — plus `contradicts` links to existing bubbles that would kill an assumption |
| `relink` | Toolbar → "Find links" | whole map, bubbles only | `Link` proposals between **existing** bubbles only. Creates no new bubbles. Each carries a `rationale`. |

- `descend` on a RAW bubble is disabled.
- `interrogate` works at every tier — it's the engine that manufactures REAL → RAW.
- Every proposed bubble must carry an explicit `category`. The model does not get
  to inherit it silently from the parent; making it choose is what surfaces §1.3
  crossings.

### 7.1 Reliability

Use **tool use with a strict `input_schema`**, not free-text JSON parsing. One tool:

```ts
{
  name: 'propose',
  input_schema: {
    type: 'object',
    properties: {
      bubbles: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            ref:      { type: 'string' },                    // "n1", "n2" — temp id
            tier:     { enum: ['safe', 'real', 'raw'] },
            category: { enum: ['love','identity','fitness','earnings'] },
            label:    { type: 'string' },
            note:     { type: 'string' },
          },
          required: ['ref', 'tier', 'category', 'label'],
        },
      },
      links: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            source:    { type: 'string' },  // a ref from above, OR an existing Bubble.id
            target:    { type: 'string' },
            kind:      { enum: ['refines','assumes','contradicts','evidence'] },
            rationale: { type: 'string' },
          },
          required: ['source', 'target', 'kind'],
        },
      },
    },
    required: ['bubbles', 'links'],
  },
}
```

The server resolves refs to nanoids, then validates every link against §5's
invariants. Reject invalid links — but **`console.warn` each rejection with the
raw model output**. Silent dropping hides prompt regressions, which are the
failure mode that matters here.

### 7.2 Model routing

Server-side, in `.env`:

```
ANTHROPIC_API_KEY=sk-ant-...
BUBBLEMAP_MODEL=claude-opus-5
```

Do **not** hardcode the model string anywhere but `server/ai.ts`. This is the app's
runtime model and is unrelated to whichever model writes the code.

### 7.3 Rawness and accuracy are different axes

The accept/reject gate tests whether a proposal is **raw**. Nothing in this design
tests whether it is **true of the song**. A bubble can be perfectly
self-implicating, land in the right quadrant, read beautifully — and be about a
lyric that isn't in the song, or attribute to the narrator a situation the song
never describes.

This is the same blind spot cold review has (`reference/COLD-REVIEW.md`): a
confident, internally consistent, well-formed falsehood passes every check we
wrote, because every check we wrote is about form and honesty rather than fact.
Fluent prose *about* a song and a correct reading *of* one are nearly
indistinguishable on a fast read, and the fast read is exactly what `Shift+A`
encourages.

Accepted for v1, with two partial defences:

- **`doc.source` is the ground truth.** Prompts operate on the text you pasted, so
  the model is grounded rather than recalling. Paste actual lyrics when you have them.
- **`evidence` links are the audit trail.** When a RAW bubble surprises you, ask for
  the line that supports it. If nothing in `source` supports it, it's invention —
  reject it however good it sounds.

Not solved, deliberately: there is no automated fact pass. If maps start containing
confident fiction, that's a v2 verb (`ground`) and an architect decision — not
something to patch into the accept flow.

---

## 8. The system prompt

This is the product. `server/prompts.ts` ships this **verbatim**. Do not paraphrase,
compress, or "improve" it during implementation. Changes are a product decision,
not a refactor.

```
You map the emotional architecture of songs along two axes.

DEPTH — how honest the idea is.

  SAFE — the message the song can state out loud. What it would say on a poster.
    Defensible, general, true of many songs. Nobody is exposed by it.

  REAL — the specific human situation underneath. Names a concrete want, fear,
    or failure. Answers "why does this actually land?" Still presentable.

  RAW — the thing the narrator would not admit even to themselves. Unflattering,
    specific, and it costs the speaker something to say. If it does not
    implicate the narrator, it is not raw yet.

  Tests:
    If the line could be a caption, it is SAFE.
    If it could be said to a friend, it is REAL.
    If it could only be said at 3am, it is RAW.

CATEGORY — what domain of life the idea belongs to.

  LOVE      relationships and hobbies. Wanting, being wanted, being left.
  IDENTITY  culture, sex, age, faith. Who the narrator believes he is.
  FITNESS   mind, body and spirit. Capacity, discipline, decay, sanity.
  EARNINGS  career, clients, skills. Status, work, being good at something.

Assign a category to every bubble by asking what the idea is ABOUT, not what
the song's genre suggests. Do not default to LOVE because it is a song.

Rules:
- Descent is not paraphrase. Each step must add information that could be wrong.
  Never restate the parent tier with stronger adjectives.
- Prefer the specific over the profound. "I want him to see me winning" beats
  "the human need for validation."
- Descent may change category, and often should. A song whose SAFE layer is
  LOVE frequently has a RAW layer in IDENTITY — the narrator was never really
  talking about her. When the honest deeper reading sits in a different
  category, put it there and say why in the link rationale. Do not force a
  descent to stay in its parent's category.
- Stay inside the narrator's point of view. Do not moralize, diagnose, or
  explain the song to an outsider.
- RAW is not shock. Cruelty and confession are different things. The test is
  self-implication, not intensity.
- Labels are at most 12 words, no trailing punctuation, no quotation marks.
  The note field carries any elaboration.
- When you cannot get deeper honestly, return fewer bubbles. Padding is failure.

Link kinds:
  refines     — the target is a deeper cut of the source.
  assumes     — the source only holds if the target is true.
  contradicts — the target undercuts the source.
  evidence    — the target is a specific lyric or moment supporting the source.
```

Per-verb instructions are appended to this base. `interrogate` appends:

```
List what would have to be true for the focus bubble to hold. Surface the
load-bearing assumptions, including the ones the narrator would rather not
examine. Each assumption is a bubble linked back with kind "assumes". If an
existing bubble on the map would kill one of these assumptions, add a
"contradicts" link. Assumptions that survive scrutiny are the path to RAW.
```

`descend` appends:

```
Go exactly one tier deeper than the focus bubble. Before choosing a category
for each new bubble, ask whether the deeper reading is still about the same
domain of life. If it is not, move it.
```

---

## 9. Rendering

> **Superseded entirely — see DECISIONS D22.** The editorial treatment replaced
> everything below: paper `#f6f3ec` and ink, tier as typography (SAFE grey sans →
> RAW large serif), category as small-caps marginalia in muted inks, hairline
> rules, nothing a card, no dark mode. The tokens and rules in this section are
> the pre-D22 design, kept as the record. Current truth is `src/styles.css`.

### 9.1 Color

Category is **hue**. Tier is **intensity**. The center of the target is the most
vivid part of the canvas — descent means the map gets hotter.

```css
:root {
  --bg:         #0d0f14;
  --text:       #f2f4f8;
  --text-dim:   #8b93a3;
  --contradict: #e05a63;   /* the only non-hue-derived accent */

  /* category hues */
  --h-love:     340;   /* rose   */
  --h-identity: 275;   /* violet */
  --h-fitness:  150;   /* green  */
  --h-earnings:  42;   /* gold   */
}

/* tier tokens, applied via .tier-safe / .tier-real / .tier-raw on the node */
.tier-safe { --sat: 32%; --lum: 56%; --border-a: 0.50; --fill-a: 0.07; --glow: none; }
.tier-real { --sat: 60%; --lum: 60%; --border-a: 0.78; --fill-a: 0.13; --glow: none; }
.tier-raw  { --sat: 88%; --lum: 64%; --border-a: 1.00; --fill-a: 0.20;
             --glow: 0 0 22px hsl(var(--h) var(--sat) var(--lum) / 0.28); }
```

A node sets `--h` from its category, then colors itself
`hsl(var(--h) var(--sat) var(--lum) / …)` for border, fill, and glow. Four hues ×
three tiers = twelve looks from two small token sets.

Ring backgrounds are near-neutral (`#141b26` outer → `#1a1216` core) so the bubbles
carry all the color.

### 9.2 Bubbles

- Rounded rect, `border-radius: 18px`, 2px border, low-alpha fill of the same hue.
- Label: **15px, 600 weight, `--text`**, `line-height: 1.35`, max-width 200px, wraps.
- Padding `14px 18px`. Nominal node ≈ 236×92px. Auto-sizes to content —
  **never clip or ellipsize a label**, at any zoom level.
- Double-click to edit inline. Enter commits, Esc cancels, Shift+Enter newline.
- Selected: 2px outer glow in the node's hue.
- `kind: 'lyric'` bubbles render differently: no fill, left border only, italic,
  `--text-dim`. They read as margin annotations, not ideas.

Handles on all four sides — descent is radial, so edges come from any direction.

### 9.3 Edges

- `refines` — solid 2px, colored by the **source**'s hue.
- `assumes` — dotted, `--text-dim`.
- `contradicts` — solid `--contradict` with a small ✕ marker mid-edge.
- `evidence` — thin solid `--text-dim`.
- **Cross-category `refines`** (source and target categories differ): 3px, rendered
  as a gradient from the source hue to the target hue, plus a small pill label at
  the midpoint reading e.g. `LOVE → IDENTITY`. The Inspector calls it out
  explicitly. These are the findings; make them impossible to miss.
- Straight or gently-curved edges, not steep beziers — everything points roughly
  at the center, and bezier control points fight radial layouts.
- Edge labels only render above 0.7 zoom.

---

## 10. Proposal review UX

Ghosts:
- Proposed bubbles: dashed 2px border, `opacity: 0.55`, `--sat` halved.
- Proposed edges: dashed with animated dash-offset.
- ✓ / ✗ chip on hover or when selected.
- Selecting a proposal shows its `rationale` and `note` in the Inspector.

Controls:
- `A` accept selected · `X` reject selected
- `Shift+A` **accept all** · `Shift+X` reject all — also buttons in the toolbar
- `Cmd+Z` undo, with a bulk accept undoing as **one** step

Accepting flips `status` to `committed` and marks the doc dirty. Autosave 800ms
after the last change. New proposals arriving while others are pending append —
never clobber.

---

## 11. Server API

All under `/api`, proxied by Vite so the browser sees same-origin.

```
GET    /api/health            → { ok: true, model: string }   ← Phase 1 deliverable

GET    /api/maps              → [{ id, title, updatedAt }]
POST   /api/maps              → { title, subject } → BubbleMapDoc
GET    /api/maps/:id          → BubbleMapDoc
PUT    /api/maps/:id          → BubbleMapDoc (strips proposed) → { ok, updatedAt }
DELETE /api/maps/:id          → { ok }

POST   /api/ai/seed           → { doc }            → { bubbles, links }
POST   /api/ai/descend        → { doc, focusId }   → { bubbles, links }
POST   /api/ai/interrogate    → { doc, focusId }   → { bubbles, links }
POST   /api/ai/relink         → { doc }            → { bubbles: [], links }
```

- Atomic writes: write `maps/.tmp-<id>.json`, then rename.
- Filenames `maps/<slug>-<id>.json`; `id` is the nanoid, slug derived from title.
- **Bind to `127.0.0.1` only. Never `0.0.0.0`.**
- AI routes: 60s timeout; return `{ error: string }` with a real status code on
  failure. The UI surfaces it in a toast — never a silent no-op.

---

## 12. Build order

> **Superseded in part — see DECISIONS D43.** Phases 0–2 below are the record of
> what happened and stand. **Phases 3–5 are superseded**: they were written
> before the tool existed, and six songs of use invalidated most of them —
> Phase 3's authoring features have never been wanted; Phase 4 is cut (`relink`,
> D15), shipped (cross-category), or unmissed (`interrogate` UI); Phase 5
> survives as a posture, not a phase. Phases are retired as a planning device —
> the queue is use-discovered now. Kept, not deleted: this is the record of what
> was planned versus what use actually asked for.

**Read PRODUCT.md §4 before this section.** The ordering below is driven by the
pre-mortem, not by engineering convenience. The riskiest assumption — *can the
prompt actually reach RAW?* — is tested first, in a terminal, with no UI. Building
the canvas first would be the comfortable order and the wrong one.

Each phase is a hard stop: get it working, commit, report back to the architect
before starting the next.

### Phase 0 — Prompt probe. No UI. **Gate for everything else.**

A single CLI script that runs **all four verbs, end to end**, per song:

1. `seed` — produces SAFE and REAL
2. `descend` on every REAL bubble → RAW
3. `interrogate` on every REAL bubble → assumption bubbles and contradiction links
4. `relink` once over the finished map

No React, no Vite, no canvas, no persistence.

**The full chain is the point, and `interrogate` is not optional.** §1.1 names
interrogation — *what would have to be true for this to be raw?* — as the mechanic
that produces RAW. A probe that runs only `seed` cannot reach RAW at all (seed stops
at REAL by contract). A probe that runs `seed` + `descend` tests a mechanism the
product doesn't claim is the important one. Both are half-tests, and analysing a
half-test's output is worse than not running it, because it produces numbers that
feel like findings. See PRODUCT §4 #5.

`relink` earns its place here for a different reason: Phase 0 is the last cheap
place to discover a broken verb. After this, every bug costs UI work to reproduce.

**Paste real lyrics into `doc.source`.** RAW lives in specifics, and specifics are
exactly where an ungrounded model invents. A title-only run will hand you confident
fabrications that read better than true readings. Lyrics are human-supplied — do not
have the implementer fetch them.

Run **all six songs**, chosen to include at least two you'd expect not to be LOVE.
The full chain on six songs is on the order of ten dollars; running fewer to save
that reintroduces the "should we have run more" question permanently. Read the
output as a human and judge two things:

1. **Does RAW clear the bar?** Does it implicate the narrator, or is it REAL with
   stronger adjectives? PRODUCT.md §4 #1.
2. **Does category spread?** If all six songs come back 100% LOVE, the second axis
   is decoration and the target geometry is the wrong canvas. PRODUCT.md §4 #2.

Iterate §8 until both pass. **This is the highest-leverage work in the project and
it costs one file.** If it can't pass here, stop and escalate — do not build a
canvas around a prompt that doesn't work.

### Phase 1 — Walking skeleton

Vite + React + TS, Express on 8787, Vite proxy, `/api/health` green. `geometry.ts`
with full unit tests for `regionForPoint`, `assignRegion`, `toCenter`/`toTopLeft`,
and `placeInRegion`. `TargetBackground` and `BubbleNode` render a **hardcoded map
pasted from Phase 0's output**, laid out correctly on the target. Drag-to-reassign
works. Pan and zoom work.

Done when: a real Phase 0 result is on screen, in the right rings and quadrants,
and dragging a bubble across a ring boundary recolors it.

### Phase 2 — The loop. **First usable version.**

`seed` + `descend` wired through the server. Ghost rendering, accept/reject single,
`Shift+A` accept all, autosave to `maps/*.json`, maps list, create/open.

Done when: **you can map a song you've never mapped before, start to finish,
in under ten minutes.** Time it. That number is a requirement (PRODUCT.md §4 #4),
not an aspiration. Report the actual time back.

### Phase 3 — Authoring

Inline text editing, add/delete bubbles by hand, hand-drawn links with a kind
picker, the Inspector, quadrant focus. The map stops being read-only.

### Phase 4 — Depth

`interrogate` + `relink`. Contradiction edges. **Cross-category `refines`
rendering (§9.3)** — gradient stroke and the `LOVE → IDENTITY` pill. Undo,
including bulk accept as a single step.

### Phase 5 — Cut list

Only what survived actual use. Candidates, all Overhead per PRODUCT.md §6:
keyboard shortcuts, toasts, minimap, lyric bubbles, PNG/SVG export, empty states.
Expect to cut most of this. Shipping none of it is an acceptable outcome.

---

**Acceptance test for v1:** map a song you have never mapped, alone, in under ten
minutes, and end with a RAW core containing something you would not say out loud
and at least one descent that crosses categories.

If the RAW core reads like a stronger-worded SAFE ring, **the prompt is wrong, not
the code.** Stop and bring it back to the architect. Do not fix it in the UI.

---

## 13. Out of scope (v1)

Multiplayer. Auth. Mobile. Rich text editing. Multiple maps open at once. Lyrics
fetching from any API. Audio playback. `subject: 'self'` prompt variants — the
field exists in the model, the prompt variant comes later. Anything with a login
screen.
