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
