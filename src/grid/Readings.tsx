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
import { stableKey, useMapStore } from '../store';
import type { Bubble } from '../types';
import { CATEGORY_LABEL } from './ThreadGrid';
import { buildGrid } from './threads';

const NUMERAL = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'];

const isProvisional = (id: string) => id.startsWith('p:');

interface Reading {
  safe?: Bubble;
  real?: Bubble;
  raw?: Bubble; // absent for a still-descending or exhausted thread
  exhausted?: boolean; // D33: asked to go deeper, declined — terminal, visible
  safeRepeat?: boolean; // D32: ancestor already shown in an earlier reading
  realRepeat?: boolean;
}

// D32: a repeated ancestor renders its FULL text in muted ink — skippable
// at no cost, never truncated to a fragment.
function Step({ bubble, parent, withNote, repeat }: { bubble: Bubble; parent?: Bubble; withNote?: boolean; repeat?: boolean }) {
  const category = bubble.category;
  const cross = Boolean(parent?.category && category && parent.category !== category);
  const pending = isProvisional(bubble.id);
  return (
    <div
      className={`reading-step t-${bubble.tier ?? 'safe'}${bubble.status === 'proposed' ? ' ghost' : ''}${repeat ? ' repeat' : ''}`}
    >
      {category && (
        <div className="marginalia" style={{ color: repeat ? 'var(--ink-dim)' : `var(--ink-${category})` }}>
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
  const exhausted = useMapStore((s) => s.exhausted);

  // One reading per RAW bubble, in arrival order (D26 #3 appends serially).
  // A thread-based derivation would hide every descent after the first
  // once one SAFE parents several — walk each RAW's own ancestor chain.
  const readings = useMemo<Reading[]>(() => {
    if (!doc) return [];
    const grid = buildGrid(doc);
    const chainOf = (start: Bubble) => {
      let safe: Bubble | undefined;
      let real: Bubble | undefined;
      const seen = new Set([start.id]);
      let current = grid.parentOf.get(start.id);
      while (current && !seen.has(current.id)) {
        seen.add(current.id);
        if (current.tier === 'real' && !real) real = current;
        if (current.tier === 'safe' && !safe) safe = current;
        current = grid.parentOf.get(current.id);
      }
      return { safe, real };
    };

    const result: Reading[] = [];
    for (const raw of doc.bubbles.filter((b) => b.tier === 'raw')) {
      result.push({ ...chainOf(raw), raw });
    }
    // While descends run, a REAL not yet descended shows as a partial
    // reading with a quiet "descending…" slot — never a silent blank.
    // D33: a REAL that was asked and declined RESOLVES to a terminal
    // "no deeper reading found" slot; it stays after the run ends.
    // Nothing that appeared may vanish.
    if (running > 0 || exhausted.length > 0) {
      const descended = new Set(result.map((r) => r.real?.id).filter(Boolean));
      for (const real of doc.bubbles.filter((b) => b.tier === 'real')) {
        if (descended.has(real.id)) continue;
        const isExhausted = exhausted.includes(real.id);
        if (running === 0 && !isExhausted) continue;
        const parent = grid.parentOf.get(real.id);
        result.push({ safe: parent?.tier === 'safe' ? parent : undefined, real, exhausted: isExhausted });
      }
    }
    // D32: mark ancestors already shown in an earlier reading, by id, in
    // render order — they render at full text in muted ink.
    const seen = new Set<string>();
    for (const r of result) {
      r.safeRepeat = r.safe ? seen.has(r.safe.id) : false;
      r.realRepeat = r.real ? seen.has(r.real.id) : false;
      if (r.safe) seen.add(r.safe.id);
      if (r.real) seen.add(r.real.id);
    }
    return result;
  }, [doc, running, exhausted]);

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
          // stableKey survives the ghost → final id swap at finalize, so a
          // reading that streamed in never remounts when it lands.
          <div key={stableKey(raw?.id ?? reading.real?.id ?? String(i))} className="reading">
            <div className="reading-numeral">{NUMERAL[i] ?? String(i + 1)}</div>
            {reading.safe && <Step bubble={reading.safe} repeat={reading.safeRepeat} />}
            {reading.real && <Step bubble={reading.real} parent={reading.safe} repeat={reading.realRepeat} />}
            {raw ? (
              <Step bubble={raw} parent={reading.real} withNote />
            ) : (
              <div className="reading-step t-raw">
                <div className="reading-line">
                  {reading.exhausted ? 'no deeper reading found' : 'descending…'}
                </div>
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
