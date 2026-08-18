// Map persistence (§11): one JSON file per map in ./maps/, filenames
// <slug>-<id>.json. Writes are atomic (tmp + rename). Proposals never
// persist — write() strips anything with status 'proposed' (§5).

import { mkdirSync, readFileSync, readdirSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { BubbleMapDoc } from '../src/types';

// Overridable so tests round-trip against a scratch dir, never real maps/.
const MAPS_DIR = process.env.BUBBLEMAP_MAPS_DIR ?? 'maps';

export interface MapMeta {
  id: string;
  title: string;
  updatedAt: string;
}

const slugify = (s: string): string =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'map';

const fileFor = (id: string): string | null => {
  try {
    return readdirSync(MAPS_DIR).find((f) => f.endsWith(`-${id}.json`)) ?? null;
  } catch {
    return null;
  }
};

export function listMaps(): MapMeta[] {
  let files: string[] = [];
  try {
    files = readdirSync(MAPS_DIR).filter((f) => f.endsWith('.json') && !f.startsWith('.tmp-'));
  } catch {
    return [];
  }
  const metas: MapMeta[] = [];
  for (const f of files) {
    try {
      const doc = JSON.parse(readFileSync(join(MAPS_DIR, f), 'utf8')) as BubbleMapDoc;
      metas.push({ id: doc.id, title: doc.title, updatedAt: doc.updatedAt });
    } catch (e) {
      console.warn(`[storage] skipping unreadable map file ${f}:`, e);
    }
  }
  return metas.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function readMap(id: string): BubbleMapDoc | null {
  const file = fileFor(id);
  if (!file) return null;
  const doc = JSON.parse(readFileSync(join(MAPS_DIR, file), 'utf8')) as BubbleMapDoc;
  if (doc.version !== 2) {
    // §5: no v1 ever shipped — fail loudly rather than guess a migration.
    throw new Error(`Map ${id} has unknown version ${String(doc.version)}; refusing to load.`);
  }
  // Files written before D24 lack the rejected array.
  doc.rejected ??= [];
  return doc;
}

export function writeMap(doc: BubbleMapDoc): BubbleMapDoc {
  mkdirSync(MAPS_DIR, { recursive: true });
  const stripped: BubbleMapDoc = {
    ...doc,
    bubbles: doc.bubbles.filter((b) => b.status === 'committed'),
    links: doc.links.filter((l) => l.status === 'committed'),
    // D24: unpicked candidates persist (status stays 'proposed' — the strip
    // above is about the live map, not the rejection record).
    rejected: doc.rejected ?? [],
    updatedAt: new Date().toISOString(),
  };
  const file = `${slugify(doc.title)}-${doc.id}.json`;
  const tmp = join(MAPS_DIR, `.tmp-${doc.id}.json`);
  writeFileSync(tmp, JSON.stringify(stripped, null, 2) + '\n');
  renameSync(tmp, join(MAPS_DIR, file));
  // A title change alters the slug — clean up the old filename.
  const stale = fileFor(doc.id);
  for (const f of readdirSync(MAPS_DIR)) {
    if (f.endsWith(`-${doc.id}.json`) && f !== file) unlinkSync(join(MAPS_DIR, f));
  }
  void stale;
  return stripped;
}

export function deleteMap(id: string): boolean {
  const file = fileFor(id);
  if (!file) return false;
  unlinkSync(join(MAPS_DIR, file));
  return true;
}
