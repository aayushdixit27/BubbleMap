// The target, demoted (D20): a small glanceable signature. Dots only, no
// text. D22 treatment: hairline circles, muted category-ink dots, no glow.
// Positions come from the same polar math (geometry.ts) via the doc.
// Twenty of these stacked is the corpus finding (v2).

import { RINGS } from '../canvas/geometry';
import type { BubbleMapDoc } from '../types';

// viewBox is 2000 units across a ~96px panel, so 1px visual ≈ 21 units.
const HAIRLINE = 21;

export function Signature({ doc }: { doc: BubbleMapDoc }) {
  const raws = doc.bubbles.filter((b) => b.tier === 'raw' && b.category);
  return (
    <svg className="signature" viewBox="-1000 -1000 2000 2000" role="img" aria-label="RAW signature">
      {[RINGS.raw.outer, RINGS.real.outer, RINGS.safe.outer].map((r) => (
        <circle key={r} r={r} fill="none" stroke="var(--hairline)" strokeWidth={HAIRLINE} />
      ))}
      <line x1={-960} y1={0} x2={960} y2={0} stroke="var(--hairline)" strokeWidth={HAIRLINE} />
      <line x1={0} y1={-960} x2={0} y2={960} stroke="var(--hairline)" strokeWidth={HAIRLINE} />
      {raws.map((b) => (
        <circle
          key={b.id}
          cx={b.position.x}
          cy={b.position.y}
          r={42}
          fill={`var(--ink-${b.category})`}
        />
      ))}
    </svg>
  );
}
