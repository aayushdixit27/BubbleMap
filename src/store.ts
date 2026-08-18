// Client state + the loop (D26 — opt-out judging):
//   create → seed streams → descends fire, streaming as ghosts → each
//   completed arrival COMMITS (amended Hard Rule 1: it arrived on screen
//   and is read as it lands). The only gesture is killDescent, which
//   parks the whole SAFE → REAL → RAW path in rejected[]; kills are
//   undoable for the session via undoKill.
//
// What survives of Hard Rule 1: nothing commits off-screen or in bulk
// unseen, and anything committed can be killed in one gesture.

import { create } from 'zustand';
import {
  createMap as apiCreateMap,
  deleteMap as apiDeleteMap,
  fetchMap,
  fetchMaps,
  saveMap,
  streamVerb,
  type MapMeta,
  type Proposal,
  type Snapshot,
} from './api';
import { placeInRegion } from './canvas/geometry';
import { loadProbeRun } from './loadProbeRun';
import type { Bubble, BubbleMapDoc, Category, Link, LinkKind, Tier } from './types';

const TIERS: Tier[] = ['safe', 'real', 'raw'];
const CATEGORIES: Category[] = ['love', 'identity', 'fitness', 'earnings'];
const LINK_KINDS: LinkKind[] = ['refines', 'assumes', 'contradicts', 'evidence'];

const provisionalId = (runId: string, ref: string) => `p:${runId}:${ref}`;
const isProvisional = (id: string) => id.startsWith('p:');

// One descent path, by bubble id. safe/real may be absent when the model
// skipped a tier; raw is the unit's anchor.
export interface DescentPath {
  safe?: string;
  real?: string;
  raw: string;
}

// A killed descent, held in session memory so the kill is undoable (D26 #2).
interface KilledDescent {
  bubbles: Bubble[];
  links: Link[];
}

interface MapState {
  maps: MapMeta[];
  doc: BubbleMapDoc | null;
  // Probe-run docs are design-test data: no autosave, no AI verbs.
  readOnly: boolean;
  running: number;
  status: string;
  error: string | null;
  metrics: string | null;
  // Killed descents this session, newest last — the undo stack (D26 #2).
  killed: KilledDescent[];

  loadMaps: () => Promise<void>;
  openMap: (id: string) => Promise<void>;
  removeMap: (id: string) => Promise<void>;
  openProbeRun: () => void;
  closeMap: () => void;
  createAndSeed: (title: string, source: string) => Promise<void>;
  killDescent: (path: DescentPath) => void;
  undoKill: () => void;
}

// Autosave state. This was an 800ms trailing debounce that RESET on every
// accept/reject — judging a whole seed in quick clicks pushed the timer
// back each time, so nothing was ever written, and a reload lost every
// judgment ("the whole map"). Saves are now immediate: serialized (one
// PUT in flight) and coalescing (state changes during a save trigger one
// more with the latest doc). Writes are a few KB to localhost — there is
// nothing worth debouncing.
let saving = false;
let dirty = false;

