// The D20 workspace: threads as rows, tiers as columns, RAW widest.
// D22 visual layer: tier is expressed in type, not chrome; category is
// small-caps marginalia above each ENTRY (cross-category reads
// "Love → Identity"). DOI: only the selected row expands to full notes.
//
// Phase 2 (D25): the grid is a presentation, not a judgment surface —
// keep/kill happens per DESCENT in the readings view. Proposals render
// as ghosts (dashed hairline, reduced ink — D22); streaming ghosts show
// "arriving…". Labels never clip.

import { useMemo, useState } from 'react';
import { useMapStore } from '../store';
import type { Bubble, Category, Tier } from '../types';
import { buildGrid } from './threads';

const COLUMNS: Tier[] = ['safe', 'real', 'raw'];

export const CATEGORY_LABEL: Record<Category, string> = {
  love: 'Love',
  identity: 'Identity',
  fitness: 'Fitness',
  earnings: 'Earnings',
};

const isProvisional = (id: string) => id.startsWith('p:');

function Entry({
  bubble,
  parent,
  expanded,
}: {
  bubble: Bubble;
  parent?: Bubble;
  expanded: boolean;
}) {
  const category = bubble.category;
  const cross = Boolean(parent?.category && category && parent.category !== category);
  const pending = isProvisional(bubble.id);
  const proposed = bubble.status === 'proposed';

  return (
    <div className={`entry t-${bubble.tier ?? 'safe'}${proposed ? ' ghost' : ''}`}>
      {category && (
        <div className="marginalia" style={{ color: `var(--ink-${category})` }}>
          {cross
            ? `${CATEGORY_LABEL[parent!.category!]} → ${CATEGORY_LABEL[category]}`
            : CATEGORY_LABEL[category]}
          {pending && <span className="entry-state"> · arriving…</span>}
        </div>
      )}
      <div className="entry-label">{bubble.label}</div>
      {expanded && bubble.note && <div className="entry-note">{bubble.note}</div>}
    </div>
  );
}

export function ThreadGrid() {
  const doc = useMapStore((s) => s.doc);
  const grid = useMemo(() => (doc ? buildGrid(doc) : null), [doc]);
  const [selected, setSelected] = useState<string | null>(null);

  if (!doc || !grid) return null;

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
                  <Entry
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
