// The refines-ancestor walk — D29's unit (a reading derives per RAW via its
// own chain), shared by the Target's provenance panel and, since D56, by the
// descent paths on both the Target and the header Signature.

import type { Bubble, BubbleMapDoc } from '../types';

// Walk refines links upward from a RAW to its REAL and SAFE. Returns the
// chain shallowest-first: [SAFE, REAL, RAW] when the spine is whole.
export function chainOf(doc: BubbleMapDoc, raw: Bubble): Bubble[] {
  const chain: Bubble[] = [raw];
  const seen = new Set([raw.id]);
  let current: Bubble | undefined = raw;
  while (current) {
    const link = doc.links.find((l) => l.kind === 'refines' && l.target === current!.id);
    const parent = link ? doc.bubbles.find((b) => b.id === link.source) : undefined;
    if (!parent || seen.has(parent.id)) break;
    seen.add(parent.id);
    chain.unshift(parent);
    current = parent;
  }
  return chain;
}

// D56 path points: the chain's committed, placed steps only. A proposed
// ancestor still sits at (0,0) — including it would draw a spoke to dead
// centre, the same phantom the committed dot filter exists to prevent.
export function pathPoints(doc: BubbleMapDoc, raw: Bubble): Bubble[] {
  return chainOf(doc, raw).filter((b) => b.status === 'committed' && b.category && b.tier);
}