export const useMapStore = create<MapState>((set, get) => {
  const scheduleSave = () => {
    if (get().readOnly) return;
    dirty = true;
    void flushSave();
  };

  const flushSave = async () => {
    if (saving) return;
    saving = true;
    try {
      while (dirty) {
        dirty = false;
        const doc = get().doc;
        if (!doc) break;
        try {
          const { updatedAt } = await saveMap(doc);
          set((s) => (s.doc?.id === doc.id ? { doc: { ...s.doc!, updatedAt } } : {}));
        } catch (e) {
          set({ error: `autosave failed: ${e instanceof Error ? e.message : String(e)}` });
          break;
        }
      }
    } finally {
      saving = false;
    }
  };

  // Rebuild one run's provisional ghosts from the latest streamed snapshot.
  const applySnapshot = (runId: string, snapshot: Snapshot) => {
    const doc = get().doc;
    if (!doc) return;
    const now = new Date().toISOString();

    const refToId = new Map<string, string>();
    const bubbles: Bubble[] = [];
    for (const raw of snapshot.bubbles ?? []) {
      if (!raw.ref || !raw.label || !raw.sourceLine) continue;
      if (!TIERS.includes(raw.tier as Tier) || !CATEGORIES.includes(raw.category as Category)) continue;
      if (refToId.has(raw.ref)) continue;
      const id = provisionalId(runId, raw.ref);
      refToId.set(raw.ref, id);
      bubbles.push({
        id,
        kind: 'idea',
        tier: raw.tier as Tier,
        category: raw.category as Category,
        label: raw.label,
        sourceLine: raw.sourceLine,
        ...(raw.note ? { note: raw.note } : {}),
        position: { x: 0, y: 0 },
        origin: 'ai',
        status: 'proposed',
        createdAt: now,
      });
    }

    const keptBubbles = doc.bubbles.filter((b) => !b.id.startsWith(`p:${runId}:`));
    const knownIds = new Set([...keptBubbles.map((b) => b.id), ...bubbles.map((b) => b.id)]);
    const links: Link[] = [];
    for (const [i, raw] of (snapshot.links ?? []).entries()) {
      if (!raw.source || !raw.target || !LINK_KINDS.includes(raw.kind as LinkKind)) continue;
      const source = refToId.get(raw.source) ?? raw.source;
      const target = refToId.get(raw.target) ?? raw.target;
      if (!knownIds.has(source) || !knownIds.has(target) || source === target) continue;
      links.push({
        id: provisionalId(runId, `l${i}`),
        source,
        target,
        kind: raw.kind as LinkKind,
        ...(raw.rationale ? { rationale: raw.rationale } : {}),
        origin: 'ai',
        status: 'proposed',
      });
    }

    set({
      doc: {
        ...doc,
        bubbles: [...keptBubbles, ...bubbles],
        links: [...doc.links.filter((l) => !l.id.startsWith(`p:${runId}:`)), ...links],
      },
    });
  };

  // D26 #2 (amended Hard Rule 1): a completed arrival commits. The human
  // watched it stream in and reads it as it lands; judgment is by
  // exception — the kill gesture — not by approval. Nothing commits
  // off-screen: this runs only after the run's ghosts have rendered.
  const commitArrived = (proposal: Proposal) => {
    let next = get().doc;
    if (!next) return;
    for (const bubble of proposal.bubbles) next = commitInto(next, bubble.id);
    set({ doc: next });
    scheduleSave();
  };

  // Swap a run's provisional ghosts for the server-resolved proposal.
  const finalizeRun = (runId: string, proposal: Proposal) => {
    const doc = get().doc;
    if (!doc) return;
    set({
      doc: {
        ...doc,
        bubbles: [...doc.bubbles.filter((b) => !b.id.startsWith(`p:${runId}:`)), ...proposal.bubbles],
        links: [...doc.links.filter((l) => !l.id.startsWith(`p:${runId}:`)), ...proposal.links],
      },
    });
  };

  const removeBubbles = (doc: BubbleMapDoc, ids: Set<string>): BubbleMapDoc => ({
    ...doc,
    bubbles: doc.bubbles.filter((b) => !ids.has(b.id)),
    links: doc.links.filter((l) => !ids.has(l.source) && !ids.has(l.target)),
  });

  // Killed paths leave the view but are parked in doc.rejected — written
  // to the file as their own signal, never rendered again (D24 → D26).
  const parkInRejected = (doc: BubbleMapDoc, ids: Set<string>): BubbleMapDoc => ({
    ...removeBubbles(doc, ids),
    rejected: [...(doc.rejected ?? []), ...doc.bubbles.filter((b) => ids.has(b.id))],
  });

  // Flip a bubble to committed, place it, and commit links whose endpoints
  // are now both committed.
  const commitInto = (doc: BubbleMapDoc, id: string): BubbleMapDoc => {
    const bubble = doc.bubbles.find((b) => b.id === id);
    if (!bubble) return doc;
    const committed = doc.bubbles.filter((b) => b.status === 'committed');
    const position =
      bubble.kind === 'idea' && bubble.category && bubble.tier
        ? placeInRegion(bubble.category, bubble.tier, committed)
        : bubble.position;
    const bubbles = doc.bubbles.map((b) =>
      b.id === id ? { ...b, status: 'committed' as const, position } : b,
    );
    const committedIds = new Set(bubbles.filter((b) => b.status === 'committed').map((b) => b.id));
    const links = doc.links.map((l) =>
      l.status === 'proposed' && committedIds.has(l.source) && committedIds.has(l.target)
        ? { ...l, status: 'committed' as const }
        : l,
    );
    return { ...doc, bubbles, links };
  };

  return {
    maps: [],
    doc: null,
    readOnly: false,
    running: 0,
    killed: [],
    status: '',
    error: null,
    metrics: null,

    loadMaps: async () => {
      try {
        set({ maps: await fetchMaps(), error: null });
      } catch (e) {
        set({ error: e instanceof Error ? e.message : String(e) });
      }
    },

    openMap: async (id) => {
      try {
        set({ doc: await fetchMap(id), readOnly: false, killed: [], error: null, metrics: null, status: '' });
      } catch (e) {
        set({ error: e instanceof Error ? e.message : String(e) });
      }
    },

    removeMap: async (id) => {
      try {
        await apiDeleteMap(id);
        set({ error: null });
      } catch (e) {
        set({ error: e instanceof Error ? e.message : String(e) });
      }
      await get().loadMaps();
    },

    // The Phase 0 chain output as design-test data — never saved, never
    // descended into, no tokens spent.
    openProbeRun: () => {
      set({ doc: loadProbeRun(), readOnly: true, killed: [], error: null, metrics: null, status: '' });
    },

    closeMap: () => {
      set({ doc: null, readOnly: false, killed: [], status: '', metrics: null });
      void get().loadMaps();
    },

    // D25: create → seed → the moment seed returns, descend on every REAL
    // in parallel. No human gate between verbs; the gate is the descent-
    // level keep/kill that follows.
    createAndSeed: async (title, source) => {
      const t0 = performance.now();
      try {
        const doc = await apiCreateMap(title, source);
        set({ doc, readOnly: false, killed: [], error: null, metrics: null, status: 'seeding…', running: 1 });
        const seedProposal = await streamVerb('seed', doc, undefined, (snapshot) =>
          applySnapshot('seed', snapshot),
        );
        finalizeRun('seed', seedProposal);
        commitArrived(seedProposal);

        const reals = seedProposal.bubbles.filter((b) => b.tier === 'real');
        if (!reals.length) {
          set({
            status: '',
            running: 0,
            error: 'seed returned no REAL bubbles — check the server log for rejections',
          });
          return;
        }

        set({ status: `descending ${reals.length} threads…`, running: reals.length });
        const results = await Promise.allSettled(
          reals.map(async (real) => {
            const runId = `descend:${real.id}`;
            const proposal = await streamVerb('descend', get().doc!, real.id, (snapshot) =>
              applySnapshot(runId, snapshot),
            );
            finalizeRun(runId, proposal);
            commitArrived(proposal);
            set((s) => ({ running: Math.max(0, s.running - 1) }));
          }),
        );

        const failures = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
        set({
          status: '',
          running: 0,
          metrics: `RAW on screen in ${((performance.now() - t0) / 1000).toFixed(0)}s`,
          error: failures.length
            ? `${failures.length} descend call(s) failed: ${failures[0].reason instanceof Error ? failures[0].reason.message : String(failures[0].reason)}`
            : null,
        });
      } catch (e) {
        set({ status: '', running: 0, error: e instanceof Error ? e.message : String(e) });
      }
    },

    // D26 #2: the only gesture. Kills the whole path into rejected[],
    // recording it on the session undo stack first. A SAFE or REAL that
    // another surviving path still hangs off is spared — paths may share
    // ancestors, and a kill must not amputate a sibling.
    killDescent: ({ safe, real, raw }) => {
      const doc = get().doc;
      if (!doc || get().readOnly || isProvisional(raw)) return;
      const toPark = new Set([raw]);
      const hasOtherChild = (id: string) =>
        doc.links.some(
          (l) =>
            l.kind === 'refines' &&
            l.source === id &&
            !toPark.has(l.target) &&
            doc.bubbles.some((b) => b.id === l.target),
        );
      if (real && !hasOtherChild(real)) toPark.add(real);
      if (safe && !hasOtherChild(safe)) toPark.add(safe);
      const record: KilledDescent = {
        bubbles: doc.bubbles.filter((b) => toPark.has(b.id)),
        links: doc.links.filter((l) => toPark.has(l.source) || toPark.has(l.target)),
      };
      set({ doc: parkInRejected(doc, toPark), killed: [...get().killed, record] });
      scheduleSave();
    },

    // D26 #2: kills are undoable for the session. Restores the most
    // recent kill — bubbles out of rejected[], links back in place.
    undoKill: () => {
      const doc = get().doc;
      const killed = get().killed;
      if (!doc || !killed.length) return;
      const last = killed[killed.length - 1];
      const bubbleIds = new Set(last.bubbles.map((b) => b.id));
      const linkIds = new Set(last.links.map((l) => l.id));
      set({
        doc: {
          ...doc,
          bubbles: [...doc.bubbles, ...last.bubbles],
          links: [...doc.links.filter((l) => !linkIds.has(l.id)), ...last.links],
          rejected: (doc.rejected ?? []).filter((b) => !bubbleIds.has(b.id)),
        },
        killed: killed.slice(0, -1),
      });
      scheduleSave();
    },
  };
});
