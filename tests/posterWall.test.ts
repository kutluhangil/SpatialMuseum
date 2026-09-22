import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { MuseumSchema, roomOpenings } from '../src/schema/museum'
import { migrateMuseum } from '../src/schema/migrate'
import { cellUv, posterSlots } from '../src/exhibits/posterHang'

const museum = MuseumSchema.parse(
  migrateMuseum(JSON.parse(readFileSync('content/museum.json', 'utf8'))),
)
const wall = museum.posterWall
if (!wall) throw new Error('content/museum.json has no poster wall')
const room = museum.rooms.find((r) => r.id === wall.roomId)
if (!room) throw new Error(`poster wall names unknown room "${wall.roomId}"`)
const slots = posterSlots(wall)
const total = wall.atlases.reduce((n, a) => n + a.count, 0)

describe('posterSlots', () => {
  it('hangs every page the atlases hold', () => {
    expect(slots).toHaveLength(total)
    for (const [i, atlas] of wall.atlases.entries()) {
      const mine = slots.filter((s) => s.atlas === i)
      expect(mine).toHaveLength(atlas.count)
      expect(new Set(mine.map((s) => s.cell)).size).toBe(atlas.count)
      for (const slot of mine) expect(slot.cell).toBeLessThan(atlas.columns * atlas.rows)
    }
  })

  it('keeps the run inside the wall and clear of the door', () => {
    const half = wall.width / 2
    const height = wall.width / wall.aspect
    for (const slot of slots) {
      expect(slot.u - half).toBeGreaterThanOrEqual(wall.from - 1e-9)
      expect(slot.u + half).toBeLessThanOrEqual(wall.to + 1e-9)
      expect(slot.v - height / 2).toBeGreaterThan(0.9)
      expect(slot.v + height / 2).toBeLessThan(room.height)
      for (const opening of roomOpenings(room, wall.wall)) {
        const clear =
          slot.u + half <= opening.offset - opening.width / 2 ||
          slot.u - half >= opening.offset + opening.width / 2
        expect(clear).toBe(true)
      }
    }
  })

  it('never lets two pages overlap', () => {
    const half = wall.width / 2
    const height = wall.width / wall.aspect
    for (const [i, a] of slots.entries()) {
      for (const b of slots.slice(i + 1)) {
        const apart = Math.abs(a.u - b.u) >= wall.width - 1e-9 || Math.abs(a.v - b.v) >= height
        expect(apart).toBe(true)
      }
    }
    expect(half).toBeGreaterThan(0)
  })

  it('fills the rows left to right, top row first', () => {
    const perRow = Math.ceil(total / wall.rows.length)
    expect(slots[0]?.v).toBe(wall.rows[0])
    expect(slots[perRow]?.v).toBe(wall.rows[1])
    expect(slots[0]?.u).toBeLessThan(slots[1]?.u ?? 0)
  })
})

describe('cellUv', () => {
  const atlas = { src: 'x', columns: 3, rows: 4, count: 12 }

  it('reads the sheet row by row from the top left', () => {
    expect(cellUv(atlas, 0)).toEqual({ u0: 0, u1: 1 / 3, v0: 3 / 4, v1: 1 })
    expect(cellUv(atlas, 2)).toEqual({ u0: 2 / 3, u1: 1, v0: 3 / 4, v1: 1 })
    expect(cellUv(atlas, 3)).toEqual({ u0: 0, u1: 1 / 3, v0: 1 / 2, v1: 3 / 4 })
    expect(cellUv(atlas, 11)).toEqual({ u0: 2 / 3, u1: 1, v0: 0, v1: 1 / 4 })
  })

  it('covers the sheet exactly once', () => {
    const area = Array.from({ length: 12 }, (_, i) => cellUv(atlas, i)).reduce(
      (sum, c) => sum + (c.u1 - c.u0) * (c.v1 - c.v0),
      0,
    )
    expect(area).toBeCloseTo(1)
  })
})
