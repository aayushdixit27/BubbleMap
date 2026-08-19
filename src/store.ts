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

// Session-stable React keys across the ghost → final id swap. When a run
// finalizes, each accepted bubble's final id is aliased back to its
// ghost-era id, so a reading keeps one key for its whole life and never
// remounts (the "flicker"). Session memory only — on reload everything is
// final and keys are just ids.
const keyAlias = new Map<string, string>();
export const stableKey = (id: string): string => keyAlias.get(id) ?? id;

// Replace one run's items IN PLACE: the new set goes where the run's
// first existing item sat, not at the end. Once a descent has appeared on
// screen it must not move — re-sorting mid-stream makes finished content
// appear to vanish.
const replaceRun = <T extends { id: string }>(items: T[], runId: string, next: T[]): T[] => {
  const prefix = `p:${runId}:`;
  const out: T[] = [];
  let inserted = false;
  for (const item of items) {
    if (item.id.startsWith(prefix)) {
      if (!inserted) {
        out.push(...next);
        inserted = true;
      }
      continue;
    }
    out.push(item);
  }
  if (!inserted) out.push(...next);
  return out;
};

// D26 #3: up to this many descents per song, generated one at a time.
const DESCENT_TARGET = 10;

// D26 #4's three views. UI state, not doc schema — deliberately not in
// types.ts.
export type View = 'readings' | 'grid' | 'target';

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

// D26 #3's always-visible progress state. Never a silent blank screen.
export interface Progress {
  done: number;
  target: number;
  state: 'going' | 'done' | 'stopped';
  note?: string; // why we stopped early, said honestly
}

interface MapState {
  maps: MapMeta[];
  doc: BubbleMapDoc | null;
  // Which view is showing (D26 #4). EXPLICIT state, in the store so no
  // component remount, HMR pass, or render churn can reset it. Written in
  // exactly two situations: the human clicks the toolbar (setView), and a
  // map opens (reset to the Readings default — a navigation event, not a
  // doc mutation). Nothing that mutates doc may touch it: a live run must
  // never be able to move the human off the kill gesture, which only
  // Readings has.
  view: View;
  // Probe-run docs are design-test data: no autosave, no AI verbs.
  readOnly: boolean;
  running: number;
  status: string;
  error: string | null;
  metrics: string | null;
  progress: Progress | null;
  // Killed descents this session, newest last — the undo stack (D26 #2).
  killed: KilledDescent[];

  setView: (view: View) => void;
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

    const nextBubbles = replaceRun(doc.bubbles, runId, bubbles);
    const knownIds = new Set(nextBubbles.map((b) => b.id));
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
        bubbles: nextBubbles,
        links: replaceRun(doc.links, runId, links),
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

