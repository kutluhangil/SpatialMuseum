import { xrStore } from './xrStore'
import { useVRSupport } from './useVRSupport'

export function EnterVRButton() {
  const support = useVRSupport()
  if (support !== 'supported') return null
  return (
    <button
      type="button"
      onClick={() => {
        xrStore.enterVR().catch((err: unknown) => console.error('enterVR failed', err))
      }}
      className="pointer-events-auto min-h-11 cursor-pointer rounded-md bg-[var(--murekkep)] px-5 py-3 text-base font-semibold text-[var(--onsut)] transition-colors duration-200 hover:bg-[#2a4756] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--kolostrum)]"
    >
      Müzeye gir (VR)
    </button>
  )
}
