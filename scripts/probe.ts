// Phase 0 prompt probe — full chain (ARCHITECTURE §12 Phase 0).
// Usage: npm run probe -- "<song> — <artist>"
//
// Runs all four verbs per song:
//   seed → descend on every REAL → interrogate on every REAL → relink once.
//
// Lyrics are human-supplied ground truth (§7.3): the probe refuses to run
// without a non-empty probe-runs/lyrics/<name>.txt whose name is a prefix of
// the song's slug. The probe harness commits each proposal into the in-memory
// doc so the next verb can see it — a stand-in for the human accept, for
// probing only. Nothing persists to maps/.
//
// Every bubble is recorded with the verb that produced it, its parent, and a
// cross-category flag. Full output saved to probe-runs/<lyrics-name>.json.

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { nanoid } from 'nanoid';
import type { Bubble, BubbleMapDoc, Link } from '../src/types';
import { propose, type Proposal, type Rejection } from '../server/ai';
import type { Verb } from '../server/prompts';

try {
  process.loadEnvFile('.env');
} catch {
  // No .env — propose() reports the missing key with instructions.
}

const title = process.argv.slice(2).join(' ').trim();
if (!title) {
  console.error('Usage: npm run probe -- "<song> — <artist>"');
  process.exit(1);
}

const slugify = (s: string): string =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const slug = slugify(title);

// Lyrics file: the probe-runs/lyrics/*.md (or .txt) whose slugified name — a
// trailing "lyrics" word aside — is the longest prefix of the song's slug.
const lyricsDir = 'probe-runs/lyrics';
let lyricsFiles: string[] = [];
try {
  lyricsFiles = readdirSync(lyricsDir).filter((f) => /\.(md|txt)$/i.test(f));
} catch {
  // Missing dir handled below with the same message as no match.
}
const match = lyricsFiles
  .map((file) => ({ file, key: slugify(file.replace(/\.(md|txt)$/i, '')).replace(/-?lyrics$/, '') }))
  .filter(({ key }) => key && (slug === key || slug.startsWith(`${key}-`)))
  .sort((a, b) => b.key.length - a.key.length)[0];
if (!match) {
  console.error(`No lyrics file found for "${title}" — expected ${lyricsDir}/<prefix-of-${slug}>.md`);
  process.exit(1);
}
const lyricsName = match.key;
const lyricsPath = `${lyricsDir}/${match.file}`;
const lyrics = readFileSync(lyricsPath, 'utf8').trim();
if (!lyrics) {
  console.error(
    `${lyricsPath} is empty. Lyrics are human-supplied ground truth (§7.3, §12) — paste them in, then re-run.`,
  );
  process.exit(1);
}

const ranAt = new Date().toISOString();
const doc: BubbleMapDoc = {
  version: 2,
  id: nanoid(),
  title,
  subject: 'song',
  source: lyrics,
  bubbles: [],
  links: [],
  createdAt: ranAt,
  updatedAt: ranAt,
};

interface CallRecord {
  verb: Verb;
  focus: { id: string; label: string; tier: string | null } | null;
  bubblesProposed: number;
  linksProposed: number;
  rejections: Rejection[];
  usage: { input_tokens: number; output_tokens: number };
  wallClockMs: number;
  raw: unknown;
}

interface BubbleRecord {
  id: string;
  verb: Verb;
  tier: string | null;
  category: string | null;
  label: string;
  note?: string;
  parent: { id: string; label: string; tier: string | null; category: string | null } | null;
  parentLinkKind?: string;
  parentLinkRationale?: string;
  crossCategory: boolean;
}

interface LinkRecord {
  verb: Verb;
  kind: string;
  source: string;
  sourceLabel: string;
  target: string;
  targetLabel: string;
  crossCategory: boolean;
  rationale?: string;
}

const calls: CallRecord[] = [];
const bubbleRecords: BubbleRecord[] = [];
const linkRecords: LinkRecord[] = [];
let modelUsed = '';

function bubbleById(id: string): Bubble | undefined {
  return doc.bubbles.find((b) => b.id === id);
}

