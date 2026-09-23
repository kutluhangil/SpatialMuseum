import {
  BoxGeometry,
  BufferGeometry,
  Color,
  CylinderGeometry,
  Float32BufferAttribute,
  Matrix4,
  Quaternion,
  Vector3,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { exhibitHeight, type ExhibitDef, type RoomDef } from '../schema/museum'
import { palette } from '../design/tokens'
import type { RoomLight } from '../design/light'
import { litColor } from '../scene/WallBuilder'
import { daylight } from '../scene/bakedLight'
import { wallFrame, wallPoint, wallYaw } from '../scene/wallFrame'
import { frameBorder, matOf, mouldingOf, type Moulding } from './frameSpec'

/**
 * Surface finishes in the merged frame mesh. One material draws them all: each vertex carries its
 * finish in uv.x, which picks a texel in small lookup textures for roughness, metalness and glow.
 */
export const FINISHES = ['gilt', 'black', 'wood', 'brass', 'glow'] as const
export type Finish = (typeof FINISHES)[number]
export const FINISH_SLOTS = 8

export function finishU(finish: Finish): number {
  return (FINISHES.indexOf(finish) + 0.5) / FINISH_SLOTS
}

/** A point of a moulding's cross-section: s outward from the sight edge, z off the picture plane. */
type ProfilePoint = readonly [s: number, z: number, shade: number]

// Cross-sections, sight edge first. The shade is baked into the vertex colour: grime and the
// room's shadow gather in the coves, the crests catch the light and are rubbed bright.
const GILT: readonly ProfilePoint[] = [
  [0, 0.006, 0.45],
  [0, 0.018, 0.7],
  [0.004, 0.025, 1.05],
  [0.009, 0.021, 0.8],
  [0.014, 0.016, 0.55],
  [0.022, 0.02, 0.7],
  [0.031, 0.032, 0.95],
  [0.041, 0.044, 1.1],
  [0.049, 0.05, 1.15],
  [0.057, 0.052, 1.12],
  [0.064, 0.049, 1],
  [0.071, 0.041, 0.85],
  [0.077, 0.03, 0.72],
  [0.082, 0.024, 0.8],
  [0.085, 0.015, 0.7],
  [0.085, -0.02, 0.45],
]
const BLACK: readonly ProfilePoint[] = [
  [0, 0, 0.7],
  [0, 0.026, 0.85],
  [0.005, 0.032, 1],
  [0.025, 0.032, 1],
  [0.03, 0.026, 0.9],
  [0.03, -0.02, 0.6],
]
const WOOD: readonly ProfilePoint[] = [
  [0, 0, 0.7],
  [0, 0.02, 0.85],
  [0.01, 0.034, 1.05],
  [0.024, 0.04, 1.1],
  [0.038, 0.036, 1],
  [0.047, 0.026, 0.85],
  [0.05, 0.015, 0.8],
  [0.05, -0.02, 0.6],
]
const PROFILES: Record<Moulding, readonly ProfilePoint[]> = { gilt: GILT, black: BLACK, wood: WOOD }
const FINISH_OF: Record<Moulding, Finish> = { gilt: 'gilt', black: 'black', wood: 'wood' }
const COLOUR_OF: Record<Moulding, string> = {
  gilt: palette.yaldiz,
  black: palette.murekkep,
  wood: palette.ceviz,
}

// The four sides of a frame: the corner it starts from, the corner it ends at, and its outward
// direction. Consecutive rings of the profile share corners, so the mitres come for free.
const SIDES = [
  { from: [-1, -1], to: [1, -1], out: [0, -1] },
  { from: [1, -1], to: [1, 1], out: [1, 0] },
  { from: [1, 1], to: [-1, 1], out: [0, 1] },
  { from: [-1, 1], to: [-1, -1], out: [-1, 0] },
] as const

// Neighbouring facets closer than this share a normal, so the profile reads as a curve; a
// sharper turn keeps its crease.
const SMOOTH_COS = Math.cos((55 * Math.PI) / 180)

type Vec2 = readonly [number, number]

function segmentNormals(profile: readonly ProfilePoint[]): (Vec2 | null)[] {
  return profile.slice(0, -1).map(([s0, z0], i) => {
    const [s1, z1] = profile[i + 1] ?? [s0, z0]
    const len = Math.hypot(s1 - s0, z1 - z0)
    // Rotating the tangent a quarter turn points the facet at the viewer and away from the picture.
    return len < 1e-9 ? null : ([-(z1 - z0) / len, (s1 - s0) / len] as const)
  })
}

function blend(a: Vec2, b: Vec2 | null | undefined): Vec2 {
  if (!b || a[0] * b[0] + a[1] * b[1] < SMOOTH_COS) return a
  const s = a[0] + b[0]
  const z = a[1] + b[1]
  const len = Math.hypot(s, z)
  return [s / len, z / len]
}

/**
 * A moulding lofted around a width × height opening: each profile point becomes a rectangle, and
 * neighbouring rectangles are joined side by side. Non-indexed, with position, normal, colour and
 * the finish in uv.
 */
export function loftFrame(
  width: number,
  height: number,
  profile: readonly ProfilePoint[],
  colour: Color,
  finish: Finish,
): BufferGeometry {
  const normals = segmentNormals(profile)
  const u = finishU(finish)
  const position: number[] = []
  const normal: number[] = []
  const color: number[] = []
  const uv: number[] = []
  const corner = (c: readonly [number, number], p: ProfilePoint): Vector3 =>
    new Vector3(c[0] * (width / 2 + p[0]), c[1] * (height / 2 + p[0]), p[1])

  for (const side of SIDES) {
    normals.forEach((n, j) => {
      if (!n) return
      const p0 = profile[j]
      const p1 = profile[j + 1]
      if (!p0 || !p1) return
      const n0 = blend(n, normals[j - 1])
      const n1 = blend(n, normals[j + 1])
      const to3 = ([s, z]: Vec2) => new Vector3(side.out[0] * s, side.out[1] * s, z)
      const a = corner(side.from, p0)
      const b = corner(side.to, p0)
      const c = corner(side.to, p1)
      const d = corner(side.from, p1)
      const facing = to3(n)
      const flip =
        new Vector3().subVectors(b, a).cross(new Vector3().subVectors(c, a)).dot(facing) < 0
      type Vert = readonly [Vector3, Vector3, ProfilePoint]
      const A: Vert = [a, to3(n0), p0]
      const B: Vert = [b, to3(n0), p0]
      const C: Vert = [c, to3(n1), p1]
      const D: Vert = [d, to3(n1), p1]
      const order = flip ? [A, C, B, A, D, C] : [A, B, C, A, C, D]
      for (const [pos, nrm, p] of order) {
        position.push(pos.x, pos.y, pos.z)
        normal.push(nrm.x, nrm.y, nrm.z)
        const shaded = colour.clone().multiplyScalar(p[2])
        color.push(shaded.r, shaded.g, shaded.b)
        uv.push(u, 0.5)
      }
    })
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(position, 3))
  g.setAttribute('normal', new Float32BufferAttribute(normal, 3))
  g.setAttribute('color', new Float32BufferAttribute(color, 3))
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2))
  return g
}

