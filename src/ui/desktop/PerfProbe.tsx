import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { usePerfStats } from './perfStats'

const INTERVAL_S = 0.5

/** Samples renderer.info (PLAN §11) into a store; useFrame runs before render, so it sees the previous frame. */
export function PerfProbe() {
  const acc = useRef(0)
  const frames = useRef(0)
  useFrame(({ gl }, delta) => {
    acc.current += delta
    frames.current += 1
    if (acc.current < INTERVAL_S) return
    const fps = frames.current / acc.current
    acc.current = 0
    frames.current = 0
    const { render, memory } = gl.info
    usePerfStats.getState().set({
      calls: render.calls,
      triangles: render.triangles,
      geometries: memory.geometries,
      textures: memory.textures,
      fps: Math.round(fps),
    })
  })
  return null
}
