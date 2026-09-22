import { useState } from 'react'

type TroikaSynced = { textRenderInfo?: { blockBounds?: number[] } | null }

/** Rendered height of a troika text block, measured after layout; 0 until the first sync. */
export function useBlockHeight() {
  const [height, setHeight] = useState(0)
  const onSync = (mesh: TroikaSynced) => {
    const b = mesh.textRenderInfo?.blockBounds
    if (b && b.length === 4) setHeight((b[3] ?? 0) - (b[1] ?? 0))
  }
  return [height, onSync] as const
}
