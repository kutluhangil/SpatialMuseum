import { useRef } from 'react'
import type { Group } from 'three'
import { XROrigin, useXRControllerLocomotion } from '@react-three/xr'
import { usePlayerStore } from './playerStore'

const SNAP_TURN_DEGREES = 45

export function XRLocomotion() {
  const origin = usePlayerStore((s) => s.origin)
  const yaw = usePlayerStore((s) => s.yaw)
  const ref = useRef<Group>(null)
  // Translation is disabled: continuous sliding is the main nausea trigger, teleport covers movement.
  useXRControllerLocomotion(ref, false, { type: 'snap', degrees: SNAP_TURN_DEGREES }, 'left')
  return <XROrigin ref={ref} position={origin} rotation-y={yaw} />
}
