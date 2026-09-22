import type { RoomDef, WallSideName } from '../schema/museum'

export type Vec3 = readonly [number, number, number]

export type WallFrame = {
  /** Floor-level point at the wall's left end, seen from inside the room. */
  origin: Vec3
  /** Unit vector along the wall, left to right as seen from inside. */
  uDir: Vec3
  /** Unit vector pointing from the wall into the room. */
  normal: Vec3
  length: number
}

/** Local frame of one wall (PLAN §6.1): u runs along the wall, v is height, normal faces inward. */
export function wallFrame(room: Pick<RoomDef, 'rect'>, side: WallSideName): WallFrame {
  const { x, z, width, depth } = room.rect
  switch (side) {
    case 'north':
      return { origin: [x, 0, z], uDir: [1, 0, 0], normal: [0, 0, 1], length: width }
    case 'south':
      return {
        origin: [x + width, 0, z + depth],
        uDir: [-1, 0, 0],
        normal: [0, 0, -1],
        length: width,
      }
    case 'west':
      return { origin: [x, 0, z + depth], uDir: [0, 0, -1], normal: [1, 0, 0], length: depth }
    case 'east':
      return { origin: [x + width, 0, z], uDir: [0, 0, 1], normal: [-1, 0, 0], length: depth }
  }
}

/** World position of wall-local (u, v, depth off the wall). */
export function wallPoint(frame: WallFrame, u: number, v: number, d = 0): Vec3 {
  const [ox, , oz] = frame.origin
  return [
    ox + frame.uDir[0] * u + frame.normal[0] * d,
    v,
    oz + frame.uDir[2] * u + frame.normal[2] * d,
  ]
}

/** Y rotation that turns a default +Z-facing plane to face into the room from this wall. */
export function wallYaw(frame: WallFrame): number {
  return Math.atan2(frame.normal[0], frame.normal[2])
}

export type WallRect = { u0: number; u1: number; v0: number; v1: number }
export type { Opening } from '../schema/museum'
import type { Opening } from '../schema/museum'

/**
 * Splits a wall into solid rectangles around openings: full-height piers between openings,
 * plus the wall below (sill) and above (lintel) each opening. Openings are expected to be
 * pre-validated (inside the wall, non-overlapping in u); unsorted input is fine.
 */
export function wallSegments(length: number, height: number, openings: Opening[]): WallRect[] {
  const sorted = [...openings].sort((a, b) => a.offset - b.offset)
  const rects: WallRect[] = []
  let cursor = 0
  for (const o of sorted) {
    const o0 = o.offset - o.width / 2
    const o1 = o.offset + o.width / 2
    if (o0 > cursor) rects.push({ u0: cursor, u1: o0, v0: 0, v1: height })
    if (o.bottom > 0) rects.push({ u0: o0, u1: o1, v0: 0, v1: Math.min(o.bottom, height) })
    if (o.top < height) rects.push({ u0: o0, u1: o1, v0: o.top, v1: height })
    cursor = o1
  }
  if (cursor < length) rects.push({ u0: cursor, u1: length, v0: 0, v1: height })
  return rects
}