/** Gives a stock three geometry the frame mesh's attribute set: one colour, one finish. */
function finished(g: BufferGeometry, colour: Color, finish: Finish): BufferGeometry {
  const flat = g.toNonIndexed()
  g.dispose()
  const n = flat.getAttribute('position').count
  const u = finishU(finish)
  flat.setAttribute(
    'color',
    new Float32BufferAttribute(Array(n).fill([colour.r, colour.g, colour.b]).flat(), 3),
  )
  flat.setAttribute('uv', new Float32BufferAttribute(Array(n).fill([u, 0.5]).flat(), 2))
  return flat
}

function at(
  g: BufferGeometry,
  x: number,
  y: number,
  z: number,
  rotZ = 0,
  rotX = 0,
): BufferGeometry {
  const q = new Quaternion()
    .setFromAxisAngle(new Vector3(0, 0, 1), rotZ)
    .multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), rotX))
  return g.applyMatrix4(new Matrix4().compose(new Vector3(x, y, z), q, new Vector3(1, 1, 1)))
}

// A gallery picture light: a brass hood on an arm above the frame, throwing its light down the
// front of the work. Measured from the frame's top edge and from the wall.
export const PICTURE_LIGHT = { rise: 0.13, reach: 0.19, hood: 0.024, maxLength: 0.56, share: 0.62 }

