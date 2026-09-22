import { usePerfStats } from './perfStats'

export function PerfReadout() {
  const stats = usePerfStats((s) => s.stats)
  if (!stats) return null
  return (
    <output
      data-testid="perf-readout"
      className="pointer-events-none absolute top-4 left-4 rounded-md bg-[var(--murekkep)] px-3 py-2 font-mono text-sm text-[var(--onsut)] tabular-nums"
    >
      {`${stats.fps} fps · draw ${stats.calls} · tri ${stats.triangles} · geo ${stats.geometries} · tex ${stats.textures}`}
    </output>
  )
}
