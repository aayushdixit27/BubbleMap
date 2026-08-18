# src/canvas/ — CLAUDE.md

Read **ARCHITECTURE §6** (geometry, coordinates, background, quadrant focus) and
**§9** (colour, bubbles, edges) before changing anything here. Constants live in
§6 and in `geometry.ts` — never duplicate them into another file.

## The mistake this folder exists to prevent

**All geometry works in bubble-CENTRE coordinates. React Flow's `node.position`
is the TOP-LEFT corner.** Convert at every boundary with `toCenter` / `toTopLeft`.

Getting this wrong produces a uniform ~(-118, -46) offset that misclassifies every
drop near a ring or axis boundary, looks fine in casual use, and is invisible until
it's expensive. This is what the tests are for. Write them first.

## Non-obvious things that will bite

- **`regionForPoint` and `assignRegion` are different functions.** The first is
  strict and returns `null` for dead zones. The second never returns `null` — it
  snaps. Drag-end calls `assignRegion`. Both get tested.
- **The `targetBg` node swallows every click** unless you set `pointer-events: none`
  on its root. `draggable: false` does *not* clear React Flow's base
  `.react-flow__node { pointer-events: all }`.
- **`zoomOnDoubleClick` defaults to `true`** and fights both quadrant focus and
  double-click-to-edit. Pass `zoomOnDoubleClick={false}`.
- **React Flow v12 has no `onPaneDoubleClick`.** Hand-roll it.
- **Exclude `targetBg` from minimap bounds** or every real bubble collapses to a dot.
- **`node.measured.{width,height}` is undefined on first render.** Fall back to 236×92.
- **Lyric bubbles are exempt from `assignRegion`** — they keep `tier: null,
  category: null` wherever they're dropped. Dragging one inward does not give it a
  tier, and dragging an idea bubble outward never converts it to a lyric.
- **Inspector selects are authoritative over position.** Changing tier or category
  there re-runs `placeInRegion` and moves the node. Position never disagrees with
  the fields.

## Rendering rules that are product decisions, not style

- **Never clip or ellipsize a label**, at any zoom. Below 0.55 zoom, drop the note
  preview and shrink padding — never truncate. A bubble may get taller; that's fine.
- Category is **hue**, tier is **saturation**. The centre of the target is the most
  vivid part of the canvas. Descent means the map gets hotter.
- Cross-category `refines` edges get the gradient stroke and the `LOVE → IDENTITY`
  pill (§9.3). These are the findings — make them impossible to miss.