function pictureLight(outerWidth: number, top: number, wallZ: number): BufferGeometry[] {
  const brass = new Color(palette.pirinc)
  const length = Math.min(PICTURE_LIGHT.maxLength, outerWidth * PICTURE_LIGHT.share)
  const y = top + PICTURE_LIGHT.rise
  const z = wallZ + PICTURE_LIGHT.reach
  const arm = PICTURE_LIGHT.reach - 0.02
  return [
    finished(at(new BoxGeometry(0.07, 0.05, 0.012), 0, y + 0.012, wallZ + 0.006), brass, 'brass'),
    finished(
      at(
        new CylinderGeometry(0.006, 0.006, arm, 10),
        0,
        y + 0.012,
        wallZ + 0.012 + arm / 2,
        0,
        Math.PI / 2,
      ),
      brass,
      'brass',
    ),
    finished(
      at(
        new CylinderGeometry(PICTURE_LIGHT.hood, PICTURE_LIGHT.hood, length, 20),
        0,
        y,
        z,
        Math.PI / 2,
      ),
      brass,
      'brass',
    ),
    // The lit slot under the hood: what makes it read as a lamp that is on, not a brass rod.
    finished(
      at(
        new BoxGeometry(length - 0.03, 0.004, PICTURE_LIGHT.hood),
        0,
        y - PICTURE_LIGHT.hood + 0.002,
        z,
      ),
      new Color(palette.lambaIsik),
      'glow',
    ),
  ]
}

/** Where an exhibit hangs, as a matrix taking its local frame (picture plane z = 0) into the room. */
function hangMatrix(room: RoomDef, exhibit: ExhibitDef): Matrix4 {
  const p = exhibit.placement
  const f = wallFrame(room, p.wall)
  return new Matrix4().compose(
    new Vector3(...wallPoint(f, p.u, p.v, p.depthOffset)),
    new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), wallYaw(f)),
    new Vector3(1, 1, 1),
  )
}

function mergeParts(parts: BufferGeometry[], what: string): BufferGeometry | null {
  if (parts.length === 0) return null
  const merged = mergeGeometries(parts)
  parts.forEach((p) => p.dispose())
  if (!merged) throw new Error(`could not merge ${what}: attribute sets differ between parts`)
  return merged
}

/**
 * Every moulding in the room with its picture light, merged into one mesh for one PBR draw call.
 * Pass `lights: false` to hang the frames without lamps.
 */
export function buildExhibitFrames(
  room: RoomDef,
  exhibits: readonly ExhibitDef[],
  lights = true,
): BufferGeometry | null {
  const parts: BufferGeometry[] = []
  for (const ex of exhibits) {
    const moulding = mouldingOf(ex)
    if (!moulding) continue
    const mat = matOf(ex)
    const w = ex.placement.width + mat * 2
    const h = exhibitHeight(ex) + mat * 2
    const local = [
      loftFrame(w, h, PROFILES[moulding], new Color(COLOUR_OF[moulding]), FINISH_OF[moulding]),
    ]
    if (lights) {
      const border = frameBorder(ex)
      local.push(
        ...pictureLight(
          ex.placement.width + border * 2,
          exhibitHeight(ex) / 2 + border,
          -ex.placement.depthOffset,
        ),
      )
    }
    const m = hangMatrix(room, ex)
    parts.push(...local.map((g) => g.applyMatrix4(m)))
  }
  return mergeParts(parts, `exhibit frames of room "${room.id}"`)
}

// The mat's bevelled window: the cut face shows the white core of the board, tilted to the light.
const MAT = { face: 0.006, bevel: 0.006, core: 1.1 }
// The picture light falls from above, so the mat is brightest along its top and fades downward.
const MAT_TOP_LIGHT = 0.06

/**
 * The passepartout mats of the room's framed screens, merged. Unlit like the walls: the room's
 * baked daylight at the exhibit is folded into the vertex colours.
 */
