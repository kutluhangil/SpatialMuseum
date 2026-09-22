import { create } from 'zustand'
import { museum } from '../store/museumStore'
import { clampStep } from './lesson'

type LessonState = {
  index: number
  go: (delta: number) => void
  reset: () => void
}

export const useLessonStore = create<LessonState>((set) => ({
  index: 0,
  go: (delta) => set((s) => ({ index: clampStep(s.index, delta, museum.lesson.steps.length) })),
  reset: () => set({ index: 0 }),
}))
