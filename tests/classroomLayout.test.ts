import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { CLASSROOM, DOOR_HEIGHT, MuseumSchema, roomOpenings } from '../src/schema/museum'
import { migrateMuseum } from '../src/schema/migrate'
import { classroomLayout } from '../src/classroom/layout'
import { ceilingGrid } from '../src/scene/ceilingGrid'
import { wallFrame } from '../src/scene/wallFrame'

import { JAMB_WIDTH } from '../src/scene/WallBuilder'
import { buildSunFloor } from '../src/scene/sun'
import { buildClassroomFurniture, buildContactShadows } from '../src/classroom/furniture'
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
const wallLength = (side: 'north' | 'east' | 'south' | 'west') => wallFrame(room, side).length

describe('classroomLayout', () => {
  it('fills the room with two-person desks, two seats each', () => {
    const c = room.classroom
    if (!c) throw new Error('not a classroom')
    expect(layout.desks).toHaveLength(c.rows * c.desksPerSide * 2)
    expect(layout.chairs).toHaveLength(layout.desks.length * 2)
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

  it('centres the board and screen on the front wall, side by side', () => {
    const front = wallLength(room.classroom?.front ?? 'north')
    const block = CLASSROOM.board.width + CLASSROOM.screen.gap + CLASSROOM.screen.width
    expect(layout.board.u0).toBeCloseTo((front - block) / 2)
    expect(layout.board.u1 - layout.board.u0).toBeCloseTo(CLASSROOM.board.width)
    expect(layout.screen.u0).toBeCloseTo(layout.board.u1 + CLASSROOM.screen.gap)
    expect(layout.screen.u1).toBeCloseTo(layout.screen.u0 + CLASSROOM.screen.width)
    // The block sits inside the wall with an equal margin on both sides.
    expect(front - layout.screen.u1).toBeCloseTo(layout.board.u0)
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
    // Roller blinds hang inside the window reveals, up to 10 cm behind the wall face.
    const reveal = 0.1 + 1e-6
    expect(b.min.x).toBeGreaterThanOrEqual(room.rect.x - reveal)
    expect(b.max.x).toBeLessThanOrEqual(room.rect.x + room.rect.width + reveal)
    expect(b.max.y).toBeLessThanOrEqual(room.height + 1e-6)
  })

  it('scatters chairs a little, the same way on every load, and never into the next desk', () => {
    expect(classroomLayout(room)).toEqual(layout)
    const yaws = new Set(layout.chairs.map((ch) => ch.yaw.toFixed(3)))
    expect(yaws.size).toBeGreaterThan(20)
    const { firstRow, rowPitch, desk } = CLASSROOM
    const rows = room.classroom?.rows ?? 0
    for (const ch of layout.chairs) {
      const d = ch.position[2] - room.rect.z
      const row = Math.round((d - firstRow - CLASSROOM.chairBehind) / rowPitch)
      if (row < rows - 1) {
        const nextDeskFront = firstRow + (row + 1) * rowPitch - desk.depth / 2
        expect(d).toBeLessThanOrEqual(nextDeskFront - 0.27 + 1e-9)
      }
      expect(d).toBeLessThan(room.rect.depth - 0.3)
    }
  })

  it("leaves the visitor's own chair exactly in place, facing the front", () => {
    const own = layout.chairs.find(
      (ch) =>
        Math.abs(ch.position[0] - layout.spawnSeat.position[0]) < 1e-9 &&
        Math.abs(ch.position[2] - layout.spawnSeat.position[2]) < 1e-9,
    )
    expect(own?.yaw).toBe(layout.frontYaw)
  })

  it('grounds every desk, chair and radiator with a penumbra and a core, on the floor', () => {
    const g = buildContactShadows(room, layout)
    // Desks, chairs, the lecturer's desk and chair, the waste bin, the three pieces of the
    // demonstration set and the radiators.
    const items = layout.desks.length + layout.chairs.length + 6 + layout.radiators.length
    expect(g.getAttribute('position').count).toBe(items * 2 * 4)
    g.computeBoundingBox()
    expect(g.boundingBox?.max.y).toBeCloseTo(0.0025)
  })

  it('lowers a roller blind part-way in every window, always above the window handle', () => {
    expect(layout.blinds).toHaveLength(room.windows.length)
    for (const [i, b] of layout.blinds.entries()) {
      const w = room.windows[i]
      if (!w) throw new Error('blind without window')
      expect(b.wall).toBe(w.wall)
      expect(b.u).toBe(w.offset)
      expect(b.top).toBeCloseTo(w.sill + w.height)
      // The handle sits at 42 % of the window height; the blind stops well above it.
      expect(b.bottom).toBeGreaterThan(w.sill + w.height * 0.5)
      expect(b.bottom).toBeLessThan(b.top - 0.15)
    }
    expect(new Set(layout.blinds.map((b) => b.bottom.toFixed(3))).size).toBeGreaterThan(1)
  })

  it('puts sockets on the walls but never in a door or window, and a switch beside each door', () => {
    expect(layout.sockets.length).toBeGreaterThanOrEqual(6)
    for (const s of layout.sockets) {
      for (const o of roomOpenings(room, s.wall)) {
        expect(Math.abs(s.u - o.offset)).toBeGreaterThan(o.width / 2 + JAMB_WIDTH)
      }
    }
    for (const d of room.doors) {
      const sw = layout.switches.find((s) => s.wall === d.wall)
      expect(sw).toBeDefined()
      const edge = d.offset + d.width / 2 + JAMB_WIDTH
      expect((sw?.u ?? 0) - edge).toBeGreaterThan(0.05)
      expect((sw?.u ?? 0) - edge).toBeLessThan(0.3)
      expect(sw?.v).toBeLessThan(DOOR_HEIGHT)
    }
  })

  it('fits ceiling fixtures into whole tiles, clear of the LED panels and the projector', () => {
    const grid = ceilingGrid(room.rect)
    const { diffusers, smokeDetectors, speakers } = layout.ceiling
    expect(diffusers.length).toBeGreaterThanOrEqual(2)
    expect(smokeDetectors.length).toBeGreaterThanOrEqual(2)
    expect(speakers).toHaveLength(2)
    const all = [...diffusers, ...smokeDetectors, ...speakers]
    const onTileCentre = (v: number, lines: number[]) =>
      lines.some((a, i) => {
        const b = lines[i + 1]
        return (
          b !== undefined && Math.abs(b - a - grid.tile) < 1e-9 && Math.abs(v - (a + b) / 2) < 1e-9
        )
      })
    for (const p of all) {
      expect(onTileCentre(p.x, grid.xs)).toBe(true)
      expect(onTileCentre(p.z, grid.zs)).toBe(true)
      for (const panel of grid.panels) {
        expect(Math.hypot(p.x - panel.x, p.z - panel.z)).toBeGreaterThan(grid.tile - 1e-9)
      }
      expect(Math.hypot(p.x - layout.projector[0], p.z - layout.projector[2])).toBeGreaterThan(0.8)
    }
    const keys = all.map((p) => `${p.x.toFixed(3)},${p.z.toFixed(3)}`)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('shortens the sunlight patches by however far each blind is left down', () => {
    const covered = layout.blinds.map((b, i) => (b.top - b.bottom) / (room.windows[i]?.height ?? 1))
    const bare = buildSunFloor(room)
    const shaded = buildSunFloor(room, covered)
    bare?.computeBoundingBox()
    shaded?.computeBoundingBox()
    // The windows are on the west wall, so a patch reaches into the room along +x.
    const bareFar = bare?.boundingBox?.max.x ?? 0
    const shadedFar = shaded?.boundingBox?.max.x ?? 0
    expect(shadedFar).toBeLessThan(bareFar)
    expect(shadedFar).toBeGreaterThan(room.rect.x)
  })

  it('keeps the waste bin inside the room and clear of every desk and chair', () => {
    const [bx, , bz] = layout.bin.position
    expect(bx).toBeGreaterThan(room.rect.x)
    expect(bx).toBeLessThan(room.rect.x + room.rect.width)
    expect(bz).toBeGreaterThan(room.rect.z)
    expect(bz).toBeLessThan(room.rect.z + room.rect.depth)
    for (const f of layout.footprints) {
      const dx = Math.max(0, Math.abs(bx - f.cx) - f.halfX)
      const dz = Math.max(0, Math.abs(bz - f.cz) - f.halfZ)
      expect(Math.hypot(dx, dz)).toBeGreaterThan(0.2)
    }
  })

  it('hangs the coat rail between the door and the pin board', () => {
    const rail = layout.coatRail
    if (!rail) throw new Error('no coat rail')
    const half = rail.width / 2
    for (const d of room.doors.filter((x) => x.wall === rail.wall)) {
      expect(rail.u - half).toBeGreaterThan(d.offset + d.width / 2 + JAMB_WIDTH)
    }
    // Nothing else hangs beside it: the rest of that wall is the class's exhibition.
    expect(rail.u + half).toBeLessThan(wallLength(rail.wall))
    expect(rail.v).toBeGreaterThan(CLASSROOM.desk.height)
  })
})
