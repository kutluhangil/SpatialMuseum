import { useEffect } from 'react'
import { useXR } from '@react-three/xr'
import { quality } from './device'

/**
 * Asks the runtime for the frame rate the device tier expects: 72 Hz on a Quest 2, 90 on a Quest 3.
 * Running a Quest 2 at 90 Hz costs a quarter of the frame budget for no visible gain in a room this
 * still. `updateTargetFrameRate` is optional in WebXR, so an unsupported runtime is left alone.
 */
export function XRFrameRate() {
  const session = useXR((s) => s.session)
  useEffect(() => {
    if (!session?.updateTargetFrameRate) return
    const rates = session.supportedFrameRates
    if (!rates?.length) return
    // Pick the closest rate at or below the target, or the lowest offered if none qualifies.
    const usable = [...rates].sort((a, b) => a - b)
    const pick = usable.filter((r) => r <= quality.targetFrameRate).pop() ?? usable[0]
    if (pick === undefined) return
    session.updateTargetFrameRate(pick).catch((err: unknown) => {
      // Not fatal: the session keeps whatever rate the runtime chose.
      console.warn(`updateTargetFrameRate(${pick}) refused`, err)
    })
  }, [session])
  return null
}
