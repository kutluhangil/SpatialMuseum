import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { MuseumSchema } from '../src/schema/museum'
import { migrateMuseum } from '../src/schema/migrate'
import { clampStep, lessonView } from '../src/lesson/lesson'

const { lesson } = MuseumSchema.parse(
  migrateMuseum(JSON.parse(readFileSync('content/museum.json', 'utf8'))),
)

describe('lessonView', () => {
  it('starts with the welcome note on the board and the section title on the screen', () => {
    const v = lessonView(lesson, 0)
    expect(v.board?.id).toBe('ders-giris')
    expect(v.screen).toEqual({ kind: 'title', section: lesson.sections[0] })
    expect(v.count).toBe(8)
  })

  it('keeps the section intro on the board while its video plays on the screen', () => {
    const v = lessonView(lesson, 2)
    expect(v.screen.kind).toBe('video')
    expect(v.screen.kind === 'video' && v.screen.step.id).toBe('vid-pozisyonlar')
    expect(v.board?.id).toBe('pozisyonlar-giris')
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
    expect(() => lessonView(lesson, 8)).toThrow('lesson step 8 is out of range 0..7')
  })
})

describe('clampStep', () => {
  it('stays within the first and last step', () => {
    expect(clampStep(0, -1, 8)).toBe(0)
    expect(clampStep(7, 1, 8)).toBe(7)
    expect(clampStep(3, 1, 8)).toBe(4)
  })
})
