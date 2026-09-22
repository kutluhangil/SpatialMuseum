import { describe, expect, it } from 'vitest'
import {
  boxSegments,
  museumSegments,
  PLAYER_RADIUS,
  resolveCircle,
  roomSegments,
} from '../src/locomotion/collision'
import { MuseumSchema } from '../src/schema/museum'

const museum = MuseumSchema.parse({
  version: 2,
  title: { tr: 'T' },
  spawn: { roomId: 'a', position: [0, 0, 0], yaw: 0 },
  rooms: [
    {
      id: 'a',
      name: { tr: 'A' },
      rect: { x: 0, z: 0, width: 8, depth: 6 },
      doors: [{ wall: 'north', offset: 4, width: 1.6, to: 'b' }],
    },
    {
      id: 'b',
      name: { tr: 'B' },
      rect: { x: 0, z: -10, width: 8, depth: 10 },
      doors: [{ wall: 'south', offset: 4, width: 1.6, to: 'a' }],
    },
  ],
  exhibits: [],
})
const segs = museumSegments(museum)

/** Walks from a point towards a target in small steps, resolving collisions each step like the game loop. */
function walk(from: [number, number], to: [number, number], steps = 400): [number, number] {
  let [x, z] = from
  for (let i = 0; i < steps; i++) {
    const dx = to[0] - x
    const dz = to[1] - z
    const d = Math.hypot(dx, dz)
    if (d < 1e-3) break
    const s = Math.min(0.05, d)
    ;[x, z] = resolveCircle(x + (dx / d) * s, z + (dz / d) * s, PLAYER_RADIUS, segs)
  }
  return [x, z]
}

describe('collision', () => {
  it('a room with one door has 5 floor-level wall stretches (door splits one wall)', () => {
    const room = museum.rooms[0]
    if (!room) throw new Error('fixture has no room')
    expect(roomSegments(room)).toHaveLength(5)
  })

  it('stops the player a radius away from a solid wall', () => {
    const [x, z] = walk([2, 3], [2, 10])
    expect(z).toBeCloseTo(6 - PLAYER_RADIUS, 2)
    expect(x).toBeCloseTo(2, 2)
  })

  it('lets the player walk through a doorway into the next room', () => {
    const [x, z] = walk([4, 3], [4, -5])
    expect(z).toBeLessThan(-4.9)
    expect(x).toBeCloseTo(4, 1)
  })

  it('slides along a wall when walking into it at an angle', () => {
    const [x, z] = walk([1, 3], [7, 20])
    expect(z).toBeCloseTo(6 - PLAYER_RADIUS, 2)
    expect(x).toBeGreaterThan(2.5)
  })

  it('walks around a box obstacle, never into it', () => {
    const withBox = [...segs, ...boxSegments(4, 3, 0.9, 0.25)]
    let [x, z] = [4, 1]
    for (let i = 0; i < 200; i++) [x, z] = resolveCircle(x, z + 0.02, PLAYER_RADIUS, withBox)
    expect(z).toBeLessThanOrEqual(3 - 0.25 - PLAYER_RADIUS + 1e-6)
  })
})
