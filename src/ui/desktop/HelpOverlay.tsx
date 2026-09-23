import { EnterVRButton } from '../../xr/EnterVRButton'
import { useAudioStore } from '../../audio/audioStore'
import { useLocaleStore } from '../../i18n/localeStore'
import { useUI } from '../../i18n/strings'

// Frosted panels over the scene: the room stays visible behind them, the text keeps its contrast
// (the panel is 85% opaque milk-white under ink).
const GLASS =
  'bg-[var(--onsut)]/85 shadow-[0_10px_30px_-12px_rgba(30,52,64,0.45)] ring-1 ring-[var(--murekkep)]/10 backdrop-blur-md'
const BUTTON = `pointer-events-auto min-h-11 cursor-pointer rounded-full px-5 py-3 text-base font-semibold text-[var(--murekkep)] transition-colors duration-200 hover:bg-[var(--onsut)] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--kolostrum)] ${GLASS}`

export function HelpOverlay() {
  const enabled = useAudioStore((s) => s.enabled)
  const toggleSound = useAudioStore((s) => s.toggle)
  const start = useAudioStore((s) => s.start)
  const toggleLocale = useLocaleStore((s) => s.toggle)
  const t = useUI()
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 p-4">
      <div className={`max-w-md rounded-xl px-5 py-4 text-[var(--murekkep)] ${GLASS}`}>
        {/* The same gold rule the placards in the room carry. */}
        <div aria-hidden className="mb-2 h-[3px] w-10 rounded-full bg-[var(--kolostrum)]" />
        <ul className="space-y-1 text-base leading-snug">
          {t('help')
            .split(' · ')
            .map((line) => (
              <li key={line}>{line}</li>
            ))}
        </ul>
      </div>
      <div className="flex items-center gap-3">
        <button type="button" onClick={toggleLocale} className={BUTTON}>
          {t('language')}
        </button>
        <button
          type="button"
          onClick={() => {
            void start()
            toggleSound()
          }}
          aria-pressed={enabled}
          className={BUTTON}
        >
          {enabled ? t('soundOff') : t('soundOn')}
        </button>
        <EnterVRButton />
      </div>
    </div>
  )
}
