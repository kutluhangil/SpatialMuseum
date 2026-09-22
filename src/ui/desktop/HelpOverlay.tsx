import { EnterVRButton } from '../../xr/EnterVRButton'
import { useAudioStore } from '../../audio/audioStore'

export function HelpOverlay() {
  const enabled = useAudioStore((s) => s.enabled)
  const toggle = useAudioStore((s) => s.toggle)
  const start = useAudioStore((s) => s.start)
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 p-4">
      <p className="max-w-md rounded-md bg-[var(--onsut)]/90 px-4 py-3 text-base leading-relaxed text-[var(--murekkep)]">
        Bakmak için sürükleyin · Yürümek için W A S D ya da oklar · Ders: N ya da Boşluk sonraki, B
        önceki · Bölüm: [ ve ]
      </p>
      <div className="pointer-events-auto flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            void start()
            toggle()
          }}
          aria-pressed={enabled}
          className="min-h-11 rounded-md bg-[var(--onsut)]/90 px-4 py-3 text-base text-[var(--murekkep)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--murekkep)]"
        >
          {enabled ? 'Sesi kapat' : 'Sesi aç'}
        </button>
        <EnterVRButton />
      </div>
    </div>
  )
}
