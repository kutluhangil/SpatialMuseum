import type { LessonDef, LessonSectionDef, LessonTextDef, LessonVideoDef } from '../schema/museum'

export type ScreenContent =
  { kind: 'video'; step: LessonVideoDef } | { kind: 'title'; section: LessonSectionDef }

export type LessonView = {
  index: number
  count: number
  section: LessonSectionDef
  /** The latest note of the current section up to this step; notes never carry across sections. */
  board: LessonTextDef | null
  screen: ScreenContent
}

export function lessonView(lesson: LessonDef, index: number): LessonView {
  const step = lesson.steps[index]
  if (!step) {
    throw new Error(`lesson step ${index} is out of range 0..${lesson.steps.length - 1}`)
  }
  const section = lesson.sections.find((s) => s.id === step.section)
  if (!section) throw new Error(`lesson step "${step.id}" names unknown section "${step.section}"`)
  let board: LessonTextDef | null = null
  for (let i = index; i >= 0; i--) {
    const s = lesson.steps[i]
    if (!s || s.section !== step.section) break
    if (s.type === 'text') {
      board = s
      break
    }
  }
  return {
    index,
    count: lesson.steps.length,
    section,
    board,
    screen: step.type === 'video' ? { kind: 'video', step } : { kind: 'title', section },
  }
}

export function clampStep(index: number, delta: number, count: number): number {
  return Math.max(0, Math.min(count - 1, index + delta))
}

/**
 * First step of the section `delta` sections away. From the middle of a section, going back lands
 * on that section's own first step, the way a chapter button on a player behaves.
 */
export function sectionJump(lesson: LessonDef, index: number, delta: number): number {
  const starts: number[] = []
  lesson.steps.forEach((step, i) => {
    if (lesson.steps[i - 1]?.section !== step.section) starts.push(i)
  })
  if (starts.length === 0) return index
  const current = starts.filter((start) => start <= index).length - 1
  if (delta < 0 && index > (starts[current] ?? 0)) return starts[current] ?? index
  const target = Math.max(0, Math.min(starts.length - 1, current + delta))
  return starts[target] ?? index
}

/** The step a returning student resumes at: whatever was stored, as long as it still exists. */
export function savedStep(raw: string | null, count: number): number {
  const index = Number(raw)
  if (raw === null || !Number.isInteger(index)) return 0
  return Math.max(0, Math.min(count - 1, index))
}
