// The D20 workspace: threads as rows, tiers as columns, RAW widest.
// D22 visual layer: tier is expressed in type, not chrome — entries are bare
// text under small-caps category marginalia; cross-category descent reads
// "Love → Identity" in the marginalia line. Labels are never clipped.
// Degree-of-interest: only the selected row expands to full notes.

import { useMemo, useState } from 'react';
import { useMapStore } from '../store';
import type { Bubble, Category, Tier } from '../types';
import { buildGrid } from './threads';

const COLUMNS: Tier[] = ['safe', 'real', 'raw'];

const CATEGORY_LABEL: Record<Category, string> = {
  love: 'Love',
  identity: 'Identity',
  fitness: 'Fitness',
  earnings: 'Earnings',
};

function Entry({ bubble, parent, expanded }: { bubble: Bubble; parent?: Bubble; expanded: boolean }) {
  const category = bubble.category;
  const cross = Boolean(parent?.category && category && parent.category !== category);
  return (
    <div className={`entry t-${bubble.tier ?? 'safe'}`}>
      {category && (
        <div className="marginalia" style={{ color: `var(--ink-${category})` }}>
          {cross
            ? `${CATEGORY_LABEL[parent!.category!]} → ${CATEGORY_LABEL[category]}`
            : CATEGORY_LABEL[category]}
        </div>
      )}
      <div className="entry-label">{bubble.label}</div>
      {expanded && bubble.note && <div className="entry-note">{bubble.note}</div>}
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
            className="thread-row"
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
