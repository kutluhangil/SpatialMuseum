import { BufferGeometry, Color, Float32BufferAttribute } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import {
  DOOR_HEIGHT,
  exhibitHeight,
  roomOpenings,
  type ExhibitDef,
  type Opening,
  type RoomDef,
  type WallSideName,
} from '../schema/museum'
import type { RoomLight } from '../design/light'
import { FRAME_PROFILE, FRAME_SHADOW } from '../exhibits/frameSpec'
import {
  wallFrame,
  wallPoint,
  wallSegments,
  type Vec3,
  type WallFrame,
  type WallRect,
} from './wallFrame'

const SIDES: WallSideName[] = ['north', 'east', 'south', 'west']

/** Reveal depth each room contributes on its own side; two back-to-back rooms add up to 15 cm. */
export const JAMB_DEPTH = 0.075
export const JAMB_WIDTH = 0.1
export const BASEBOARD_HEIGHT = 0.14
const BASEBOARD_DEPTH = 0.018

// Classroom wall: scuff-proof paint below a PVC rail at chair-back height, plain plaster above.
// Depths stay under the 2 cm exhibit offset so placards always sit in front.
export const CHAIR_RAIL = { bottom: 0.88, top: 0.94, depth: 0.018 }
const CEILING_ANGLE = { height: 0.03, depth: 0.02 }
const WINDOW = { reveal: 0.25, casing: 0.06, casingDepth: 0.04, sillDepth: 0.12, bar: 0.045 }

// Fake key light from the north-east: each wall orientation gets a fixed brightness so corners
// stay readable without runtime lighting (PLAN §8.4, "baked light at zero cost").
const SIDE_BRIGHTNESS: Record<WallSideName, number> = {
  north: 1,
  east: 0.95,
  south: 0.9,
  west: 0.93,
}

const WHITE = new Color(1, 1, 1)
const smooth = (t: number) => {
  const c = Math.min(1, Math.max(0, t))
  return c * c * (3 - 2 * c)
}

/** Base colour of a surface under the room light: tinted towards its colour, scaled by exposure. */
export function litColor(hex: string, light: RoomLight, brightness = 1): Color {
  return new Color(hex)
    .lerp(new Color(light.light), light.tint)
    .multiplyScalar(light.exposure * brightness)
}

/**
 * Baked ambient occlusion for a point on a wall: corners, the floor seam and the ceiling seam
 * darken softly.
 */
export function wallShade(u: number, v: number, length: number, height: number): number {
  const corner = Math.min(u, length - u)
  const cornerAO = 1 - 0.2 * (1 - smooth(corner / 0.8))
  const floorAO = 1 - 0.16 * (1 - smooth(v / 0.6))
  const ceilingAO = 1 - 0.1 * (1 - smooth((height - v) / 0.7))
  return cornerAO * floorAO * ceilingAO
}

function shadeColor(base: Color, u: number, v: number, length: number, height: number): Color {
  return base
    .clone()
    .lerp(WHITE, (v / height) * 0.07)
    .multiplyScalar(wallShade(u, v, length, height))
}

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

/**
 * One quad (a, b, c, d around its edge) as an indexed triangle pair facing `normal`. The winding
 * is derived from the normal, so callers only need to list corners in order around the edge.
 */
export function quad(
  a: Vec3,
  b: Vec3,
  c: Vec3,
  d: Vec3,
  normal: Vec3,
  colors?: [Color, Color, Color, Color],
): BufferGeometry {
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute([...a, ...b, ...c, ...d], 3))
  g.setAttribute(
    'normal',
    new Float32BufferAttribute([...normal, ...normal, ...normal, ...normal], 3),
  )
  if (colors) {
    g.setAttribute(
      'color',
      new Float32BufferAttribute(
        colors.flatMap((c) => [c.r, c.g, c.b]),
        3,
      ),
    )
  }
  const facesNormal = dot(cross(sub(b, a), sub(c, a)), normal) >= 0
  g.setIndex(facesNormal ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2])
  return g
}

function merge(parts: BufferGeometry[], what: string): BufferGeometry {
  const merged = mergeGeometries(parts)
  parts.forEach((p) => p.dispose())
  if (!merged) throw new Error(`could not merge ${what}: attribute sets differ between parts`)
  return merged
}

/** Breakpoints inside [a, b]: the given cuts plus a regular step, so vertex AO can vary smoothly. */
function cuts(a: number, b: number, fixed: number[], step: number): number[] {
  const out = new Set([a, b])
  for (const c of fixed) if (c > a && c < b) out.add(c)
  for (let x = Math.ceil(a / step) * step; x < b; x += step) if (x > a) out.add(x)
  return [...out].sort((x, y) => x - y)
}

