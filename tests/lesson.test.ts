import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { MuseumSchema } from '../src/schema/museum'
import { migrateMuseum } from '../src/schema/migrate'
import { clampStep, lessonView, savedStep, sectionJump } from '../src/lesson/lesson'

const { lesson } = MuseumSchema.parse(
  migrateMuseum(JSON.parse(readFileSync('content/museum.json', 'utf8'))),
)

describe('lessonView', () => {
  it('starts with the welcome note on the board and the section title on the screen', () => {
    const v = lessonView(lesson, 0)
    expect(v.board?.id).toBe('ders-giris')
    expect(v.screen).toEqual({ kind: 'title', section: lesson.sections[0] })
    expect(v.count).toBe(lesson.steps.length)
  })

  it('keeps the last note of the section on the board while its video plays', () => {
    const index = lesson.steps.findIndex((s) => s.id === 'vid-pozisyonlar')
    const v = lessonView(lesson, index)
    expect(v.screen.kind).toBe('video')
    expect(v.screen.kind === 'video' && v.screen.step.id).toBe('vid-pozisyonlar')
    expect(v.board?.id).toBe('pozisyonlar-giris')
    expect(v.section.id).toBe('pozisyonlar')
  })

  it('clears the board when a new section starts with a video', () => {
    const v = lessonView(
      {
        sections: [
          { id: 'a', title: { tr: 'A' } },
          { id: 'b', title: { tr: 'B' } },
        ],
        steps: [
          { id: '1', section: 'a', type: 'text', body: { tr: 'x' } },
          {
            id: '2',
            section: 'b',
            type: 'video',
            title: { tr: 'v' },
            src: 's',
            poster: 'p',
            aspect: 16 / 9,
            subtitles: [],
            loop: false,
          },
        ],
      },
      1,
    )
    expect(v.board).toBeNull()
    expect(v.section.id).toBe('b')
  })

  it('refuses an index outside the lesson', () => {
    const n = lesson.steps.length
    expect(() => lessonView(lesson, n)).toThrow(`lesson step ${n} is out of range 0..${n - 1}`)
  })
})

describe('clampStep', () => {
  it('stays within the first and last step', () => {
    expect(clampStep(0, -1, 8)).toBe(0)
    expect(clampStep(7, 1, 8)).toBe(7)
    expect(clampStep(3, 1, 8)).toBe(4)
  })
})

describe('sectionJump', () => {
  const ids = (i: number) => lesson.steps[i]?.id

  it('moves to the first step of the next section', () => {
    expect(ids(sectionJump(lesson, 0, 1))).toBe('ilk-saat')
    expect(ids(sectionJump(lesson, 1, 1))).toBe('ilk-saat')
  })

  it('goes back to the start of the current section before leaving it', () => {
    const middle = lesson.steps.findIndex((s) => s.id === 'kavrama')
    expect(ids(sectionJump(lesson, middle, -1))).toBe('pozisyonlar-giris')
    const start = lesson.steps.findIndex((s) => s.id === 'pozisyonlar-giris')
    expect(ids(sectionJump(lesson, start, -1))).toBe('ilk-saat')
  })

  it('stops at the first and last section', () => {
    expect(sectionJump(lesson, 0, -1)).toBe(0)
    const last = lesson.steps.length - 1
    expect(ids(sectionJump(lesson, last, 1))).toBe('sanat-giris')
  })
})

describe('savedStep', () => {
  it('resumes where the student left off, and starts over on anything unusable', () => {
    expect(savedStep('5', 14)).toBe(5)
    expect(savedStep(null, 14)).toBe(0)
    expect(savedStep('abc', 14)).toBe(0)
    expect(savedStep('1.5', 14)).toBe(0)
    expect(savedStep('99', 14)).toBe(13)
    expect(savedStep('-3', 14)).toBe(0)
  })
})
