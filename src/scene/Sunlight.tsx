import { useEffect, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import { AdditiveBlending, Color, DoubleSide, Object3D, type ShadowMaterial } from 'three'
import type { RoomDef } from '../schema/museum'
import type { RoomLight } from '../design/light'
import { palette } from '../design/tokens'
import { sunShaftTexture } from '../design/proceduralTextures'
import { roomBlinds } from '../classroom/layout'
import { useRoomStore } from '../classroom/roomStore'
import { quality } from '../xr/device'
import { buildSunFloor, buildSunShafts, sunDirection } from './sun'
import { createSunMaterial, createSunUniforms, setSunCover, type SunUniforms } from './sunShader'
import { HIDE_FROM_PROBE } from './RoomProbeCapture'

type Sun = { uniforms: SunUniforms; material: ShadowMaterial }

// One sun per room, shared by everything it falls on (floor here, furniture in Classroom).
const suns = new WeakMap<RoomDef, Sun | null>()

/** The room's sunlight material, or null for a room without windows. */
export function roomSun(room: RoomDef, light: RoomLight): Sun | null {
  if (!suns.has(room)) {
    const colour = new Color(palette.gunes).multiplyScalar(light.sun)
    const uniforms = createSunUniforms(room, colour)
    suns.set(room, uniforms ? { uniforms, material: createSunMaterial(uniforms) } : null)
  }
  return suns.get(room) ?? null
}

/** How much of each window its blind hides, from the top: nothing while the blinds are up. */
export function useSunCover(room: RoomDef): number[] {
  const blindsDown = useRoomStore((s) => s.blindsDown)
  return useMemo(() => {
    const blinds = room.classroom && blindsDown ? roomBlinds(room) : []
    return room.windows.map((w, i) => {
      const b = blinds[i]
      return b ? (b.top - b.bottom) / w.height : 0
    })
  }, [room, blindsDown])
}

// The sun's shadow map is drawn only when something that casts changes, never per frame: the
// furniture is fixed, so a few passes after loading cover it.
const SHADOW_PASSES_AFTER_MS = [0, 800, 3000]
const SHADOW_MAP = 2048
// Wide enough to cover the whole room seen along the sun.
const SHADOW_SPAN = 10
const SHADOW_DISTANCE = 20

/**
 * The sun of a room with windows: an invisible light that only casts the shadow map (the sun
 * shader does the lighting), the patches it throws on the floor, and on better headsets the
 * shafts of light hanging in the air between the windows and the floor.
 */
export function Sunlight({ room, light }: { room: RoomDef; light: RoomLight }) {
  const sun = roomSun(room, light)
  const cover = useSunCover(room)
  useEffect(() => {
    if (sun) setSunCover(sun.uniforms, room, cover)
  }, [sun, room, cover])
  const floor = useMemo(() => buildSunFloor(room, cover), [room, cover])
  const shafts = useMemo(
    () => (quality.sunShafts ? buildSunShafts(room, cover) : null),
    [room, cover],
  )
  useEffect(() => () => floor?.dispose(), [floor])
  useEffect(() => () => shafts?.dispose(), [shafts])

  const gl = useThree((s) => s.gl)
  const { target, position } = useMemo(() => {
    const t = new Object3D()
    const { x, z, width, depth } = room.rect
    t.position.set(x + width / 2, 0, z + depth / 2)
    const dir = sunDirection(room)
    const p = dir ? t.position.clone().addScaledVector(dir, -SHADOW_DISTANCE) : t.position.clone()
    return { target: t, position: p }
  }, [room])
  useEffect(() => {
    const timers = SHADOW_PASSES_AFTER_MS.map((ms) =>
      setTimeout(() => {
        gl.shadowMap.needsUpdate = true
      }, ms),
    )
    return () => timers.forEach(clearTimeout)
  }, [gl])

  if (!sun) return null
  return (
    <group>
      <primitive object={target} />
      <directionalLight
        position={position}
        target={target}
        // Casts only: the frames' PBR shading must not pick up a sun that cannot reach them.
        intensity={0}
        castShadow
        shadow-mapSize={[SHADOW_MAP, SHADOW_MAP]}
        shadow-radius={3}
        shadow-bias={-0.0008}
        shadow-normalBias={0.035}
        shadow-camera-left={-SHADOW_SPAN}
        shadow-camera-right={SHADOW_SPAN}
        shadow-camera-top={SHADOW_SPAN}
        shadow-camera-bottom={-SHADOW_SPAN}
        shadow-camera-near={1}
        shadow-camera-far={SHADOW_DISTANCE * 2}
      />
      {floor && (
        // Over the contact shadows and under the glass; additive, so it only ever brightens.
        <mesh geometry={floor} material={sun.material} receiveShadow renderOrder={2} />
      )}
      {shafts && (
        <mesh geometry={shafts} renderOrder={4} userData={{ [HIDE_FROM_PROBE]: true }}>
          <meshBasicMaterial
            map={sunShaftTexture()}
            color={palette.gunes}
            transparent
            opacity={SHAFT_OPACITY}
            blending={AdditiveBlending}
            depthWrite={false}
            side={DoubleSide}
          />
        </mesh>
      )}
    </group>
  )
}

// Dust lit by the sun: barely there, as it is in a real room, and doubled where you look through
// both faces of a beam.
const SHAFT_OPACITY = 0.05
