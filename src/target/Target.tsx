// D26 #4 + D30: the Target view is the RAW disc, not the three-ring target.
// In a RAW-only plot the outer rings are empty by construction — no
// information, 83% of the frame — so the frame crops to the ring the dots
// live in. Readings owns the depth axis (the type crescendo); Target owns
// the category axis. One circle, four quadrants, all signal.
//
// Clicking a dot opens its PROVENANCE — the SAFE → REAL → RAW chain that
// produced it, in a panel beside the disc. This is deliberately the cheap
// answer to Q5: the path lives in a panel, not as lines swung across the
// axes. Clicking the disc background (or the dot again) dismisses it.
//
// Dots and hairlines only, D22 treatment: no glow, no cards, category as
// muted ink. One dot per committed RAW bubble — the same unit a reading
// derives from (D29). Positions come from the shared polar math in
// canvas/geometry.ts; only the frame is cropped.
//
// Pre-commit bubbles sit at (0,0) until placeInRegion runs on commit, so the
// committed filter is load-bearing: without it a streaming descent renders a
// phantom dot at dead centre.

import { useState } from 'react';
import { QUADRANTS, RINGS } from '../canvas/geometry';
import { CATEGORY_LABEL } from '../grid/ThreadGrid';
import type { Bubble, BubbleMapDoc, Category } from '../types';

// viewBox is 960 units across a 450–620px panel, so 1px visual ≈ 1.8 units.
const HAIRLINE = 2;
const DOT = 16;
const HIT = 44; // invisible click target — a 7px dot is not a button
// Labels sit in the corners, outside the disc (RINGS.raw.outer = 380) but
// inside the viewBox — they must never collide with a dot.
const LABEL_RADIUS = 435;

const CATEGORIES: Category[] = ['love', 'identity', 'fitness', 'earnings'];

const labelPoint = (category: Category) => {
  const a = (QUADRANTS[category].center * Math.PI) / 180;
  return { x: LABEL_RADIUS * Math.cos(a), y: LABEL_RADIUS * Math.sin(a) };
};

// Walk refines links upward from a RAW to its REAL and SAFE — the same
// unit Readings derives (D29), rendered as provenance.
function chainOf(doc: BubbleMapDoc, raw: Bubble): Bubble[] {
  const chain: Bubble[] = [raw];
  const seen = new Set([raw.id]);
  let current: Bubble | undefined = raw;
  while (current) {
    const link = doc.links.find((l) => l.kind === 'refines' && l.target === current!.id);
    const parent = link ? doc.bubbles.find((b) => b.id === link.source) : undefined;
    if (!parent || seen.has(parent.id)) break;
    seen.add(parent.id);
    chain.unshift(parent);
    current = parent;
  }
  return chain;
}

function ProvenanceStep({ bubble, parent }: { bubble: Bubble; parent?: Bubble }) {
  const category = bubble.category;
  const cross = Boolean(parent?.category && category && parent.category !== category);
  return (
    <div className={`reading-step t-${bubble.tier ?? 'safe'}`}>
      {category && (
        <div className="marginalia" style={{ color: `var(--ink-${category})` }}>
          {bubble.tier && <span className="tier-label">{bubble.tier} · </span>}
          {cross
            ? `${CATEGORY_LABEL[parent!.category!]} → ${CATEGORY_LABEL[category]}`
            : CATEGORY_LABEL[category]}
        </div>
      )}
      <div className="entry-label">{bubble.label}</div>
      {bubble.sourceLine && (
        <div className="reading-line">
          {bubble.sourceLine}
          {bubble.citationUnverified && (
            <span className="citation-flag"> · citation unverified</span>
          )}
        </div>
      )}
      {bubble.tier === 'raw' && bubble.note && <div className="entry-note">{bubble.note}</div>}
    </div>
  );
}

export function Target({ doc }: { doc: BubbleMapDoc }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const raws = doc.bubbles.filter(
    (b) => b.kind === 'idea' && b.tier === 'raw' && b.category && b.status === 'committed',
  );
  const selected = raws.find((b) => b.id === selectedId) ?? null;
  const chain = selected ? chainOf(doc, selected) : null;
  const R = RINGS.raw.outer;

  return (
    <div className="target-view">
      <svg
        viewBox="-480 -480 960 960"
        role="img"
        aria-label="Where this song's RAW readings landed, by category"
        onClick={() => setSelectedId(null)}
      >
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
          <g
            key={b.id}
            className="target-dot"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedId(b.id === selectedId ? null : b.id);
            }}
          >
            {/* invisible hit area */}
            <circle cx={b.position.x} cy={b.position.y} r={HIT} fill="transparent" />
            {b.id === selectedId && (
              // Selection is a hairline ring in ink — never a glow (D22).
              <circle
                cx={b.position.x}
                cy={b.position.y}
                r={DOT + 12}
                fill="none"
                stroke="var(--ink-mid)"
                strokeWidth={HAIRLINE}
              />
            )}
            <circle cx={b.position.x} cy={b.position.y} r={DOT} fill={`var(--ink-${b.category})`} />
          </g>
        ))}
      </svg>
      {chain && (
        <div className="target-panel">
          {chain.map((b, i) => (
            <ProvenanceStep key={b.id} bubble={b} parent={i > 0 ? chain[i - 1] : undefined} />
          ))}
        </div>
      )}
    </div>
  );
}