  // Swap a run's provisional ghosts for the server-resolved proposal —
  // in place (stable order), and with each final id aliased back to its
  // ghost key so the rendered reading never remounts or moves.
  const finalizeRun = (runId: string, proposal: Proposal) => {
    const doc = get().doc;
    if (!doc) return;
    for (const [ref, finalId] of Object.entries(proposal.refs)) {
      keyAlias.set(finalId, provisionalId(runId, ref));
    }
    set({
      doc: {
        ...doc,
        bubbles: replaceRun(doc.bubbles, runId, proposal.bubbles),
        links: replaceRun(doc.links, runId, proposal.links),
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
    view: 'readings' as View,
    readOnly: false,
    running: 0,
    killed: [],
    progress: null,
    status: '',
    error: null,
    metrics: null,

    setView: (view) => set({ view }),

    loadMaps: async () => {
      try {
        set({ maps: await fetchMaps(), error: null });
      } catch (e) {
        set({ error: e instanceof Error ? e.message : String(e) });
      }
    },

    openMap: async (id) => {
      try {
        set({ doc: await fetchMap(id), view: 'readings', readOnly: false, killed: [], progress: null, error: null, metrics: null, status: '' });
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
      set({ doc: loadProbeRun(), view: 'readings', readOnly: true, killed: [], progress: null, error: null, metrics: null, status: '' });
    },

    closeMap: () => {
      set({ doc: null, readOnly: false, killed: [], progress: null, status: '', metrics: null });
      void get().loadMaps();
    },

    // D26 #3: up to DESCENT_TARGET descents, generated serially, each
    // appended (and committed, per chunk 2) as it completes — never
    // batched. The first descend overlaps the tail of the seed stream so
    // RAW reaches the screen fast; everything after runs one at a time.
    // Stops early, honestly, when the song runs out of threads.
    createAndSeed: async (title, source) => {
      const t0 = performance.now();
      let firstRawAt: number | null = null;
      // "First RAW on screen" means visible, not committed — a streaming
      // ghost with a label counts the moment it renders.
      const noteRawGhost = (s: Snapshot) => {
        if (firstRawAt === null && (s.bubbles ?? []).some((b) => b.tier === 'raw' && b.label)) {
          firstRawAt = performance.now() - t0;
          set({ metrics: `first RAW visible in ${(firstRawAt / 1000).toFixed(0)}s` });
        }
      };
      const rawCount = () =>
        (get().doc?.bubbles ?? []).filter((b) => b.tier === 'raw' && b.status === 'committed').length;
      const tick = (state: Progress['state'] = 'going', note?: string) => {
        set({
          progress: { done: rawCount(), target: DESCENT_TARGET, state, ...(note ? { note } : {}) },
        });
      };

      try {
        const doc = await apiCreateMap(title, source);
        set({
          doc, view: 'readings', readOnly: false, killed: [], error: null, metrics: null,
          status: '', running: 1,
          progress: { done: 0, target: DESCENT_TARGET, state: 'going' },
        });

        // ── Seed, overlapping the first descend (D26 #3's ~20s target).
        // The moment the first REAL bubble is fully streamed (a later
        // bubble has started), descend it against the provisional doc;
        // its links are remapped to final ids once seed resolves.
        let early: { focusRef: string; promise: Promise<Proposal> } | null = null;
        const seedProposal = await streamVerb('seed', doc, undefined, (snapshot) => {
          applySnapshot('seed', snapshot);
          if (!early) {
            const bs = snapshot.bubbles ?? [];
            const i = bs.findIndex((b) => b.tier === 'real' && b.ref && b.label && b.sourceLine);
            if (i >= 0 && i < bs.length - 1) {
              const focusRef = bs[i].ref!;
              early = {
                focusRef,
                promise: streamVerb('descend', get().doc!, provisionalId('seed', focusRef), (s) => {
                  applySnapshot('descend:first', s);
                  noteRawGhost(s);
                }),
              };
            }
          }
        });
        finalizeRun('seed', seedProposal);
        commitArrived(seedProposal);
        tick();

        if (!seedProposal.bubbles.length) {
          set({ running: 0, error: 'seed returned nothing usable — check the server log for rejections' });
          tick('stopped', 'seed failed');
          return;
        }

        // A descend's links may reference bubbles by the ids of the doc
        // snapshot it was called against — remap provisional seed ids to
        // their final ones, dropping anything that no longer resolves.
        const remap = (proposal: Proposal): Proposal => {
          const mapId = (id: string) => {
            const m = /^p:seed:(.+)$/.exec(id);
            return m ? seedProposal.refs[m[1]] ?? id : id;
          };
          return {
            ...proposal,
            links: proposal.links
              .map((l) => ({ ...l, source: mapId(l.source), target: mapId(l.target) }))
              .filter((l) => !isProvisional(l.source) && !isProvisional(l.target)),
          };
        };

        // A descend's one bubble is one tier deeper than its focus BY
        // CONSTRUCTION — the client knows the parent and does not trust
        // the model to emit the link. Without this, a fumbled link (the
        // server rejects e.g. a backwards refines) lands the bubble as an
        // orphan in the file, and the loop re-descends the same focus
        // because hasRawChild can't see the child. (Money, descent v.)
        const ensureParentLink = (proposal: Proposal, focusId: string): Proposal => {
          const child = proposal.bubbles[0];
          const focus = get().doc?.bubbles.find((b) => b.id === focusId);
          if (!child || !focus) return proposal;
          if (!child.tier || !focus.tier || TIERS.indexOf(child.tier) <= TIERS.indexOf(focus.tier)) {
            return proposal;
          }
          if (proposal.links.some((l) => l.kind === 'refines' && l.target === child.id)) {
            return proposal;
          }
          return {
            ...proposal,
            links: [
              ...proposal.links,
              {
                id: `repair:${child.id}`,
                source: focusId,
                target: child.id,
                kind: 'refines' as const,
                rationale: 'restored by the client: a descent’s focus is its parent by construction',
                origin: 'ai' as const,
                status: 'proposed' as const,
              },
            ],
          };
        };

        const land = (runId: string, proposal: Proposal, focusId?: string) => {
          let remapped = remap(proposal);
          if (focusId) remapped = ensureParentLink(remapped, focusId);
          finalizeRun(runId, remapped);
          commitArrived(remapped);
          tick();
          return remapped;
        };

        // Threads that declined to go deeper — do not ask twice, do not pad.
        const exhausted = new Set<string>();
        let errors = 0;

        const descendOn = async (focusId: string, runId: string): Promise<Bubble[]> => {
          try {
            const proposal = await streamVerb('descend', get().doc!, focusId, (s) => {
              applySnapshot(runId, s);
              noteRawGhost(s);
            });
            errors = 0;
            const landed = land(runId, proposal, focusId);
            if (!landed.bubbles.length) exhausted.add(focusId);
            return landed.bubbles;
          } catch (e) {
            errors += 1;
            exhausted.add(focusId);
            set({ error: e instanceof Error ? e.message : String(e) });
            return [];
          }
        };

        if (early !== null) {
          const { focusRef, promise } = early as { focusRef: string; promise: Promise<Proposal> };
          const focusId = seedProposal.refs[focusRef];
          try {
            const proposal = await promise;
            land('descend:first', proposal, focusId);
          } catch (e) {
            if (focusId) exhausted.add(focusId);
            set({ error: e instanceof Error ? e.message : String(e) });
          }
        }

        // ── The serial loop: descend un-descended REALs; when none are
        // left, spawn a fresh REAL from the least-used SAFE, then descend
        // it. Two consecutive failures, or no thread to try, ends the run.
        let stopNote: string | null = null;
        let spawnCounter = 0;
        while (rawCount() < DESCENT_TARGET) {
          if (errors >= 2) {
            stopNote = `stopped at ${rawCount()} — descend kept failing`;
            break;
          }
          const d = get().doc!;
          const hasRawChild = (id: string) =>
            d.links.some(
              (l) =>
                l.kind === 'refines' &&
                l.source === id &&
                d.bubbles.some((b) => b.id === l.target && b.tier === 'raw'),
            );
          const nextReal = d.bubbles.find(
            (b) =>
              b.tier === 'real' && b.status === 'committed' &&
              !hasRawChild(b.id) && !exhausted.has(b.id),
          );
          if (nextReal) {
            await descendOn(nextReal.id, `descend:${nextReal.id}`);
            continue;
          }
          const childCount = (id: string) =>
            d.links.filter((l) => l.kind === 'refines' && l.source === id).length;
          const safes = d.bubbles
            .filter((b) => b.tier === 'safe' && b.status === 'committed' && !exhausted.has(b.id))
            .sort((a, b) => childCount(a.id) - childCount(b.id));
          if (!safes.length) {
            stopNote = `stopped at ${rawCount()} — the song ran out of threads`;
            break;
          }
          spawnCounter += 1;
          const spawned = await descendOn(safes[0].id, `descend:spawn${spawnCounter}:${safes[0].id}`);
          if (!spawned.some((b) => b.tier === 'real')) exhausted.add(safes[0].id);
        }

        set({ running: 0 });
        if (stopNote) tick('stopped', stopNote);
        else tick('done');
      } catch (e) {
        set({ running: 0, error: e instanceof Error ? e.message : String(e) });
        tick('stopped', `stopped at ${rawCount()}`);
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
