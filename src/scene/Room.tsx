import { useEffect, useMemo } from 'react'
import { AdditiveBlending, Color, RepeatWrapping, type Texture } from 'three'
import { useThree } from '@react-three/fiber'
import { TeleportTarget } from '@react-three/xr'
import type { ExhibitDef, RoomDef } from '../schema/museum'
import { palette } from '../design/tokens'
import {
  ceilingTileTexture,
  floorGlareTexture,
  glassTexture,
  plasterTexture,
  softShadowTexture,
  sunPatchTexture,
} from '../design/proceduralTextures'
import { CLASSROOM_LIGHT } from '../design/light'
import { useKTX2 } from '../media/useKTX2'
import { usePlayerStore } from '../locomotion/playerStore'
import { resolveCircle } from '../locomotion/collision'
import {
  buildFrameShadows,
  buildRoomTrim,
  buildRoomWalls,
  buildSunPatches,
  buildWindowGlare,
  buildWindowGlass,
} from './WallBuilder'
import { FLOOR_TILE_METRES, buildCeiling, buildCeilingPanels, buildFloor } from './Surfaces'
import { floorSheen } from './floorSheen'
import { roomBlinds } from '../classroom/layout'
import { useRoomStore } from '../classroom/roomStore'

const FLOOR_URL = '/textures/floor-interior-tiles-2k.ktx2'

// An unlit LED panel: dark grey acrylic, not black, because daylight still falls on it.
const PANELS_OFF = '#727a80'

// Glazed ceramic: strength of the grazing-angle reflection added to the floor colour.
const FLOOR_SHEEN = 0.16

// PLAN §14 Faz 3: no teleport target closer than 0.4 m to a wall; targets are nudged out instead of refused.
const TELEPORT_WALL_CLEARANCE = 0.4

function configureFloor(tex: Texture, maxAnisotropy: number) {
  tex.wrapS = RepeatWrapping
  tex.wrapT = RepeatWrapping
  // Floors are seen at grazing angles; without anisotropy the texture smears into mush.
  tex.anisotropy = maxAnisotropy
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
    () =>
      buildRoomTrim(room, palette.onsut, baseboardColor, palette.kapi, palette.aluminyum, light),
    [room, baseboardColor, light],
  )
  const floor = useMemo(() => buildFloor(room, light, FLOOR_TILE_METRES), [room, light])
  const ceiling = useMemo(() => buildCeiling(room, light), [room, light])
  const panels = useMemo(() => buildCeilingPanels(room, palette.onsut, light), [room, light])
  const sheen = useMemo(() => floorSheen(light.light, FLOOR_SHEEN), [light])
  const blindsDown = useRoomStore((s) => s.blindsDown)
  const lightsOn = useRoomStore((s) => s.lightsOn)
  const sun = useMemo(() => {
    const blinds = room.classroom && blindsDown ? roomBlinds(room) : []
    const covered = room.windows.map((w, i) => {
      const b = blinds[i]
      return b ? (b.top - b.bottom) / w.height : 0
    })
    return buildSunPatches(room, covered)
  }, [room, blindsDown])
  const glass = useMemo(() => buildWindowGlass(room), [room])
  const glare = useMemo(() => buildWindowGlare(room), [room])
  const shadows = useMemo(() => buildFrameShadows(room, exhibits), [room, exhibits])
  useEffect(
    () => () => {
      for (const g of [walls, trim, floor, ceiling, panels, sun, glass, glare, shadows]) {
        g?.dispose()
      }
    },
    [walls, trim, floor, ceiling, panels, sun, glass, glare, shadows],
  )

  const maxAnisotropy = useThree((s) => s.gl.capabilities.getMaxAnisotropy())
  const floorMap = useKTX2(FLOOR_URL, (t) => configureFloor(t, maxAnisotropy))
  const teleport = usePlayerStore((s) => s.teleport)
  const wallMap = useMemo(() => {
    const t = plasterTexture()
    // The walls are read at a glance from across the room; anisotropy keeps the grain from smearing.
    t.anisotropy = maxAnisotropy
    return t
  }, [maxAnisotropy])
  const ceilingMap = useMemo(() => {
    const t = ceilingTileTexture()
    // Ceiling tiles are seen at grazing angles from a seat, like the floor.
    t.anisotropy = maxAnisotropy
    return t
  }, [maxAnisotropy])

  return (
    <group name={`room:${room.id}`}>
      {/* Unlit: light is baked into vertex colours (PLAN §8.4), which also keeps Quest fill cost low. */}
      <mesh geometry={walls}>
        <meshBasicMaterial map={wallMap} vertexColors />
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
          <meshBasicMaterial
            map={floorMap}
            vertexColors
            onBeforeCompile={sheen}
            customProgramCacheKey={() => 'floor-sheen'}
          />
        </mesh>
      </TeleportTarget>
      <mesh geometry={ceiling}>
        <meshBasicMaterial map={ceilingMap} vertexColors />
      </mesh>
      {/* Switched off, the panels stop being light sources and read as grey acrylic. */}
      <mesh geometry={panels}>
        <meshBasicMaterial vertexColors color={lightsOn ? '#ffffff' : PANELS_OFF} />
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
      {glass && (
        // After the panorama and walls; never writes depth, so exhibits behind stay visible.
        <mesh geometry={glass} renderOrder={3}>
          <meshBasicMaterial
            map={glassTexture()}
            color={palette.onsut}
            transparent
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      )}
      {glare && (
        // The floor's reflection of the window: under the sun patches, over the contact shadows.
        <mesh geometry={glare} renderOrder={2}>
          <meshBasicMaterial
            map={floorGlareTexture()}
            color={light.light}
            transparent
            opacity={0.22}
            blending={AdditiveBlending}
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
