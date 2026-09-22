import { create } from 'zustand'
import type { Vector3Tuple } from 'three'
import type { Segment } from './collision'

export const EYE_HEIGHT = 1.6
/** Desktop eye height in a classroom chair; in XR the headset's real height is used instead. */
export const SEATED_EYE_HEIGHT = 1.2

export type Posture = 'standing' | 'seated'
export const eyeHeight = (p: Posture) => (p === 'seated' ? SEATED_EYE_HEIGHT : EYE_HEIGHT)

type PlayerState = {
  /** Feet position of the XR origin; desktop camera sits eyeHeight(posture) above it. */
  origin: Vector3Tuple
  /** Yaw of the XR origin in radians. */
  yaw: number
  posture: Posture
  /** Walls and obstacles the desktop walker slides along; empty = free movement (spike room). */
  colliders: Segment[]
  teleport: (to: Vector3Tuple) => void
  reset: (origin: Vector3Tuple, yaw: number, posture?: Posture) => void
  standUp: () => void
  setColliders: (colliders: Segment[]) => void
}

export const usePlayerStore = create<PlayerState>((set) => ({
  origin: [0, 0, 0],
  yaw: 0,
  posture: 'standing',
  colliders: [],
  // Teleporting always lands on your feet.
  teleport: (to) => set({ origin: to, posture: 'standing' }),
  reset: (origin, yaw, posture = 'standing') => set({ origin, yaw, posture }),
  standUp: () => set({ posture: 'standing' }),
  setColliders: (colliders) => set({ colliders }),
}))
