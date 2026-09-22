import { EnterVRButton } from '../../xr/EnterVRButton'
import { useAudioStore } from '../../audio/audioStore'
import { useLocaleStore } from '../../i18n/localeStore'
import { useUI } from '../../i18n/strings'

const BUTTON =
  'pointer-events-auto min-h-11 rounded-md bg-[var(--onsut)]/90 px-4 py-3 text-base text-[var(--murekkep)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--murekkep)]'

export function HelpOverlay() {
  const enabled = useAudioStore((s) => s.enabled)
  const toggleSound = useAudioStore((s) => s.toggle)
  const start = useAudioStore((s) => s.start)
  const toggleLocale = useLocaleStore((s) => s.toggle)
  const t = useUI()
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 p-4">
      <p className="max-w-md rounded-md bg-[var(--onsut)]/90 px-4 py-3 text-base leading-relaxed text-[var(--murekkep)]">
        {t('help')}
      </p>
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
