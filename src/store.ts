// Client state + the Phase 2 loop, serial (dogfood-first):
//   create → seed streams → ghosts render → human keeps/kills each →
//   descend is human-triggered per kept REAL entry → 3 RAW candidate
//   ghosts → human picks one, siblings park in rejected[] (D24).
//
// The parallel pipeline (D17 #3: all descends dispatched on seed
// completion) is deliberately deferred until the loop has been used on
// real songs — a slow correct loop beats a fast unused one.
//
// AI never mutates the map: proposals arrive status 'proposed' and only
// accept() commits. Saving strips proposals server-side.

import { create } from 'zustand';
import {
  createMap as apiCreateMap,
  fetchMap,
  fetchMaps,
  saveMap,
  streamVerb,
  type MapMeta,
  type Proposal,
  type Snapshot,
} from './api';
import { placeInRegion } from './canvas/geometry';
import type { Bubble, BubbleMapDoc, Category, Link, LinkKind, Tier } from './types';

const TIERS: Tier[] = ['safe', 'real', 'raw'];
const CATEGORIES: Category[] = ['love', 'identity', 'fitness', 'earnings'];
const LINK_KINDS: LinkKind[] = ['refines', 'assumes', 'contradicts', 'evidence'];

const provisionalId = (runId: string, ref: string) => `p:${runId}:${ref}`;
const isProvisional = (id: string) => id.startsWith('p:');

interface MapState {
  maps: MapMeta[];
  doc: BubbleMapDoc | null;
  // descend runId → proposed RAW candidate ids; keeping one discards the rest (D18)
  groups: Record<string, string[]>;
  running: number;
  status: string;
  error: string | null;
  metrics: string | null;

  loadMaps: () => Promise<void>;
  openMap: (id: string) => Promise<void>;
  closeMap: () => void;
  createAndSeed: (title: string, source: string) => Promise<void>;
  runDescend: (focusId: string) => Promise<void>;
  accept: (id: string) => void;
  reject: (id: string) => void;
  acceptAllUngrouped: () => void;
  rejectAllProposed: () => void;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export const useMapStore = create<MapState>((set, get) => {
  const scheduleSave = () => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      const doc = get().doc;
      if (!doc) return;
      try {
        const { updatedAt } = await saveMap(doc);
        set((s) => (s.doc?.id === doc.id ? { doc: { ...s.doc!, updatedAt } } : {}));
      } catch (e) {
        set({ error: `autosave failed: ${e instanceof Error ? e.message : String(e)}` });
      }
    }, 800); // §10
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

  // Swap a run's provisional ghosts for the server-resolved proposal.
  const finalizeRun = (runId: string, proposal: Proposal, verb: 'seed' | 'descend' | 'interrogate') => {
    const doc = get().doc;
    if (!doc) return;
    set({
      doc: {
        ...doc,
        bubbles: [...doc.bubbles.filter((b) => !b.id.startsWith(`p:${runId}:`)), ...proposal.bubbles],
        links: [...doc.links.filter((l) => !l.id.startsWith(`p:${runId}:`)), ...proposal.links],
      },
      ...(verb === 'descend' && proposal.bubbles.length
        ? { groups: { ...get().groups, [runId]: proposal.bubbles.map((b) => b.id) } }
        : {}),
    });
  };

  const removeBubbles = (doc: BubbleMapDoc, ids: Set<string>): BubbleMapDoc => ({
    ...doc,
    bubbles: doc.bubbles.filter((b) => !ids.has(b.id)),
    links: doc.links.filter((l) => !ids.has(l.source) && !ids.has(l.target)),
  });

