import { useMemo } from 'react'
import { BackSide } from 'three'
import type { Museum } from '../schema/museum'
import { EYE_HEIGHT } from '../locomotion/playerStore'
import { useKTX2 } from '../media/useKTX2'

const PANORAMA_URL = '/textures/panorama-meadow-4k.ktx2'
// Far enough that parallax between the eyes is nil (it reads as infinitely distant), well inside the camera far plane.
const RADIUS = 90

/**
 * The landscape outside the windows (Poly Haven meadow_2, CC0): an inside-out sphere centred at
 * eye height so the horizon sits level with the visitor's eyes. Walls hide it everywhere except
 * the window openings; drawn after opaque walls, early depth test skips the hidden pixels.
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
  return (
    <mesh position={centre}>
      <sphereGeometry args={[RADIUS, 64, 32]} />
      <meshBasicMaterial map={texture} side={BackSide} toneMapped={false} depthWrite={false} />
    </mesh>
  )
}
