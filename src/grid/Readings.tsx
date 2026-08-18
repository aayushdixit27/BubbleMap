// THE READINGS VIEW — the cheapest possible test of a design change:
// each reading is ONE complete descent, presented vertically —
//   SAFE entry, its lyric line
//   REAL entry, its lyric line
//   RAW entry, its lyric line, and its full note.
// Read-only: no keep/kill, no descend, no selection. D22 throughout —
// tier is the type crescendo, category is marginalia, hairlines separate.
//
// A reading is derived per thread: the first RAW entry, then its actual
// ancestor chain (parentOf) for the REAL and SAFE steps, falling back to
// the thread's first entry in a tier when the chain skips one. Threads
// without a RAW payload are not readings and are omitted.
//
// The lyric line renders only when sourceLine is non-empty — pre-D23 data
// (the probe run) has none; every post-D23 map fills it.

import { useMemo } from 'react';
import { useMapStore } from '../store';
import type { Bubble } from '../types';
import { CATEGORY_LABEL } from './ThreadGrid';
import { buildGrid } from './threads';

const NUMERAL = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'];

interface Reading {
  safe?: Bubble;
  real?: Bubble;
  raw: Bubble;
}

function Step({ bubble, parent, withNote }: { bubble: Bubble; parent?: Bubble; withNote?: boolean }) {
  const category = bubble.category;
  const cross = Boolean(parent?.category && category && parent.category !== category);
  return (
    <div className={`reading-step t-${bubble.tier ?? 'safe'}`}>
      {category && (
        <div className="marginalia" style={{ color: `var(--ink-${category})` }}>
          {cross
            ? `${CATEGORY_LABEL[parent!.category!]} → ${CATEGORY_LABEL[category]}`
            : CATEGORY_LABEL[category]}
        </div>
      )}
      <div className="entry-label">{bubble.label}</div>
      {bubble.sourceLine && <div className="reading-line">{bubble.sourceLine}</div>}
      {withNote && bubble.note && <div className="entry-note">{bubble.note}</div>}
    </div>
  );
}

export function Readings() {
  const doc = useMapStore((s) => s.doc);
  const readings = useMemo<Reading[]>(() => {
    if (!doc) return [];
    const grid = buildGrid(doc);
    const result: Reading[] = [];
    for (const thread of grid.threads) {
      if (!thread.raw.length) continue;
      const raw = thread.raw[0];
      let safe: Bubble | undefined;
      let real: Bubble | undefined;
      const seen = new Set([raw.id]);
      let current = grid.parentOf.get(raw.id);
      while (current && !seen.has(current.id)) {
        seen.add(current.id);
        if (current.tier === 'real' && !real) real = current;
        if (current.tier === 'safe' && !safe) safe = current;
        current = grid.parentOf.get(current.id);
      }
      result.push({ safe: safe ?? thread.safe[0], real: real ?? thread.real[0], raw });
    }
    return result;
  }, [doc]);

  if (!doc) return null;

  return (
    <div className="readings">
      {readings.length === 0 && (
        <div className="readings-empty">No complete descents yet — nothing reaches RAW.</div>
      )}
      {readings.map((reading, i) => (
        <div key={reading.raw.id} className="reading">
          <div className="reading-numeral">{NUMERAL[i] ?? String(i + 1)}</div>
          {reading.safe && <Step bubble={reading.safe} />}
          {reading.real && <Step bubble={reading.real} parent={reading.safe} />}
          <Step bubble={reading.raw} parent={reading.real} withNote />
        </div>
      ))}
    </div>
  );
}
