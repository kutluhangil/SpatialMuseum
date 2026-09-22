import { create } from 'zustand'
import { museum } from '../store/museumStore'
import { clampStep, savedStep, sectionJump } from './lesson'

const STORAGE_KEY = 'ders-adimi'

/** Storage can be blocked (private windows, embedded webviews); the lesson still has to run. */
function readIndex(): number {
  try {
    return savedStep(localStorage.getItem(STORAGE_KEY), museum.lesson.steps.length)
  } catch {
    return 0
  }
}

function writeIndex(index: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(index))
  } catch {
    // Nothing to do: the lesson runs, it just will not resume next time.
  }
}

type LessonState = {
  index: number
  go: (delta: number) => void
  goSection: (delta: number) => void
  reset: () => void
}

export const useLessonStore = create<LessonState>((set) => ({
  index: readIndex(),
  go: (delta) =>
    set((s) => {
      const index = clampStep(s.index, delta, museum.lesson.steps.length)
      writeIndex(index)
      return { index }
    }),
  goSection: (delta) =>
    set((s) => {
      const index = sectionJump(museum.lesson, s.index, delta)
      writeIndex(index)
      return { index }
    }),
  reset: () => {
    writeIndex(0)
    set({ index: 0 })
  },
}))
