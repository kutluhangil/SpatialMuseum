import { useEffect, useMemo } from 'react'
import { Color, RepeatWrapping, type Texture } from 'three'
import { useThree } from '@react-three/fiber'
import { TeleportTarget } from '@react-three/xr'
import type { ExhibitDef, RoomDef } from '../schema/museum'
import { palette } from '../design/tokens'
import {
  PLASTER_METRES,
  ceilingTileTexture,
  glassTexture,
  plasterTexture,
  softShadowTexture,
} from '../design/proceduralTextures'
import { CLASSROOM_LIGHT } from '../design/light'
import { useKTX2 } from '../media/useKTX2'
import { usePlayerStore } from '../locomotion/playerStore'
import { resolveCircle } from '../locomotion/collision'
import { buildFrameShadows, buildRoomTrim, buildRoomWalls, buildWindowGlass } from './WallBuilder'
import { FLOOR_TILE_METRES, buildCeiling, buildCeilingPanels, buildFloor } from './Surfaces'
import { probeCacheKey, probeReflection, roomProbe, type Reflective } from './roomProbe'
import { PROBE_GAIN, RoomProbeCapture } from './RoomProbeCapture'
import { useRoomStore } from '../classroom/roomStore'
import { quality } from '../xr/device'
import { ExhibitFrames } from '../exhibits/ExhibitFrames'
import { Sunlight } from './Sunlight'

const FLOOR_URL = '/textures/floor-interior-tiles-2k.ktx2'

// An unlit LED panel: dark grey acrylic, not black, because daylight still falls on it.
const PANELS_OFF = '#727a80'

// A lit LED panel against the white it is drawn with: what makes it a highlight in reflections.
const PANEL_GAIN = 5
// Glazed ceramic tiles, mopped but not polished: a blurred reflection of the windows and ceiling
// panels that strengthens towards grazing angles, where a tiled corridor always looks wet.
const FLOOR_REFLECTION: Reflective = {
  f0: 0.06,
  strength: 1.5,
  lod: 1.5,
  normal: 'floor',
  mode: 'opaque',
}
// Float glass: faint straight on, a clear mirror of the room at a slant.
const WINDOW_REFLECTION: Reflective = {
  f0: 0.04,
  strength: 1,
  lod: 0.6,
  normal: 'mesh',
  mode: 'glass',
}

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
  const probe = roomProbe(room)
  const floorReflection = useMemo(() => probeReflection(probe, FLOOR_REFLECTION), [probe])
  const windowReflection = useMemo(() => probeReflection(probe, WINDOW_REFLECTION), [probe])
  const lightsOn = useRoomStore((s) => s.lightsOn)
  const glass = useMemo(() => buildWindowGlass(room), [room])
  const shadows = useMemo(() => buildFrameShadows(room, exhibits), [room, exhibits])
  useEffect(
    () => () => {
      for (const g of [walls, trim, floor, ceiling, panels, glass, shadows]) {
        g?.dispose()
      }
    },
    [walls, trim, floor, ceiling, panels, glass, shadows],
  )

  // Anisotropy is capped per device: a Quest 2 spends that bandwidth better elsewhere.
  const maxAnisotropy = useThree((s) =>
    Math.min(quality.anisotropy, s.gl.capabilities.getMaxAnisotropy()),
  )
  const floorMap = useKTX2(FLOOR_URL, (t) => configureFloor(t, maxAnisotropy))
  const teleport = usePlayerStore((s) => s.teleport)
  const wallMap = useMemo(() => {
    const t = plasterTexture()
    // Wall UVs are in metres, so this is what spreads one repeat over PLASTER_METRES of wall.
    t.repeat.set(1 / PLASTER_METRES, 1 / PLASTER_METRES)
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
            onBeforeCompile={floorReflection}
            customProgramCacheKey={() => probeCacheKey(FLOOR_REFLECTION)}
          />
        </mesh>
      </TeleportTarget>
      <mesh geometry={ceiling}>
        <meshBasicMaterial map={ceilingMap} vertexColors />
      </mesh>
      {/* Switched off, the panels stop being light sources and read as grey acrylic. */}
      <mesh geometry={panels} userData={lightsOn ? { [PROBE_GAIN]: PANEL_GAIN } : {}}>
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
      <RoomProbeCapture probe={probe} />
      <ExhibitFrames room={room} exhibits={exhibits} light={light} probe={probe} />
      {glass && (
        // After the panorama and walls; never writes depth, so exhibits behind stay visible.
        <mesh geometry={glass} renderOrder={3}>
          <meshBasicMaterial
            map={glassTexture()}
            color={palette.onsut}
            transparent
            depthWrite={false}
            toneMapped={false}
            onBeforeCompile={windowReflection}
            customProgramCacheKey={() => probeCacheKey(WINDOW_REFLECTION)}
          />
        </mesh>
      )}
      <Sunlight room={room} light={light} />
    </group>
  )
}
