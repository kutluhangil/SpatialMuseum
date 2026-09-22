import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import type { RoomDef } from '../schema/museum'
import { buildBlindFabric } from './furniture'
import type { ClassroomLayout } from './layout'
import { useRoomStore } from './roomStore'

// A blind takes about a second and a half to run its full travel, as a hand-pulled one does.
const TRAVEL_PER_SECOND = 0.7

/** Someone who asked for less motion gets the blind at its new height, not the travel. */
function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Every blind's fabric in one mesh, rolled up and down by scaling it about the head rail. */
export function Blinds({ room, layout }: { room: RoomDef; layout: ClassroomLayout }) {
  const fabric = useMemo(() => buildBlindFabric(room, layout), [room, layout])
  useEffect(() => () => fabric?.geometry.dispose(), [fabric])
  const down = useRoomStore((s) => s.blindsDown)
  const group = useRef<Group>(null)

  useFrame((_, delta) => {
    const g = group.current
    if (!g) return
    const target = down ? 1 : 0
    const step = prefersReducedMotion() ? 1 : TRAVEL_PER_SECOND * delta
    const next = g.scale.y + Math.max(-step, Math.min(step, target - g.scale.y))
    // Zero scale leaves the fabric with no volume at all; keep a sliver so normals stay valid.
    g.scale.y = Math.max(0.0001, next)
    g.visible = g.scale.y > 0.01
  })

  if (!fabric) return null
  return (
    <group ref={group} position={[0, fabric.rail, 0]}>
      <mesh geometry={fabric.geometry}>
        <meshBasicMaterial vertexColors />
      </mesh>
    </group>
  )
}
