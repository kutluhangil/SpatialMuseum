import { describe, expect, it } from 'vitest'
import { initialLocale, text } from '../src/i18n/locale'

describe('initialLocale', () => {
  it('lets the URL decide first', () => {
    expect(initialLocale('?lang=en', 'tr', 'tr-TR')).toBe('en')
    expect(initialLocale('?lang=tr', 'en', 'en-GB')).toBe('tr')
  })

  it('then a stored choice, then the browser language', () => {
    expect(initialLocale('', 'en', 'tr-TR')).toBe('en')
    expect(initialLocale('', null, 'tr-TR')).toBe('tr')
    expect(initialLocale('', null, 'en-US')).toBe('en')
    expect(initialLocale('', 'nonsense', 'de-DE')).toBe('en')
  })
})

describe('text', () => {
  it('falls back to Turkish when a translation is missing', () => {
    expect(text({ tr: 'Merhaba', en: 'Hello' }, 'en')).toBe('Hello')
    expect(text({ tr: 'Merhaba' }, 'en')).toBe('Merhaba')
    expect(text({ tr: 'Merhaba', en: 'Hello' }, 'tr')).toBe('Merhaba')
  })
})

describe('content translations', () => {
  it('translates every lesson step and section that the class reads', async () => {
    const { readFileSync } = await import('node:fs')
    const museum = JSON.parse(readFileSync('content/museum.json', 'utf8')) as {
      lesson: {
        sections: { title: { en?: string } }[]
        steps: { title?: { en?: string }; body?: { en?: string } }[]
      }
    }
    for (const section of museum.lesson.sections) expect(section.title.en).toBeTruthy()
    for (const step of museum.lesson.steps) {
      if (step.title) expect(step.title.en).toBeTruthy()
      if (step.body) expect(step.body.en).toBeTruthy()
    }
  })
})
