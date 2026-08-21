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
  createdAt: string;
  updatedAt: string;
  descents: number; // committed RAW bubbles — one per descent (D25/D26)
  killed: number;   // RAW bubbles parked in rejected[] — killed descents.
                    // With descents, this is Q3's kill-rate, per song: the
                    // number PRODUCT §2 wants measured.
  rawLine?: string; // D48: the song's LINE — the RAW its most recent arc was
                    // built from (the human dug there); no arc → the most
                    // recent RAW, for identification only
  dug?: boolean;    // D48: rawLine comes from an arc. The UI must keep the
                    // distinction visible, never silently equate the two.
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
      // Files hold committed bubbles only, so raws are the kept descents.
      const raws = doc.bubbles.filter((b) => b.tier === 'raw');
      // D48: the song's line is the RAW its most recent arc was built
      // from — the arc is the choosing act. The arc's raw may since have
      // been killed into rejected[]; its label still names the line.
      const arcs = doc.arcs ?? [];
      let dugLine: string | undefined;
      for (let i = arcs.length - 1; i >= 0 && dugLine === undefined; i--) {
        const b =
          doc.bubbles.find((x) => x.id === arcs[i].rawId) ??
          (doc.rejected ?? []).find((x) => x.id === arcs[i].rawId);
        if (b) dugLine = b.label;
      }
      const latest = raws.length
        ? raws.reduce((a, b) => (b.createdAt > a.createdAt ? b : a))
        : null;
      const line = dugLine ?? latest?.label;
      metas.push({
        id: doc.id,
        title: doc.title,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        descents: raws.length,
        killed: (doc.rejected ?? []).filter((b) => b.tier === 'raw').length,
        ...(line ? { rawLine: line, dug: dugLine !== undefined } : {}),
      });
    } catch (e) {
      console.warn(`[storage] skipping unreadable map file ${f}:`, e);
    }
  }
  // The library is "most recent first" by when the song was made (D26 #1).
  return metas.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
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
