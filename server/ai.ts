// Anthropic calls, tool schema, ref resolution (ARCHITECTURE.md §7).
// Every result is a proposal: status 'proposed', origin 'ai'. Nothing here
// writes committed state — committing is a human action in the UI.

import Anthropic from '@anthropic-ai/sdk';
import { nanoid } from 'nanoid';
import type { Bubble, BubbleMapDoc, Category, Link, LinkKind, Tier } from '../src/types';
import { SYSTEM_PROMPT, VERB_SUFFIXES, type Verb } from './prompts';

// §7.1 — one tool, strict schema. The model proposes; it never gets a
// mutation verb. Bubble counts are capped in the schema, not the prompt
// (D16/D18) — §8 stays verbatim, schema constraints are free.
// seed: exactly 3 SAFE + 3 REAL. descend: exactly ONE bubble one tier
// deeper (D25 — the unit of judgment is the descent, so each path carries
// one RAW; choice happens between descents, not between candidates).
// interrogate: max 3, no minimum — §8 says padding is failure, so a
// stalled interrogation may return fewer.
const BUBBLE_CAP: Record<Verb, number> = { seed: 6, descend: 1, interrogate: 3 };
const BUBBLE_MIN: Record<Verb, number> = { seed: 6, descend: 1, interrogate: 0 };

function proposeTool(verb: Verb): Anthropic.Tool {
  return {
  name: 'propose',
  input_schema: {
    type: 'object',
    properties: {
      bubbles: {
        type: 'array',
        maxItems: BUBBLE_CAP[verb],
        minItems: BUBBLE_MIN[verb],
        items: {
          type: 'object',
          properties: {
            ref:        { type: 'string' },                  // "n1", "n2" — temp id
            tier:       { enum: ['safe', 'real', 'raw'] },
            category:   { enum: ['love', 'identity', 'fitness', 'earnings'] },
            label:      { type: 'string' },
            sourceLine: { type: 'string' },                  // verbatim lyric fragment (D23)
            note:       { type: 'string' },
          },
          required: ['ref', 'tier', 'category', 'label', 'sourceLine'],
        },
      },
      links: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            source:    { type: 'string' },  // a ref from above, OR an existing Bubble.id
            target:    { type: 'string' },
            kind:      { enum: ['refines', 'assumes', 'contradicts', 'evidence'] },
            rationale: { type: 'string' },
          },
          required: ['source', 'target', 'kind'],
        },
      },
    },
    required: ['bubbles', 'links'],
  },
  };
}

// The one place the model string lives (CLAUDE.md rule 6). Also serves /api/health.
export function currentModel(): string {
  return process.env.BUBBLEMAP_MODEL ?? 'claude-opus-5';
}

interface RawBubble {
  ref: string;
  tier: Tier;
  category: Category;
  label: string;
  sourceLine: string;
  note?: string;
}

interface RawLink {
  source: string;
  target: string;
  kind: LinkKind;
  rationale?: string;
}

export interface RawProposal {
  bubbles: RawBubble[];
  links: RawLink[];
}

export interface Rejection {
  reason: string;
  item: unknown;               // the raw model output that caused the rejection
}

export interface Proposal {
  bubbles: Bubble[];
  links: Link[];
  // Model ref ("n1") → committed nanoid, for accepted bubbles. Lets the
  // client remap references made against a still-streaming run (D26 #3's
  // seed/descend overlap).
  refs: Record<string, string>;
  rejections: Rejection[];
  raw: unknown;                // verbatim tool input from the model
  model: string;
  usage: { input_tokens: number; output_tokens: number };
}

// onInputJson streams the accumulating tool-input snapshot as it arrives
// (D17 #1) — the caller decides what to render; the CLI and Phase 2 UI both
// hang off this.
export async function propose(
  verb: Verb,
  doc: BubbleMapDoc,
  focusId?: string,
  onInputJson?: (snapshot: unknown) => void,
): Promise<Proposal> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set. Put it in .env (see .env.example).');
  }

  let focus: Bubble | undefined;
  if (verb === 'descend' || verb === 'interrogate') {
    focus = doc.bubbles.find((b) => b.id === focusId);
    if (!focus) {
      throw new Error(`${verb} requires a focusId that exists on the map (got: ${focusId}).`);
    }
    if (verb === 'descend' && focus.tier === 'raw') {
      throw new Error('descend on a RAW bubble is disabled (§7).');
    }
  }

  const client = new Anthropic({ apiKey });
  const model = currentModel();
  const stream = client.messages.stream({
    model,
    max_tokens: 16000,
    system: `${SYSTEM_PROMPT}\n\n${VERB_SUFFIXES[verb]}`,
    tools: [proposeTool(verb)],
    messages: [{ role: 'user', content: buildUserMessage(verb, doc, focus) }],
  });
  if (onInputJson) {
    stream.on('inputJson', (_partial, snapshot) => onInputJson(snapshot));
  }
  const response = await stream.finalMessage();

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use' && block.name === 'propose',
  );
  if (!toolUse) {
    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n');
    throw new Error(
      `Model did not call the propose tool (stop_reason: ${response.stop_reason}).` +
        (text ? `\nText output:\n${text}` : ''),
    );
  }

  return {
    ...resolveProposal(toolUse.input as RawProposal, doc, verb),
    raw: toolUse.input,
    model,
    usage: {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
    },
  };
}

