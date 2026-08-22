// The target, demoted (D20): a small glanceable signature. Dots only, no
// text. D22 treatment: hairline circles, muted category-ink dots, no glow.
// Positions come from the same polar math (geometry.ts) via the doc.
//
// D56: the signature plots all three tiers with a faint path per descent —
// the surface scatters, the raw converges, at header scale. RAW dots carry
// the weight; SAFE/REAL are context.
//
// The committed filter is load-bearing (same as the Target's): a proposed
// bubble sits at (0,0) until placeInRegion runs on commit, so an unfiltered
// mid-run signature stacks every pending dot into a phantom at dead centre.

import { RINGS } from '../canvas/geometry';
import { pathPoints } from '../target/lineage';
import type { BubbleMapDoc } from '../types';

// viewBox is 2000 units across a ~96px panel, so 1px visual ≈ 21 units.
const HAIRLINE = 21;

export function Signature({ doc }: { doc: BubbleMapDoc }) {
  const committed = doc.bubbles.filter(
    (b) => b.kind === 'idea' && b.tier && b.category && b.status === 'committed',
  );
  const raws = committed.filter((b) => b.tier === 'raw');
  const outers = committed.filter((b) => b.tier !== 'raw');
  return (
    <svg className="signature" viewBox="-1000 -1000 2000 2000" role="img" aria-label="Descent signature">
      {[RINGS.raw.outer, RINGS.real.outer, RINGS.safe.outer].map((r) => (
        <circle key={r} r={r} fill="none" stroke="var(--hairline)" strokeWidth={HAIRLINE} />
      ))}
      <line x1={-960} y1={0} x2={960} y2={0} stroke="var(--hairline)" strokeWidth={HAIRLINE} />
      <line x1={0} y1={-960} x2={0} y2={960} stroke="var(--hairline)" strokeWidth={HAIRLINE} />
      {raws.map((b) => {
        const points = pathPoints(doc, b);
        if (points.length < 2) return null;
        return (
          <polyline
            key={`path-${b.id}`}
            className="target-path"
            points={points.map((p) => `${p.position.x},${p.position.y}`).join(' ')}
            fill="none"
            stroke={`var(--ink-${b.category})`}
            strokeWidth={HAIRLINE}
          />
        );
      })}
      {outers.map((b) => (
        <circle
          key={b.id}
          className="target-dot-outer"
          cx={b.position.x}
          cy={b.position.y}
          r={26}
          fill={`var(--ink-${b.category})`}
        />
      ))}
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
