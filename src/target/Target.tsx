// D56: the Target plots all three tiers — SAFE outer, REAL middle, RAW
// inner — with a path drawn per descent, SAFE → REAL → RAW. The glance it
// exists for: the surface scatters, the raw converges. A song can present
// across Fitness and Identity in the outer ring while every RAW lands in
// one quadrant, and no other view shows that.
//
// This supersedes the D30 crop WITHOUT reversing it: D30 cropped because a
// RAW-only plot leaves the outer rings empty by construction, and D20's
// objection to the three-ring frame was about text area — dots need none.
// Plot three tiers and the rings carry data. (The corpus disc is a separate
// question — hundreds of dots may still want the crop. Decided after
// looking, not here.)
//
// Clicking a RAW dot opens its PROVENANCE — the SAFE → REAL → RAW chain that
// produced it, in a panel beside the disc — and solidifies its path (Q5's
// hairball dial: paths faint by default, solid on selection). Clicking the
// disc background (or the dot again) dismisses it. SAFE and REAL dots are
// context, not controls — the reading unit is the descent (D29).
//
// Dots and hairlines only, D22 treatment: no glow, no cards, category as
// muted ink. Positions come from the shared polar math in canvas/geometry.ts.
//
// Pre-commit bubbles sit at (0,0) until placeInRegion runs on commit, so the
// committed filter is load-bearing: without it a streaming descent renders a
// phantom dot at dead centre. Same filter guards the path points (lineage.ts).

import { useState } from 'react';
import { QUADRANTS, RINGS } from '../canvas/geometry';
import { CATEGORY_LABEL } from '../grid/ThreadGrid';
import { useMapStore } from '../store';
import type { Bubble, BubbleMapDoc, Category } from '../types';
import { chainOf, pathPoints } from './lineage';

// viewBox is 2120 units across a 450–620px panel, so 1px visual ≈ 4.2 units.
const HAIRLINE = 4;
const DOT = 34; // RAW — the destination carries the weight
const DOT_OUTER = 20; // SAFE and REAL — context for the paths
const HIT = 96; // invisible click target — an 8px dot is not a button
// Labels sit in the corners, outside the outermost ring (RINGS.safe.outer =
// 920) but inside the viewBox — they must never collide with a dot.
const LABEL_RADIUS = 990;

const CATEGORIES: Category[] = ['love', 'identity', 'fitness', 'earnings'];

const labelPoint = (category: Category) => {
  const a = (QUADRANTS[category].center * Math.PI) / 180;
  return { x: LABEL_RADIUS * Math.cos(a), y: LABEL_RADIUS * Math.sin(a) };
};

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
  // D46: the opt-in trigger for descent and return lives here, on the
  // provenance panel — one click, one call, never automatic.
  const buildArc = useMapStore((s) => s.buildArc);
  const readOnly = useMapStore((s) => s.readOnly);
  const running = useMapStore((s) => s.running);
  const arcDraft = useMapStore((s) => s.arcDraft);

  const committed = doc.bubbles.filter(
    (b) => b.kind === 'idea' && b.tier && b.category && b.status === 'committed',
  );
  const raws = committed.filter((b) => b.tier === 'raw');
  const outers = committed.filter((b) => b.tier !== 'raw');
  const selected = raws.find((b) => b.id === selectedId) ?? null;
  const chain = selected ? chainOf(doc, selected) : null;

  return (
    <div className="target-view">
      <svg
        viewBox="-1060 -1060 2120 2120"
        role="img"
        aria-label="This song's descents — SAFE outer, REAL middle, RAW at the centre"
        onClick={() => setSelectedId(null)}
      >
        {[RINGS.raw.outer, RINGS.real.outer, RINGS.safe.outer].map((r) => (
          <circle key={r} r={r} fill="none" stroke="var(--hairline)" strokeWidth={HAIRLINE} />
        ))}
        <line x1={-RINGS.safe.outer} y1={0} x2={RINGS.safe.outer} y2={0} stroke="var(--hairline)" strokeWidth={HAIRLINE} />
        <line x1={0} y1={-RINGS.safe.outer} x2={0} y2={RINGS.safe.outer} stroke="var(--hairline)" strokeWidth={HAIRLINE} />
        {CATEGORIES.map((c) => {
          const p = labelPoint(c);
          return (
            <text key={c} x={p.x} y={p.y} className="target-label" fill={`var(--ink-${c})`}>
              {c}
            </text>
          );
        })}
        {/* D56 descent paths, under the dots. One per RAW (D29's unit);
            shared SAFEs mean fewer origin points than descents. Faint by
            default, solid when its RAW is selected. */}
        {raws.map((b) => {
          const points = pathPoints(doc, b);
          if (points.length < 2) return null;
          return (
            <polyline
              key={`path-${b.id}`}
              className={`target-path${b.id === selectedId ? ' target-path-selected' : ''}`}
              points={points.map((p) => `${p.position.x},${p.position.y}`).join(' ')}
              fill="none"
              stroke={`var(--ink-${b.category})`}
              strokeWidth={b.id === selectedId ? HAIRLINE * 2 : HAIRLINE}
            />
          );
        })}
        {outers.map((b) => (
          <circle
            key={b.id}
            className="target-dot-outer"
            cx={b.position.x}
            cy={b.position.y}
            r={DOT_OUTER}
            fill={`var(--ink-${b.category})`}
          />
        ))}
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
                r={DOT + 26}
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
          {/* D46: write this descent as a five-beat arc — RAW, up for
              air, back down. Hidden while a run owns the doc. */}
          {!readOnly && running === 0 && selected && (
            <div className="target-arc-action">
              <button
                className="text-action"
                disabled={arcDraft !== null}
                onClick={() => void buildArc(selected.id)}
              >
                {arcDraft ? 'writing an arc…' : 'descent and return'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
