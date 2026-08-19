// D26 #4 + D30: the Target view is the RAW disc, not the three-ring target.
// In a RAW-only plot the outer rings are empty by construction — no
// information, 83% of the frame — so the frame crops to the ring the dots
// live in. Readings owns the depth axis (the type crescendo); Target owns
// the category axis. One circle, four quadrants, all signal.
//
// Dots and hairlines only, D22 treatment: no glow, no cards, category as
// muted ink. One dot per committed RAW bubble — the same unit a reading
// derives from (D29). Positions come from the shared polar math in
// canvas/geometry.ts; only the frame is cropped.
//
// Pre-commit bubbles sit at (0,0) until placeInRegion runs on commit, so the
// committed filter is load-bearing: without it a streaming descent renders a
// phantom dot at dead centre.

import { QUADRANTS, RINGS } from '../canvas/geometry';
import type { BubbleMapDoc, Category } from '../types';

// viewBox is 960 units across a 450–620px panel, so 1px visual ≈ 1.8 units.
const HAIRLINE = 2;
const DOT = 16;
// Labels sit in the corners, outside the disc (RINGS.raw.outer = 380) but
// inside the viewBox — they must never collide with a dot.
const LABEL_RADIUS = 435;

const CATEGORIES: Category[] = ['love', 'identity', 'fitness', 'earnings'];

const labelPoint = (category: Category) => {
  const a = (QUADRANTS[category].center * Math.PI) / 180;
  return { x: LABEL_RADIUS * Math.cos(a), y: LABEL_RADIUS * Math.sin(a) };
};

export function Target({ doc }: { doc: BubbleMapDoc }) {
  const raws = doc.bubbles.filter(
    (b) => b.kind === 'idea' && b.tier === 'raw' && b.category && b.status === 'committed',
  );
  const R = RINGS.raw.outer;
  return (
    <div className="target-view">
      <svg viewBox="-480 -480 960 960" role="img" aria-label="Where this song's RAW readings landed, by category">
        <circle r={R} fill="none" stroke="var(--hairline)" strokeWidth={HAIRLINE} />
        <line x1={-R} y1={0} x2={R} y2={0} stroke="var(--hairline)" strokeWidth={HAIRLINE} />
        <line x1={0} y1={-R} x2={0} y2={R} stroke="var(--hairline)" strokeWidth={HAIRLINE} />
        {CATEGORIES.map((c) => {
          const p = labelPoint(c);
          return (
            <text key={c} x={p.x} y={p.y} className="target-label" fill={`var(--ink-${c})`}>
              {c}
            </text>
          );
        })}
        {raws.map((b) => (
          <circle
            key={b.id}
            cx={b.position.x}
            cy={b.position.y}
            r={DOT}
            fill={`var(--ink-${b.category})`}
          />
        ))}
      </svg>
    </div>
  );
}
