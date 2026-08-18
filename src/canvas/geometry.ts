// Polar math for the target (ARCHITECTURE §6).
//
// EVERY function here takes and returns the bubble's CENTER point in canvas
// space. React Flow's node.position is the TOP-LEFT corner — convert at the
// boundary with toCenter/toTopLeft, every time (§6.1).
//
// Origin (0,0) is the center of the target. Screen coordinates: +y is down.
// Angles are degrees clockwise from +x in y-down screen space, normalized
// to [0, 360).

import type { Bubble, Category, Tier } from '../types';

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Region {
  category: Category;
  tier: Tier;
}

export const RINGS = {
  raw:  { inner: 0,   outer: 380 },
  real: { inner: 420, outer: 640 },
  safe: { inner: 680, outer: 920 },
} as const;

export const LYRIC_MARGIN = 1000;          // lyric bubbles live beyond this

// Quadrant center angles in degrees, clockwise from +x, y-down screen space.
// Matches the notebook: Love top-left, Identity top-right,
//                       Fitness bottom-left, Earnings bottom-right.
export const QUADRANTS = {
  love:     { center: 225, hue: 340 },   // up-left
  identity: { center: 315, hue: 275 },   // up-right
  fitness:  { center: 135, hue: 150 },   // down-left
  earnings: { center:  45, hue:  42 },   // down-right
} as const;

export const WEDGE = 90;        // degrees per quadrant
export const GUTTER = 7;        // degrees of dead space either side of an axis

// §6.1 — nominal node size, used until React Flow populates node.measured.
export const NOMINAL_SIZE: Size = { width: 236, height: 92 };

const TIERS: Tier[] = ['raw', 'real', 'safe'];
const CATEGORIES: Category[] = ['love', 'identity', 'fitness', 'earnings'];

export function toCenter(pos: Point, measured: Size): Point {
  return { x: pos.x + measured.width / 2, y: pos.y + measured.height / 2 };
}

export function toTopLeft(ctr: Point, measured: Size): Point {
  return { x: ctr.x - measured.width / 2, y: ctr.y - measured.height / 2 };
}

const degrees = (c: Point): number => {
  const a = (Math.atan2(c.y, c.x) * 180) / Math.PI;
  return (a + 360) % 360;
};

const radius = (c: Point): number => Math.hypot(c.x, c.y);

// Angular distance to the nearest axis (0 / 90 / 180 / 270).
const axisDistance = (angle: number): number => {
  const m = angle % 90;
  return Math.min(m, 90 - m);
};

// Which quadrant's 90° span contains the angle. Half-open [start, start+90),
// so points exactly on an axis resolve deterministically (they are in a
// gutter either way — regionForPoint still returns null there).
function categoryForAngle(angle: number): Category {
  if (angle < 90) return 'earnings';
  if (angle < 180) return 'fitness';
  if (angle < 270) return 'love';
  return 'identity';
}

function tierForRadius(r: number): Tier | null {
  for (const tier of TIERS) {
    if (r >= RINGS[tier].inner && r <= RINGS[tier].outer) return tier;
  }
  return null;
}

// Strict lookup. Returns null for dead zones (ring gaps, axis gutters) and
// for anything outside the target.
export function regionForPoint(c: Point): Region | null {
  const tier = tierForRadius(radius(c));
  if (!tier) return null;
  const angle = degrees(c);
  if (axisDistance(angle) < GUTTER) return null;
  return { category: categoryForAngle(angle), tier };
}

// Total function. Never returns null: snaps dead zones and out-of-bounds
// points to the nearest valid region. This is what drag-end calls.
// Radial tie (exact middle of a ring gap) breaks toward the deeper ring.
// NOTE: lyric bubbles are exempt from this entirely — the caller never runs
// assignRegion for kind 'lyric' (§6.2).
export function assignRegion(c: Point): Region {
  const strict = regionForPoint(c);
  if (strict) return strict;

  const r = radius(c);
  let tier: Tier;
  if (r > RINGS.safe.outer) {
    // Includes beyond LYRIC_MARGIN: an idea bubble dragged outward snaps
    // back into SAFE, never converts to a lyric (§6.2).
    tier = 'safe';
  } else {
    tier = TIERS.reduce((best, t) => {
      const dist = (x: Tier) => Math.max(RINGS[x].inner - r, r - RINGS[x].outer, 0);
      return dist(t) < dist(best) ? t : best;
    });
  }
  return { category: categoryForAngle(degrees(c)), tier };
}

const toPoint = (angle: number, r: number): Point => ({
  x: r * Math.cos((angle * Math.PI) / 180),
  y: r * Math.sin((angle * Math.PI) / 180),
});

// Candidate radial rows per ring, in preference order. RAW leads with rows
// biased toward the wedge's outer edge to keep the very center clear (§6.2).
function candidateRadii(tier: Tier): number[] {
  const { inner, outer } = RINGS[tier];
  const rows =
    tier === 'raw'
      ? [inner + (outer - inner) * 0.72, outer - 30, inner + (outer - inner) * 0.45, inner + 90]
      : [(inner + outer) / 2, outer - 40, inner + 40];
  const lo = inner + 30;
  const hi = outer - 30;
  return rows
    .map((r) => Math.min(hi, Math.max(lo, r)))
    .filter((r, i, arr) => arr.indexOf(r) === i);
}

// Bubbles are wide and flat, so separation is a rectangle test, not a radial
// distance: half nominal footprint plus breathing room on each axis.
const SEP_X = 260;
const SEP_Y = 150;

// Where should a bubble go? Spreads along the wedge arc and across radial
// rows, avoiding overlap with siblings already in that region. Returns a
// CENTER point that always satisfies regionForPoint(result) ≘ the requested
// region. When a region is genuinely over capacity (the firehose — D12), it
// degrades to the least-overlapping slot rather than stacking.
export function placeInRegion(category: Category, tier: Tier, existing: Bubble[]): Point {
  const center = QUADRANTS[category].center;

  const maxOffset = WEDGE / 2 - GUTTER - 4;
  const angleOffsets: number[] = [0];
  for (let step = 6; step <= maxOffset; step += 6) angleOffsets.push(-step, step);
  if (angleOffsets.indexOf(-maxOffset) === -1) angleOffsets.push(-maxOffset, maxOffset);

  const siblings = existing.filter(
    (b) => b.kind === 'idea' && b.category === category && b.tier === tier,
  );

  // Normalized separation from the nearest sibling: ≥ 1 means no overlap of
  // the nominal footprints on at least one axis.
  const separation = (p: Point): number =>
    Math.min(
      Infinity,
      ...siblings.map((b) =>
        Math.max(Math.abs(b.position.x - p.x) / SEP_X, Math.abs(b.position.y - p.y) / SEP_Y),
      ),
    );

  let best: Point | null = null;
  let bestSeparation = -Infinity;
  for (const r of candidateRadii(tier)) {
    for (const offset of angleOffsets) {
      const candidate = toPoint(center + offset, r);
      const s = separation(candidate);
      if (s >= 1) return candidate;
      if (s > bestSeparation) {
        bestSeparation = s;
        best = candidate;
      }
    }
  }
  return best ?? toPoint(center, candidateRadii(tier)[0]);
}
