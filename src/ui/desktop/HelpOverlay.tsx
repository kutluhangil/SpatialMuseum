import { EnterVRButton } from '../../xr/EnterVRButton'

export function HelpOverlay() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 p-4">
      <p className="max-w-md rounded-md bg-[var(--onsut)]/90 px-4 py-3 text-base leading-relaxed text-[var(--murekkep)]">
        Bakmak için sürükleyin · Yürümek için W A S D ya da oklar · Ders: N ya da Boşluk sonraki, B
        önceki
      </p>
      <EnterVRButton />
    </div>
  )
}
