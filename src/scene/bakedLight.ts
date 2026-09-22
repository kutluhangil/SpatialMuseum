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

// Daylight reach: surfaces within ~6 m of a window catch its light, the far side of the room
// falls back to the ceiling panels alone.
const REACH = 6
const BASE = 0.94
const GAIN = 0.14
// A window wall is seen against the bright glass, so it reads darker than it is (backlit).
const BACKLIT = 0.93
const FACING_BOOST = 0.03

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

/**
 * Baked daylight multiplier for a point in the room (floor plan x, z). Pass `wall` for points on a
 * wall surface: a wall holding windows is backlit, the wall facing them catches their light.
 * Rooms without windows get 1 everywhere.
 */
export function daylight(room: LitRoom, x: number, z: number, wall?: WallSideName): number {
  const sides = [...new Set(room.windows.map((w) => w.wall))]
  if (sides.length === 0) return 1
  if (wall && sides.includes(wall)) return BACKLIT
  const dist = Math.min(...sides.map((s) => distanceToWall(room, s, x, z)))
  const facing = wall && sides.some((s) => OPPOSITE[s] === wall) ? FACING_BOOST : 0
  return BASE + GAIN * (1 - smooth(dist / REACH)) + facing
}
