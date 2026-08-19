// Shared types — single source of truth (ARCHITECTURE.md §5).
// Imported by both the client and the server.

export type Tier = 'safe' | 'real' | 'raw';
export type Category = 'love' | 'identity' | 'fitness' | 'earnings';

export type LinkKind =
  | 'refines'      // target is a deeper cut of source. The descent spine.
  | 'assumes'      // source only holds if target is true. The interrogation edge.
  | 'contradicts'  // target undercuts source. How assumptions die.
  | 'evidence';    // target is a lyric/moment supporting source.

export type Origin = 'user' | 'ai';
export type Status = 'committed' | 'proposed';

export interface Bubble {
  id: string;                 // nanoid
  kind: 'idea' | 'lyric';     // 'lyric' lives in the outer margin, has no tier
  tier: Tier | null;          // null only when kind === 'lyric'
  category: Category | null;  // null only when kind === 'lyric'
  label: string;              // ≤ 12 words. Renders in the bubble.
  sourceLine: string;         // verbatim lyric fragment the bubble derives from (D23).
                              // Server-validated against doc.source; fabrication guard.
                              // For kind 'lyric' it is the line itself.
  note?: string;              // longer expansion, shown in Inspector.
  exhausted?: boolean;        // D35: asked to go deeper and declined. Set by the
                              // client when a descend returns nothing. Optional;
                              // pre-D35 files backfill undefined. No migration.
  citationUnverified?: boolean; // D39: sourceLine didn't match doc.source. The
                              // reading stays — provenance is unverified, and
                              // renders with a quiet visible marker. Optional.
  position: { x: number; y: number };
  origin: Origin;
  status: Status;
  createdAt: string;          // ISO
}

export interface Link {
  id: string;
  source: string;             // Bubble.id
  target: string;             // Bubble.id
  kind: LinkKind;
  rationale?: string;         // one-sentence "why". Shown in Inspector.
  origin: Origin;
  status: Status;
}

export interface BubbleMapDoc {
  version: 2;
  id: string;
  title: string;              // e.g. "Mr. Brightside — The Killers"
  subject: 'song' | 'self';   // v1 always 'song'; swaps the prompt variant
  source?: string;            // free text: lyrics, notes, your analysis
  bubbles: Bubble[];
  links: Link[];
  rejected: Bubble[];         // unpicked candidates: persisted, never rendered (D24).
  keeperId?: string;          // D41: the song's canonical raw thing — a committed
                              // RAW bubble's id, chosen by the human from the
                              // model's nominations (or any reading). Optional,
                              // backfills undefined, re-choosable at any time.
  createdAt: string;
  updatedAt: string;
}
