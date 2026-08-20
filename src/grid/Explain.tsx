// D44 (Q6) — "explain this": select words in a RAW reading and dig into
// exactly those words. The affordance appears at the selection; the answer
// streams into a hovering box; clicking away (or Escape) dismisses it.
//
// Implementer decisions (D36, reported):
// - Scope: selections inside a RAW step in Readings, and inside the box's
//   own current answer. Not SAFE/REAL — the gap was "the raw section just
//   ends there", and RAW is where the dig continues.
// - The answer EVAPORATES on dismissal. Persisting it would put AI prose
//   on the doc — a data-model change, which is an escalation area — and
//   would turn a dig into a report that accretes. Asking again is cheap.
// - PRODUCT §1 (digging): the current answer is itself selectable and
//   explainable, so every answer is a place to keep pushing. Earlier
//   turns stay visible above it in muted ink (D32's register) — the hole
//   you dug through. Digging deeper keeps the box where it stands.
// - Nothing here can touch the doc. Read aid only; Hard Rule 1 untouched.
// - No native dialogs, nothing modal (PROGRESS: inline surfaces only).

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { streamExplain, type ExplainTurn } from '../api';
import { useMapStore } from '../store';

interface Offer {
  rawId: string;
  text: string;
  fromBox: boolean;
  // Viewport coords of the selection: the affordance sits under its end;
  // a fresh box anchors to its left edge.
  buttonX: number;
  buttonY: number;
  boxX: number;
  selTop: number;
  selBottom: number;
}

interface Dig {
  rawId: string;
  highlight: string;
  answer: string;
  streaming: boolean;
  error: string | null;
  trail: ExplainTurn[];
  x: number;
  // The box opens below the selection, or above it when the lower half of
  // the viewport is cramped — either way it never covers the highlight.
  above: boolean;
  selTop: number;
  selBottom: number;
}

const BOX_WIDTH = 420;

export function ExplainLayer() {
  const doc = useMapStore((s) => s.doc);
  const readOnly = useMapStore((s) => s.readOnly);
  const [offer, setOffer] = useState<Offer | null>(null);
  const [dig, setDig] = useState<Dig | null>(null);
  // Streams from an abandoned dig must not write into the current one.
  const seq = useRef(0);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const digRef = useRef<Dig | null>(null);
  digRef.current = dig;

  // Offer "explain this" when a selection settles inside a RAW step or
  // inside the box's current answer.
  useEffect(() => {
    if (readOnly) return;
    const onMouseUp = () => {
      // Selection state settles after mouseup — read it a tick later.
      setTimeout(() => {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed) return setOffer(null);
        const text = sel.toString().trim();
        if (!text) return setOffer(null);
        const range = sel.getRangeAt(0);
        const node = range.commonAncestorContainer;
        const el = node instanceof Element ? node : node.parentElement;
        const fromBox = Boolean(el?.closest('.explain-answer'));
        // A selection in a still-streaming answer waits — its turn isn't a
        // complete rung of the trail yet.
        if (fromBox && (!digRef.current || digRef.current.streaming)) return setOffer(null);
        const rawId = fromBox
          ? digRef.current!.rawId
          : el?.closest('[data-explain-raw]')?.getAttribute('data-explain-raw') ?? undefined;
        if (!rawId) return setOffer(null);
        const rect = range.getBoundingClientRect();
        setOffer({
          rawId,
          text,
          fromBox,
          buttonX: Math.min(rect.right + 6, window.innerWidth - 110),
          buttonY: rect.bottom + 4,
          boxX: Math.min(Math.max(rect.left, 12), window.innerWidth - BOX_WIDTH - 12),
          selTop: rect.top,
          selBottom: rect.bottom,
        });
      }, 0);
    };
    document.addEventListener('mouseup', onMouseUp);
    return () => document.removeEventListener('mouseup', onMouseUp);
  }, [readOnly]);

  // Clicking away dismisses box and dig together; Escape too. The dig's
  // memory evaporates with it — by design, nothing persists.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as Element | null;
      if (t?.closest('.explain-box') || t?.closest('.explain-offer')) return;
      seq.current += 1;
      setDig(null);
      setOffer(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        seq.current += 1;
        setDig(null);
        setOffer(null);
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  // Streamed text lands at the bottom of the box — keep it in view.
  useEffect(() => {
    const box = boxRef.current;
    if (box && dig?.streaming) box.scrollTop = box.scrollHeight;
  }, [dig?.answer, dig?.streaming]);

  if (!doc || readOnly) return null;

  const ask = (o: Offer) => {
    const prev = digRef.current;
    const digDeeper = o.fromBox && prev !== null && prev.answer !== '' && prev.error === null;
    const trail: ExplainTurn[] = digDeeper
      ? [...prev.trail, { highlight: prev.highlight, answer: prev.answer }]
      : [];
    const next: Dig = digDeeper
      ? { ...prev, highlight: o.text, answer: '', streaming: true, error: null, trail }
      : {
          rawId: o.rawId,
          highlight: o.text,
          answer: '',
          streaming: true,
          error: null,
          trail: [],
          x: o.boxX,
          above: window.innerHeight - o.selBottom < 240,
          selTop: o.selTop,
          selBottom: o.selBottom,
        };
    const mySeq = ++seq.current;
    setDig(next);
    setOffer(null);
    window.getSelection()?.removeAllRanges();
    streamExplain(doc, o.rawId, o.text, trail, (delta) => {
      if (seq.current !== mySeq) return;
      setDig((d) => (d ? { ...d, answer: d.answer + delta } : d));
    })
      .then(() => {
        if (seq.current !== mySeq) return;
        setDig((d) => (d ? { ...d, streaming: false } : d));
      })
      .catch((e: unknown) => {
        if (seq.current !== mySeq) return;
        const message = e instanceof Error ? e.message : String(e);
        setDig((d) => (d ? { ...d, streaming: false, error: message } : d));
      });
  };

  const boxStyle: CSSProperties | undefined = dig
    ? dig.above
      ? {
          left: dig.x,
          bottom: window.innerHeight - dig.selTop + 8,
          maxHeight: Math.max(dig.selTop - 24, 120),
        }
      : {
          left: dig.x,
          top: dig.selBottom + 30,
          maxHeight: Math.max(window.innerHeight - dig.selBottom - 46, 120),
        }
    : undefined;

  return (
    <>
      {offer && (
        <button
          className="text-action explain-offer"
          style={{ left: offer.buttonX, top: offer.buttonY }}
          // Keep the selection alive through the click.
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => ask(offer)}
        >
          explain this
        </button>
      )}
      {dig && (
        <div ref={boxRef} className="explain-box" style={boxStyle}>
          {dig.trail.map((turn, i) => (
            <div key={i} className="explain-turn explain-past">
              <div className="marginalia">“{turn.highlight}”</div>
              <div className="explain-answer-past">{turn.answer}</div>
            </div>
          ))}
          <div className="explain-turn">
            <div className="marginalia">“{dig.highlight}”</div>
            <div className="explain-answer">{dig.answer || (dig.streaming ? 'digging…' : '')}</div>
            {dig.error && <div className="status-error explain-error">{dig.error}</div>}
          </div>
          {!dig.streaming && !dig.error && (
            <div className="explain-hint">select any of this to keep digging · click away to close</div>
          )}
        </div>
      )}
    </>
  );
}
