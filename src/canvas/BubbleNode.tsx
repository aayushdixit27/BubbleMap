// Bubble renderer (§9.2). Sets --h from category; tier class supplies
// saturation/intensity. Never clips or ellipsizes the label.
//
// D14 reading surface: label + first sentence by default; the SELECTED bubble
// expands in place to its full note. Handles sit on all four sides — descent
// is radial, so edges come from any direction.

import { Handle, Position } from '@xyflow/react';
import { memo } from 'react';
import type { Bubble } from '../types';

export interface BubbleNodeData {
  bubble: Bubble;
  [key: string]: unknown;
}

const firstSentence = (note: string): string => {
  const match = note.match(/^.*?[.!?](?=\s|$)/s);
  return match ? match[0] : note;
};

const SIDES = [Position.Top, Position.Right, Position.Bottom, Position.Left];

function BubbleNodeInner({ data, selected }: { data: BubbleNodeData; selected?: boolean }) {
  const { bubble } = data;
  const preview = bubble.note ? firstSentence(bubble.note) : null;
  const expanded = Boolean(selected && bubble.note);

  return (
    <div
      className={`bubble tier-${bubble.tier ?? 'safe'}${expanded ? ' expanded' : ''}`}
      style={{ ['--h' as string]: `var(--h-${bubble.category ?? 'love'})` }}
    >
      {SIDES.map((side) => (
        <span key={side}>
          <Handle id={`s-${side}`} type="source" position={side} className="bubble-handle" />
          <Handle id={`t-${side}`} type="target" position={side} className="bubble-handle" />
        </span>
      ))}
      <div className="label">{bubble.label}</div>
      {expanded ? (
        <div className="note-full">{bubble.note}</div>
      ) : (
        preview && <div className="note-preview">{preview}</div>
      )}
    </div>
  );
}

export const BubbleNode = memo(BubbleNodeInner);
