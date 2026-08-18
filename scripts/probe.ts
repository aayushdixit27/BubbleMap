// Phase 0 prompt probe (ARCHITECTURE.md §12).
// Usage: npm run probe -- "<song> — <artist>"
// Calls the seed verb and prints the proposal, grouped by (category, tier),
// for a human to judge: does RAW implicate the narrator, and does category spread?

import { nanoid } from 'nanoid';
import type { BubbleMapDoc, Category, Tier } from '../src/types';
import { propose } from '../server/ai';

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

let bubbles, links;
try {
  ({ bubbles, links } = await propose('seed', doc));
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

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

console.log(
  JSON.stringify(
    {
      title,
      bubbles: grouped,
      links: links.map((l) => ({
        kind: l.kind,
        source: labelById.get(l.source) ?? l.source,
        target: labelById.get(l.target) ?? l.target,
        ...(l.rationale ? { rationale: l.rationale } : {}),
      })),
    },
    null,
    2,
  ),
);

const categorySpread = CATEGORIES.filter((c) => grouped[c]).join(', ') || 'none';
console.error(`\n${bubbles.length} bubbles, ${links.length} links. Categories touched: ${categorySpread}.`);
