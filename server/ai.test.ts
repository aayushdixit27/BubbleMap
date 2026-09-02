// §5 invariant tests for ref resolution (CLAUDE.md: no upward refines, no
// orphan link endpoints, no duplicate (source, target, kind), lyric rules).

import { describe, expect, it } from 'vitest';
import type { Bubble, BubbleMapDoc, Link, Tier } from '../src/types';
import { plainApiError, resolveProposal, sourceLineOccurs, type RawProposal } from './ai';
import type { Verb } from './prompts';

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

const propose = (raw: Partial<RawProposal>, doc = mkDoc(), verb?: Verb) =>
  resolveProposal({ bubbles: [], links: [], ...raw }, doc, verb);

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

describe('resolveProposal — sourceLine guard (D23, amended by D39: flags, never rejects)', () => {
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
    expect(result.bubbles[0].citationUnverified).toBeUndefined();
    expect(result.bubbles[1].citationUnverified).toBeUndefined();
  });

  it('D39: a sourceLine that does not occur is KEPT and flagged, and its links resolve', () => {
    const result = propose({
      bubbles: [
        { ref: 'n1', tier: 'safe', category: 'love', label: 'grounded', sourceLine: LINE },
        { ref: 'n2', tier: 'real', category: 'love', label: 'uncited', sourceLine: 'explain the emails' },
      ],
      links: [{ source: 'n1', target: 'n2', kind: 'refines' }],
    });
    expect(result.bubbles).toHaveLength(2);
    expect(result.bubbles[0].citationUnverified).toBeUndefined();
    expect(result.bubbles[1].citationUnverified).toBe(true);
    expect(result.bubbles[1].label).toBe('uncited'); // content untouched
    expect(result.links).toHaveLength(1); // endpoint exists, link survives
    expect(result.rejections).toHaveLength(0); // a flag is not a rejection
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

  it('D39: with no doc.source nothing can verify — every bubble is kept, flagged', () => {
    const doc = mkDoc();
    delete doc.source;
    const result = propose(
      { bubbles: [{ ref: 'n1', tier: 'safe', category: 'love', label: 'a', sourceLine: LINE }] },
      doc,
    );
    expect(result.bubbles).toHaveLength(1);
    expect(result.bubbles[0].citationUnverified).toBe(true);
    expect(result.rejections).toHaveLength(0);
  });
});

