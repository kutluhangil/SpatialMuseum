import { describe, expect, it } from 'vitest'
import { wallFrame, wallPoint, wallSegments, wallYaw } from '../src/scene/wallFrame'
import type { WallSideName } from '../src/schema/museum'

const room = { rect: { x: -4, z: -3, width: 8, depth: 6 } }
const centre = [0, 0, 0] as const

describe('wallFrame', () => {
  it.each<[WallSideName, number]>([
    ['north', 8],
    ['south', 8],
    ['west', 6],
    ['east', 6],
  ])('%s wall: length, inward normal, u runs left to right seen from inside', (side, length) => {
    const f = wallFrame(room, side)
    expect(f.length).toBe(length)

    // The normal points from the wall towards the room centre.
    const mid = wallPoint(f, f.length / 2, 0)
    const toCentre = [centre[0] - mid[0], centre[2] - mid[2]] as const
    expect(toCentre[0] * f.normal[0] + toCentre[1] * f.normal[2]).toBeGreaterThan(0)

    // Standing inside and facing the wall (direction -normal), "right" is (-normal) x up.
    const facing = [-f.normal[0], -f.normal[2]] as const
    const right = [-facing[1], facing[0]] as const
    expect(f.uDir[0]).toBeCloseTo(right[0])
    expect(f.uDir[2]).toBeCloseTo(right[1])

    // Both ends of the wall are room corners.
    const end = wallPoint(f, f.length, 0)
    for (const p of [f.origin, end]) {
      expect([-4, 4]).toContain(p[0])
      expect([-3, 3]).toContain(p[2])
    }
  })

  it('shares the doorway position between two rooms that declare the same door', () => {
    const lobby = { rect: { x: -4, z: -3, width: 8, depth: 6 } }
    const north = { rect: { x: -4, z: -13, width: 8, depth: 10 } }
    const a = wallPoint(wallFrame(lobby, 'north'), 4, 0)
    const b = wallPoint(wallFrame(north, 'south'), 4, 0)
    expect(a[0]).toBeCloseTo(b[0])
    expect(a[2]).toBeCloseTo(b[2])
  })

  it('wallYaw turns a +Z plane to face along the normal', () => {
    for (const side of ['north', 'south', 'east', 'west'] as const) {
      const f = wallFrame(room, side)
      const yaw = wallYaw(f)
      expect(Math.sin(yaw)).toBeCloseTo(f.normal[0])
      expect(Math.cos(yaw)).toBeCloseTo(f.normal[2])
    }
  })
})

const door = (offset: number, width: number) => ({ offset, width, bottom: 0, top: 2.4 })

describe('wallSegments', () => {
  const area = (rs: { u0: number; u1: number; v0: number; v1: number }[]) =>
    rs.reduce((a, r) => a + (r.u1 - r.u0) * (r.v1 - r.v0), 0)

  it('returns the full wall when there are no doors', () => {
    expect(wallSegments(8, 3.6, [])).toEqual([{ u0: 0, u1: 8, v0: 0, v1: 3.6 }])
  })

  it('leaves exactly the door opening uncovered', () => {
    const rs = wallSegments(8, 3.6, [door(4, 1.6)])
    expect(rs).toHaveLength(3)
    expect(area(rs)).toBeCloseTo(8 * 3.6 - 1.6 * 2.4)
  })

  it('handles a door flush with the wall edge (no zero-width pier)', () => {
    const rs = wallSegments(6, 3.6, [door(0.8, 1.6)])
    expect(rs.every((r) => r.u1 - r.u0 > 0)).toBe(true)
    expect(rs).toHaveLength(2) // lintel + right pier
    expect(area(rs)).toBeCloseTo(6 * 3.6 - 1.6 * 2.4)
  })

  it('handles two doors on one wall given in any order', () => {
    const rs = wallSegments(10, 3.6, [door(7, 1.4), door(2, 1.4)])
    expect(rs).toHaveLength(5) // 3 piers + 2 lintels
    expect(area(rs)).toBeCloseTo(10 * 3.6 - 2 * 1.4 * 2.4)
  })

  it('keeps wall below and above a window', () => {
    const rs = wallSegments(8, 3.6, [{ offset: 4, width: 1.4, bottom: 1, top: 2.8 }])
    expect(rs).toHaveLength(4) // left pier, sill wall, head wall, right pier
    expect(rs.filter((r) => r.u0 === 3.3 && r.u1 === 4.7).map((r) => [r.v0, r.v1])).toEqual([
      [0, 1],
      [2.8, 3.6],
    ])
    expect(area(rs)).toBeCloseTo(8 * 3.6 - 1.4 * 1.8)
  })

  it('omits the lintel when the door is as tall as the wall', () => {
    const rs = wallSegments(8, 2.4, [door(4, 1.6)])
    expect(rs).toHaveLength(2)
  })
})
