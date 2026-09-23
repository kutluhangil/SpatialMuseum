import { Color } from 'three'
import type { RoomDef, WallSideName } from '../schema/museum'

const smooth = (t: number) => {
  const c = Math.min(1, Math.max(0, t))
  return c * c * (3 - 2 * c)
}

const OPPOSITE: Record<WallSideName, WallSideName> = {
  north: 'south',
  south: 'north',
  east: 'west',
  west: 'east',
}

// Daylight reach: surfaces within ~7 m of a window catch its light, the far side of the room
// falls back to the ceiling panels alone. The spread between the two ends is what gives a big
// hall its depth: with everything inside a few per cent of white the room reads as a flat box.
const REACH = 7
const BASE = 0.8
const GAIN = 0.24
// A window wall is seen against the bright glass, so it reads darker than it is (backlit). As a
// factor on the light it actually receives it stays the darkest wall whatever the room's size.
const BACKLIT = 0.78
const FACING_BOOST = 0.04

// Daylight is far bluer than an LED panel. Splitting the room between the two - cool by the
// glass, warm where only the fittings reach - is the cue that reads as real light; at full
// strength it would read as coloured plastic, so the tint stays a few per cent.
const SKY = new Color('#D6E6FF')
const LAMP = new Color('#FFF6E8')
const WHITE = new Color(1, 1, 1)
const TINT = 0.06

type LitRoom = Pick<RoomDef, 'rect'> & { windows: readonly { wall: WallSideName }[] }

function distanceToWall(room: LitRoom, side: WallSideName, x: number, z: number): number {
  const { rect } = room
  switch (side) {
    case 'west':
      return x - rect.x
    case 'east':
      return rect.x + rect.width - x
    case 'north':
      return z - rect.z
    case 'south':
      return rect.z + rect.depth - z
  }
}

function windowSides(room: LitRoom): WallSideName[] {
  return [...new Set(room.windows.map((w) => w.wall))]
}

/**
 * Baked daylight multiplier for a point in the room (floor plan x, z). Pass `wall` for points on a
 * wall surface: a wall holding windows is backlit, the wall facing them catches their light.
 * Rooms without windows get 1 everywhere.
 */
export function daylight(room: LitRoom, x: number, z: number, wall?: WallSideName): number {
  const sides = windowSides(room)
  if (sides.length === 0) return 1
  const dist = Math.min(...sides.map((s) => distanceToWall(room, s, x, z)))
  const reach = BASE + GAIN * (1 - smooth(dist / REACH))
  if (wall && sides.includes(wall)) return reach * BACKLIT
  const facing = wall && sides.some((s) => OPPOSITE[s] === wall) ? FACING_BOOST : 0
  return reach + facing
}

/** How much of the light at a point comes from the windows rather than the ceiling panels. */
function skyShare(room: LitRoom, x: number, z: number, wall?: WallSideName): number {
  const sides = windowSides(room)
  if (sides.length === 0) return 0
  if (wall && sides.includes(wall)) return 1
  const dist = Math.min(...sides.map((s) => distanceToWall(room, s, x, z)))
  return 1 - smooth(dist / REACH)
}

/**
 * The same baked daylight as `daylight`, as a colour multiplier that also carries the room's
 * warm/cool split. Surfaces that print text keep the scalar form, so their contrast is untouched.
 */
export function daylightColor(room: LitRoom, x: number, z: number, wall?: WallSideName): Color {
  const tint = new Color().lerpColors(LAMP, SKY, skyShare(room, x, z, wall)).lerp(WHITE, 1 - TINT)
  return tint.multiplyScalar(daylight(room, x, z, wall))
}
