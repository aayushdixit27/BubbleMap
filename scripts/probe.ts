// Phase 0 prompt probe (ARCHITECTURE.md §12).
// Usage: npm run probe -- "<song> — <artist>"
// Calls the seed verb, prints the proposal grouped by (category, tier), and
// saves the full result — raw model output, rejections, usage, wall-clock —
// to probe-runs/<slug>.json for the architect to read.

import { mkdirSync, writeFileSync } from 'node:fs';
import { nanoid } from 'nanoid';
import type { BubbleMapDoc, Category, Tier } from '../src/types';
import { propose, type Proposal } from '../server/ai';

try {
  process.loadEnvFile('.env');
} catch {
  // No .env — propose() reports the missing key with instructions.
}

const CATEGORIES: Category[] = ['love', 'identity', 'fitness', 'earnings'];
const TIERS: Tier[] = ['safe', 'real', 'raw'];

const title = process.argv.slice(2).join(' ').trim();
if (!title) {
  console.error('Usage: npm run probe -- "<song> — <artist>"');
  process.exit(1);
}

const now = new Date().toISOString();
const doc: BubbleMapDoc = {
  version: 2,
  id: nanoid(),
  title,
  subject: 'song',
  bubbles: [],
  links: [],
  createdAt: now,
  updatedAt: now,
};

const startedAt = Date.now();
let result: Proposal;
try {
  result = await propose('seed', doc);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
const wallClockMs = Date.now() - startedAt;
const { bubbles, links, rejections, raw, model, usage } = result;

const labelById = new Map(bubbles.map((b) => [b.id, b.label]));

const grouped: Record<string, Partial<Record<Tier, { label: string; note?: string }[]>>> = {};
for (const category of CATEGORIES) {
  for (const tier of TIERS) {
    const inRegion = bubbles.filter((b) => b.category === category && b.tier === tier);
    if (inRegion.length === 0) continue;
    (grouped[category] ??= {})[tier] = inRegion.map(({ label, note }) => ({
      label,
      ...(note ? { note } : {}),
    }));
  }
}

const readable = {
  title,
  bubbles: grouped,
  links: links.map((l) => ({
    kind: l.kind,
    source: labelById.get(l.source) ?? l.source,
    target: labelById.get(l.target) ?? l.target,
    ...(l.rationale ? { rationale: l.rationale } : {}),
  })),
};

const slug = title
  .toLowerCase()
  .normalize('NFKD')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

mkdirSync('probe-runs', { recursive: true });
const outPath = `probe-runs/${slug}.json`;
writeFileSync(
  outPath,
  JSON.stringify(
    { ...readable, model, ranAt: now, wallClockMs, usage, rejections, raw },
    null,
    2,
  ) + '\n',
);

console.log(JSON.stringify(readable, null, 2));

const categorySpread = CATEGORIES.filter((c) => grouped[c]).join(', ') || 'none';
console.error(
  `\n${bubbles.length} bubbles, ${links.length} links, ${rejections.length} rejections. ` +
    `Categories touched: ${categorySpread}. ` +
    `${usage.input_tokens} in / ${usage.output_tokens} out tokens, ${(wallClockMs / 1000).toFixed(1)}s. ` +
    `Saved to ${outPath}.`,
);