function subdividedWall(
  frame: WallFrame,
  r: WallRect,
  base: Color,
  dado: Color,
  height: number,
): BufferGeometry[] {
  const L = frame.length
  const us = cuts(r.u0, r.u1, [0.2, 0.45, 0.8, L - 0.8, L - 0.45, L - 0.2], 1)
  const vs = cuts(r.v0, r.v1, [0.2, 0.6, CHAIR_RAIL.top, height - 0.7, height - 0.3], 1.2)
  const parts: BufferGeometry[] = []
  for (let i = 0; i < us.length - 1; i++) {
    for (let j = 0; j < vs.length - 1; j++) {
      const u0 = us[i] ?? 0
      const u1 = us[i + 1] ?? 0
      const v0 = vs[j] ?? 0
      const v1 = vs[j + 1] ?? 0
      // Quads never straddle the rail, so the dado tone changes with a crisp edge.
      const tone = v1 <= CHAIR_RAIL.top + 1e-6 ? dado : base
      const c = (u: number, v: number) => shadeColor(tone, u, v, L, height)
      parts.push(
        quad(
          wallPoint(frame, u0, v0),
          wallPoint(frame, u1, v0),
          wallPoint(frame, u1, v1),
          wallPoint(frame, u0, v1),
          frame.normal,
          [c(u0, v0), c(u1, v0), c(u1, v1), c(u0, v1)],
        ),
      )
    }
  }
  return parts
}

/** All four walls of a room merged into one geometry with baked light: one draw call per room. */
export function buildRoomWalls(
  room: RoomDef,
  baseColor: string,
  dadoColor: string,
  light: RoomLight,
): BufferGeometry {
  const parts: BufferGeometry[] = []
  for (const side of SIDES) {
    const base = litColor(baseColor, light, SIDE_BRIGHTNESS[side])
    const dado = litColor(dadoColor, light, SIDE_BRIGHTNESS[side])
    const frame = wallFrame(room, side)
    for (const r of wallSegments(frame.length, room.height, roomOpenings(room, side))) {
      parts.push(...subdividedWall(frame, r, base, dado, room.height))
    }
  }
  return merge(parts, `walls of room "${room.id}"`)
}

/**
 * Visible faces of a box on the wall between depths d0 and d1 (along the inward normal):
 * front, both ends, top and underside. Faces turned from the key light read a touch darker.
 */
function box(f: WallFrame, r: WallRect, d0: number, d1: number, color: Color): BufferGeometry[] {
  const p = (u: number, v: number, d: number) => wallPoint(f, u, v, d)
  const u = f.uDir
  const neg = (x: Vec3): Vec3 => [-x[0], -x[1], -x[2]]
  const side = color.clone().multiplyScalar(0.86)
  const top = color.clone().multiplyScalar(1.04)
  const under = color.clone().multiplyScalar(0.72)
  const c4 = (c: Color): [Color, Color, Color, Color] => [c, c, c, c]
  return [
    quad(
      p(r.u0, r.v0, d1),
      p(r.u1, r.v0, d1),
      p(r.u1, r.v1, d1),
      p(r.u0, r.v1, d1),
      f.normal,
      c4(color),
    ),
    quad(
      p(r.u0, r.v0, d0),
      p(r.u0, r.v0, d1),
      p(r.u0, r.v1, d1),
      p(r.u0, r.v1, d0),
      neg(u),
      c4(side),
    ),
    quad(p(r.u1, r.v0, d0), p(r.u1, r.v0, d1), p(r.u1, r.v1, d1), p(r.u1, r.v1, d0), u, c4(side)),
    quad(
      p(r.u0, r.v1, d0),
      p(r.u1, r.v1, d0),
      p(r.u1, r.v1, d1),
      p(r.u0, r.v1, d1),
      [0, 1, 0],
      c4(top),
    ),
    quad(
      p(r.u0, r.v0, d0),
      p(r.u1, r.v0, d0),
      p(r.u1, r.v0, d1),
      p(r.u0, r.v0, d1),
      [0, -1, 0],
      c4(under),
    ),
  ]
}

/** Stretches of wall that fully cover the band [v0, v1], with openings widened by `pad`. */
function runsCovering(
  f: WallFrame,
  room: RoomDef,
  openings: Opening[],
  v0: number,
  v1: number,
  pad: number,
) {
  const widened = openings.map((o) => ({ ...o, width: o.width + pad * 2 }))
  return wallSegments(f.length, room.height, widened)
    .filter((r) => r.v0 <= v0 + 1e-6 && r.v1 >= v1 - 1e-6 && r.u1 - r.u0 > 1e-3)
    .map((r) => ({ u0: Math.max(0, r.u0), u1: Math.min(f.length, r.u1) }))
}

