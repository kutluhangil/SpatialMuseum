import { BufferGeometry, Float32BufferAttribute, Vector3 } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { RoomDef, WallSideName } from '../schema/museum'
import { wallFrame, wallPoint, type Vec3 } from './wallFrame'
import { WINDOW } from './WallBuilder'

/**
 * The sun, as the room sees it: one direction of travel, entering through the windows of one
 * wall. Given as the horizontal run per metre of drop, into the room and along the window wall,
 * so it reads like the slant of a patch on the floor: a low afternoon sun (about 27° up) off to
 * one side, low enough that its beams reach the first desks.
 */
export const SUN_SLOPE = { into: 1.9, along: 0.5 }

// The glass sits halfway through the reveal; the beam is cut by the glazing bars there.
export const GLAZING_DEPTH = -WINDOW.reveal / 2

/** The wall the sun comes through: the first window's. Rooms without windows get no sun. */
export function sunWall(room: RoomDef): WallSideName | null {
  return room.windows[0]?.wall ?? null
}

/** Unit vector the sunlight travels along (downwards, into the room), or null without windows. */
export function sunDirection(room: RoomDef): Vector3 | null {
  const wall = sunWall(room)
  if (!wall) return null
  const f = wallFrame(room, wall)
  return new Vector3(
    f.normal[0] * SUN_SLOPE.into + f.uDir[0] * SUN_SLOPE.along,
    -1,
    f.normal[2] * SUN_SLOPE.into + f.uDir[2] * SUN_SLOPE.along,
  ).normalize()
}

/**
 * What of each sunlit window lets light through, in window-wall coordinates: the opening below
 * its blind, and its glazing bars (one upright at the middle, one transom at two thirds).
 * `covered[i]` is how much of window i its blind hides, from the top.
 */
export type SunOpening = {
  u0: number
  u1: number
  v0: number
  v1: number
  upright: number
  transom: number
}

export function sunOpenings(room: RoomDef, covered: readonly number[] = []): SunOpening[] {
  const wall = sunWall(room)
  return room.windows.flatMap((w, i) => {
    if (w.wall !== wall) return []
    const cover = Math.min(1, Math.max(0, covered[i] ?? 0))
    return [
      {
        u0: w.offset - w.width / 2,
        u1: w.offset + w.width / 2,
        v0: w.sill,
        v1: w.sill + w.height * (1 - cover),
        upright: w.offset,
        transom: w.sill + w.height * (2 / 3),
      },
    ]
  })
}

/** Where a point on the glazing plane lands on the floor, following the sun. */
function toFloor(p: Vec3, sun: Vector3, y: number): Vec3 {
  const t = (p[1] - y) / -sun.y
  return [p[0] + sun.x * t, y, p[2] + sun.z * t]
}

// The floor quads reach past the opening's own projection, so the soft edge the shader draws
// (wider the further the light has travelled) is never clipped by the geometry.
const FLOOR_MARGIN = 0.3
const FLOOR_Y = 0.004

function quadGeometry(corners: Vec3[], normal: Vec3, uvs?: number[]): BufferGeometry {
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(corners.flat(), 3))
  g.setAttribute(
    'normal',
    new Float32BufferAttribute([...normal, ...normal, ...normal, ...normal], 3),
  )
  g.setAttribute('uv', new Float32BufferAttribute(uvs ?? [0, 0, 1, 0, 1, 1, 0, 1], 2))
  g.setIndex([0, 1, 2, 0, 2, 3])
  const flat = g.toNonIndexed()
  g.dispose()
  return flat
}

function merged(parts: BufferGeometry[], what: string): BufferGeometry | null {
  if (parts.length === 0) return null
  const out = mergeGeometries(parts)
  parts.forEach((p) => p.dispose())
  if (!out) throw new Error(`could not merge ${what}: attribute sets differ between parts`)
  return out
}

/**
 * The floor under each sunlit window's beam, one quad per window. The quads only bound the light:
 * its shape (opening, glazing bars, blind, the furniture's shadows) is drawn by the sun shader.
 */
export function buildSunFloor(
  room: RoomDef,
  covered: readonly number[] = [],
): BufferGeometry | null {
  const sun = sunDirection(room)
  const wall = sunWall(room)
  if (!sun || !wall) return null
  const f = wallFrame(room, wall)
  const parts: BufferGeometry[] = []
  for (const o of sunOpenings(room, covered)) {
    if (o.v1 - o.v0 < 1e-3) continue
    const m = FLOOR_MARGIN
    const at = (u: number, v: number) => toFloor(wallPoint(f, u, v, GLAZING_DEPTH), sun, FLOOR_Y)
    const a = at(o.u0 - m, o.v0 - m)
    const b = at(o.u1 + m, o.v0 - m)
    const c = at(o.u1 + m, o.v1 + m)
    const d = at(o.u0 - m, o.v1 + m)
    // Corner order keeps the quad facing up whichever wall the windows are on.
    const up =
      new Vector3(...b).sub(new Vector3(...a)).cross(new Vector3(...c).sub(new Vector3(...a))).y > 0
    parts.push(quadGeometry(up ? [a, b, c, d] : [d, c, b, a], [0, 1, 0]))
  }
  return merged(parts, `sun on the floor of room "${room.id}"`)
}

/**
 * Shafts of sunlight hanging in the air: each open window's beam as the four long faces of the
 * slanted box it sweeps from the glass to the floor. uv v runs 0 at the glass to 1 on the floor,
 * u across each face.
 */
export function buildSunShafts(
  room: RoomDef,
  covered: readonly number[] = [],
): BufferGeometry | null {
  const sun = sunDirection(room)
  const wall = sunWall(room)
  if (!sun || !wall) return null
  const f = wallFrame(room, wall)
  const parts: BufferGeometry[] = []
  for (const o of sunOpenings(room, covered)) {
    if (o.v1 - o.v0 < 1e-3) continue
    // The beam starts at the room face of the wall, where the reveal lets it out.
    const glass = (u: number, v: number) => wallPoint(f, u, v, 0)
    const edges: [Vec3, Vec3][] = [
      [glass(o.u0, o.v0), glass(o.u1, o.v0)],
      [glass(o.u1, o.v0), glass(o.u1, o.v1)],
      [glass(o.u1, o.v1), glass(o.u0, o.v1)],
      [glass(o.u0, o.v1), glass(o.u0, o.v0)],
    ]
    const floorOf = (p: Vec3) => toFloor(p, sun, 0)
    for (const [a, b] of edges) {
      const n = new Vector3(...b)
        .sub(new Vector3(...a))
        .cross(sun)
        .normalize()
      parts.push(
        quadGeometry([a, b, floorOf(b), floorOf(a)], [n.x, n.y, n.z], [0, 0, 1, 0, 1, 1, 0, 1]),
      )
    }
  }
  return merged(parts, `sun shafts of room "${room.id}"`)
}
