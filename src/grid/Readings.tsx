// THE READINGS VIEW — the judgment surface (D26, opt-out). Each reading
// is one complete descent presented vertically:
//   SAFE entry, its lyric line
//   REAL entry, its lyric line
//   RAW entry, its lyric line, and its full note.
// Descents land committed; the only gesture is "kill this descent",
// which parks the path in rejected[] (undoable for the session).
// Controls surface on hover/focus only (D22); still-streaming steps read
// as ghosts. While descends run, a thread that has not yet reached RAW
// shows its SAFE/REAL with a quiet "descending…" slot.
//
// A reading is derived per thread: the first RAW entry, then its actual
// ancestor chain (parentOf) for the REAL and SAFE steps, falling back to
// the thread's first entry in a tier when the chain skips one.
//
// The lyric line renders only when sourceLine is non-empty — pre-D23 data
// (the probe run) has none; every post-D23 map fills it.

import { useMemo } from 'react';
import { useMapStore } from '../store';
import type { Bubble } from '../types';
import { CATEGORY_LABEL } from './ThreadGrid';
import { buildGrid } from './threads';

const NUMERAL = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'];

const isProvisional = (id: string) => id.startsWith('p:');

interface Reading {
  safe?: Bubble;
  real?: Bubble;
  raw?: Bubble; // absent only for a still-descending thread
}

function Step({ bubble, parent, withNote }: { bubble: Bubble; parent?: Bubble; withNote?: boolean }) {
  const category = bubble.category;
  const cross = Boolean(parent?.category && category && parent.category !== category);
  const pending = isProvisional(bubble.id);
  return (
    <div className={`reading-step t-${bubble.tier ?? 'safe'}${bubble.status === 'proposed' ? ' ghost' : ''}`}>
      {category && (
        <div className="marginalia" style={{ color: `var(--ink-${category})` }}>
          {cross
            ? `${CATEGORY_LABEL[parent!.category!]} → ${CATEGORY_LABEL[category]}`
            : CATEGORY_LABEL[category]}
          {pending && <span className="entry-state"> · arriving…</span>}
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
  const running = useMapStore((s) => s.running);
  const readOnly = useMapStore((s) => s.readOnly);
  const killDescent = useMapStore((s) => s.killDescent);

  const readings = useMemo<Reading[]>(() => {
    if (!doc) return [];
    const grid = buildGrid(doc);
    const result: Reading[] = [];
    for (const thread of grid.threads) {
      if (!thread.raw.length) {
        // Not a reading yet — show the partial descent only while its
        // RAW is still being generated.
        if (running > 0 && thread.real.length) {
          result.push({ safe: thread.safe[0], real: thread.real[0] });
        }
        continue;
      }
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
  }, [doc, running]);

  if (!doc) return null;

  return (
    <div className="readings">
      {readings.length === 0 && running === 0 && (
        <div className="readings-empty">No complete descents yet — nothing reaches RAW.</div>
      )}
      {readings.map((reading, i) => {
        const raw = reading.raw;
        const killable = !readOnly && raw && !isProvisional(raw.id);
        return (
          <div key={raw?.id ?? reading.real?.id ?? i} className="reading">
            <div className="reading-numeral">{NUMERAL[i] ?? String(i + 1)}</div>
            {reading.safe && <Step bubble={reading.safe} />}
            {reading.real && <Step bubble={reading.real} parent={reading.safe} />}
            {raw ? (
              <Step bubble={raw} parent={reading.real} withNote />
            ) : (
              <div className="reading-step t-raw">
                <div className="reading-line">descending…</div>
              </div>
            )}
            {killable && (
              <div className="entry-actions reading-actions">
                <button
                  className="text-action"
                  onClick={() =>
                    killDescent({ safe: reading.safe?.id, real: reading.real?.id, raw: raw!.id })
                  }
                >
                  kill this descent
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