  // D24: unpicked candidates leave the view but are parked in doc.rejected —
  // written to the file as their own signal, never rendered again. Killed
  // seed ghosts do NOT come through here; they just vanish (D24 step 2).
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
    groups: {},
    running: 0,
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
        set({ doc: await fetchMap(id), groups: {}, error: null, metrics: null, status: '' });
      } catch (e) {
        set({ error: e instanceof Error ? e.message : String(e) });
      }
    },

    closeMap: () => {
      set({ doc: null, groups: {}, status: '', metrics: null });
      void get().loadMaps();
    },

    // Create, then seed — serial. Descend is human-triggered per kept
    // REAL entry; nothing is dispatched speculatively this side of the
    // dogfood milestone.
    createAndSeed: async (title, source) => {
      try {
        const doc = await apiCreateMap(title, source);
        set({ doc, groups: {}, error: null, metrics: null, status: 'seeding…', running: 1 });
        const seedProposal = await streamVerb('seed', doc, undefined, (snapshot) =>
          applySnapshot('seed', snapshot),
        );
        finalizeRun('seed', seedProposal, 'seed');
        set({ status: '', running: 0 });
      } catch (e) {
        set({ status: '', running: 0, error: e instanceof Error ? e.message : String(e) });
      }
    },

    // On-demand descend (a row that stalls). Never speculative.
    runDescend: async (focusId) => {
      const doc = get().doc;
      if (!doc) return;
      const runId = `descend:${focusId}:${Date.now()}`;
      set((s) => ({ running: s.running + 1, status: 'descending…', error: null }));
      try {
        const proposal = await streamVerb('descend', doc, focusId, (snapshot) =>
          applySnapshot(runId, snapshot),
        );
        finalizeRun(runId, proposal, 'descend');
        scheduleSave();
      } catch (e) {
        set({ error: e instanceof Error ? e.message : String(e) });
      } finally {
        set((s) => ({ running: Math.max(0, s.running - 1), status: '' }));
      }
    },

    accept: (id) => {
      const doc = get().doc;
      const bubble = doc?.bubbles.find((b) => b.id === id);
      if (!doc || !bubble || bubble.status !== 'proposed' || isProvisional(id)) return;

      let next = doc;
      const groups = { ...get().groups };
      const groupEntry = Object.entries(groups).find(([, ids]) => ids.includes(id));
      if (groupEntry) {
        // D24 (amends D18): keep one, park the unpicked siblings.
        const [runId, ids] = groupEntry;
        next = parkInRejected(next, new Set(ids.filter((otherId) => otherId !== id)));
        delete groups[runId];
      }
      next = commitInto(next, id);
      set({ doc: next, groups });
      scheduleSave();
    },

    reject: (id) => {
      const doc = get().doc;
      if (!doc || isProvisional(id)) return;
      // A killed grouped candidate is an unpicked RAW reading — parked
      // (D24). A killed seed ghost vanishes (D24 step 2).
      const grouped = Object.values(get().groups).some((ids) => ids.includes(id));
      const groups = Object.fromEntries(
        Object.entries(get().groups)
          .map(([runId, ids]) => [runId, ids.filter((i) => i !== id)] as const)
          .filter(([, ids]) => ids.length > 0),
      );
      const ids = new Set([id]);
      set({ doc: grouped ? parkInRejected(doc, ids) : removeBubbles(doc, ids), groups });
      scheduleSave();
    },

    // Shift+A (§10): accepts every ungrouped proposal. Descend candidate
    // groups are left alone — keeping 1 of 3 is an explicit choice (D18).
    acceptAllUngrouped: () => {
      const doc = get().doc;
      if (!doc) return;
      const grouped = new Set(Object.values(get().groups).flat());
      let next = doc;
      for (const bubble of doc.bubbles) {
        if (bubble.status === 'proposed' && !isProvisional(bubble.id) && !grouped.has(bubble.id)) {
          next = commitInto(next, bubble.id);
        }
      }
      set({ doc: next });
      scheduleSave();
    },

    rejectAllProposed: () => {
      const doc = get().doc;
      if (!doc) return;
      const grouped = new Set(Object.values(get().groups).flat());
      const proposed = doc.bubbles.filter((b) => b.status === 'proposed' && !isProvisional(b.id));
      // Same split as reject(): candidates park (D24), seed ghosts vanish.
      const next = removeBubbles(
        parkInRejected(doc, new Set(proposed.filter((b) => grouped.has(b.id)).map((b) => b.id))),
        new Set(proposed.filter((b) => !grouped.has(b.id)).map((b) => b.id)),
      );
      set({ doc: next, groups: {} });
      scheduleSave();
    },
  };
});
