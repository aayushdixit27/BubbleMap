// Save/load round-trip: committed entries and rejected[] survive a write
// and read back; proposed ghosts are stripped by the write. This is the
// invariant the dogfood loop's autosave depends on.

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

process.env.BUBBLEMAP_MAPS_DIR = mkdtempSync(join(tmpdir(), 'bubblemap-storage-test-'));

const { readMap, writeMap, deleteMap, listMaps } = await import('./storage');

import { afterAll, describe, expect, it } from 'vitest';
import type { Bubble, BubbleMapDoc, Link } from '../src/types';

afterAll(() => {
  rmSync(process.env.BUBBLEMAP_MAPS_DIR!, { recursive: true, force: true });
});

const mkBubble = (id: string, status: Bubble['status']): Bubble => ({
  id,
  kind: 'idea',
  tier: 'real',
  category: 'love',
  label: `label ${id}`,
  sourceLine: 'a line from the song',
  note: `note ${id}`,
  position: { x: 1, y: 2 },
  origin: 'ai',
  status,
  createdAt: '2026-08-18T00:00:00.000Z',
});

const mkLink = (id: string, source: string, target: string, status: Link['status']): Link => ({
  id,
  source,
  target,
  kind: 'refines',
  origin: 'ai',
  status,
});

describe('storage — save/load round-trip', () => {
  it('persists committed bubbles/links and rejected[]; strips proposed; survives reload', () => {
    const doc: BubbleMapDoc = {
      version: 2,
      id: 'roundtrip1',
      title: 'Round Trip — Nobody',
      subject: 'song',
      source: 'a line from the song',
      bubbles: [mkBubble('kept', 'committed'), mkBubble('ghost', 'proposed')],
      links: [
        mkLink('l-kept', 'kept', 'kept2', 'committed'),
        mkLink('l-ghost', 'kept', 'ghost', 'proposed'),
      ],
      rejected: [mkBubble('unpicked-a', 'proposed'), mkBubble('unpicked-b', 'proposed')],
      createdAt: '2026-08-18T00:00:00.000Z',
      updatedAt: '2026-08-18T00:00:00.000Z',
    };

    writeMap(doc);
    const loaded = readMap('roundtrip1');

    expect(loaded).not.toBeNull();
    expect(loaded!.bubbles.map((b) => b.id)).toEqual(['kept']);
    expect(loaded!.links.map((l) => l.id)).toEqual(['l-kept']);
    expect(loaded!.rejected.map((b) => b.id)).toEqual(['unpicked-a', 'unpicked-b']);
    // Full fidelity on what survives — sourceLine and note included.
    expect(loaded!.bubbles[0]).toMatchObject({
      label: 'label kept',
      sourceLine: 'a line from the song',
      note: 'note kept',
      status: 'committed',
    });
    expect(loaded!.title).toBe('Round Trip — Nobody');
    expect(loaded!.source).toBe('a line from the song');

    // A second write of the loaded doc must be lossless (reload → autosave).
    writeMap(loaded!);
    const reloaded = readMap('roundtrip1');
    expect(reloaded!.bubbles.map((b) => b.id)).toEqual(['kept']);
    expect(reloaded!.rejected.map((b) => b.id)).toEqual(['unpicked-a', 'unpicked-b']);

    expect(listMaps().some((m) => m.id === 'roundtrip1')).toBe(true);
    expect(deleteMap('roundtrip1')).toBe(true);
  });

  it('backfills rejected: [] for files written before D24', () => {
    const legacy = {
      version: 2,
      id: 'legacy1',
      title: 'Legacy',
      subject: 'song',
      bubbles: [],
      links: [],
      createdAt: '2026-08-18T00:00:00.000Z',
      updatedAt: '2026-08-18T00:00:00.000Z',
    };
    writeFileSync(
      join(process.env.BUBBLEMAP_MAPS_DIR!, 'legacy-legacy1.json'),
      JSON.stringify(legacy),
    );
    const loaded = readMap('legacy1');
    expect(loaded!.rejected).toEqual([]);
    expect(deleteMap('legacy1')).toBe(true);
  });
});
