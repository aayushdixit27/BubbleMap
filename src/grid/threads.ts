// Thread derivation for the D20 grid: rows are descent chains, built from the
// doc's links (not probe metadata) so Phase 2 maps thread the same way.
//
// A bubble's parent is the source of the best link targeting it — refines
// preferred over assumes over evidence; contradicts never parents — where the
// source sits at the same tier or shallower. A thread is everything that
// walks up to the same parentless root, bucketed by tier for the columns.

import type { Bubble, BubbleMapDoc, LinkKind, Tier } from '../types';

export interface Thread {
  rootId: string;
  safe: Bubble[];
  real: Bubble[];
  raw: Bubble[];
}

export interface GridModel {
  threads: Thread[];
  parentOf: Map<string, Bubble>;
  parentKind: Map<string, LinkKind>;
}

const DEPTH: Record<Tier, number> = { safe: 0, real: 1, raw: 2 };
const PARENT_PREF: Partial<Record<LinkKind, number>> = { refines: 0, assumes: 1, evidence: 2 };

export function buildGrid(doc: BubbleMapDoc): GridModel {
  const byId = new Map(doc.bubbles.map((b) => [b.id, b]));
  const parentOf = new Map<string, Bubble>();
  const parentKind = new Map<string, LinkKind>();

  for (const bubble of doc.bubbles) {
    if (!bubble.tier) continue; // lyric bubbles don't thread
    let best: { parent: Bubble; kind: LinkKind; pref: number } | null = null;
    for (const link of doc.links) {
      if (link.target !== bubble.id) continue;
      const pref = PARENT_PREF[link.kind];
      if (pref === undefined) continue;
      const parent = byId.get(link.source);
      if (!parent?.tier || parent.id === bubble.id) continue;
      if (DEPTH[parent.tier] > DEPTH[bubble.tier]) continue;
      if (!best || pref < best.pref) best = { parent, kind: link.kind, pref };
    }
    if (best) {
      parentOf.set(bubble.id, best.parent);
      parentKind.set(bubble.id, best.kind);
    }
  }

  const rootOf = (bubble: Bubble): Bubble => {
    const seen = new Set<string>();
    let current = bubble;
    while (parentOf.has(current.id) && !seen.has(current.id)) {
      seen.add(current.id);
      current = parentOf.get(current.id)!;
    }
    return current;
  };

  const threadsByRoot = new Map<string, Thread>();
  const order: string[] = [];
  for (const bubble of doc.bubbles) {
    if (!bubble.tier) continue;
    const root = rootOf(bubble);
    let thread = threadsByRoot.get(root.id);
    if (!thread) {
      thread = { rootId: root.id, safe: [], real: [], raw: [] };
      threadsByRoot.set(root.id, thread);
      order.push(root.id);
    }
    thread[bubble.tier].push(bubble);
  }

  // Rows with a RAW payload first (stable within each group) — the reading
  // surface leads; childless SAFE roots trail as thin rows.
  const threads = order
    .map((id) => threadsByRoot.get(id)!)
    .sort((a, b) => Number(b.raw.length > 0) - Number(a.raw.length > 0));

  return { threads, parentOf, parentKind };
}
