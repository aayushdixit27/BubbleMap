// D46 — DESCENT AND RETURN, the fourth view. One chosen descent rewritten
// as a narrative arc: RAW → REAL → SAFE → REAL → RAW. The thesis is that
// this is the shape the best songs and sets actually move in — nobody can
// hold raw for eight minutes; you surface for air and dive again.
//
// Display per the ruling: a DIVE PROFILE as index at the top (RAW at the
// bottom, consistent with the target's bullseye), prose running linearly
// beneath — the curve is an index, not a container. The D22 crescendo
// carries the arc: RAW beats 20px serif near-black, REAL 16px serif,
// SAFE 14px SANS — serif carries the payload, the safe beat is the
// breath, and the reader feels the relief because the typeface relaxes.
// Roman numerals tie each dot to its passage.
//
// A streaming draft renders beats as they arrive (never a silent page);
// killing an arc is one gesture, undoable for the session (D26 #2).

import { useMapStore, type ArcDraft } from '../store';
import type { Arc, ArcBeat, Tier } from '../types';

const NUMERAL = ['i', 'ii', 'iii', 'iv', 'v'];
const ARC_TIERS: Tier[] = ['raw', 'real', 'safe', 'real', 'raw'];

// The profile: 5 beats across, depth down. RAW is the bottom, like the
// bullseye. Hairline + ink dots only (D22) — no fills, no glow.
const W = 440;
const H = 150;
const XS = [40, 130, 220, 310, 400];
const Y: Record<Tier, number> = { safe: 30, real: 74, raw: 118 };

function DiveProfile({ beats }: { beats: { tier: Tier }[] }) {
  const pts = beats.map((b, i) => ({ x: XS[i], y: Y[b.tier] }));
  // A smooth dive: cubic segments with horizontal tangents at each beat,
  // so the curve rests at every depth before moving on.
  const path = pts
    .map((p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const prev = pts[i - 1];
      const mid = (prev.x + p.x) / 2;
      return `C ${mid} ${prev.y}, ${mid} ${p.y}, ${p.x} ${p.y}`;
    })
    .join(' ');
  return (
    <svg
      className="arc-profile"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="The arc's dive profile: raw, up for air, and back down"
    >
      {(['safe', 'real', 'raw'] as Tier[]).map((t) => (
        <text key={t} x={4} y={Y[t] + 4} className="arc-axis">
          {t}
        </text>
      ))}
      {pts.length > 1 && (
        <path d={path} fill="none" stroke="var(--ink-mid)" strokeWidth={1.5} />
      )}
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={5} fill="var(--ink)" />
          <text x={p.x} y={H - 8} className="arc-numeral" textAnchor="middle">
            {NUMERAL[i]}
          </text>
        </g>
      ))}
    </svg>
  );
}

function Beat({ beat, index }: { beat: ArcBeat; index: number }) {
  return (
    <div className={`arc-beat t-${beat.tier}`}>
      <span className="arc-beat-numeral">{NUMERAL[index]}</span>
      <div className="arc-beat-text">{beat.text}</div>
    </div>
  );
}

export function ArcView() {
  const doc = useMapStore((s) => s.doc);
  const draft = useMapStore((s) => s.arcDraft);
  const readOnly = useMapStore((s) => s.readOnly);
  const killArc = useMapStore((s) => s.killArc);

  if (!doc) return null;
  const arcs = [...(doc.arcs ?? [])].reverse(); // newest first — the fresh dig on top
  const rawLabel = (rawId: string) => doc.bubbles.find((b) => b.id === rawId)?.label;

  // The streaming draft: beats appear as they arrive, tiers assigned by
  // position — the same rule the server commits with.
  const draftBeats = (d: ArcDraft): ArcBeat[] =>
    d.passages.slice(0, 5).map((text, i) => ({ tier: ARC_TIERS[i], text }));

  return (
    <div className="readings arc-view">
      {!draft && arcs.length === 0 && (
        <div className="readings-empty">
          No arcs yet. On the target, open a reading and choose “descent and return”
          — one descent, written as the dive a song actually takes.
        </div>
      )}
      {draft && (
        <div className="reading arc">
          <div className="marginalia">
            descent and return{rawLabel(draft.rawId) ? ` · ${rawLabel(draft.rawId)}` : ''}
            <span className="entry-state"> · writing…</span>
          </div>
          <DiveProfile beats={draftBeats(draft)} />
          {draftBeats(draft).map((beat, i) => (
            <Beat key={i} beat={beat} index={i} />
          ))}
        </div>
      )}
      {arcs.map((arc: Arc) => (
        <div key={arc.id} className="reading arc">
          <div className="marginalia">
            descent and return{rawLabel(arc.rawId) ? ` · ${rawLabel(arc.rawId)}` : ''}
          </div>
          <DiveProfile beats={arc.beats} />
          {arc.beats.map((beat, i) => (
            <Beat key={i} beat={beat} index={i} />
          ))}
          {!readOnly && (
            <div className="entry-actions reading-actions">
              <button className="text-action" onClick={() => killArc(arc.id)}>
                kill this arc
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
