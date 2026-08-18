// The target, demoted (D20): a small glanceable signature. Dots only, no
// text — where the RAW bubbles landed by category. Same polar math as ever:
// positions come from geometry.ts via the doc, just drawn as dots instead of
// nodes. Twenty of these stacked is the corpus finding (v2).

import { QUADRANTS, RINGS } from '../canvas/geometry';
import type { BubbleMapDoc } from '../types';

export function Signature({ doc }: { doc: BubbleMapDoc }) {
  const raws = doc.bubbles.filter((b) => b.tier === 'raw' && b.category);
  return (
    <svg className="signature" viewBox="-1000 -1000 2000 2000" role="img" aria-label="RAW signature">
      {[RINGS.raw.outer, RINGS.real.outer, RINGS.safe.outer].map((r) => (
        <circle key={r} r={r} fill="none" stroke="#252c3b" strokeWidth={14} />
      ))}
      <line x1={-960} y1={0} x2={960} y2={0} stroke="#252c3b" strokeWidth={14} />
      <line x1={0} y1={-960} x2={0} y2={960} stroke="#252c3b" strokeWidth={14} />
      {raws.map((b) => (
        <circle
          key={b.id}
          cx={b.position.x}
          cy={b.position.y}
          r={34}
          fill={`hsl(${QUADRANTS[b.category!].hue} 82% 62%)`}
          opacity={0.92}
        />
      ))}
    </svg>
  );
}