// Per-verb context, per the §7 input column. Harness plumbing only — every
// instruction about WHAT to propose lives in the §8 prompt and its suffixes.
function buildUserMessage(verb: Verb, doc: BubbleMapDoc, focus?: Bubble): string {
  const source = doc.source
    ? `\n\nSource material (lyrics / notes / analysis):\n${doc.source}`
    : '';

  switch (verb) {
    case 'seed':
      return `Song: ${doc.title}\n\nMap this song. Respond by calling the propose tool.${source}`;

    case 'descend': {
      // D26 #3 generates up to ten descents, several from the same SAFE.
      // Like D8 for interrogate: descend cannot avoid duplicating threads
      // it cannot see, so the map's bubbles ride along (labels only, D17 #2).
      const chain = ancestorChain(doc, focus!);
      return (
        `Song: ${doc.title}\n\n` +
        `Focus bubble:\n${describeBubble(focus!, true)}\n\n` +
        `Its ancestor chain (outermost first):\n` +
        `${chain.length ? chain.map((b) => describeBubble(b)).join('\n') : '(none)'}\n\n` +
        `Existing bubbles on the map:\n` +
        `${doc.bubbles.map((b) => describeBubble(b)).join('\n')}\n\n` +
        `In links, refer to the focus bubble by its id, ${focus!.id}, and to new ` +
        `bubbles by their refs. Respond by calling the propose tool.${source}`
      );
    }

    case 'interrogate':
      // §7's input column said focus + source; D8 adds the map's bubbles —
      // contradicts links against bubbles the model cannot see are impossible.
      return (
        `Song: ${doc.title}\n\n` +
        `Focus bubble:\n${describeBubble(focus!, true)}\n\n` +
        `Existing bubbles on the map:\n` +
        `${doc.bubbles.map((b) => describeBubble(b)).join('\n')}\n\n` +
        `In links, refer to existing bubbles by id and to new bubbles by their ` +
        `refs. Respond by calling the propose tool.${source}`
      );
  }
}

// Only the focus carries its note (D17 #2): non-focus bubbles cost
// label + tier + category (+ the id links need, per D8).
function describeBubble(b: Bubble, withNote = false): string {
  const tier = b.tier ? b.tier.toUpperCase() : 'LYRIC';
  const category = b.category ? b.category.toUpperCase() : '—';
  return `- id ${b.id} [${tier} / ${category}] ${b.label}${withNote && b.note ? ` — ${b.note}` : ''}`;
}

// Walk refines links upward (target → source) from the focus to the surface.
function ancestorChain(doc: BubbleMapDoc, focus: Bubble): Bubble[] {
  const chain: Bubble[] = [];
  const seen = new Set([focus.id]);
  let current = focus;
  for (;;) {
    const parentLink = doc.links.find((l) => l.kind === 'refines' && l.target === current.id);
    if (!parentLink) break;
    const parent = doc.bubbles.find((b) => b.id === parentLink.source);
    if (!parent || seen.has(parent.id)) break;
    chain.unshift(parent);
    seen.add(parent.id);
    current = parent;
  }
  return chain;
}

const TIER_DEPTH: Record<Tier, number> = { safe: 0, real: 1, raw: 2 };

// D23's matching rule: whitespace and case are normalised, punctuation is
// ignored entirely — the model quoting "Mr Brightside" against "Mr. Brightside"
// is a match, not a fabrication.
function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// The D23 fabrication guard: a bubble's sourceLine must occur verbatim
// (modulo normalisation) in doc.source. Exported for the invariant tests.
export function sourceLineOccurs(sourceLine: string, source: string | undefined): boolean {
  if (!source) return false;
  const needle = normalizeForMatch(sourceLine);
  if (!needle) return false;
  return normalizeForMatch(source).includes(needle);
}

