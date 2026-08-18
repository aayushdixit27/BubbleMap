// Loads the Phase 0 chain output as a BubbleMapDoc — real data, not
// placeholders. Probe output stores no positions (the probe has no canvas),
// so every bubble is laid out here with placeInRegion.

import probeRun from '../probe-runs/mr-brightside.json';
import { placeInRegion } from './canvas/geometry';
import type { Bubble, BubbleMapDoc, Category, Link, LinkKind, Tier } from './types';

interface ProbeBubble {
  id: string;
  tier: string | null;
  category: string | null;
  label: string;
  note?: string;
}

interface ProbeLink {
  kind: string;
  source: string;
  target: string;
  rationale?: string;
}

export function loadProbeRun(): BubbleMapDoc {
  const bubbles: Bubble[] = [];
  for (const record of probeRun.bubbles as ProbeBubble[]) {
    const tier = record.tier as Tier;
    const category = record.category as Category;
    bubbles.push({
      id: record.id,
      kind: 'idea',
      tier,
      category,
      label: record.label,
      ...(record.note ? { note: record.note } : {}),
      position: placeInRegion(category, tier, bubbles),
      origin: 'ai',
      status: 'committed',
      createdAt: probeRun.ranAt,
    });
  }

  const links: Link[] = (probeRun.links as ProbeLink[]).map((record, i) => ({
    id: `link-${i}`,
    source: record.source,
    target: record.target,
    kind: record.kind as LinkKind,
    ...(record.rationale ? { rationale: record.rationale } : {}),
    origin: 'ai',
    status: 'committed',
  }));

  const now = new Date().toISOString();
  return {
    version: 2,
    id: 'probe-mr-brightside',
    title: probeRun.title,
    subject: 'song',
    bubbles,
    links,
    createdAt: probeRun.ranAt,
    updatedAt: now,
  };
}
