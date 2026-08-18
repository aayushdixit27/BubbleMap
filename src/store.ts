import { create } from 'zustand';
import { loadProbeRun } from './loadProbeRun';
import type { Bubble, BubbleMapDoc } from './types';

interface MapState {
  doc: BubbleMapDoc;
  updateBubble: (id: string, patch: Partial<Bubble>) => void;
}

export const useMapStore = create<MapState>((set) => ({
  // Phase 1: the hardcoded Phase 0 result. Maps list + persistence are Phase 2.
  doc: loadProbeRun(),
  updateBubble: (id, patch) =>
    set((state) => ({
      doc: {
        ...state.doc,
        bubbles: state.doc.bubbles.map((b) => (b.id === id ? { ...b, ...patch } : b)),
        updatedAt: new Date().toISOString(),
      },
    })),
}));
