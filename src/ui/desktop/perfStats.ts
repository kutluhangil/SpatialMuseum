import { create } from 'zustand'

export type RenderStats = { calls: number; triangles: number; geometries: number; textures: number }

export const usePerfStats = create<{ stats: RenderStats | null; set: (s: RenderStats) => void }>(
  (set) => ({
    stats: null,
    set: (stats) => set({ stats }),
  }),
)

/** Readout is opt-in via ?stats so it never shows for mothers or nurses. */
export const statsEnabled = new URLSearchParams(window.location.search).has('stats')