function windowTrim(f: WallFrame, o: Opening, casing: Color): BufferGeometry[] {
  const o0 = o.offset - o.width / 2
  const o1 = o.offset + o.width / 2
  const { reveal, casing: cw, casingDepth, sillDepth, bar } = WINDOW
  const p = (u: number, v: number, d: number) => wallPoint(f, u, v, d)
  const revealColor = casing.clone().multiplyScalar(0.92)
  const c4: [Color, Color, Color, Color] = [revealColor, revealColor, revealColor, revealColor]
  const parts: BufferGeometry[] = [
    // Reveal: the inner faces of a thick wall, reaching outwards (negative depth) from the room.
    quad(
      p(o0, o.bottom, 0),
      p(o0, o.bottom, -reveal),
      p(o0, o.top, -reveal),
      p(o0, o.top, 0),
      f.uDir,
      c4,
    ),
    quad(
      p(o1, o.bottom, 0),
      p(o1, o.bottom, -reveal),
      p(o1, o.top, -reveal),
      p(o1, o.top, 0),
      [-f.uDir[0], -f.uDir[1], -f.uDir[2]],
      c4,
    ),
    quad(
      p(o0, o.bottom, 0),
      p(o1, o.bottom, 0),
      p(o1, o.bottom, -reveal),
      p(o0, o.bottom, -reveal),
      [0, 1, 0],
      c4,
    ),
    quad(
      p(o0, o.top, 0),
      p(o1, o.top, 0),
      p(o1, o.top, -reveal),
      p(o0, o.top, -reveal),
      [0, -1, 0],
      c4,
    ),
  ]
  // Architrave on three sides and a deeper sill ledge below.
  for (const r of [
    { u0: o0 - cw, u1: o0, v0: o.bottom, v1: o.top + cw },
    { u0: o1, u1: o1 + cw, v0: o.bottom, v1: o.top + cw },
    { u0: o0, u1: o1, v0: o.top, v1: o.top + cw },
  ]) {
    parts.push(...box(f, r, 0, casingDepth, casing))
  }
  parts.push(
    ...box(
      f,
      { u0: o0 - cw * 1.6, u1: o1 + cw * 1.6, v0: o.bottom - 0.06, v1: o.bottom },
      -reveal,
      sillDepth,
      casing,
    ),
  )
  // Glazing bars halfway through the reveal: one upright, one transom at two thirds.
  const midD0 = -reveal / 2 - bar / 2
  const midD1 = -reveal / 2 + bar / 2
  const tv = o.bottom + (o.top - o.bottom) * (2 / 3)
  parts.push(
    ...box(
      f,
      { u0: o.offset - bar / 2, u1: o.offset + bar / 2, v0: o.bottom, v1: o.top },
      midD0,
      midD1,
      casing,
    ),
  )
  parts.push(
    ...box(f, { u0: o0, u1: o1, v0: tv - bar / 2, v1: tv + bar / 2 }, midD0, midD1, casing),
  )
  return parts
}

/**
 * Architectural trim merged into one geometry: door casings, window reveals and architraves,
 * skirting, the scuff rail and the suspended ceiling's wall angle.
 */
