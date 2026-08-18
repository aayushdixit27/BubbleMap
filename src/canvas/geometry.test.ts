import { describe, expect, it } from 'vitest';
import type { Bubble, Category, Tier } from '../types';
import {
  GUTTER,
  LYRIC_MARGIN,
  NOMINAL_SIZE,
  QUADRANTS,
  RINGS,
  assignRegion,
  placeInRegion,
  regionForPoint,
  toCenter,
  toTopLeft,
  type Point,
} from './geometry';

const CATEGORIES = Object.keys(QUADRANTS) as Category[];
const TIERS = Object.keys(RINGS) as Tier[];

const at = (angleDeg: number, r: number): Point => ({
  x: r * Math.cos((angleDeg * Math.PI) / 180),
  y: r * Math.sin((angleDeg * Math.PI) / 180),
});

const ringMid = (tier: Tier): number => (RINGS[tier].inner + RINGS[tier].outer) / 2;

describe('regionForPoint', () => {
  it('resolves every quadrant × every ring at wedge centers and ring midpoints', () => {
    for (const category of CATEGORIES) {
      for (const tier of TIERS) {
        const c = at(QUADRANTS[category].center, ringMid(tier));
        expect(regionForPoint(c)).toEqual({ category, tier });
      }
    }
  });

  it('respects screen orientation (+y down): love up-left, earnings down-right', () => {
    expect(regionForPoint({ x: -375, y: -375 })).toEqual({ category: 'love', tier: 'real' });
    expect(regionForPoint({ x: 375, y: -375 })).toEqual({ category: 'identity', tier: 'real' });
    expect(regionForPoint({ x: -375, y: 375 })).toEqual({ category: 'fitness', tier: 'real' });
    expect(regionForPoint({ x: 375, y: 375 })).toEqual({ category: 'earnings', tier: 'real' });
  });

  it('returns null in both ring gaps at every quadrant center', () => {
    for (const category of CATEGORIES) {
      expect(regionForPoint(at(QUADRANTS[category].center, 400))).toBeNull(); // raw–real gap
      expect(regionForPoint(at(QUADRANTS[category].center, 660))).toBeNull(); // real–safe gap
    }
  });

  it('returns null in the axis gutters at every ring', () => {
    for (const axis of [0, 90, 180, 270]) {
      for (const tier of TIERS) {
        expect(regionForPoint(at(axis + GUTTER - 1, ringMid(tier)))).toBeNull();
        expect(regionForPoint(at(axis - GUTTER + 1, ringMid(tier)))).toBeNull();
        expect(regionForPoint(at(axis, ringMid(tier)))).toBeNull();
      }
    }
  });

  it('is alive just outside a gutter and dead just inside a ring boundary gap', () => {
    expect(regionForPoint(at(45 + GUTTER + 38 - 45, ringMid('real')))).not.toBeNull();
    expect(regionForPoint(at(45, RINGS.raw.outer))).toEqual({ category: 'earnings', tier: 'raw' });
    expect(regionForPoint(at(45, RINGS.raw.outer + 1))).toBeNull();
    expect(regionForPoint(at(45, RINGS.real.inner))).toEqual({ category: 'earnings', tier: 'real' });
  });

  it('returns null out of bounds, including beyond LYRIC_MARGIN, and at the exact center', () => {
    expect(regionForPoint(at(225, RINGS.safe.outer + 1))).toBeNull();
    expect(regionForPoint(at(225, LYRIC_MARGIN + 200))).toBeNull();
    expect(regionForPoint({ x: 0, y: 0 })).toBeNull(); // angle 0 → axis gutter
  });
});

describe('assignRegion', () => {
  it('never returns null across a dense polar sweep', () => {
    for (let angle = 0; angle < 360; angle += 3) {
      for (const r of [0, 50, 390, 410, 500, 650, 670, 800, 921, 1500, 3000]) {
        const region = assignRegion(at(angle, r));
        expect(region.category).toBeTruthy();
        expect(region.tier).toBeTruthy();
      }
    }
  });

  it('agrees with regionForPoint wherever regionForPoint is non-null', () => {
    for (let angle = 1; angle < 360; angle += 7) {
      for (const tier of TIERS) {
        const c = at(angle, ringMid(tier));
        const strict = regionForPoint(c);
        if (strict) expect(assignRegion(c)).toEqual(strict);
      }
    }
  });

  it('snaps ring gaps to the nearest ring', () => {
    const angle = QUADRANTS.identity.center;
    expect(assignRegion(at(angle, 390))).toEqual({ category: 'identity', tier: 'raw' });
    expect(assignRegion(at(angle, 412))).toEqual({ category: 'identity', tier: 'real' });
    expect(assignRegion(at(angle, 650))).toEqual({ category: 'identity', tier: 'real' });
    expect(assignRegion(at(angle, 672))).toEqual({ category: 'identity', tier: 'safe' });
  });

  it('snaps axis gutters to the adjacent quadrant', () => {
    expect(assignRegion(at(3, ringMid('real')))).toEqual({ category: 'earnings', tier: 'real' });
    expect(assignRegion(at(87, ringMid('real')))).toEqual({ category: 'earnings', tier: 'real' });
    expect(assignRegion(at(93, ringMid('safe')))).toEqual({ category: 'fitness', tier: 'safe' });
    expect(assignRegion(at(357, ringMid('raw')))).toEqual({ category: 'identity', tier: 'raw' });
  });

  it('snaps beyond the SAFE outer radius back into SAFE — even past LYRIC_MARGIN', () => {
    for (const category of CATEGORIES) {
      const angle = QUADRANTS[category].center;
      expect(assignRegion(at(angle, RINGS.safe.outer + 40))).toEqual({ category, tier: 'safe' });
      expect(assignRegion(at(angle, LYRIC_MARGIN + 500))).toEqual({ category, tier: 'safe' });
    }
  });
});