export function buildExhibitMats(
  room: RoomDef,
  exhibits: readonly ExhibitDef[],
  light: RoomLight,
): BufferGeometry | null {
  const parts: BufferGeometry[] = []
  for (const ex of exhibits) {
    const mat = matOf(ex)
    if (mat === 0) continue
    const p = ex.placement
    const f = wallFrame(room, p.wall)
    const [x, , z] = wallPoint(f, p.u, p.v)
    const base = litColor(palette.paspartu, light, daylight(room, x, z, p.wall))
    const w = p.width
    const h = exhibitHeight(ex)
    const profile: ProfilePoint[] = [
      [0, 0.0015, MAT.core],
      [MAT.bevel, MAT.face, MAT.core],
      [MAT.bevel, MAT.face, 1],
      [mat, MAT.face, 1],
    ]
    const g = loftFrame(w, h, profile, base, 'black')
    const pos = g.getAttribute('position')
    const col = g.getAttribute('color')
    for (let i = 0; i < pos.count; i++) {
      const lift = 1 + MAT_TOP_LIGHT * (pos.getY(i) / (h / 2 + mat))
      col.setXYZ(i, col.getX(i) * lift, col.getY(i) * lift, col.getZ(i) * lift)
    }
    g.deleteAttribute('uv')
    g.deleteAttribute('normal')
    parts.push(g.applyMatrix4(hangMatrix(room, ex)))
  }
  return mergeParts(parts, `exhibit mats of room "${room.id}"`)
}

// The pool a picture light throws on the wall: from just above the hood to below the frame, a
// little wider than the frame.
const WASH = { above: 0.24, below: 0.35, widen: 1.7 }

/** One additive quad per lit exhibit on the wall behind it, merged; uv v = 1 at the lamp end. */
export function buildPictureWashes(
  room: RoomDef,
  exhibits: readonly ExhibitDef[],
): BufferGeometry | null {
  const parts: BufferGeometry[] = []
  for (const ex of exhibits) {
    if (!mouldingOf(ex)) continue
    const border = frameBorder(ex)
    const half = ((ex.placement.width + border * 2) * WASH.widen) / 2
    const top = exhibitHeight(ex) / 2 + border + WASH.above
    const bottom = -exhibitHeight(ex) / 2 - border - WASH.below
    const g = new BufferGeometry()
    // Just off the wall plane, behind the frame and its drop shadow.
    const z = -ex.placement.depthOffset + 0.004
    g.setAttribute(
      'position',
      new Float32BufferAttribute(
        [-half, bottom, z, half, bottom, z, half, top, z, -half, top, z],
        3,
      ),
    )
    g.setAttribute('uv', new Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2))
    g.setIndex([0, 1, 2, 0, 2, 3])
    parts.push(g.toNonIndexed().applyMatrix4(hangMatrix(room, ex)))
    g.dispose()
  }
  return mergeParts(parts, `picture light washes of room "${room.id}"`)
}

// Glazing sits just in front of the mat, inside the moulding's rabbet.
const GLASS_Z = 0.008

/** The glazing over each framed screen (picture and mat), merged; normals face into the room. */
export function buildExhibitGlass(
  room: RoomDef,
  exhibits: readonly ExhibitDef[],
): BufferGeometry | null {
  const parts: BufferGeometry[] = []
  for (const ex of exhibits) {
    const mat = matOf(ex)
    if (mat === 0) continue
    const hw = ex.placement.width / 2 + mat
    const hh = exhibitHeight(ex) / 2 + mat
    const g = new BufferGeometry()
    g.setAttribute(
      'position',
      new Float32BufferAttribute(
        [-hw, -hh, GLASS_Z, hw, -hh, GLASS_Z, hw, hh, GLASS_Z, -hw, hh, GLASS_Z],
        3,
      ),
    )
    g.setAttribute('normal', new Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1], 3))
    g.setIndex([0, 1, 2, 0, 2, 3])
    parts.push(g.toNonIndexed().applyMatrix4(hangMatrix(room, ex)))
    g.dispose()
  }
  return mergeParts(parts, `exhibit glass of room "${room.id}"`)
}
