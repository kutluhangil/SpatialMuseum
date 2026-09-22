import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { MuseumSchema } from '../src/schema/museum'
import { migrateMuseum } from '../src/schema/migrate'
import { classroomLayout } from '../src/classroom/layout'
import { buildClassroomFurniture } from '../src/classroom/furniture'
import {
  museumSegments,
  boxSegments,
  resolveCircle,
  PLAYER_RADIUS,
} from '../src/locomotion/collision'

const museum = MuseumSchema.parse(
  migrateMuseum(JSON.parse(readFileSync('content/museum.json', 'utf8'))),
)
const room = museum.rooms[0]
if (!room?.classroom) throw new Error('content/museum.json has no classroom room')
const layout = classroomLayout(room)

describe('classroomLayout', () => {
  it('seats 40 students at 20 two-person desks', () => {
    expect(layout.desks).toHaveLength(20)
    expect(layout.chairs).toHaveLength(40)
  })

  it('keeps every desk inside the room, clear of the side walls and of each other', () => {
    const { x, z, width, depth } = room.rect
    for (const f of layout.footprints) {
      expect(f.cx - f.halfX).toBeGreaterThanOrEqual(x + 0.8 - 1e-9)
      expect(f.cx + f.halfX).toBeLessThanOrEqual(x + width - 0.8 + 1e-9)
      expect(f.cz - f.halfZ).toBeGreaterThan(z)
      expect(f.cz + f.halfZ).toBeLessThan(z + depth)
    }
    for (const [i, a] of layout.footprints.entries()) {
      for (const b of layout.footprints.slice(i + 1)) {
        const apart =
          Math.abs(a.cx - b.cx) >= a.halfX + b.halfX - 1e-9 ||
          Math.abs(a.cz - b.cz) >= a.halfZ + b.halfZ - 1e-9
        expect(apart).toBe(true)
      }
    }
  })

  it('leaves the centre aisle open from front to back', () => {
    const aisleX = room.rect.x + room.rect.width / 2
    expect(
      layout.footprints.filter((f) => Math.abs(f.cx - aisleX) < f.halfX + 0.5 - 1e-9),
    ).toHaveLength(0)
  })

  it('puts the board and screen side by side on the front wall', () => {
    expect(layout.board).toEqual({ u0: 0.7, u1: 4.7, v0: 0.9, v1: 2.1 })
    expect(layout.screen.u0).toBeCloseTo(5)
    expect(layout.screen.u1).toBeCloseTo(8.6)
  })

  it('matches the spawn in content/museum.json and lets the player stand up without a jolt', () => {
    expect(layout.spawnSeat.position[0]).toBeCloseTo(museum.spawn.position[0])
    expect(layout.spawnSeat.position[2]).toBeCloseTo(museum.spawn.position[2])
    expect(layout.spawnSeat.yaw).toBeCloseTo(museum.spawn.yaw, 2)
    const colliders = museumSegments(
      museum,
      layout.footprints.flatMap((f) => boxSegments(f.cx, f.cz, f.halfX, f.halfZ)),
    )
    const [sx, , sz] = layout.spawnSeat.position
    const [rx, rz] = resolveCircle(sx, sz, PLAYER_RADIUS, colliders)
    expect(Math.hypot(rx - sx, rz - sz)).toBeLessThan(0.01)
  })

  it('merges all furniture into one vertex-coloured geometry inside the room', () => {
    const g = buildClassroomFurniture(room, layout)
    const pos = g.getAttribute('position')
    expect(g.getAttribute('color').count).toBe(pos.count)
    expect(pos.count).toBeGreaterThan(1000)
    g.computeBoundingBox()
    const b = g.boundingBox
    if (!b) throw new Error('no bounding box')
    expect(b.min.x).toBeGreaterThanOrEqual(room.rect.x - 1e-6)
    expect(b.max.x).toBeLessThanOrEqual(room.rect.x + room.rect.width + 1e-6)
    expect(b.max.y).toBeLessThanOrEqual(room.height + 1e-6)
  })
})
