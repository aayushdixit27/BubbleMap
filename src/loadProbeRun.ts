// Loads the Phase 0 chain output as a read-only BubbleMapDoc — real data
// for design tests, no AI calls. Probe output predates D23, so bubbles
// carry no sourceLine (rendered views omit the lyric line when empty), and
// stores no positions (the probe had no canvas) — placeInRegion lays every
// bubble out for the Signature.

import probeRun from '../probe-runs/mr-brightside.json';
import { placeInRegion } from './canvas/geometry';
import type { Bubble, BubbleMapDoc, Category, Link, LinkKind, Tier } from './types';

export const PROBE_DOC_ID = 'probe-mr-brightside';

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
      sourceLine: '', // pre-D23 data — no lyric grounding recorded
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

  return {
    version: 2,
    id: PROBE_DOC_ID,
    title: probeRun.title,
    subject: 'song',
    bubbles,
    links,
    rejected: [],
    createdAt: probeRun.ranAt,
    updatedAt: probeRun.ranAt,
  };
}