export function buildRoomTrim(
  room: RoomDef,
  casingColor: string,
  baseboardColor: string,
  doorColor: string,
  handleColor: string,
  light: RoomLight,
): BufferGeometry {
  const parts: BufferGeometry[] = []
  for (const side of SIDES) {
    const f = wallFrame(room, side)
    const brightness = SIDE_BRIGHTNESS[side]
    const casing = litColor(casingColor, light, brightness)
    const baseboard = litColor(baseboardColor, light, brightness)
    const openings = roomOpenings(room, side)
    const doors = room.doors.filter((d) => d.wall === side)

    for (const door of doors) {
      const d0 = door.offset - door.width / 2
      const d1 = door.offset + door.width / 2
      const top = Math.min(DOOR_HEIGHT + JAMB_WIDTH, room.height - CEILING_ANGLE.height)
      for (const b of [
        { u0: d0 - JAMB_WIDTH, u1: d0, v0: 0, v1: top },
        { u0: d1, u1: d1 + JAMB_WIDTH, v0: 0, v1: top },
        { u0: d0, u1: d1, v0: DOOR_HEIGHT, v1: top },
      ]) {
        parts.push(...box(f, b, 0, JAMB_DEPTH, casing))
      }
      // A door that leads nowhere in the model (the corridor) is drawn shut, so the opening
      // never shows the outdoor panorama.
      if (door.to === undefined) {
        const leaf = litColor(doorColor, light, brightness)
        parts.push(...box(f, { u0: d0, u1: d1, v0: 0, v1: DOOR_HEIGHT }, -0.06, -0.02, leaf))
        const handle = litColor(handleColor, light, brightness)
        parts.push(
          ...box(f, { u0: d1 - 0.16, u1: d1 - 0.04, v0: 1.02, v1: 1.045 }, -0.02, 0.045, handle),
        )
      }
    }

    for (const w of openings.filter((o) => o.bottom > 0)) parts.push(...windowTrim(f, w, casing))

    // Horizontal mouldings stop at door casings (JAMB_WIDTH) and at window architraves.
    const doorOnly = openings.filter((o) => o.bottom === 0)
    for (const r of runsCovering(f, room, doorOnly, 0, BASEBOARD_HEIGHT, JAMB_WIDTH)) {
      parts.push(...box(f, { ...r, v0: 0, v1: BASEBOARD_HEIGHT }, 0, BASEBOARD_DEPTH, baseboard))
    }
    for (const r of runsCovering(
      f,
      room,
      openings,
      CHAIR_RAIL.bottom,
      CHAIR_RAIL.top,
      JAMB_WIDTH,
    )) {
      parts.push(
        ...box(f, { ...r, v0: CHAIR_RAIL.bottom, v1: CHAIR_RAIL.top }, 0, CHAIR_RAIL.depth, casing),
      )
    }
    parts.push(
      ...box(
        f,
        { u0: 0, u1: f.length, v0: room.height - CEILING_ANGLE.height, v1: room.height },
        0,
        CEILING_ANGLE.depth,
        casing,
      ),
    )
  }
  return merge(parts, `trim of room "${room.id}"`)
}

function withUv(g: BufferGeometry): BufferGeometry {
  g.setAttribute('uv', new Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2))
  return g
}

/**
 * Sunlight patches thrown onto the floor by each window: a soft parallelogram slanting away
 * from the wall, as if the sun stood high to the side. Additive, one draw call per room.
 */
export function buildSunPatches(room: RoomDef): BufferGeometry | null {
  const parts: BufferGeometry[] = []
  for (const win of room.windows) {
    const f = wallFrame(room, win.wall)
    const near = 0.25 + win.sill * 0.35
    const far = near + win.height * 0.85
    const skew = win.height * 0.35
    const u0 = win.offset - win.width / 2
    const u1 = win.offset + win.width / 2
    parts.push(
      withUv(
        quad(
          wallPoint(f, u0 + skew, 0.004, far),
          wallPoint(f, u1 + skew, 0.004, far),
          wallPoint(f, u1, 0.004, near),
          wallPoint(f, u0, 0.004, near),
          [0, 1, 0],
          [WHITE, WHITE, WHITE, WHITE],
        ),
      ),
    )
  }
  if (parts.length === 0) return null
  return merge(parts, `sun patches of room "${room.id}"`)
}

/** Soft drop shadows behind every framed painting in the room, merged into one mesh. */
export function buildFrameShadows(room: RoomDef, exhibits: ExhibitDef[]): BufferGeometry | null {
  const parts: BufferGeometry[] = []
  for (const ex of exhibits) {
    if (ex.type !== 'image' || (ex.frame !== 'wood' && ex.frame !== 'black')) continue
    const f = wallFrame(room, ex.placement.wall)
    const border = FRAME_PROFILE[ex.frame]
    const w = ex.placement.width + border * 2 + FRAME_SHADOW.spreadX
    const h = exhibitHeight(ex) + border * 2 + FRAME_SHADOW.spreadY
    const u = ex.placement.u + FRAME_SHADOW.offsetU
    const v = ex.placement.v + FRAME_SHADOW.offsetV
    const d = ex.placement.depthOffset - FRAME_SHADOW.depthBehind
    parts.push(
      withUv(
        quad(
          wallPoint(f, u - w / 2, v - h / 2, d),
          wallPoint(f, u + w / 2, v - h / 2, d),
          wallPoint(f, u + w / 2, v + h / 2, d),
          wallPoint(f, u - w / 2, v + h / 2, d),
          f.normal,
        ),
      ),
    )
  }
  if (parts.length === 0) return null
  return merge(parts, `frame shadows of room "${room.id}"`)
}
