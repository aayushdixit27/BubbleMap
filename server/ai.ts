// Anthropic calls, tool schema, ref resolution (ARCHITECTURE.md §7).
// Every result is a proposal: status 'proposed', origin 'ai'. Nothing here
// writes committed state — committing is a human action in the UI.

import Anthropic from '@anthropic-ai/sdk';
import { nanoid } from 'nanoid';
import type { Arc, Bubble, BubbleMapDoc, Category, Link, LinkKind, Tier } from '../src/types';
import { ARC_SUFFIX, EXPLAIN_SUFFIX, MOVE_SUFFIX, SYSTEM_PROMPT, VERB_SUFFIXES, type Verb } from './prompts';

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
            // D58: descend only. Deliberately NOT in `required` — a descent
            // may honestly find no move (omission is the honest no), and a
            // descend can land a REAL, where the field does not apply.
            // Rejecting a good bubble over a missing meta-field is the
            // D51/D53 mistake again. What a move IS lives in the §8 suffix.
            ...(verb === 'descend' ? { move: { type: 'string' } } : {}),
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
            // D51: seed's contract has always been the SAFE→REAL spine —
            // argumentative links are descend's and interrogate's job.
            // Kashmir's seed emitted zero refines links and the SAFE tier
            // vanished from every reading; the enum makes that impossible.
            kind:      verb === 'seed'
              ? { enum: ['refines'] }
              : { enum: ['refines', 'assumes', 'contradicts', 'evidence'] },
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

// A person saw `400 {"type":"error",...}` in the toolbar twice — once in
// the overload episode, once on an empty credit balance. Every AI route
// funnels its caught error through here: known failures become a sentence
// that says what to DO; anything else at least sheds the JSON wrapper.
export function plainApiError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  const status = e instanceof Anthropic.APIError ? e.status : undefined;
  if (/credit balance is too low/i.test(msg)) {
    return (
      'Anthropic says the credit balance is too low. Top up at ' +
      'console.anthropic.com (Billing), then try again — a partly-run song ' +
      'resumes from its toolbar; nothing already landed is lost.'
    );
  }
  if (status === 529 || /overloaded/i.test(msg)) {
    return 'Anthropic is overloaded right now. Wait a minute and try again.';
  }
  if (status === 401 || /authentication_error|invalid x-api-key/i.test(msg)) {
    return 'The API key was rejected. Check ANTHROPIC_API_KEY in .env and restart the server.';
  }
  if (status === 429 || /rate[ _-]?limit/i.test(msg)) {
    return 'Rate-limited by Anthropic. Wait a minute and try again.';
  }
  // The SDK embeds the raw JSON body in its message — surface the human
  // part of it when present, the message untouched when not.
  return /"message"\s*:\s*"([^"]*)"/.exec(msg)?.[1] ?? msg;
}

interface RawBubble {
  ref: string;
  tier: Tier;
  category: Category;
  label: string;
  sourceLine: string;
  note?: string;
  move?: string; // D58: descend's RAW bubbles only
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
  // D53: a seed rejected whole (orphaned REAL, bad split) is a SAMPLING
  // outcome, not a deterministic fault — re-sample up to twice before
  // failing loudly. The line is "would a re-sample plausibly succeed?":
  // yes for a bad spine or split; no for a malformed request, which
  // throws instead. A retry streams over the previous attempt's ghosts
  // (same runId — replaceRun swaps them in place).
  const attempts = verb === 'seed' ? 3 : 1;
  for (let attempt = 1; ; attempt++) {
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

    const resolved = resolveProposal(toolUse.input as RawProposal, doc, verb);
    if (verb === 'seed' && resolved.bubbles.length === 0 && attempt < attempts) {
      console.warn(
        `[ai] seed attempt ${attempt} of ${attempts} rejected whole — re-sampling:`,
        resolved.rejections.map((r) => r.reason).join('; '),
      );
      continue;
    }
    return {
      ...resolved,
      raw: toolUse.input,
      model,
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
      },
    };
  }
}

// D48: nominateKeeper (D41/D42) is cut with the keeper. The arc is the
// choosing act; the song's line now comes from the RAW an arc was built
// from (see storage.ts listMaps).

// D44 (Q6): the fifth verb — explain a highlighted fragment of a RAW
// reading, streamed as prose. No tool and no proposal: nothing in the
// response can become map content, so there is nothing to commit and Hard
// Rule 1 is untouched. The trail carries this dig's earlier turns so a
// selection made inside an answer digs deeper rather than starting over.
// The criterion (what an explanation IS) lives in EXPLAIN_SUFFIX, §8-grade
// product copy; the user messages carry only plumbing.
export interface ExplainTurn {
  highlight: string;
  answer: string;
}

