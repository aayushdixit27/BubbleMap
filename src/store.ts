import { create } from 'zustand';
import { loadProbeRun } from './loadProbeRun';
import type { BubbleMapDoc } from './types';

interface MapState {
  doc: BubbleMapDoc;
}

export const useMapStore = create<MapState>(() => ({
  // Phase 1: the hardcoded Phase 0 result. Maps list + persistence are Phase 2.
  doc: loadProbeRun(),
}));
