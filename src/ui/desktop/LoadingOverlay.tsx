import { useProgress } from '@react-three/drei'
import { useUI } from '../../i18n/strings'
import { useEffect, useState } from 'react'

// Textures are transcoded on the device, which takes a moment on a headset; an empty room with no
// explanation reads as a broken page.
const HIDE_DELAY_MS = 400

export function LoadingOverlay() {
  const { active, progress } = useProgress()
  const t = useUI()
  // Once the room is up it stays up: later loads (a lesson video) must not curtain the class.
  const [done, setDone] = useState(false)
  useEffect(() => {
    if (active) return
    const timer = setTimeout(() => setDone(true), HIDE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [active])

  if (done) return null
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none absolute inset-0 grid place-items-center bg-[radial-gradient(ellipse_at_center,var(--isik)_0%,var(--onsut)_70%)] transition-opacity duration-500"
      style={{ opacity: active ? 1 : 0 }}
    >
      <div className="flex flex-col items-center gap-4 text-[var(--murekkep)]">
        <div aria-hidden className="h-[3px] w-12 rounded-full bg-[var(--kolostrum)]" />
        <p className="text-xl font-semibold tracking-wide">{t('loading')}</p>
        <div className="h-1.5 w-64 overflow-hidden rounded-full bg-[var(--murekkep)]/12">
          <div
            className="h-full rounded-full bg-[var(--murekkep)] transition-[width] duration-300"
            style={{ width: `${Math.round(progress)}%` }}
          />
        </div>
        <p className="font-mono text-sm tabular-nums">{Math.round(progress)}%</p>
      </div>
    </div>
  )
}
