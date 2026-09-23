import { useEffect, useMemo } from 'react'
import { BackSide, Color, Float32BufferAttribute, SphereGeometry } from 'three'
import type { Museum } from '../schema/museum'
import { EYE_HEIGHT } from '../locomotion/playerStore'
import { useKTX2 } from '../media/useKTX2'
import { PROBE_GAIN } from './RoomProbeCapture'

const PANORAMA_URL = '/textures/panorama-campus-4k.ktx2'
// Far enough that parallax between the eyes is nil (it reads as infinitely distant), well inside the camera far plane.
const RADIUS = 90
// Seen from a lit room, the outdoors is far brighter than any interior surface; the sky blows out
// and the horizon washes into haze. Both are baked into the sphere's vertex colours.
const EXPOSURE = 1.3
const HAZE = { colour: '#E8EEF2', strength: 0.5, band: 0.3 }
// Daylight against the room, for reflections: the windows are the brightest thing in the glass.
const DAYLIGHT_GAIN = 2.5

/**
 * The campus outside the windows (Poly Haven charolettenbrunn_park, CC0): an inside-out sphere centred at
 * eye height so the horizon sits level with the student's eyes. Walls hide it everywhere except
 * the window openings; drawn after opaque walls, early depth test skips the hidden pixels.
 *
 * Vertex colours carry the outdoor exposure and the haze that gathers towards the horizon, so the
 * view reads as daylight outside a dimmer room without a second material or any post-processing.
 */
export function Panorama({ museum }: { museum: Museum }) {
  const texture = useKTX2(PANORAMA_URL)
  const centre = useMemo(() => {
    const xs = museum.rooms.flatMap((r) => [r.rect.x, r.rect.x + r.rect.width])
    const zs = museum.rooms.flatMap((r) => [r.rect.z, r.rect.z + r.rect.depth])
    return [
      (Math.min(...xs) + Math.max(...xs)) / 2,
      EYE_HEIGHT,
      (Math.min(...zs) + Math.max(...zs)) / 2,
    ] as const
  }, [museum])
  const geometry = useMemo(() => {
    const g = new SphereGeometry(RADIUS, 64, 32)
    const pos = g.getAttribute('position')
    const haze = new Color(HAZE.colour)
    const colours: number[] = []
    for (let i = 0; i < pos.count; i++) {
      const elevation = Math.abs(pos.getY(i)) / RADIUS
      const nearHorizon = 1 - Math.min(1, elevation / HAZE.band)
      const c = new Color(1, 1, 1).lerp(haze, HAZE.strength * nearHorizon).multiplyScalar(EXPOSURE)
      colours.push(c.r, c.g, c.b)
    }
    g.setAttribute('color', new Float32BufferAttribute(colours, 3))
    return g
  }, [])
  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <mesh position={centre} geometry={geometry} userData={{ [PROBE_GAIN]: DAYLIGHT_GAIN }}>
      <meshBasicMaterial
        map={texture}
        vertexColors
        side={BackSide}
        toneMapped={false}
        depthWrite={false}
      />
    </mesh>
  )
}
