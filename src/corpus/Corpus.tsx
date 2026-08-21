// D47/D48 — THE CORPUS VIEW: the view ACROSS maps, reached from the
// library. Two pages, no algorithm, deliberately dumb — what produced
// the n=8 finding (PRODUCT §7) was putting the lines next to each other,
// and that is all v1 does.
//
//   1. The wall — every dug-into song's LINE (D48: the RAW its most
//      recent arc was built from; the arc is the choosing act), one per
//      row, RAW serif at reading size, title as quiet marginalia. A song
//      with NO arc contributes NO line — deliberate: the corpus is made
//      of songs the human dug into, not songs they ran.
//   2. The stacked target — every song's committed RAW dots on one
//      disc. Answers whether raw layers cluster by category across
//      songs. A song's line-dot wears the hairline ring.
//
// Deliberately NOT here (D47): an AI call that names the shape. A human
// reading eight lines worked fine; revisit at twenty.
//
// Implementer decisions (D36, reported): rows open their song; data is
// fetched read-only per open; nothing here can write. Dots are re-placed
// with the existing placeInRegion at corpus scope — stored positions are
// per-map deterministic and collide EXACTLY across songs (62 dots drew
// as 16 before this; display only, nothing written back).

import { useEffect, useMemo, useState } from 'react';
import { fetchMap, fetchMaps } from '../api';
import { placeInRegion, QUADRANTS, RINGS } from '../canvas/geometry';
import { useMapStore } from '../store';
import type { Bubble, BubbleMapDoc, Category } from '../types';

const CATEGORIES: Category[] = ['love', 'identity', 'fitness', 'earnings'];
const HAIRLINE = 2;
const DOT = 10; // smaller than the per-song Target's 16 — this disc holds ~10× the dots
const LABEL_RADIUS = 435;

const labelPoint = (category: Category) => {
  const a = (QUADRANTS[category].center * Math.PI) / 180;
  return { x: LABEL_RADIUS * Math.cos(a), y: LABEL_RADIUS * Math.sin(a) };
};

const committedRaws = (d: BubbleMapDoc): Bubble[] =>
  d.bubbles.filter(
    (b) => b.kind === 'idea' && b.tier === 'raw' && b.category && b.status === 'committed',
  );

// D48: the song's line is the RAW its most recent arc was built from.
// The arc's raw may since have been killed into rejected[]; its label
// still names the line (the dot, though, exists only while committed).
const lineOf = (d: BubbleMapDoc): Bubble | undefined => {
  const arcs = d.arcs ?? [];
  for (let i = arcs.length - 1; i >= 0; i--) {
    const b =
      d.bubbles.find((x) => x.id === arcs[i].rawId) ??
      (d.rejected ?? []).find((x) => x.id === arcs[i].rawId);
    if (b) return b;
  }
  return undefined;
};

export function Corpus({ onBack }: { onBack: () => void }) {
  const openMap = useMapStore((s) => s.openMap);
  const [docs, setDocs] = useState<BubbleMapDoc[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const metas = await fetchMaps(); // recency order, same as the library
        const loaded = await Promise.all(metas.map((m) => fetchMap(m.id)));
        if (alive) setDocs(loaded);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const rows = (docs ?? []).flatMap((d) => {
    const line = lineOf(d);
    return line ? [{ id: d.id, title: d.title, line: line.label }] : [];
  });

  const dots = useMemo(() => {
    const placed: Bubble[] = [];
    return (docs ?? []).flatMap((d) => {
      const lineId = lineOf(d)?.id;
      return committedRaws(d).map((b) => {
        const position = placeInRegion(b.category!, 'raw', placed);
        placed.push({ ...b, position });
        return { bubble: b, position, isLine: b.id === lineId };
      });
    });
  }, [docs]);
  const R = RINGS.raw.outer;

  return (
    <div className="corpus">
      <div className="toolbar corpus-bar">
        <button className="text-action" onClick={onBack}>← library</button>
        {error && <span className="status status-error">{error}</span>}
      </div>
      {!docs && !error && <div className="readings-empty">reading the corpus…</div>}
      {docs && (
        <div className="corpus-body">
          {/* Page 1 — the wall: one line per song dug into. */}
          <div className="marginalia corpus-head">
            the lines · {rows.length} of {docs.length} songs dug into
          </div>
          <div className="corpus-wall">
            {rows.map((r) => (
              <button key={r.id} className="corpus-row" onClick={() => void openMap(r.id)}>
                <span className="marginalia">{r.title}</span>
                <span className="corpus-line">{r.line}</span>
              </button>
            ))}
            {rows.length === 0 && (
              <div className="readings-empty">
                No lines yet. A song earns its line when you dig into it — open one and
                build an arc from its target.
              </div>
            )}
          </div>

          {/* Page 2 — the stacked target: every song's RAW dots, one disc. */}
          <div className="marginalia corpus-head">every raw reading, one disc</div>
          <svg
            className="corpus-disc"
            viewBox="-480 -480 960 960"
            role="img"
            aria-label="Every song's RAW readings on one target, by category"
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
            {dots.map(({ bubble, position, isLine }) => (
              <g key={bubble.id}>
                {isLine && (
                  <circle
                    cx={position.x}
                    cy={position.y}
                    r={DOT + 5}
                    fill="none"
                    stroke="var(--ink)"
                    strokeWidth={HAIRLINE}
                  />
                )}
                <circle
                  cx={position.x}
                  cy={position.y}
                  r={DOT}
                  fill={`var(--ink-${bubble.category})`}
                />
              </g>
            ))}
          </svg>
        </div>
      )}
    </div>
  );
}
