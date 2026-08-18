// The D20 workspace: threads as rows, tiers as columns, RAW widest.
// Degree-of-interest: only the selected row expands to full notes; every
// other row shows labels only. Labels are never clipped (CLAUDE.md rule 7).
// Cross-category descent renders as a badge on the card, not a drawn line.

import { useMemo, useState } from 'react';
import { useMapStore } from '../store';
import type { Bubble, Tier } from '../types';
import { buildGrid } from './threads';

const COLUMNS: Tier[] = ['safe', 'real', 'raw'];

function Card({ bubble, parent, expanded }: { bubble: Bubble; parent?: Bubble; expanded: boolean }) {
  const cross = Boolean(
    parent?.category && bubble.category && parent.category !== bubble.category,
  );
  return (
    <div
      className={`card tier-${bubble.tier ?? 'safe'}`}
      style={{ ['--h' as string]: `var(--h-${bubble.category ?? 'love'})` }}
    >
      {cross && (
        <span
          className="cross-badge"
          style={{ ['--h2' as string]: `var(--h-${parent!.category})` }}
        >
          {parent!.category!.toUpperCase()} → {bubble.category!.toUpperCase()}
        </span>
      )}
      <div className="card-label">{bubble.label}</div>
      {expanded && bubble.note && <div className="card-note">{bubble.note}</div>}
    </div>
  );
}

export function ThreadGrid() {
  const doc = useMapStore((s) => s.doc);
  const grid = useMemo(() => buildGrid(doc), [doc]);
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="grid-wrap">
      <div className="thread-row grid-head">
        {COLUMNS.map((tier) => (
          <div key={tier} className={`col-head col-head-${tier}`}>
            {tier.toUpperCase()}
          </div>
        ))}
      </div>
      {grid.threads.map((thread) => {
        const expanded = selected === thread.rootId;
        return (
          <div
            key={thread.rootId}
            className={`thread-row${expanded ? ' selected' : ''}`}
            onClick={() => setSelected(expanded ? null : thread.rootId)}
          >
            {COLUMNS.map((tier) => (
              <div key={tier} className={`cell cell-${tier}`}>
                {thread[tier].map((bubble) => (
                  <Card
                    key={bubble.id}
                    bubble={bubble}
                    parent={grid.parentOf.get(bubble.id)}
                    expanded={expanded}
                  />
                ))}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
