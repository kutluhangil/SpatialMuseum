import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { Mesh, MeshBasicMaterial } from 'three'
import { BackSide } from 'three'
import { usePlayerStore } from './playerStore'

// A jump cut across the room is the second-worst thing for comfort after sliding; a short blink
// hides it. Meta's guidance is roughly a tenth of a second to black and twice that back.
const FADE_OUT_S = 0.09
const FADE_IN_S = 0.2
// Small enough to sit inside anything in the room, large enough to clear both eyes' near planes.
const SHELL_RADIUS = 0.2

/** A black shell that follows the head, opaque only during a teleport blink. */
export function ComfortFade() {
  const camera = useThree((s) => s.camera)
  const mesh = useRef<Mesh>(null)
  const blink = useRef({ elapsed: 0, active: false })

  useEffect(
    () =>
      usePlayerStore.subscribe((s, prev) => {
        if (s.origin !== prev.origin) blink.current = { elapsed: 0, active: true }
      }),
    [],
  )

  useFrame((_, delta) => {
    const m = mesh.current
    if (!m) return
    camera.getWorldPosition(m.position)
    const material = m.material as MeshBasicMaterial
    if (!blink.current.active) {
      m.visible = false
      return
    }
    blink.current.elapsed += delta
    const t = blink.current.elapsed
    const opacity = t < FADE_OUT_S ? t / FADE_OUT_S : 1 - Math.min(1, (t - FADE_OUT_S) / FADE_IN_S)
    material.opacity = Math.max(0, opacity)
    m.visible = material.opacity > 0.001
    if (t > FADE_OUT_S + FADE_IN_S) blink.current.active = false
  })

  return (
    <mesh ref={mesh} renderOrder={1000} visible={false} frustumCulled={false}>
      <sphereGeometry args={[SHELL_RADIUS, 12, 8]} />
      <meshBasicMaterial
        color="#000000"
        side={BackSide}
        transparent
        opacity={0}
        depthTest={false}
      />
    </mesh>
  )
}
