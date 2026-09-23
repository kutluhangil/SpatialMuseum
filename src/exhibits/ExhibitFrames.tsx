import { useEffect, useMemo } from 'react'
import {
  AdditiveBlending,
  Color,
  DataTexture,
  NearestFilter,
  NoColorSpace,
  RGBAFormat,
  SRGBColorSpace,
} from 'three'
import type { ExhibitDef, RoomDef } from '../schema/museum'
import type { RoomLight } from '../design/light'
import { palette } from '../design/tokens'
import { pictureWashTexture } from '../design/proceduralTextures'
import { quality } from '../xr/device'
import { probeCacheKey, probeReflection, type Reflective, type RoomProbe } from '../scene/roomProbe'
import {
  FINISHES,
  FINISH_SLOTS,
  buildExhibitFrames,
  buildExhibitGlass,
  buildExhibitMats,
  buildPictureWashes,
  type Finish,
} from './frames'

// Per finish: roughness, metalness, and whether it glows (the lit slot under a picture light).
const FINISH_SURFACE: Record<Finish, { roughness: number; metalness: number; glow: boolean }> = {
  // Burnished water gilding: a metal, but a soft one; the crests shine, the coves stay dull.
  gilt: { roughness: 0.34, metalness: 1, glow: false },
  black: { roughness: 0.38, metalness: 0, glow: false },
  wood: { roughness: 0.55, metalness: 0, glow: false },
  brass: { roughness: 0.26, metalness: 1, glow: false },
  glow: { roughness: 1, metalness: 0, glow: true },
}

function lookup(texel: (finish: Finish) => [number, number, number]): DataTexture {
  const data = new Uint8Array(FINISH_SLOTS * 4)
  FINISHES.forEach((finish, i) => {
    const [r, g, b] = texel(finish)
    data.set([r, g, b, 255], i * 4)
  })
  const t = new DataTexture(data, FINISH_SLOTS, 1, RGBAFormat)
  // One texel per finish: filtering would bleed neighbouring finishes into each other.
  t.magFilter = NearestFilter
  t.minFilter = NearestFilter
  t.needsUpdate = true
  return t
}

let surfaceMap: DataTexture | null = null
let glowMap: DataTexture | null = null

/** roughnessMap reads green and metalnessMap blue, so one texture carries both. */
function finishSurfaceMap(): DataTexture {
  surfaceMap ??= lookup((f) => [
    0,
    Math.round(FINISH_SURFACE[f].roughness * 255),
    Math.round(FINISH_SURFACE[f].metalness * 255),
  ])
  surfaceMap.colorSpace = NoColorSpace
  return surfaceMap
}

function finishGlowMap(): DataTexture {
  glowMap ??= lookup((f) => (FINISH_SURFACE[f].glow ? [255, 255, 255] : [0, 0, 0]))
  glowMap.colorSpace = SRGBColorSpace
  return glowMap
}

const WASH_OPACITY = 0.3
// Picture glass reflects the room faintly face on (the windows opposite show in it) and strongly
// from the side, as glazing over a print does.
const SCREEN_GLASS: Reflective = {
  f0: 0.04,
  strength: 1.2,
  lod: 0.4,
  normal: 'mesh',
  mode: 'glass',
}
const noRaycast = () => undefined

/**
 * The room's framing, hung like a gallery: every moulding and picture light in one PBR mesh, the
 * screens' mats in one unlit mesh, and the lamps' warm pools on the wall in one additive mesh.
 */
export function ExhibitFrames({
  room,
  exhibits,
  light,
  probe,
}: {
  room: RoomDef
  exhibits: ExhibitDef[]
  light: RoomLight
  probe: RoomProbe
}) {
  const frames = useMemo(() => buildExhibitFrames(room, exhibits), [room, exhibits])
  const mats = useMemo(() => buildExhibitMats(room, exhibits, light), [room, exhibits, light])
  const washes = useMemo(
    () => (quality.pictureLights ? buildPictureWashes(room, exhibits) : null),
    [room, exhibits],
  )
  const glass = useMemo(
    () => (quality.screenGlass ? buildExhibitGlass(room, exhibits) : null),
    [room, exhibits],
  )
  const glassReflection = useMemo(() => probeReflection(probe, SCREEN_GLASS), [probe])
  useEffect(
    () => () => {
      for (const g of [frames, mats, washes, glass]) g?.dispose()
    },
    [frames, mats, washes, glass],
  )
  const glowColour = useMemo(() => new Color(palette.lambaIsik), [])

  return (
    <group>
      {frames && (
        <mesh geometry={frames} raycast={noRaycast}>
          <meshStandardMaterial
            vertexColors
            roughness={1}
            metalness={1}
            roughnessMap={finishSurfaceMap()}
            metalnessMap={finishSurfaceMap()}
            emissive={glowColour}
            emissiveMap={finishGlowMap()}
          />
        </mesh>
      )}
      {mats && (
        <mesh geometry={mats} raycast={noRaycast}>
          <meshBasicMaterial vertexColors />
        </mesh>
      )}
      {washes && (
        // After the frame drop shadows, so the lamp's light also lifts the shadow under the frame.
        <mesh geometry={washes} renderOrder={2} raycast={noRaycast}>
          <meshBasicMaterial
            map={pictureWashTexture()}
            color={palette.lambaIsik}
            transparent
            opacity={WASH_OPACITY}
            blending={AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      )}
      {glass && (
        // Clear glass: only its reflection is drawn. Over the film, under nothing.
        <mesh geometry={glass} renderOrder={3} raycast={noRaycast}>
          <meshBasicMaterial
            color="#000000"
            transparent
            opacity={0}
            depthWrite={false}
            toneMapped={false}
            onBeforeCompile={glassReflection}
            customProgramCacheKey={() => probeCacheKey(SCREEN_GLASS)}
          />
        </mesh>
      )}
    </group>
  )
}
