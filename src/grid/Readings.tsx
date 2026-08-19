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
  raw?: Bubble; // absent for a still-descending or terminal thread
  // D33/D40: terminal states are visible and TRUE. 'declined' = asked,
  // the song had nothing deeper (persisted). 'discarded' = something was
  // produced and removed by the system (session; see rejections).
  terminal?: 'declined' | 'discarded';
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
          {/* Tier is named, not only sized — watching the descent happen
              is the point. Dim, so category keeps its ink. */}
          {bubble.tier && <span className="tier-label">{bubble.tier} · </span>}
          {cross
            ? `${CATEGORY_LABEL[parent!.category!]} → ${CATEGORY_LABEL[category]}`
            : CATEGORY_LABEL[category]}
          {pending && <span className="entry-state"> · arriving…</span>}
        </div>
      )}
      <div className="entry-label">{bubble.label}</div>
      {bubble.sourceLine && (
        <div className="reading-line">
          {bubble.sourceLine}
          {/* D39: provenance unverified — a quiet fact, not a rejection. */}
          {bubble.citationUnverified && (
            <span className="citation-flag"> · citation unverified</span>
          )}
        </div>
      )}
      {withNote && bubble.note && <div className="entry-note">{bubble.note}</div>}
    </div>
  );
}

export function Readings() {
  const doc = useMapStore((s) => s.doc);
  const running = useMapStore((s) => s.running);
  const readOnly = useMapStore((s) => s.readOnly);
  const killDescent = useMapStore((s) => s.killDescent);
  const discarded = useMapStore((s) => s.discarded);
  const nominations = useMapStore((s) => s.nominations);
  const setKeeper = useMapStore((s) => s.setKeeper);

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
    // D33/D35: a REAL that was asked and declined carries a persisted
    // `exhausted` flag and RESOLVES to a terminal "no deeper reading
    // found" slot — it stays after the run ends and across reloads.
    // Nothing that appeared may vanish.
    const descended = new Set(result.map((r) => r.real?.id).filter(Boolean));
    for (const real of doc.bubbles.filter((b) => b.tier === 'real')) {
      if (descended.has(real.id)) continue;
      const terminal: Reading['terminal'] = real.exhausted
        ? 'declined'
        : discarded.includes(real.id)
          ? 'discarded'
          : undefined;
      if (running === 0 && !terminal) continue;
      const parent = grid.parentOf.get(real.id);
      result.push({ safe: parent?.tier === 'safe' ? parent : undefined, real, terminal });
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
  }, [doc, running, discarded]);

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
            {/* D41: the human's chosen raw thing carries a quiet mark. */}
            {raw && doc.keeperId === raw.id && (
              <div className="marginalia keeper-mark">the keeper</div>
            )}
            {reading.safe && <Step bubble={reading.safe} repeat={reading.safeRepeat} />}
            {reading.real && <Step bubble={reading.real} parent={reading.safe} repeat={reading.realRepeat} />}
            {raw ? (
              <Step bubble={raw} parent={reading.real} withNote />
            ) : (
              <div className="reading-step t-raw">
                <div className="marginalia tier-label">raw</div>
                <div className="reading-line">
                  {reading.terminal === 'declined'
                    ? 'no deeper reading found'
                    : reading.terminal === 'discarded'
                      ? 'its reading arrived malformed and was discarded — see rejections'
                      : 'descending…'}
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
                {doc.keeperId !== raw!.id && (
                  <button className="text-action" onClick={() => setKeeper(raw!.id)}>
                    make this the keeper
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
      {/* D41: the natural end of a run — the model's nominations, the
          human's pick. Not a modal; it sits below the readings like one
          more entry, and disappears once a keeper exists (the mark on the
          chosen reading carries it from there). */}
      {running === 0 && !doc.keeperId && nominations.length > 0 && (
        <div className="reading keeper-block">
          <div className="marginalia">the keeper</div>
          <div className="keeper-prose">
            Nominated below — pick the one raw thing this song is about, or hover any
            reading above and make it the keeper there.
          </div>
          {nominations.map((id) => {
            const b = doc.bubbles.find((x) => x.id === id);
            return (
              b && (
                <button key={id} className="keeper-option" onClick={() => setKeeper(id)}>
                  {b.label}
                </button>
              )
            );
          })}
        </div>
      )}
      {/* While the run generates, the page is never blank: the pasted
          lyrics render as a quiet sheet below whatever has arrived —
          you're about to read about this song, so read the song. New
          readings land above it; the sheet leaves when the run ends. */}
      {running > 0 && doc.source && (
        <div className="reading lyric-sheet">
          <div className="marginalia">the song, while it reads</div>
          <div className="lyric-text">{doc.source}</div>
        </div>
      )}
    </div>
  );
}