// D58 (amended): name the move of one descent — one sentence on what the
// writer DID, generated on demand and persisted to the RAW bubble's
// `move` field by the client. The whole chain rides along with notes
// (same argument as explain: the rest of the map is irrelevant to one
// descent). No streaming — the answer is one sentence; the client shows
// its own pending state.
export async function nameMove(
  doc: BubbleMapDoc,
  rawId: string,
): Promise<{ text: string; model: string; usage: { input_tokens: number; output_tokens: number } }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set. Put it in .env (see .env.example).');
  }
  const raw = doc.bubbles.find((b) => b.id === rawId);
  if (!raw || raw.tier !== 'raw') {
    throw new Error(`move requires the id of a RAW bubble on the map (got: ${rawId}).`);
  }

  const descent = [...ancestorChain(doc, raw), raw].map((b) => describeBubble(b, true)).join('\n');
  const source = doc.source
    ? `\n\nSource material (lyrics / notes / analysis):\n${doc.source}`
    : '';

  const client = new Anthropic({ apiKey });
  const model = currentModel();
  const response = await client.messages.create({
    model,
    // One sentence of prose — but Opus 5 thinks by default and thinking
    // counts against max_tokens. Never starve a cap (found live 20 Aug).
    max_tokens: 3000,
    system: `${SYSTEM_PROMPT}\n\n${MOVE_SUFFIX}`,
    messages: [
      {
        role: 'user',
        content:
          `Song: ${doc.title}\n\n` +
          `The descent, surface to raw:\n${descent}${source}`,
      },
    ],
  });
  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();
  if (!text) {
    throw new Error(`move returned no text (stop_reason: ${response.stop_reason}).`);
  }
  return {
    text,
    model,
    usage: {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
    },
  };
}

export async function explainHighlight(
  doc: BubbleMapDoc,
  rawId: string,
  highlight: string,
  trail: ExplainTurn[],
  onText?: (delta: string) => void,
): Promise<{ text: string; model: string; usage: { input_tokens: number; output_tokens: number } }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set. Put it in .env (see .env.example).');
  }
  const raw = doc.bubbles.find((b) => b.id === rawId);
  if (!raw || raw.tier !== 'raw') {
    throw new Error(`explain requires the id of a RAW bubble on the map (got: ${rawId}).`);
  }

  // The reading under the highlight IS the focus, so the whole chain rides
  // along with notes (D17 #2 trims non-focus context; there is none here —
  // the rest of the map is irrelevant to explaining one reading).
  const reading = [...ancestorChain(doc, raw), raw].map((b) => describeBubble(b, true)).join('\n');
  const source = doc.source
    ? `\n\nSource material (lyrics / notes / analysis):\n${doc.source}`
    : '';

  const messages: Anthropic.MessageParam[] = [
    {
      role: 'user',
      content:
        `Song: ${doc.title}\n\n` +
        `The reading, surface to raw:\n${reading}\n\n` +
        `The reader highlighted: "${trail.length ? trail[0].highlight : highlight}"${source}`,
    },
  ];
  for (const [i, turn] of trail.entries()) {
    messages.push({ role: 'assistant', content: turn.answer });
    messages.push({
      role: 'user',
      content: `Now the reader has highlighted, inside your last answer: "${
        i + 1 < trail.length ? trail[i + 1].highlight : highlight
      }"`,
    });
  }

  const client = new Anthropic({ apiKey });
  const model = currentModel();
  const stream = client.messages.stream({
    model,
    // Opus 5 runs adaptive thinking by default, and thinking tokens count
    // against max_tokens — a 400 cap starved the call to zero text
    // (stop_reason max_tokens, found live 20 Aug). The cap must hold the
    // thinking AND the prose; the prose's register lives in the suffix
    // (product copy), not in this number.
    max_tokens: 3000,
    system: `${SYSTEM_PROMPT}\n\n${EXPLAIN_SUFFIX}`,
    messages,
  });
  if (onText) stream.on('text', (delta) => onText(delta));
  const response = await stream.finalMessage();
  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();
  if (!text) {
    throw new Error(`explain returned no text (stop_reason: ${response.stop_reason}).`);
  }
  return {
    text,
    model,
    usage: {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
    },
  };
}

// D46: descent and return — one chosen descent rewritten as a narrative
// arc of five beats, RAW → REAL → SAFE → REAL → RAW. The beat count and
// order are structural, so the count lives in the schema (D16) and the
// tiers are assigned by position here, never trusted to the model. The
// ask itself (what an arc IS) lives in ARC_SUFFIX, product copy.
export const ARC_TIERS: Tier[] = ['raw', 'real', 'safe', 'real', 'raw'];