async function runVerb(verb: Verb, focusId?: string): Promise<Proposal> {
  const focus = focusId ? bubbleById(focusId) : undefined;
  console.error(`→ ${verb}${focus ? ` on [${focus.tier?.toUpperCase()}] ${focus.label}` : ''}...`);

  const startedAt = Date.now();
  const proposal = await propose(verb, doc, focusId);
  const wallClockMs = Date.now() - startedAt;
  modelUsed = proposal.model;

  calls.push({
    verb,
    focus: focus ? { id: focus.id, label: focus.label, tier: focus.tier } : null,
    bubblesProposed: proposal.bubbles.length,
    linksProposed: proposal.links.length,
    rejections: proposal.rejections,
    usage: proposal.usage,
    wallClockMs,
    raw: proposal.raw,
  });

  // Harness-accept: commit into the in-memory doc so the next verb sees it.
  for (const b of proposal.bubbles) doc.bubbles.push({ ...b, status: 'committed' });
  for (const l of proposal.links) doc.links.push({ ...l, status: 'committed' });

  for (const b of proposal.bubbles) {
    // Parent = source of the first link in this proposal that targets the bubble.
    const parentLink = proposal.links.find((l) => l.target === b.id);
    const parent = parentLink ? bubbleById(parentLink.source) : undefined;
    bubbleRecords.push({
      id: b.id,
      verb,
      tier: b.tier,
      category: b.category,
      label: b.label,
      ...(b.note ? { note: b.note } : {}),
      parent: parent
        ? { id: parent.id, label: parent.label, tier: parent.tier, category: parent.category }
        : null,
      ...(parentLink ? { parentLinkKind: parentLink.kind } : {}),
      ...(parentLink?.rationale ? { parentLinkRationale: parentLink.rationale } : {}),
      crossCategory: Boolean(parent && b.category && parent.category && parent.category !== b.category),
    });
  }

  for (const l of proposal.links) {
    const s = bubbleById(l.source);
    const t = bubbleById(l.target);
    linkRecords.push({
      verb,
      kind: l.kind,
      source: l.source,
      sourceLabel: s?.label ?? l.source,
      target: l.target,
      targetLabel: t?.label ?? l.target,
      crossCategory: Boolean(s?.category && t?.category && s.category !== t.category),
      ...(l.rationale ? { rationale: l.rationale } : {}),
    });
  }

  console.error(
    `  ${proposal.bubbles.length} bubbles, ${proposal.links.length} links, ` +
      `${proposal.rejections.length} rejections, ${(wallClockMs / 1000).toFixed(1)}s`,
  );
  return proposal;
}

try {
  await runVerb('seed');

  // Capture the REAL set once, after seed — descend adds RAW, not REAL.
  const reals = doc.bubbles.filter((b) => b.tier === 'real');
  for (const real of reals) await runVerb('descend', real.id);
  for (const real of reals) await runVerb('interrogate', real.id);
  await runVerb('relink');
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

const totals = calls.reduce(
  (acc, c) => ({
    input_tokens: acc.input_tokens + c.usage.input_tokens,
    output_tokens: acc.output_tokens + c.usage.output_tokens,
    wallClockMs: acc.wallClockMs + c.wallClockMs,
    rejections: acc.rejections + c.rejections.length,
  }),
  { input_tokens: 0, output_tokens: 0, wallClockMs: 0, rejections: 0 },
);

const result = {
  title,
  model: modelUsed,
  ranAt,
  lyricsFile: lyricsPath,
  lyricsChars: lyrics.length,
  totals,
  bubbles: bubbleRecords,
  links: linkRecords,
  calls,
};

mkdirSync('probe-runs', { recursive: true });
const outPath = `probe-runs/${lyricsName}.json`;
writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n');

console.log(JSON.stringify(result, null, 2));
console.error(
  `\n${calls.length} calls: ${bubbleRecords.length} bubbles, ${linkRecords.length} links, ` +
    `${totals.rejections} rejections. ${totals.input_tokens} in / ${totals.output_tokens} out tokens, ` +
    `${(totals.wallClockMs / 1000).toFixed(1)}s. Saved to ${outPath}.`,
);
