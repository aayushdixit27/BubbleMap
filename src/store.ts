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
  nominateKeeper as apiNominate,
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

// ── D37: "one song ahead, never more." ─────────────────────────────────
// The active run OWNS its doc. Everything the run does mutates run.doc,
// which is published to the store only while that map is the open one.
// While the map is unopened, arrivals stay `proposed` and queue in
// `uncommitted`; opening the map commits them — they render in the same
// frame they commit, so nothing commits off-screen (Hard Rule 1). This is
// a one-slot buffer, not a queue: while `activeRun` exists (generating OR
// finished-but-unopened), no new run can start. Flow control, not WIP.
interface ActiveRun {
  docId: string;
  title: string;
  doc: BubbleMapDoc;
  uncommitted: Proposal[]; // arrived while unopened — commit on open
  progress: Progress;
  metrics: string | null;
  rejections: { reason: string; item: unknown }[];
  discarded: string[]; // D40: foci whose output was produced then removed
  error: string | null;
  finished: boolean;
}
let activeRun: ActiveRun | null = null;

// The quiet toolbar indicator for a run whose map is not open.
export interface AheadRun {
  docId: string;
  title: string;
  progress: Progress;
}

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
  // Server-rejected proposal items for the open map, D34: a quiet count
  // in the toolbar, expanding to reasons. Silent rejection produced a
  // broken map once (Money, descent v); never again invisible.
  rejections: { reason: string; item: unknown }[];
  // D40: REALs whose descend PRODUCED something that was then removed
  // (malformed, discarded server-side) — distinct from declined. Session
  // scope; renders "discarded — see rejections", never "no deeper
  // reading found". Never report system-caused exhaustion as song-caused.
  discarded: string[];
  // D37: the run whose map is NOT open, if any — drives the quiet
  // "next song · N of 10" toolbar indicator. null when no run, or when
  // the running map is the open one (its progress shows normally).
  ahead: AheadRun | null;

  setView: (view: View) => void;
  loadMaps: () => Promise<void>;
  openMap: (id: string) => Promise<void>;
  removeMap: (id: string) => Promise<void>;
  openProbeRun: () => void;
  closeMap: () => void;
  // D41: choose the song's canonical raw thing. Re-choosable at any time.
  setKeeper: (id: string) => void;
  // openNow=false is D37's "start the next song while reading this one":
  // the run generates against its own doc and the current map stays open.
  createAndSeed: (title: string, source: string, opts?: { openNow?: boolean }) => Promise<void>;
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

  // Rebuild one run's provisional ghosts from the latest streamed
  // snapshot. Pure: takes and returns the RUN's doc (D37 — a run owns its
  // doc; the store's open doc may be a different map entirely).
  const applySnapshot = (doc: BubbleMapDoc, runId: string, snapshot: Snapshot): BubbleMapDoc => {
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

    return {
      ...doc,
      bubbles: nextBubbles,
      links: replaceRun(doc.links, runId, links),
    };
  };

  // Swap a run's provisional ghosts for the server-resolved proposal —
  // in place (stable order), and with each final id aliased back to its
  // ghost key so the rendered reading never remounts or moves. Pure.
  const finalizeRun = (doc: BubbleMapDoc, runId: string, proposal: Proposal): BubbleMapDoc => {
    for (const [ref, finalId] of Object.entries(proposal.refs)) {
      keyAlias.set(finalId, provisionalId(runId, ref));
    }
    return {
      ...doc,
      bubbles: replaceRun(doc.bubbles, runId, proposal.bubbles),
      links: replaceRun(doc.links, runId, proposal.links),
    };
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
    rejections: [],
    discarded: [],
    ahead: null,
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
      // D37: opening the ahead-run's map ADOPTS it — the run's doc is
      // fresher than disk, and everything that arrived while unopened
      // commits now, rendering in the same frame it commits. From here
      // the run publishes into the open doc and commits live, exactly
      // like a run that was open from the start.
      if (activeRun && activeRun.docId === id) {
        let doc = activeRun.doc;
        for (const p of activeRun.uncommitted) {
          for (const b of p.bubbles) doc = commitInto(doc, b.id);
        }
        activeRun.uncommitted = [];
        activeRun.doc = doc;
        set({
          doc,
          // Landing view (supersedes D26 #4's Readings default): Target
          // answers "what is this song about" in one glance, and its
          // provenance panel reaches the readings. A still-generating map
          // lands on Readings — the dig is what there is to watch.
          view: activeRun.finished ? 'target' : 'readings',
          readOnly: false,
          killed: [],
          ahead: null,
          running: activeRun.finished ? 0 : 1,
          progress: activeRun.progress,
          metrics: activeRun.metrics,
          rejections: activeRun.rejections,
          discarded: activeRun.discarded,
          error: activeRun.error,
          status: '',
        });
        scheduleSave();
        if (activeRun.finished) activeRun = null;
        return;
      }
      try {
        // Target is the landing view for a finished map (supersedes
        // D26 #4's Readings default).
        set({ doc: await fetchMap(id), view: 'target', readOnly: false, killed: [], rejections: [], discarded: [], progress: null, error: null, metrics: null, status: '' });
      } catch (e) {
        set({ error: e instanceof Error ? e.message : String(e) });
      }
    },

    removeMap: async (id) => {
      if (activeRun?.docId === id) {
        set({ error: 'that song is still generating — open it or wait for it to finish' });
        return;
      }
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
      set({ doc: loadProbeRun(), view: 'readings', readOnly: true, killed: [], rejections: [], discarded: [], progress: null, error: null, metrics: null, status: '' });
    },

    closeMap: () => {
      // Navigating away from a still-running map is legal under D37: the
      // run keeps going against its own doc and shows up as `ahead`.
      set({ doc: null, readOnly: false, running: 0, killed: [], rejections: [], discarded: [], progress: null, status: '', metrics: null });
      void get().loadMaps();
    },

    // D26 #3: up to DESCENT_TARGET descents, generated serially, each
    // appended (and committed, per chunk 2) as it completes — never
    // batched. The first descend overlaps the tail of the seed stream so
    // RAW reaches the screen fast; everything after runs one at a time.
    // Stops early, honestly, when the song runs out of threads.
    createAndSeed: async (title, source, opts) => {
      // D37: a one-slot buffer, not a queue. While any run exists —
      // generating, or finished but never opened — a new one cannot start.
      if (activeRun) {
        set({ error: 'a song is already generating — one ahead, never more' });
        return;
      }
      const openNow = opts?.openNow ?? true;

      const t0 = performance.now();
      let firstRawAt: number | null = null;

      let run: ActiveRun; // assigned right after the map is created

      // ── Run-aware publishing. The run owns run.doc; the store's open
      // doc gets updates only when it IS the run's map. Unopened, the run
      // surfaces only as the quiet `ahead` indicator.
      const isOpen = () => get().doc?.id === run.docId;
      const publishDoc = (next: BubbleMapDoc) => {
        run.doc = next;
        if (isOpen()) set({ doc: next });
      };
      const pubProgress = (progress: Progress) => {
        run.progress = progress;
        if (isOpen()) set({ progress });
        else set({ ahead: { docId: run.docId, title: run.title, progress } });
      };
      const pubMetrics = (metrics: string) => {
        run.metrics = metrics;
        if (isOpen()) set({ metrics });
      };
      const pubError = (e: unknown) => {
        run.error = e instanceof Error ? e.message : String(e);
        if (isOpen()) set({ error: run.error });
      };

      // "First RAW on screen" means visible, not committed — a streaming
      // ghost with a label counts the moment it renders. The metric is
      // LIVE while it matters: a ticking count until the first RAW, then
      // it freezes at the real number (D28's blocked-time lens).
      let rawTimer: ReturnType<typeof setInterval> | null = null;
      const stopRawTimer = () => {
        if (rawTimer !== null) clearInterval(rawTimer);
        rawTimer = null;
      };
      const noteRawGhost = (s: Snapshot) => {
        if (firstRawAt === null && (s.bubbles ?? []).some((b) => b.tier === 'raw' && b.label)) {
          firstRawAt = performance.now() - t0;
          stopRawTimer();
          pubMetrics(`first RAW in ${(firstRawAt / 1000).toFixed(0)}s`);
        }
      };
      // The run's own bookkeeping keys off ARRIVED (final id), not
      // committed — an unopened run holds everything as proposed, and the
      // loop must still see what has landed.
      const arrived = (b: Bubble) => !isProvisional(b.id);
      const rawCount = () => run.doc.bubbles.filter((b) => b.tier === 'raw' && arrived(b)).length;
      const tick = (state: Progress['state'] = 'going', note?: string) => {
        pubProgress({ done: rawCount(), target: DESCENT_TARGET, state, ...(note ? { note } : {}) });
      };

      // D26 #2 (amended Hard Rule 1): a completed arrival commits — but
      // ONLY while its map is on screen. Unopened, it queues as proposed;
      // openMap commits the queue in the same frame it first renders.
      const commitArrived = (proposal: Proposal) => {
        if (!isOpen()) {
          run.uncommitted.push(proposal);
          return;
        }
        let next = run.doc;
        for (const bubble of proposal.bubbles) next = commitInto(next, bubble.id);
        publishDoc(next);
        scheduleSave();
      };

      try {
        const doc = await apiCreateMap(title, source);
        run = {
          docId: doc.id,
          title,
          doc,
          uncommitted: [],
          progress: { done: 0, target: DESCENT_TARGET, state: 'going' },
          metrics: null,
          rejections: [],
          discarded: [],
          error: null,
          finished: false,
        };
        activeRun = run;
        if (openNow) {
          set({
            doc, view: 'readings', readOnly: false, killed: [], rejections: [],
            discarded: [], error: null, metrics: null, status: '', running: 1,
            ahead: null,
            progress: run.progress,
          });
        } else {
          // The current map stays open; the new one appears in the
          // library (apiCreateMap persisted it) and in the ahead chip.
          set({ ahead: { docId: run.docId, title, progress: run.progress } });
          void get().loadMaps();
        }
        rawTimer = setInterval(() => {
          if (firstRawAt === null) {
            pubMetrics(`waiting for the first RAW · ${Math.round((performance.now() - t0) / 1000)}s`);
          } else {
            stopRawTimer();
          }
        }, 1000);

        // D34: server-rejected items reach the toolbar, never only the
        // server console — silent rejection broke a map once (descent v).
        const noteRejections = (p: Proposal) => {
          if (!p.rejections?.length) return;
          run.rejections = [...run.rejections, ...p.rejections];
          if (isOpen()) set({ rejections: run.rejections });
        };

        // ── Seed, overlapping the first descend (D26 #3's ~20s target).
        // The moment the first REAL bubble is fully streamed (a later
        // bubble has started), descend it against the provisional doc;
        // its links are remapped to final ids once seed resolves.
        let early: { focusRef: string; promise: Promise<Proposal> } | null = null;
        const seedProposal = await streamVerb('seed', doc, undefined, (snapshot) => {
          publishDoc(applySnapshot(run.doc, 'seed', snapshot));
          if (!early) {
            const bs = snapshot.bubbles ?? [];
            const i = bs.findIndex((b) => b.tier === 'real' && b.ref && b.label && b.sourceLine);
            if (i >= 0 && i < bs.length - 1) {
              const focusRef = bs[i].ref!;
              early = {
                focusRef,
                promise: streamVerb('descend', run.doc, provisionalId('seed', focusRef), (s) => {
                  publishDoc(applySnapshot(run.doc, 'descend:first', s));
                  noteRawGhost(s);
                }),
              };
            }
          }
        });
        noteRejections(seedProposal);
        publishDoc(finalizeRun(run.doc, 'seed', seedProposal));
        commitArrived(seedProposal);
        tick();

        if (!seedProposal.bubbles.length) {
          if (isOpen()) set({ running: 0 });
          pubError(new Error('seed returned nothing usable — check the server log for rejections'));
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
          const focus = run.doc.bubbles.find((b) => b.id === focusId);
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
          noteRejections(proposal);
          let remapped = remap(proposal);
          if (focusId) remapped = ensureParentLink(remapped, focusId);
          publishDoc(finalizeRun(run.doc, runId, remapped));
          commitArrived(remapped);
          tick();
          return remapped;
        };

        // Threads that declined to go deeper — do not ask twice, do not
        // pad. The local set guards re-asking (errors included); a genuine
        // DECLINE additionally sets the persisted `exhausted` flag on the
        // bubble (D35), which is what renders the terminal
        // "no deeper reading found" slot and survives reload (D33).
        const exhausted = new Set<string>();
        const exhaust = (id: string) => {
          exhausted.add(id);
          const d = run.doc;
          publishDoc({
            ...d,
            bubbles: d.bubbles.map((b) => (b.id === id ? { ...b, exhausted: true } : b)),
          });
          if (isOpen()) scheduleSave();
        };
        // D40: DISCARDED, not declined — the model produced something and
        // the system removed it. Don't re-ask this session, but never set
        // the persisted "declined" flag or claim the song had nothing.
        const discard = (id: string) => {
          exhausted.add(id);
          run.discarded = [...run.discarded, id];
          if (isOpen()) set({ discarded: run.discarded });
        };
        let errors = 0;

        // Returns the landed bubbles, or null when the call errored — an
        // error is not a decline, and callers must not flag one as such.
        const descendOn = async (focusId: string, runId: string): Promise<Bubble[] | null> => {
          try {
            const proposal = await streamVerb('descend', run.doc, focusId, (s) => {
              publishDoc(applySnapshot(run.doc, runId, s));
              noteRawGhost(s);
            });
            errors = 0;
            const landed = land(runId, proposal, focusId);
            if (!landed.bubbles.length) {
              // D40: an empty landing is DECLINED only if the model truly
              // proposed nothing. If bubbles were produced and removed
              // server-side, that is discarded — system-caused.
              const produced = proposal.rejections?.some((r) => String(r.reason).startsWith('bubble'));
              if (produced) discard(focusId);
              else exhaust(focusId);
            }
            return landed.bubbles;
          } catch (e) {
            // An API error is not a decline — no persisted flag, no terminal
            // "no deeper reading found" claim. Session-only: don't re-ask.
            errors += 1;
            exhausted.add(focusId);
            pubError(e);
            return null;
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
            pubError(e);
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
          const d = run.doc;
          const hasRawChild = (id: string) =>
            d.links.some(
              (l) =>
                l.kind === 'refines' &&
                l.source === id &&
                d.bubbles.some((b) => b.id === l.target && b.tier === 'raw'),
            );
          const nextReal = d.bubbles.find(
            (b) =>
              b.tier === 'real' && arrived(b) &&
              !hasRawChild(b.id) && !exhausted.has(b.id),
          );
          if (nextReal) {
            await descendOn(nextReal.id, `descend:${nextReal.id}`);
            continue;
          }
          const childCount = (id: string) =>
            d.links.filter((l) => l.kind === 'refines' && l.source === id).length;
          const safes = d.bubbles
            .filter((b) => b.tier === 'safe' && arrived(b) && !exhausted.has(b.id))
            .sort((a, b) => childCount(a.id) - childCount(b.id));
          if (!safes.length) {
            // D40: never report system-caused exhaustion as song-caused.
            stopNote =
              run.discarded.length > 0
                ? `stopped at ${rawCount()} — ${run.discarded.length} ${
                    run.discarded.length === 1 ? 'proposal was' : 'proposals were'
                  } discarded as malformed (see rejections)`
                : `stopped at ${rawCount()} — every thread has gone as deep as it goes`;
            break;
          }
          spawnCounter += 1;
          const spawned = await descendOn(safes[0].id, `descend:spawn${spawnCounter}:${safes[0].id}`);
          if (spawned !== null && !spawned.some((b) => b.tier === 'real')) exhaust(safes[0].id);
        }

        if (isOpen()) set({ running: 0 });
        if (stopNote) tick('stopped', stopNote);
        else tick('done');

        // D41/D42: the model nominates three existing RAWs as keeper
        // candidates; the human picks one (or any reading by hand). With
        // three or fewer RAWs, every one is a candidate — no call needed.
        // Nominations PERSIST on the doc: the pick-off-list diagnostic
        // only answers across sessions, and a keeperless map reopens with
        // its block and no AI call. Nomination is garnish: a failure
        // never fails the run.
        try {
          if (!run.doc.keeperId) {
            const rawIds = run.doc.bubbles
              .filter((b) => b.tier === 'raw' && arrived(b))
              .map((b) => b.id);
            if (rawIds.length >= 2) {
              const noms =
                rawIds.length <= 3
                  ? rawIds
                  : (await apiNominate(run.doc)).nominations
                      .filter((id) => rawIds.includes(id))
                      .slice(0, 3);
              publishDoc({ ...run.doc, nominatedIds: noms });
              if (isOpen()) scheduleSave();
            }
          }
        } catch (e) {
          console.warn('[store] keeper nomination failed (ignored):', e);
        }
      } catch (e) {
        // May fire before the run exists (map creation failed) — handle
        // both without touching `run` directly.
        const message = e instanceof Error ? e.message : String(e);
        if (activeRun === null) {
          set({ error: message });
        } else {
          activeRun.error = message;
          const done = activeRun.doc.bubbles.filter(
            (b) => b.tier === 'raw' && !isProvisional(b.id),
          ).length;
          const progress: Progress = {
            done, target: DESCENT_TARGET, state: 'stopped', note: `stopped at ${done}`,
          };
          activeRun.progress = progress;
          if (get().doc?.id === activeRun.docId) {
            set({ running: 0, error: message, progress });
          } else {
            set({ ahead: { docId: activeRun.docId, title: activeRun.title, progress } });
          }
        }
      } finally {
        stopRawTimer();
        // The buffer holds a finished-but-unopened run until it is opened
        // (openMap adopts and releases it). An open, fully-committed run
        // releases immediately.
        if (activeRun !== null) {
          activeRun.finished = true;
          if (get().doc?.id === activeRun.docId && activeRun.uncommitted.length === 0) {
            activeRun = null;
          }
        }
      }
    },

    // D41: the human's pick — the song's canonical raw thing. Guarded to
    // committed RAWs; writes through to a live run's doc; re-choosable.
    setKeeper: (id) => {
      const doc = get().doc;
      if (!doc || get().readOnly) return;
      if (!doc.bubbles.some((b) => b.id === id && b.tier === 'raw' && b.status === 'committed')) return;
      const next: BubbleMapDoc = { ...doc, keeperId: id };
      if (activeRun?.docId === next.id) activeRun.doc = next;
      set({ doc: next });
      scheduleSave();
      void get().loadMaps();
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
      let next = parkInRejected(doc, toPark);
      // D41: killing the keeper's descent orphans keeperId — clear it.
      if (next.keeperId && toPark.has(next.keeperId)) next = { ...next, keeperId: undefined };
      // Write through to the active run's doc (D37): when the open map is
      // also the running one, run.doc is the single truth.
      if (activeRun?.docId === next.id) activeRun.doc = next;
      set({ doc: next, killed: [...get().killed, record] });
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
      const next: BubbleMapDoc = {
        ...doc,
        bubbles: [...doc.bubbles, ...last.bubbles],
        links: [...doc.links.filter((l) => !linkIds.has(l.id)), ...last.links],
        rejected: (doc.rejected ?? []).filter((b) => !bubbleIds.has(b.id)),
      };
      if (activeRun?.docId === next.id) activeRun.doc = next;
      set({ doc: next, killed: killed.slice(0, -1) });
      scheduleSave();
    },
  };
});