export async function writeArc(
  doc: BubbleMapDoc,
  rawId: string,
  onInputJson?: (snapshot: unknown) => void,
): Promise<{ arc: Arc; model: string; usage: { input_tokens: number; output_tokens: number } }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set. Put it in .env (see .env.example).');
  }
  const raw = doc.bubbles.find((b) => b.id === rawId);
  if (!raw || raw.tier !== 'raw') {
    throw new Error(`arc requires the id of a RAW bubble on the map (got: ${rawId}).`);
  }

  // The whole descent rides along with notes — it is the material being
  // rewritten, so nothing about it is trimmed (D17 #2 trims non-focus
  // context; the rest of the map is irrelevant here and stays out).
  const reading = [...ancestorChain(doc, raw), raw].map((b) => describeBubble(b, true)).join('\n');
  const source = doc.source
    ? `\n\nSource material (lyrics / notes / analysis):\n${doc.source}`
    : '';

  const client = new Anthropic({ apiKey });
  const model = currentModel();
  const stream = client.messages.stream({
    model,
    // Adaptive thinking plus five beats of prose (the explain lesson:
    // thinking counts against max_tokens — never starve the cap).
    max_tokens: 8000,
    system: `${SYSTEM_PROMPT}\n\n${ARC_SUFFIX}`,
    tools: [
      {
        name: 'arc',
        input_schema: {
          type: 'object',
          properties: {
            // Exactly five, schema-enforced (D16). Order is RAW, REAL,
            // SAFE, REAL, RAW — assigned by position server-side.
            passages: { type: 'array', minItems: 5, maxItems: 5, items: { type: 'string' } },
          },
          required: ['passages'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'arc' },
    messages: [
      {
        role: 'user',
        content:
          `Song: ${doc.title}\n\n` +
          `The reading, surface to raw:\n${reading}\n\n` +
          `Respond by calling the arc tool with the five passages in order: ` +
          `RAW, REAL, SAFE, REAL, RAW.${source}`,
      },
    ],
  });
  if (onInputJson) {
    stream.on('inputJson', (_partial, snapshot) => onInputJson(snapshot));
  }
  const response = await stream.finalMessage();

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use' && block.name === 'arc',
  );
  const passages = ((toolUse?.input as { passages?: unknown })?.passages ?? []) as unknown[];
  const texts = passages.filter((p): p is string => typeof p === 'string' && p.trim().length > 0);
  if (texts.length !== 5) {
    throw new Error(
      `arc returned ${texts.length} usable passages, not 5 (stop_reason: ${response.stop_reason}).`,
    );
  }

  return {
    arc: {
      id: nanoid(),
      rawId,
      beats: texts.map((text, i) => ({ tier: ARC_TIERS[i], text: text.trim() })),
      createdAt: new Date().toISOString(),
    },
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
// D52 (amends D23): a "/" joins quoted lines across a line break — the
// standard lyric convention — so the citation verifies PER SEGMENT: each
// part must occur in the source. Out-of-order joins pass; every part is
// still a real line, and the guard's job is fabrication, not citation
// style. (Kashmir, 21 Aug: five honest couplet citations flagged because
// the matcher required the concatenation to be contiguous.)
export function sourceLineOccurs(sourceLine: string, source: string | undefined): boolean {
  if (!source) return false;
  const haystack = normalizeForMatch(source);
  if (!haystack) return false;
  const segments = sourceLine.split('/').map(normalizeForMatch).filter(Boolean);
  if (!segments.length) return false;
  return segments.every((segment) => haystack.includes(segment));
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
    // D39 (amends D23): a failed citation match FLAGS, it does not reject.
    // The reading is the product; the citation is provenance — a bad one
    // is a fact to surface, not proof the reading is false. Silent
    // rejection was the AI deciding for the human (Hard Rule 1). The flag
    // rate is the diagnostic: if it stays high, that's a §8 problem and
    // it belongs to the architect. Still warned here so the log keeps
    // the sensor.
    const citationUnverified = !sourceLineOccurs(rawBubble.sourceLine, doc.source);
    if (citationUnverified) {
      console.warn('[ai] citation unverified (kept, flagged):', JSON.stringify(rawBubble));
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
      ...(citationUnverified ? { citationUnverified: true } : {}),
      ...(rawBubble.note ? { note: rawBubble.note } : {}),
      // D58: the move belongs to the RAW bubble; one emitted anywhere else
      // is dropped silently — it has no surface and no meaning there.
      ...(rawBubble.move && rawBubble.tier === 'raw' ? { move: rawBubble.move } : {}),
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

  // D51 as loosened by D53: guard on BREAKAGE, not shape. The only
  // condition that breaks a reading is an ORPHANED REAL — one with no
  // SAFE refines parent, which is the original Kashmir bug. Extra
  // links, or one SAFE parenting several REALs, render fine (D32's
  // repeat treatment; spawns produce the same shape mid-run) and stay
  // permitted. An orphan rejects the seed whole; the caller re-samples
  // before surfacing (a bad spine is a sampling outcome).
  if (verb === 'seed') {
    const safeIds = new Set(bubbles.filter((b) => b.tier === 'safe').map((b) => b.id));
    const orphaned = bubbles.filter(
      (b) =>
        b.tier === 'real' &&
        !links.some((l) => l.kind === 'refines' && l.target === b.id && safeIds.has(l.source)),
    );
    if (orphaned.length) {
      rejectItem(
        `seed spine incomplete — ${orphaned.length} REAL bubble${
          orphaned.length === 1 ? '' : 's'
        } with no SAFE parent`,
        raw.links ?? [],
      );
      return { bubbles: [], links: [], refs: {}, rejections };
    }
  }

  return { bubbles, links, refs: Object.fromEntries(refToId), rejections };
}
