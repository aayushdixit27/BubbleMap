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
  note?: string;              // longer expansion, shown in Inspector.
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
  createdAt: string;
  updatedAt: string;
}
