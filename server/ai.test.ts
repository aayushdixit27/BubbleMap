// §5 invariant tests for ref resolution (CLAUDE.md: no upward refines, no
// orphan link endpoints, no duplicate (source, target, kind), lyric rules).

import { describe, expect, it } from 'vitest';
import type { Bubble, BubbleMapDoc, Link } from '../src/types';
import { resolveProposal, type RawProposal } from './ai';

const SOURCE = 'It started out with a kiss\nHow did it end up like this?\nIt was only a kiss';
const LINE = 'started out with a kiss';

const mkBubble = (partial: Partial<Bubble> & Pick<Bubble, 'id' | 'tier' | 'category'>): Bubble => ({
  kind: 'idea',
  label: partial.id,
  sourceLine: LINE,
  position: { x: 0, y: 0 },
  origin: 'user',
  status: 'committed',
  createdAt: '2026-08-18T00:00:00.000Z',
  ...partial,
});

const mkDoc = (bubbles: Bubble[] = [], links: Link[] = []): BubbleMapDoc => ({
  version: 2,
  id: 'doc',
  title: 'Test — Nobody',
  subject: 'song',
  source: SOURCE,
  bubbles,
  links,
  rejected: [],
  createdAt: '2026-08-18T00:00:00.000Z',
  updatedAt: '2026-08-18T00:00:00.000Z',
});

const propose = (raw: Partial<RawProposal>, doc = mkDoc()) =>
  resolveProposal({ bubbles: [], links: [], ...raw }, doc);

describe('resolveProposal — §5 invariants', () => {
  it('resolves refs to real ids and keeps valid links, including cross-category refines', () => {
    const result = propose({
      bubbles: [
        { ref: 'n1', tier: 'safe', category: 'love', label: 'surface', sourceLine: LINE },
        { ref: 'n2', tier: 'real', category: 'identity', label: 'beneath', sourceLine: LINE },
      ],
      links: [{ source: 'n1', target: 'n2', kind: 'refines', rationale: 'crosses category' }],
    });
    expect(result.bubbles).toHaveLength(2);
    expect(result.links).toHaveLength(1);
    expect(result.rejections).toHaveLength(0);
    expect(result.links[0].source).toBe(result.bubbles[0].id);
    expect(result.links[0].target).toBe(result.bubbles[1].id);
    expect(result.bubbles.every((b) => b.status === 'proposed' && b.origin === 'ai')).toBe(true);
  });

  it('rejects refines that do not go strictly deeper (upward and same-tier)', () => {
    const result = propose({
      bubbles: [
        { ref: 'n1', tier: 'raw', category: 'love', label: 'deep', sourceLine: LINE },
        { ref: 'n2', tier: 'real', category: 'love', label: 'shallower', sourceLine: LINE },
        { ref: 'n3', tier: 'real', category: 'love', label: 'same tier', sourceLine: LINE },
      ],
      links: [
        { source: 'n1', target: 'n2', kind: 'refines' }, // upward
        { source: 'n3', target: 'n2', kind: 'refines' }, // sideways
      ],
    });
    expect(result.links).toHaveLength(0);
    expect(result.rejections.map((r) => r.reason)).toEqual([
      'link refines must go strictly deeper',
      'link refines must go strictly deeper',
    ]);
  });

  it('rejects links with orphan endpoints and self-links', () => {
    const result = propose({
      bubbles: [{ ref: 'n1', tier: 'safe', category: 'fitness', label: 'a', sourceLine: LINE }],
      links: [
        { source: 'n1', target: 'ghost-id', kind: 'assumes' },
        { source: 'n1', target: 'n1', kind: 'assumes' },
      ],
    });
    expect(result.links).toHaveLength(0);
    expect(result.rejections.map((r) => r.reason)).toEqual([
      'link endpoint does not resolve to a known bubble',
      'link self-link',
    ]);
  });

  it('rejects duplicate (source, target, kind) triples, including against existing doc links', () => {
    const a = mkBubble({ id: 'a', tier: 'safe', category: 'love' });
    const b = mkBubble({ id: 'b', tier: 'real', category: 'love' });
    const existing: Link = {
      id: 'l1', source: 'a', target: 'b', kind: 'refines', origin: 'user', status: 'committed',
    };
    const result = propose(
      {
        links: [
          { source: 'a', target: 'b', kind: 'refines' }, // dup of existing
          { source: 'a', target: 'b', kind: 'assumes' }, // different kind — fine
          { source: 'a', target: 'b', kind: 'assumes' }, // dup within proposal
        ],
      },
      mkDoc([a, b], [existing]),
    );
    expect(result.links).toHaveLength(1);
    expect(result.links[0].kind).toBe('assumes');
    expect(result.rejections.map((r) => r.reason)).toEqual([
      'link duplicate (source, target, kind)',
      'link duplicate (source, target, kind)',
    ]);
  });

  it('enforces the lyric rules: never a source, only evidence may target one', () => {
    const idea = mkBubble({ id: 'idea', tier: 'real', category: 'earnings' });
    const lyric = mkBubble({ id: 'lyric', kind: 'lyric', tier: null, category: null });
    const result = propose(
      {
        links: [
          { source: 'lyric', target: 'idea', kind: 'assumes' },
          { source: 'idea', target: 'lyric', kind: 'refines' },
          { source: 'idea', target: 'lyric', kind: 'evidence' }, // allowed
        ],
      },
      mkDoc([idea, lyric]),
    );
    expect(result.links).toHaveLength(1);
    expect(result.links[0].kind).toBe('evidence');
    expect(result.rejections.map((r) => r.reason)).toEqual([
      'link lyric bubble as link source',
      'link only evidence links may target a lyric bubble',
    ]);
  });

  it('rejects bubbles missing required fields and duplicate refs, then drops their links', () => {
    const result = propose({
      bubbles: [
        { ref: 'n1', tier: 'raw', category: 'identity', label: 'ok', sourceLine: LINE },
        { ref: 'n2', tier: 'raw', category: undefined as never, label: 'no category', sourceLine: LINE },
        { ref: 'n1', tier: 'safe', category: 'love', label: 'dup ref', sourceLine: LINE },
      ],
      links: [{ source: 'n2', target: 'n1', kind: 'assumes' }],
    });
    expect(result.bubbles).toHaveLength(1);
    expect(result.links).toHaveLength(0);
    expect(result.rejections.map((r) => r.reason)).toEqual([
      'bubble missing required field',
      'bubble duplicate ref',
      'link endpoint does not resolve to a known bubble',
    ]);
  });
});

