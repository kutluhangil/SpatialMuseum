import type { Localized } from '../schema/museum'

export type Locale = 'tr' | 'en'

/** `?lang=en` wins, then a stored choice, then the browser's own language; Turkish otherwise. */
export function initialLocale(search: string, stored: string | null, browser: string): Locale {
  const asked = new URLSearchParams(search).get('lang')
  if (asked === 'en' || asked === 'tr') return asked
  if (stored === 'en' || stored === 'tr') return stored
  return browser.toLowerCase().startsWith('tr') ? 'tr' : 'en'
}

/** Falls back to Turkish, which every piece of content has: a missing translation is not an error. */
export function text(value: Localized, locale: Locale): string {
  return locale === 'en' ? (value.en ?? value.tr) : value.tr
}

/** A text in both languages: the chosen one first, the other beside it when the content has it. */
export type Bilingual = { primary: string; secondary: string | null }

/**
 * Everything written in the room is read by students of both languages at once, so it carries
 * both: the viewer's language leads, the other follows. No second line when a translation is
 * missing or reads the same.
 */
export function bilingual(value: Localized, locale: Locale): Bilingual {
  const primary = text(value, locale)
  const other = text(value, locale === 'tr' ? 'en' : 'tr')
  return { primary, secondary: value.en !== undefined && other !== primary ? other : null }
}
