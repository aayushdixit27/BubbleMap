// The D20 workspace: threads as rows, tiers as columns, RAW widest.
// D22 visual layer: tier is expressed in type, not chrome; category is
// small-caps marginalia above each ENTRY (cross-category reads
// "Love → Identity"). DOI: only the selected row expands to full notes.
//
// Phase 2: AI proposals render as ghosts. Streaming (provisional) ghosts
// show "arriving…"; resolved ghosts carry keep / discard. Keeping one RAW
// candidate from a descend discards its siblings (D18). Labels never clip.

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

const isProvisional = (id: string) => id.startsWith('p:');

function Entry({
  bubble,
  parent,
  expanded,
  grouped,
}: {
  bubble: Bubble;
  parent?: Bubble;
  expanded: boolean;
  grouped: boolean;
}) {
  const accept = useMapStore((s) => s.accept);
  const reject = useMapStore((s) => s.reject);
  const runDescend = useMapStore((s) => s.runDescend);

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
      {proposed && !pending && (
        <div className="entry-actions" onClick={(e) => e.stopPropagation()}>
          <button className="text-action" onClick={() => accept(bubble.id)}>
            {grouped ? 'keep this one' : 'keep'}
          </button>
          <button className="text-action" onClick={() => reject(bubble.id)}>
            discard
          </button>
        </div>
      )}
      {!proposed && bubble.tier === 'real' && expanded && (
        <div className="entry-actions" onClick={(e) => e.stopPropagation()}>
          <button className="text-action" onClick={() => void runDescend(bubble.id)}>
            descend
          </button>
        </div>
      )}
    </div>
  );
}

export function ThreadGrid() {
  const doc = useMapStore((s) => s.doc);
  const groups = useMapStore((s) => s.groups);
  const grid = useMemo(() => (doc ? buildGrid(doc) : null), [doc]);
  const [selected, setSelected] = useState<string | null>(null);
  const groupedIds = useMemo(() => new Set(Object.values(groups).flat()), [groups]);

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
                    grouped={groupedIds.has(bubble.id)}
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
