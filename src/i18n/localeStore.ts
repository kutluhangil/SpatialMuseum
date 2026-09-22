import { create } from 'zustand'
import type { Localized } from '../schema/museum'
import { initialLocale, text, type Locale } from './locale'

const STORAGE_KEY = 'dil'

function read(): Locale {
  try {
    return initialLocale(
      window.location.search,
      localStorage.getItem(STORAGE_KEY),
      navigator.language,
    )
  } catch {
    // Storage can be blocked; the URL and the browser language still decide.
    return initialLocale(window.location.search, null, navigator.language)
  }
}

function write(locale: Locale): void {
  try {
    localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    // The choice just will not survive a reload.
  }
}

type LocaleState = { locale: Locale; setLocale: (locale: Locale) => void; toggle: () => void }

export const useLocaleStore = create<LocaleState>((set, get) => ({
  locale: read(),
  setLocale: (locale) => {
    write(locale)
    set({ locale })
  },
  toggle: () => get().setLocale(get().locale === 'tr' ? 'en' : 'tr'),
}))

/** Reads the current locale and returns the reader for content strings. */
export function useText(): (value: Localized) => string {
  const locale = useLocaleStore((s) => s.locale)
  return (value) => text(value, locale)
}
