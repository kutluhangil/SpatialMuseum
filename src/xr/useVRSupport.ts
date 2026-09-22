import { useEffect, useState } from 'react'

export type VRSupport = 'checking' | 'supported' | 'unsupported'

export function useVRSupport(): VRSupport {
  const [support, setSupport] = useState<VRSupport>(() =>
    navigator.xr ? 'checking' : 'unsupported',
  )
  useEffect(() => {
    let cancelled = false
    if (!navigator.xr) return
    navigator.xr.isSessionSupported('immersive-vr').then(
      (ok) => {
        if (!cancelled) setSupport(ok ? 'supported' : 'unsupported')
      },
      (err: unknown) => {
        // A rejected support query is a browser/permission problem worth seeing, not hiding.
        console.error('isSessionSupported(immersive-vr) failed', err)
        if (!cancelled) setSupport('unsupported')
      },
    )
    return () => {
      cancelled = true
    }
  }, [])
  return support
}