// Resolve model refs ("n1") to nanoids and validate every link against the
// §5 invariants. Rejections are console.warn'd with the raw model output —
// silent dropping hides prompt regressions. Exported for the invariant tests.
export function resolveProposal(
  raw: RawProposal,
  doc: BubbleMapDoc,
  verb?: Verb,
): Pick<Proposal, 'bubbles' | 'links' | 'refs' | 'rejections'> {
  const now = new Date().toISOString();
  const refToId = new Map<string, string>();
  const bubbles: Bubble[] = [];
  const rejections: Rejection[] = [];
  const rejectItem = (reason: string, item: unknown) => {
    console.warn(`[ai] rejected (${reason}):`, JSON.stringify(item));
    rejections.push({ reason, item });
  };

  // D18's seed contract is 3 SAFE + 3 REAL. The schema can only bound the
  // total (minItems/maxItems 6), not the split — 6 SAFE + 0 REAL would pass
  // it and leave descend nothing to run on. A wrong split is a malformed
  // seed, not six independently judgeable bubbles, so the proposal is
  // rejected whole.
  if (verb === 'seed') {
    const tally = { safe: 0, real: 0 };
    for (const b of raw.bubbles ?? []) if (b.tier === 'safe' || b.tier === 'real') tally[b.tier]++;
    if (tally.safe !== 3 || tally.real !== 3) {
      rejectItem(
        `seed split must be 3 SAFE + 3 REAL (got ${tally.safe} SAFE, ${tally.real} REAL)`,
        raw.bubbles ?? [],
      );
      return { bubbles: [], links: [], refs: {}, rejections };
    }
  }

  for (const rawBubble of raw.bubbles ?? []) {
    if (!rawBubble.ref || !rawBubble.tier || !rawBubble.category || !rawBubble.label || !rawBubble.sourceLine) {
      rejectItem('bubble missing required field', rawBubble);
      continue;
    }
    if (refToId.has(rawBubble.ref)) {
      rejectItem('bubble duplicate ref', rawBubble);
      continue;
    }
    // D23 fabrication guard. AI bubbles are always kind 'idea', so the
    // lyric-bubble exemption never applies here.
    if (!sourceLineOccurs(rawBubble.sourceLine, doc.source)) {
      rejectItem('bubble sourceLine not found in doc.source', rawBubble);
      continue;
    }
    const id = nanoid();
    refToId.set(rawBubble.ref, id);
    bubbles.push({
      id,
      kind: 'idea',
      tier: rawBubble.tier,
      category: rawBubble.category,
      label: rawBubble.label,
      sourceLine: rawBubble.sourceLine,
      ...(rawBubble.note ? { note: rawBubble.note } : {}),
      // Placeholder — Phase 1's placeInRegion assigns real positions.
      position: { x: 0, y: 0 },
      origin: 'ai',
      status: 'proposed',
      createdAt: now,
    });
  }

  const byId = new Map<string, Bubble>();
  for (const bubble of doc.bubbles) byId.set(bubble.id, bubble);
  for (const bubble of bubbles) byId.set(bubble.id, bubble);

  const seenTriples = new Set(doc.links.map((l) => `${l.source} ${l.target} ${l.kind}`));
  const links: Link[] = [];

  for (const rawLink of raw.links ?? []) {
    const reject = (reason: string) => rejectItem(`link ${reason}`, rawLink);

    const source = refToId.get(rawLink.source) ?? rawLink.source;
    const target = refToId.get(rawLink.target) ?? rawLink.target;
    const sourceBubble = byId.get(source);
    const targetBubble = byId.get(target);

    if (!sourceBubble || !targetBubble) {
      reject('endpoint does not resolve to a known bubble');
      continue;
    }
    if (source === target) {
      reject('self-link');
      continue;
    }
    const triple = `${source} ${target} ${rawLink.kind}`;
    if (seenTriples.has(triple)) {
      reject('duplicate (source, target, kind)');
      continue;
    }
    if (sourceBubble.kind === 'lyric') {
      reject('lyric bubble as link source');
      continue;
    }
    if (targetBubble.kind === 'lyric' && rawLink.kind !== 'evidence') {
      reject('only evidence links may target a lyric bubble');
      continue;
    }
    if (rawLink.kind === 'refines') {
      if (sourceBubble.tier === null || targetBubble.tier === null) {
        reject('refines endpoints must both have a tier');
        continue;
      }
      if (TIER_DEPTH[targetBubble.tier] <= TIER_DEPTH[sourceBubble.tier]) {
        reject('refines must go strictly deeper');
        continue;
      }
      // Cross-category refines is allowed and wanted — §1.3.
    }

    seenTriples.add(triple);
    links.push({
      id: nanoid(),
      source,
      target,
      kind: rawLink.kind,
      ...(rawLink.rationale ? { rationale: rawLink.rationale } : {}),
      origin: 'ai',
      status: 'proposed',
    });
  }

  return { bubbles, links, refs: Object.fromEntries(refToId), rejections };
}