describe('toCenter / toTopLeft', () => {
  it('round-trips to the original point, both directions', () => {
    const points: Point[] = [
      { x: 0, y: 0 },
      { x: -812.5, y: 293.25 },
      { x: 118, y: -46 },
      { x: 1234.75, y: -987.5 },
    ];
    for (const p of points) {
      expect(toTopLeft(toCenter(p, NOMINAL_SIZE), NOMINAL_SIZE)).toEqual(p);
      expect(toCenter(toTopLeft(p, NOMINAL_SIZE), NOMINAL_SIZE)).toEqual(p);
      const odd = { width: 231, height: 95 };
      expect(toTopLeft(toCenter(p, odd), odd)).toEqual(p);
    }
  });

  it('offsets by half the measured size', () => {
    expect(toCenter({ x: 0, y: 0 }, NOMINAL_SIZE)).toEqual({ x: 118, y: 46 });
    expect(toTopLeft({ x: 0, y: 0 }, NOMINAL_SIZE)).toEqual({ x: -118, y: -46 });
  });
});

describe('placeInRegion', () => {
  const mkBubble = (category: Category, tier: Tier, position: Point, i: number): Bubble => ({
    id: `b${i}`,
    kind: 'idea',
    tier,
    category,
    label: `bubble ${i}`,
    position,
    origin: 'ai',
    status: 'committed',
    createdAt: '2026-08-18T00:00:00.000Z',
  });

  it('lands inside the requested region when the region is empty', () => {
    for (const category of CATEGORIES) {
      for (const tier of TIERS) {
        const p = placeInRegion(category, tier, []);
        expect(regionForPoint(p)).toEqual({ category, tier });
      }
    }
  });

  it('keeps landing inside the region as it fills up, without stacking', () => {
    for (const category of CATEGORIES) {
      for (const tier of TIERS) {
        const placed: Bubble[] = [];
        for (let i = 0; i < 5; i++) {
          const p = placeInRegion(category, tier, placed);
          expect(regionForPoint(p)).toEqual({ category, tier });
          for (const prior of placed) {
            const dx = Math.abs(prior.position.x - p.x);
            const dy = Math.abs(prior.position.y - p.y);
            if (i < 3) {
              // Within capacity (§6.2: 2–3 per RAW wedge): footprints must
              // not overlap — clear on at least one axis.
              expect(Math.max(dx / 260, dy / 150)).toBeGreaterThanOrEqual(1);
            } else {
              // Over capacity: degrade, never stack.
              expect(Math.max(dx, dy)).toBeGreaterThan(60);
            }
          }
          placed.push(mkBubble(category, tier, p, i));
        }
      }
    }
  });

  it('ignores bubbles from other regions and lyric bubbles when spacing', () => {
    const elsewhere = [
      mkBubble('love', 'safe', placeInRegion('love', 'safe', []), 0),
      { ...mkBubble('love', 'raw', { x: -260, y: -140 }, 1), kind: 'lyric' as const, tier: null, category: null },
    ];
    const empty = placeInRegion('love', 'raw', []);
    expect(placeInRegion('love', 'raw', elsewhere)).toEqual(empty);
  });

  it('biases RAW toward the wedge outer edge, keeping the very center clear', () => {
    for (const category of CATEGORIES) {
      const p = placeInRegion(category, 'raw', []);
      expect(Math.hypot(p.x, p.y)).toBeGreaterThan(RINGS.raw.outer / 2);
    }
  });

  it('is deterministic for identical inputs', () => {
    const existing = [mkBubble('fitness', 'real', placeInRegion('fitness', 'real', []), 0)];
    expect(placeInRegion('fitness', 'real', existing)).toEqual(
      placeInRegion('fitness', 'real', existing),
    );
  });
});
