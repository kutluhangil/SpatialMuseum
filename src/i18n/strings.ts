import type { Locale } from './locale'
import { useLocaleStore } from './localeStore'

/** Interface strings. Content strings live in `content/museum.json` alongside the lesson. */
export const UI = {
  help: {
    tr: 'Bakmak için sürükleyin · Yürümek için W A S D ya da oklar · Ders: N ya da Boşluk sonraki, B önceki · Bölüm: [ ve ]',
    en: 'Drag to look · W A S D or arrows to walk · Lesson: N or Space next, B back · Section: [ and ]',
  },
  soundOn: { tr: 'Sesi aç', en: 'Sound on' },
  soundOff: { tr: 'Sesi kapat', en: 'Sound off' },
  enterVR: { tr: 'Derse gir (VR)', en: 'Enter the class (VR)' },
  loading: { tr: 'Derslik hazırlanıyor', en: 'Preparing the classroom' },
  language: { tr: 'English', en: 'Türkçe' },
  previous: { tr: '‹ Önceki', en: '‹ Back' },
  next: { tr: 'Sonraki ›', en: 'Next ›' },
} as const

export type UIKey = keyof typeof UI

export function ui(key: UIKey, locale: Locale): string {
  return UI[key][locale]
}

export function useUI(): (key: UIKey) => string {
  const locale = useLocaleStore((s) => s.locale)
  return (key) => ui(key, locale)
}