describe('resolveProposal — D23 sourceLine fabrication guard', () => {
  it('accepts a sourceLine that occurs in doc.source, ignoring case, whitespace and punctuation', () => {
    const result = propose({
      bubbles: [
        // "how did it end up like this?" with case, spacing and punctuation mangled
        { ref: 'n1', tier: 'safe', category: 'love', label: 'a', sourceLine: 'How   did it end up like this' },
        { ref: 'n2', tier: 'real', category: 'love', label: 'b', sourceLine: 'IT WAS ONLY A KISS.' },
      ],
    });
    expect(result.bubbles).toHaveLength(2);
    expect(result.rejections).toHaveLength(0);
    expect(result.bubbles[0].sourceLine).toBe('How   did it end up like this');
  });

  it('rejects a sourceLine that does not occur in doc.source, and drops its links', () => {
    const result = propose({
      bubbles: [
        { ref: 'n1', tier: 'safe', category: 'love', label: 'grounded', sourceLine: LINE },
        { ref: 'n2', tier: 'real', category: 'love', label: 'fabricated', sourceLine: 'explain the emails' },
      ],
      links: [{ source: 'n1', target: 'n2', kind: 'refines' }],
    });
    expect(result.bubbles).toHaveLength(1);
    expect(result.links).toHaveLength(0);
    expect(result.rejections.map((r) => r.reason)).toEqual([
      'bubble sourceLine not found in doc.source',
      'link endpoint does not resolve to a known bubble',
    ]);
  });

  it('rejects a missing or empty sourceLine as a missing required field', () => {
    const result = propose({
      bubbles: [
        { ref: 'n1', tier: 'safe', category: 'love', label: 'no line', sourceLine: undefined as never },
        { ref: 'n2', tier: 'real', category: 'love', label: 'empty line', sourceLine: '' },
      ],
    });
    expect(result.bubbles).toHaveLength(0);
    expect(result.rejections.map((r) => r.reason)).toEqual([
      'bubble missing required field',
      'bubble missing required field',
    ]);
  });

  it('rejects every bubble when the doc has no source — nothing can be verified', () => {
    const doc = mkDoc();
    delete doc.source;
    const result = propose(
      { bubbles: [{ ref: 'n1', tier: 'safe', category: 'love', label: 'a', sourceLine: LINE }] },
      doc,
    );
    expect(result.bubbles).toHaveLength(0);
    expect(result.rejections.map((r) => r.reason)).toEqual(['bubble sourceLine not found in doc.source']);
  });
});
