// D47 — THE CORPUS VIEW: the view ACROSS maps, reached from the library.
// Two pages, no algorithm, deliberately dumb — what produced the n=8
// finding (PRODUCT §7) was putting the keeper lines next to each other,
// and that is all v1 does.
//
//   1. The keeper wall — every song's keeper line, one per row, RAW
//      serif at reading size, title as quiet marginalia. No grouping,
//      no clustering, recency order only (same as the library).
//   2. The stacked target — every song's committed RAW dots on one
//      disc, existing geometry, stored positions. Answers whether raw
//      layers cluster by category across songs.
//
// Deliberately NOT here (D47): an AI call that names the shape. A human
// reading eight lines worked fine; revisit at twenty.
//
// Implementer decisions (D36, reported): a song with no chosen keeper
// falls back to its most recent RAW — the same rule the library row
// uses — marked "keeper not chosen" so the wall never silently equates
// the two. Keeper dots wear the Target's existing hairline ring. Rows
// open their song. Data is fetched read-only per open; nothing here can
// write.

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
    const raws = committedRaws(d);
    const keeper = d.keeperId ? raws.find((b) => b.id === d.keeperId) : undefined;
    const latest = raws.length
      ? raws.reduce((a, b) => (b.createdAt > a.createdAt ? b : a))
      : undefined;
    const line = keeper ?? latest;
    return line ? [{ id: d.id, title: d.title, line: line.label, chosen: Boolean(keeper) }] : [];
  });

  // Stored positions are computed per map by the same deterministic
  // placement, so across songs the i-th RAW lands on the SAME spot —
  // 62 corpus dots collapsed to 16 visible ones (found live, 21 Aug).
  // Exact stacking makes eight readings look like one, which un-answers
  // the disc's whole question. Fix: re-place every dot with the EXISTING
  // placeInRegion, fed the accumulated corpus instead of one map — the
  // same geometry the per-song target uses, at corpus scope. Display
  // only; nothing writes back to any map.
  const dots = useMemo(() => {
    const placed: Bubble[] = [];
    return (docs ?? []).flatMap((d) =>
      committedRaws(d).map((b) => {
        const position = placeInRegion(b.category!, 'raw', placed);
        placed.push({ ...b, position });
        return { bubble: b, position, keeper: b.id === d.keeperId };
      }),
    );
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
          {/* Page 1 — the keeper wall. The page that did the work manually. */}
          <div className="marginalia corpus-head">
            the keepers · {rows.length} {rows.length === 1 ? 'song' : 'songs'}
          </div>
          <div className="keeper-wall">
            {rows.map((r) => (
              <button key={r.id} className="keeper-wall-row" onClick={() => void openMap(r.id)}>
                <span className="marginalia">
                  {r.title}
                  {!r.chosen && <span className="entry-state"> · keeper not chosen</span>}
                </span>
                <span className="keeper-wall-line">{r.line}</span>
              </button>
            ))}
            {rows.length === 0 && (
              <div className="readings-empty">No songs reach RAW yet.</div>
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
            {dots.map(({ bubble, position, keeper }) => (
              <g key={bubble.id}>
                {keeper && (
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
