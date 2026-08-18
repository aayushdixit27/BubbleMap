// The target drawing (§6.3): a custom React Flow node holding a 2200×2200 SVG
// so it pans and zooms with the graph. pointer-events: none on the root, or
// this node swallows every click on the pane.

import { memo } from 'react';
import { QUADRANTS, RINGS } from './geometry';

const polar = (angleDeg: number, r: number) => ({
  x: r * Math.cos((angleDeg * Math.PI) / 180),
  y: r * Math.sin((angleDeg * Math.PI) / 180),
});

const CATEGORY_LABELS = (Object.keys(QUADRANTS) as (keyof typeof QUADRANTS)[]).map((category) => {
  const { center, hue } = QUADRANTS[category];
  const p = polar(center, 1000);
  return { category, hue, ...p };
});

const RING_LABELS = (Object.keys(RINGS) as (keyof typeof RINGS)[]).map((tier) => {
  const r = (RINGS[tier].inner + RINGS[tier].outer) / 2;
  const p = polar(225, r); // upper-left diagonal, like the drawing
  return { tier, r, ...p };
});

function TargetBackgroundNode() {
  return (
    <div style={{ pointerEvents: 'none', width: 2200, height: 2200 }}>
      <svg width="2200" height="2200" viewBox="-1100 -1100 2200 2200">
        {/* ring bands, near-neutral: outer #141b26 → core #1a1216 (§9.1) */}
        <circle r={RINGS.safe.outer} fill="#141b26" />
        <circle r={RINGS.safe.inner} fill="var(--bg)" />
        <circle r={RINGS.real.outer} fill="#171722" />
        <circle r={RINGS.real.inner} fill="var(--bg)" />
        <circle r={RINGS.raw.outer} fill="#1a1216" />

        {/* ring outlines */}
        {[RINGS.raw.outer, RINGS.real.inner, RINGS.real.outer, RINGS.safe.inner, RINGS.safe.outer].map(
          (r) => (
            <circle key={r} r={r} fill="none" stroke="#2a3040" strokeWidth={1.5} />
          ),
        )}

        {/* the two axes */}
        <line x1={-1040} y1={0} x2={1040} y2={0} stroke="#2a3040" strokeWidth={1.5} />
        <line x1={0} y1={-1040} x2={0} y2={1040} stroke="#2a3040" strokeWidth={1.5} />

        {/* category names in the outer margin, notebook positions */}
        {CATEGORY_LABELS.map(({ category, hue, x, y }) => (
          <text
            key={category}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={`hsl(${hue} 30% 55% / 0.8)`}
            fontSize={44}
            fontWeight={700}
            letterSpacing={6}
            style={{ textTransform: 'uppercase' }}
          >
            {category.toUpperCase()}
          </text>
        ))}

        {/* SAFE / REAL / RAW along the upper-left diagonal, following the arc */}
        {RING_LABELS.map(({ tier, x, y }) => (
          <text
            key={tier}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="var(--text-dim)"
            fontSize={26}
            fontWeight={600}
            letterSpacing={4}
            transform={`rotate(-45 ${x} ${y})`}
          >
            {tier.toUpperCase()}
          </text>
        ))}
      </svg>
    </div>
  );
}

export const TargetBackground = memo(TargetBackgroundNode);
