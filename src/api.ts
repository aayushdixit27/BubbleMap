// Client → server calls. AI verbs stream NDJSON; onSnapshot fires with the
// model's accumulating tool input so bubbles render as they arrive (D17 #1).

import type { Arc, Bubble, BubbleMapDoc, Link, LinkKind } from './types';

export interface MapMeta {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  descents: number; // kept descents in the saved map (one committed RAW each)
  killed: number;   // killed descents (RAWs in rejected[]) — Q3's kill-rate
  rawLine?: string; // D48: the song's LINE — the RAW its most recent arc was
                    // built from; or, when no arc exists, the most recent RAW
                    // for identification only (see `dug`)
  dug?: boolean;    // D48: true when rawLine comes from an arc — a line the
                    // human dug into, never silently equated with the fallback
}

export const deleteMap = (id: string): Promise<{ ok: boolean }> =>
  fetch(`/api/maps/${id}`, { method: 'DELETE' }).then(asJson<{ ok: boolean }>);

export interface Snapshot {
  bubbles?: { ref?: string; tier?: string; category?: string; label?: string; sourceLine?: string; note?: string }[];
  links?: { source?: string; target?: string; kind?: LinkKind; rationale?: string }[];
}

export interface Proposal {
  bubbles: Bubble[];
  links: Link[];
  refs: Record<string, string>; // model ref → committed id (accepted bubbles)
  rejections: { reason: string; item: unknown }[];
  usage: { input_tokens: number; output_tokens: number };
}

async function asJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export const fetchMaps = (): Promise<MapMeta[]> => fetch('/api/maps').then(asJson<MapMeta[]>);

export const createMap = (title: string, source: string): Promise<BubbleMapDoc> =>
  fetch('/api/maps', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title, subject: 'song', source }),
  }).then(asJson<BubbleMapDoc>);

export const fetchMap = (id: string): Promise<BubbleMapDoc> =>
  fetch(`/api/maps/${id}`).then(asJson<BubbleMapDoc>);

export const saveMap = (doc: BubbleMapDoc): Promise<{ ok: boolean; updatedAt: string }> =>
  fetch(`/api/maps/${doc.id}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(doc),
    // Survive a reload issued right after the judgment that triggered
    // this save — without keepalive the browser aborts the in-flight PUT.
    keepalive: true,
  }).then(asJson<{ ok: boolean; updatedAt: string }>);

// D46: descent and return. One call per arc, opt-in. Streams the model's
// accumulating passages so the arc view is never silent; resolves to the
// finished, server-built Arc (ids and beat tiers assigned there).
export async function streamArc(
  doc: BubbleMapDoc,
  rawId: string,
  onPassages: (passages: string[]) => void,
): Promise<Arc> {
  const res = await fetch('/api/ai/arc', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ doc, rawId }),
  });
  if (!res.ok || !res.body) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `${res.status} ${res.statusText}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let arc: Arc | null = null;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let newline: number;
    while ((newline = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (!line) continue;
      const msg = JSON.parse(line) as
        | { type: 'snapshot'; snapshot: { passages?: unknown } }
        | { type: 'result'; arc: Arc }
        | { type: 'error'; error: string };
      if (msg.type === 'snapshot') {
        const raw = Array.isArray(msg.snapshot?.passages) ? msg.snapshot.passages : [];
        onPassages(raw.filter((p): p is string => typeof p === 'string'));
      } else if (msg.type === 'result') arc = msg.arc;
      else throw new Error(msg.error);
    }
  }
  if (!arc) throw new Error('arc stream ended without a result');
  return arc;
}

// D44 (Q6): explain a highlighted fragment of a RAW reading. Prose only —
// nothing in the response can become map content. Streams deltas so the
// box is never silent (D17 #1); resolves to the full answer text. The
// trail carries this dig's earlier turns for select-inside-the-answer.
export interface ExplainTurn {
  highlight: string;
  answer: string;
}

export async function streamExplain(
  doc: BubbleMapDoc,
  rawId: string,
  highlight: string,
  trail: ExplainTurn[],
  onDelta: (delta: string) => void,
): Promise<string> {
  const res = await fetch('/api/ai/explain', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ doc, rawId, highlight, trail }),
  });
  if (!res.ok || !res.body) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `${res.status} ${res.statusText}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let text = '';
  let finished = false;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let newline: number;
    while ((newline = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (!line) continue;
      const msg = JSON.parse(line) as
        | { type: 'delta'; text: string }
        | { type: 'result' }
        | { type: 'error'; error: string };
      if (msg.type === 'delta') {
        text += msg.text;
        onDelta(msg.text);
      } else if (msg.type === 'result') finished = true;
      else throw new Error(msg.error);
    }
  }
  if (!finished) throw new Error('explain stream ended without a result');
  return text;
}

export async function streamVerb(
  verb: 'seed' | 'descend' | 'interrogate',
  doc: BubbleMapDoc,
  focusId: string | undefined,
  onSnapshot: (snapshot: Snapshot) => void,
): Promise<Proposal> {
  const res = await fetch(`/api/ai/${verb}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ doc, focusId }),
  });
  if (!res.ok || !res.body) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `${res.status} ${res.statusText}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let result: Proposal | null = null;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let newline: number;
    while ((newline = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (!line) continue;
      const msg = JSON.parse(line) as
        | { type: 'snapshot'; snapshot: Snapshot }
        | { type: 'result'; proposal: Proposal }
        | { type: 'error'; error: string };
      if (msg.type === 'snapshot') onSnapshot(msg.snapshot);
      else if (msg.type === 'result') result = msg.proposal;
      else throw new Error(msg.error);
    }
  }
  if (!result) throw new Error(`${verb} stream ended without a result`);
  return result;
}