describe('resolveProposal — D18 seed split (3 SAFE + 3 REAL)', () => {
  const seedOf = (tiers: Tier[]) =>
    tiers.map((tier, i) => ({
      ref: `n${i}`,
      tier,
      category: 'love' as const,
      label: `b${i}`,
      sourceLine: LINE,
    }));

  // D51: a valid seed now carries its spine — 3 refines, one per REAL.
  const SPINE = [
    { source: 'n0', target: 'n3', kind: 'refines' as const },
    { source: 'n1', target: 'n4', kind: 'refines' as const },
    { source: 'n2', target: 'n5', kind: 'refines' as const },
  ];

  it('accepts a seed of exactly 3 SAFE + 3 REAL with a full spine', () => {
    const result = propose(
      { bubbles: seedOf(['safe', 'safe', 'safe', 'real', 'real', 'real']), links: SPINE },
      mkDoc(),
      'seed',
    );
    expect(result.bubbles).toHaveLength(6);
    expect(result.links).toHaveLength(3);
    expect(result.rejections).toHaveLength(0);
  });

  it('rejects the proposal whole when the split is off, dropping its links too', () => {
    const result = propose(
      {
        bubbles: seedOf(['safe', 'safe', 'safe', 'safe', 'safe', 'safe']),
        links: [{ source: 'n0', target: 'n1', kind: 'refines' }],
      },
      mkDoc(),
      'seed',
    );
    expect(result.bubbles).toHaveLength(0);
    expect(result.links).toHaveLength(0);
    expect(result.rejections.map((r) => r.reason)).toEqual([
      'seed split must be 3 SAFE + 3 REAL (got 6 SAFE, 0 REAL)',
    ]);
  });

  it('counts a stray RAW bubble against the split', () => {
    const result = propose(
      { bubbles: seedOf(['safe', 'safe', 'safe', 'real', 'real', 'raw']) },
      mkDoc(),
      'seed',
    );
    expect(result.bubbles).toHaveLength(0);
    expect(result.rejections.map((r) => r.reason)).toEqual([
      'seed split must be 3 SAFE + 3 REAL (got 3 SAFE, 2 REAL)',
    ]);
  });

  it('does not apply the split to other verbs', () => {
    const result = propose({ bubbles: seedOf(['raw', 'raw', 'raw']) }, mkDoc(), 'descend');
    expect(result.bubbles).toHaveLength(3);
    expect(result.rejections).toHaveLength(0);
  });

  // D58: the move belongs to the RAW bubble. Kept there, dropped silently
  // anywhere else, and never required — omission is the honest no.
  it('keeps a move on a RAW bubble and drops one on any other tier', () => {
    const withMoves = seedOf(['raw', 'real']).map((b) => ({ ...b, move: 'he does a thing' }));
    const result = propose({ bubbles: withMoves }, mkDoc(), 'descend');
    expect(result.bubbles).toHaveLength(2);
    expect(result.bubbles[0].move).toBe('he does a thing');
    expect(result.bubbles[1].move).toBeUndefined();
    expect(result.rejections).toHaveLength(0);
  });

  it('accepts a RAW bubble with no move — omission is the honest no', () => {
    const result = propose({ bubbles: seedOf(['raw']) }, mkDoc(), 'descend');
    expect(result.bubbles).toHaveLength(1);
    expect(result.bubbles[0].move).toBeUndefined();
    expect(result.rejections).toHaveLength(0);
  });

  // D51 (as loosened by D53): guard on breakage, not shape. Only an
  // ORPHANED REAL — no SAFE refines parent — rejects the seed.
  describe('the seed spine', () => {
    const SEED = seedOf(['safe', 'safe', 'safe', 'real', 'real', 'real']);

    it('rejects the proposal whole when the spine is missing entirely', () => {
      const result = propose({ bubbles: SEED, links: [] }, mkDoc(), 'seed');
      expect(result.bubbles).toHaveLength(0);
      expect(result.links).toHaveLength(0);
      expect(result.rejections.map((r) => r.reason)).toEqual([
        'seed spine incomplete — 3 REAL bubbles with no SAFE parent',
      ]);
    });

    it('rejects a spine that leaves one REAL orphaned', () => {
      const result = propose(
        {
          bubbles: SEED,
          links: [
            { source: 'n0', target: 'n3', kind: 'refines' },
            { source: 'n1', target: 'n3', kind: 'refines' }, // n3 twice, n5 never
            { source: 'n2', target: 'n4', kind: 'refines' },
          ],
        },
        mkDoc(),
        'seed',
      );
      expect(result.bubbles).toHaveLength(0);
      expect(result.rejections.map((r) => r.reason)).toEqual([
        'seed spine incomplete — 1 REAL bubble with no SAFE parent',
      ]);
    });

    it('permits one SAFE parenting all three REALs (D53 — renders fine, arises mid-run)', () => {
      const result = propose(
        {
          bubbles: SEED,
          links: [
            { source: 'n0', target: 'n3', kind: 'refines' },
            { source: 'n0', target: 'n4', kind: 'refines' },
            { source: 'n0', target: 'n5', kind: 'refines' },
          ],
        },
        mkDoc(),
        'seed',
      );
      expect(result.bubbles).toHaveLength(6);
      expect(result.links).toHaveLength(3);
      expect(result.rejections).toHaveLength(0);
    });

    it('permits extra links beyond the spine (D53 — tidiness is not breakage)', () => {
      const result = propose(
        {
          bubbles: SEED,
          links: [
            { source: 'n0', target: 'n3', kind: 'refines' },
            { source: 'n1', target: 'n4', kind: 'refines' },
            { source: 'n2', target: 'n5', kind: 'refines' },
            { source: 'n0', target: 'n4', kind: 'refines' }, // a second parent
          ],
        },
        mkDoc(),
        'seed',
      );
      expect(result.bubbles).toHaveLength(6);
      expect(result.links).toHaveLength(4);
      expect(result.rejections).toHaveLength(0);
    });

    it('does not apply the spine to other verbs', () => {
      const result = propose(
        { bubbles: [{ ref: 'n1', tier: 'raw', category: 'love', label: 'x', sourceLine: LINE }] },
        mkDoc(),
        'descend',
      );
      expect(result.bubbles).toHaveLength(1);
      expect(result.rejections).toHaveLength(0);
    });
  });
});

// D52 (amends D23): slash-joined couplets verify per segment.
describe('sourceLineOccurs — D52 slash-joined citations', () => {
  const SRC = 'It started out with a kiss\nsome other line entirely\nIt was only a kiss';

  it('passes a couplet whose halves occur non-adjacently', () => {
    expect(sourceLineOccurs('It started out with a kiss / It was only a kiss', SRC)).toBe(true);
  });

  it('passes out-of-order joins — each part is still a real line', () => {
    expect(sourceLineOccurs('It was only a kiss / It started out with a kiss', SRC)).toBe(true);
  });

  it('fails when any segment is fabricated', () => {
    expect(sourceLineOccurs('It started out with a kiss / explain the emails', SRC)).toBe(false);
  });

  it('still matches plain single-line citations, normalised', () => {
    expect(sourceLineOccurs('it started out with a KISS!', SRC)).toBe(true);
    expect(sourceLineOccurs('a line that is not there', SRC)).toBe(false);
  });
});

// A person saw the raw SDK JSON in the toolbar twice (overload episode,
// credit balance). Known failures become a sentence that says what to do;
// unknown ones at least shed the JSON wrapper; plain errors pass through.
describe('plainApiError', () => {
  it('turns the credit-balance error into instructions', () => {
    const e = new Error(
      '400 {"type":"error","error":{"type":"invalid_request_error","message":"Your credit balance is too low to access the Anthropic API."}}',
    );
    const out = plainApiError(e);
    expect(out).toContain('credit balance is too low');
    expect(out).toContain('console.anthropic.com');
    expect(out).not.toContain('{');
  });

  it('names the overloaded case', () => {
    expect(plainApiError(new Error('529 {"type":"error","error":{"type":"overloaded_error","message":"Overloaded"}}'))).toContain('overloaded');
  });

  it('unwraps unknown API JSON to its message', () => {
    expect(
      plainApiError(new Error('400 {"type":"error","error":{"type":"weird","message":"something novel"}}')),
    ).toBe('something novel');
  });

  it('passes plain errors through untouched', () => {
    expect(plainApiError(new Error('descend exceeded 60s'))).toBe('descend exceeded 60s');
  });
});
