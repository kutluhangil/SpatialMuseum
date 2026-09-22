import { useEffect, useMemo } from 'react'
import { AdditiveBlending, Color, RepeatWrapping, type Texture } from 'three'
import { useThree } from '@react-three/fiber'
import { TeleportTarget } from '@react-three/xr'
import type { ExhibitDef, RoomDef } from '../schema/museum'
import { palette } from '../design/tokens'
import { softShadowTexture, sunPatchTexture } from '../design/proceduralTextures'
import { CLASSROOM_LIGHT } from '../design/light'
import { useKTX2 } from '../media/useKTX2'
import { usePlayerStore } from '../locomotion/playerStore'
import { resolveCircle } from '../locomotion/collision'
import { buildFrameShadows, buildRoomTrim, buildRoomWalls, buildSunPatches } from './WallBuilder'
import { FLOOR_TILE_METRES, buildCeiling, buildFloor } from './Surfaces'

const FLOOR_URL = '/textures/floor-interior-tiles-2k.ktx2'

// PLAN §14 Faz 3: no teleport target closer than 0.4 m to a wall; targets are nudged out instead of refused.
const TELEPORT_WALL_CLEARANCE = 0.4

function configureFloor(tex: Texture, maxAnisotropy: number) {
  tex.wrapS = RepeatWrapping
  tex.wrapT = RepeatWrapping
  // Floors are seen at grazing angles; without anisotropy the texture smears into mush.
  tex.anisotropy = Math.min(8, maxAnisotropy)
}

type RoomProps = {
  room: RoomDef
  exhibits: ExhibitDef[]
}

export function Room({ room, exhibits }: RoomProps) {
  const light = CLASSROOM_LIGHT
  const wallColor = palette[room.wallTone]
  const baseboardColor = `#${new Color(wallColor).multiplyScalar(0.58).getHexString()}`
  const walls = useMemo(
    () => buildRoomWalls(room, wallColor, palette.korumaBandi, light),
    [room, wallColor, light],
  )
  const trim = useMemo(
    () => buildRoomTrim(room, palette.onsut, baseboardColor, palette.kapi, palette.metal, light),
    [room, baseboardColor, light],
  )
  const floor = useMemo(() => buildFloor(room, light, FLOOR_TILE_METRES), [room, light])
  const ceiling = useMemo(() => buildCeiling(room, palette.tavan, light), [room, light])
  const sun = useMemo(() => buildSunPatches(room), [room])
  const shadows = useMemo(() => buildFrameShadows(room, exhibits), [room, exhibits])
  useEffect(
    () => () => {
      for (const g of [walls, trim, floor, ceiling, sun, shadows]) g?.dispose()
    },
    [walls, trim, floor, ceiling, sun, shadows],
  )

  const maxAnisotropy = useThree((s) => s.gl.capabilities.getMaxAnisotropy())
  const floorMap = useKTX2(FLOOR_URL, (t) => configureFloor(t, maxAnisotropy))
  const teleport = usePlayerStore((s) => s.teleport)

  return (
    <group name={`room:${room.id}`}>
      {/* Unlit: light is baked into vertex colours (PLAN §8.4), which also keeps Quest fill cost low. */}
      <mesh geometry={walls}>
        <meshBasicMaterial vertexColors />
      </mesh>
      <mesh geometry={trim}>
        <meshBasicMaterial vertexColors />
      </mesh>
      <TeleportTarget
        onTeleport={(p) => {
          const [tx, tz] = resolveCircle(
            p.x,
            p.z,
            TELEPORT_WALL_CLEARANCE,
            usePlayerStore.getState().colliders,
          )
          teleport([tx, 0, tz])
        }}
      >
        <mesh geometry={floor}>
          <meshBasicMaterial map={floorMap} vertexColors />
        </mesh>
      </TeleportTarget>
      <mesh geometry={ceiling}>
        <meshBasicMaterial vertexColors />
      </mesh>
      {shadows && (
        <mesh geometry={shadows} renderOrder={1}>
          <meshBasicMaterial
            color="#000000"
            alphaMap={softShadowTexture()}
            transparent
            opacity={0.42}
            depthWrite={false}
          />
        </mesh>
      )}
      {sun && (
        <mesh geometry={sun} renderOrder={2}>
          <meshBasicMaterial
            map={sunPatchTexture()}
            color={light.light}
            transparent
            opacity={light.sun}
            blending={AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  )
}
