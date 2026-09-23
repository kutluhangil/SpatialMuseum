import {
  BoxGeometry,
  BufferGeometry,
  Color,
  CylinderGeometry,
  Float32BufferAttribute,
  Matrix4,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { CLASSROOM, type RoomDef } from '../schema/museum'
import { palette } from '../design/tokens'
import { CLASSROOM_LIGHT } from '../design/light'
import { litColor } from '../scene/WallBuilder'
import { wallFrame, wallPoint, wallYaw } from '../scene/wallFrame'
import { daylightColor } from '../scene/bakedLight'
import { hashSeed, seededRandom, type ClassroomLayout, type Placed, type WallSpot } from './layout'

// Faked key light from above: tops brightest, faces turned away darkest. Same idea as the
// walls' SIDE_BRIGHTNESS, so furniture sits in the room's baked light without runtime lights.
const FACE_SHADE = [0.88, 0.82, 1.06, 0.62, 0.95, 0.78] // +x, -x, +y, -y, +z, -z (BoxGeometry group order)
// Ceiling fixtures are seen from below and lit by the panels and the floor bounce: undersides brightest.
const CEILING_SHADE = [0.9, 0.9, 0.8, 1, 0.9, 0.9]

type CylinderShade = { top: number; side: number; bottom: number }
const CYLINDER_SHADE: CylinderShade = { top: 1.05, side: 0.85, bottom: 0.65 }
const CEILING_CYLINDER_SHADE: CylinderShade = { top: 0.8, side: 0.9, bottom: 1 }

const lit = (hex: string) => litColor(hex, CLASSROOM_LIGHT)

/** A box with per-face baked shading, non-indexed so each face keeps its own colour. */
function shadedBox(
  w: number,
  h: number,
  d: number,
  color: Color,
  shade: readonly number[] = FACE_SHADE,
): BufferGeometry {
  const g = new BoxGeometry(w, h, d).toNonIndexed()
  g.deleteAttribute('uv')
  const n = g.getAttribute('position').count
  const colors: number[] = []
  for (let i = 0; i < n; i++) {
    const c = color.clone().multiplyScalar(shade[Math.floor(i / 6)] ?? 1)
    colors.push(c.r, c.g, c.b)
  }
  g.setAttribute('color', new Float32BufferAttribute(colors, 3))
  return g
}

function shadedCylinder(
  r: number,
  h: number,
  color: Color,
  segments = 24,
  shade: CylinderShade = CYLINDER_SHADE,
): BufferGeometry {
  const g = new CylinderGeometry(r, r, h, segments).toNonIndexed()
  g.deleteAttribute('uv')
  const normals = g.getAttribute('normal')
  const colors: number[] = []
  for (let i = 0; i < normals.count; i++) {
    const up = normals.getY(i)
    const c = color
      .clone()
      .multiplyScalar(up > 0.5 ? shade.top : up < -0.5 ? shade.bottom : shade.side)
    colors.push(c.r, c.g, c.b)
  }
  g.setAttribute('color', new Float32BufferAttribute(colors, 3))
  return g
}

/**
 * Colours a curved surface from its normals: upward faces catch the ceiling panels, downward ones
 * only the floor bounce. Flat-shaded boxes get their tone per face instead, from FACE_SHADE.
 */
function shadedByNormal(g: BufferGeometry, color: Color, down = 0.6, up = 1.06): BufferGeometry {
  const rounded = g.toNonIndexed()
  g.dispose()
  rounded.deleteAttribute('uv')
  const normals = rounded.getAttribute('normal')
  const colors: number[] = []
  const c = new Color()
  for (let i = 0; i < normals.count; i++) {
    c.copy(color).multiplyScalar(down + (up - down) * (normals.getY(i) * 0.5 + 0.5))
    colors.push(c.r, c.g, c.b)
  }
  rounded.setAttribute('color', new Float32BufferAttribute(colors, 3))
  return rounded
}

/** Local part placed at (x, y, z) inside a piece whose local -Z faces the front of the room. */
function part(g: BufferGeometry, x: number, y: number, z: number, tiltX = 0): BufferGeometry {
  const m = new Matrix4().compose(
    new Vector3(x, y, z),
    new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), tiltX),
    new Vector3(1, 1, 1),
  )
  return g.applyMatrix4(m)
}

/** Local part turned by `yaw` about its own vertical axis, then placed at (x, y, z). */
function turned(g: BufferGeometry, x: number, y: number, z: number, yaw: number): BufferGeometry {
  const m = new Matrix4().compose(
    new Vector3(x, y, z),
    new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), yaw),
    new Vector3(1, 1, 1),
  )
  return g.applyMatrix4(m)
}

function place(parts: BufferGeometry[], at: Placed): BufferGeometry[] {
  const m = new Matrix4().compose(
    new Vector3(...at.position),
    new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), at.yaw),
    new Vector3(1, 1, 1),
  )
  return parts.map((p) => p.applyMatrix4(m))
}

const TUBE = 0.03
// Where a blind hangs inside the window reveal: room-side of the glazing bars, clear of the handle.
export const BLIND_DEPTH = -0.065

/** Two-person student desk: laminate top, two C-shaped steel side frames, modesty panel at the front. */
function studentDesk(): BufferGeometry[] {
  const { width, depth, height } = CLASSROOM.desk
  const top = lit(palette.laminat)
  const steel = lit(palette.metal)
  // ABS edge band under the laminate: the darker rim every school desk has.
  const band = top.clone().multiplyScalar(0.72)
  const out = [
    part(shadedBox(width, 0.025, depth, top), 0, height - 0.0125, 0),
    part(shadedBox(width + 0.006, 0.014, depth + 0.006, band), 0, height - 0.032, 0),
  ]
  for (const x of [-width / 2 + 0.05, width / 2 - 0.05]) {
    out.push(
      part(
        shadedBox(TUBE, height - 0.025, TUBE, steel),
        x,
        (height - 0.025) / 2,
        -depth / 2 + 0.06,
      ),
    )
    out.push(
      part(shadedBox(TUBE, height - 0.025, TUBE, steel), x, (height - 0.025) / 2, depth / 2 - 0.06),
    )
    out.push(part(shadedBox(TUBE, TUBE, depth - 0.06, steel), x, 0.015, 0))
    out.push(part(shadedBox(TUBE, TUBE, depth - 0.06, steel), x, height - 0.05, 0))
  }
  out.push(part(shadedBox(width - 0.12, 0.3, 0.015, steel), 0, height - 0.24, -depth / 2 + 0.03))
  // Book shelf under the top, as in most lecture-room desks.
  out.push(part(shadedBox(width - 0.14, 0.012, depth - 0.14, steel), 0, height - 0.17, 0.02))
  return out
}

/** Stackable classroom chair: moulded plastic seat and back on a four-leg steel frame. */
function studentChair(): BufferGeometry[] {
  const shell = lit(palette.kabuk)
  const steel = lit(palette.metal)
  const seatH = 0.45
  const w = 0.44
  const d = 0.42
  // Positive tilt about X leans the back away from the sitter (towards local +Z, the room's back).
  const recline = 0.12
  // A darker rim under the seat and behind the back: moulded plastic reads thicker than a slab.
  const rim = shell.clone().multiplyScalar(0.74)
  const out = [
    part(shadedBox(w, 0.03, d, shell), 0, seatH, 0),
    part(shadedBox(w - 0.03, 0.016, d - 0.03, rim), 0, seatH - 0.022, 0),
    part(shadedBox(w, 0.3, 0.025, shell), 0, seatH + 0.3, d / 2 + 0.02, recline),
    part(shadedBox(w - 0.03, 0.27, 0.014, rim), 0, seatH + 0.3, d / 2 + 0.036, recline),
  ]
  for (const x of [-w / 2 + 0.03, w / 2 - 0.03]) {
    for (const z of [-d / 2 + 0.03, d / 2 - 0.03]) {
      out.push(part(shadedBox(0.022, seatH, 0.022, steel), x, seatH / 2, z))
    }
    out.push(part(shadedBox(0.022, 0.32, 0.022, steel), x, seatH + 0.16, d / 2 + 0.005, recline))
  }
  return out
}

function lecturerDesk(): BufferGeometry[] {
  const top = lit(palette.laminat)
  const body = lit(palette.metal).lerp(lit(palette.laminat), 0.55)
  const w = 1.4
  const d = 0.7
  const h = 0.76
  return [
    part(shadedBox(w, 0.03, d, top), 0, h - 0.015, 0),
    part(shadedBox(0.03, h - 0.03, d, body), -w / 2 + 0.015, (h - 0.03) / 2, 0),
    part(shadedBox(0.03, h - 0.03, d, body), w / 2 - 0.015, (h - 0.03) / 2, 0),
    // The panel faces the class (local +Z is towards the students).
    part(shadedBox(w - 0.06, h - 0.1, 0.02, body), 0, (h - 0.03) / 2 + 0.03, d / 2 - 0.02),
    part(shadedBox(0.42, 0.62, d - 0.06, body), w / 2 - 0.25, 0.34, 0),
  ]
}

// The demonstration set, and the reason the room reads as a breastfeeding class rather than any
// lecture hall. A nursing chair is lower and deeper than a lecture chair and has arms to rest on;
// the C-pillow, the teaching doll and the expressing equipment are what the sections are taught
// with. Every piece is kept under 0.8 m so it never cuts into the board from a seat.
const NURSING = { seatTop: 0.45, width: 0.62, depth: 0.58, back: 0.3, arm: 0.11, foot: 0.06 }
const PILLOW = { radius: 0.26, tube: 0.085, arc: 4.2 }
const DOLL = { head: 0.055, body: 0.072, length: 0.24 }
const DEMO_TABLE = { width: 0.7, depth: 0.45, height: 0.6, leg: 0.03 }
const BASSINET = { width: 0.86, depth: 0.5, basket: 0.28, stand: 0.52 }

/** Low upholstered nursing chair: a padded plinth and cushion, short arms and a shallow back. */
function nursingChair(): BufferGeometry[] {
  const { seatTop, width, depth, back, arm, foot } = NURSING
  const fabric = lit(palette.dosemelik)
  // The plinth takes the wear, so it reads a shade deeper than the cushion above it.
  const plinth = fabric.clone().multiplyScalar(0.9)
  const wood = lit(palette.mese)
  const cushion = 0.1
  const plinthHeight = seatTop - cushion - foot
  const out = [
    part(shadedBox(width, plinthHeight, depth, plinth), 0, foot + plinthHeight / 2, 0),
    part(shadedBox(width - 0.04, cushion, depth - 0.08, fabric), 0, seatTop - cushion / 2, 0),
    // The back sits away from the class, which local +Z faces.
    part(shadedBox(width, back, 0.1, fabric), 0, seatTop + back / 2, depth / 2 - 0.05),
  ]
  for (const x of [-(width - arm) / 2, (width - arm) / 2]) {
    out.push(part(shadedBox(arm, 0.16, depth - 0.1, fabric), x, seatTop + 0.08, 0))
    for (const z of [-depth / 2 + 0.06, depth / 2 - 0.06]) {
      out.push(part(shadedCylinder(0.022, foot, wood, 8), x, foot / 2, z))
    }
  }
  return out
}

/**
 * The C-shaped nursing pillow on the chair's seat. Its missing arc has to face the class, so the
 * gap is turned to local -Z: a ring seen from the front would read as a swim float, not a pillow.
 */
function nursingPillow(): BufferGeometry[] {
  const { radius, tube, arc } = PILLOW
  const g = shadedByNormal(
    new TorusGeometry(radius, tube, 8, 22, arc),
    lit(palette.yastik),
    0.68,
    1.08,
  )
  // Laid flat, the ring's parameter angle and the direction it points stay the same, so turning by
  // the offset between the gap's middle and -Z aims the opening at the class.
  g.rotateX(-Math.PI / 2).rotateY(Math.PI / 2 - (arc + Math.PI * 2) / 2)
  return [part(g, 0, NURSING.seatTop + tube * 0.8, 0)]
}

/** The swaddled teaching doll, lying in the pillow's hollow with its head towards the left arm. */
function teachingDoll(): BufferGeometry[] {
  const { head, body, length } = DOLL
  const y = NURSING.seatTop + PILLOW.tube * 0.9 + body * 0.6
  // A shade below the pillow it lies on, or the doll disappears into it from the back rows.
  const swaddle = shadedByNormal(
    new CylinderGeometry(body * 0.7, body, length, 12),
    lit(palette.kundak).multiplyScalar(0.82),
    0.62,
    1.06,
  ).rotateZ(Math.PI / 2)
  const skull = shadedByNormal(new SphereGeometry(head, 12, 8), lit(palette.bebekTeni), 0.6, 1.06)
  // Held across the body rather than square to the chair, which is how a baby is actually fed,
  // and what stops the swaddle reading as a bolster cushion laid on the pillow.
  const across = -0.5
  const headX = -(length / 2 + head * 0.55)
  return [
    turned(part(swaddle, 0, y, 0), 0.02, 0, -0.03, across),
    turned(
      part(skull, headX * Math.cos(across), y + head * 0.35, -headX * Math.sin(across)),
      0.02,
      0,
      -0.03,
      0,
    ),
  ]
}

/** The table the expressing section is taught from: a pump, its funnel, bottles and storage bags. */
function expressingTable(): BufferGeometry[] {
  const { width, depth, height, leg } = DEMO_TABLE
  const top = lit(palette.laminat)
  const steel = lit(palette.aluminyum)
  const white = lit(palette.beyazTahta)
  const milk = lit(palette.sut)
  const out = [
    part(shadedBox(width, 0.03, depth, top), 0, height - 0.015, 0),
    part(shadedBox(width - 0.1, 0.018, depth - 0.08, steel), 0, 0.22, 0),
  ]
  for (const x of [-width / 2 + 0.04, width / 2 - 0.04]) {
    for (const z of [-depth / 2 + 0.04, depth / 2 - 0.04]) {
      out.push(part(shadedBox(leg, height - 0.03, leg, steel), x, (height - 0.03) / 2, z))
    }
  }
  const deck = height + 0.001
  // The pump: a small white body with its control face turned to the class, so it is read as a
  // machine rather than as a white block, and the funnel standing in front of it.
  out.push(part(shadedBox(0.13, 0.095, 0.09, white), -0.22, deck + 0.0475, 0.02))
  out.push(part(shadedBox(0.08, 0.045, 0.004, lit(palette.murekkep)), -0.22, deck + 0.055, -0.026))
  out.push(part(shadedCylinder(0.035, 0.075, white, 12), -0.09, deck + 0.037, -0.03))
  for (const [x, z] of [
    [0.04, 0.09],
    [0.13, 0.0],
  ] as const) {
    out.push(part(shadedCylinder(0.032, 0.12, milk, 12), x, deck + 0.06, z))
    out.push(part(shadedCylinder(0.026, 0.025, lit(palette.kalemMavi), 12), x, deck + 0.132, z))
  }
  // Muslins folded ready for the next demonstration; a stack reads from further off than the
  // storage bags it replaces, which were thin enough to vanish at any distance.
  out.push(part(shadedBox(0.17, 0.055, 0.13, lit(palette.kundak)), 0.25, deck + 0.0275, 0.03))
  out.push(part(shadedBox(0.16, 0.016, 0.12, lit(palette.onsut)), 0.25, deck + 0.063, 0.03))
  return out
}

/**
 * Demonstration bassinet on its stand. Read from the back of a fourteen-metre hall it has to be a
 * cot at a glance, so it is a pale body under a wicker band with its bedding showing over the rim,
 * rather than one tan box that resolves into a crate.
 */
function bassinet(): BufferGeometry[] {
  const { width, depth, basket, stand } = BASSINET
  const body = lit(palette.perde)
  const wicker = lit(palette.hasir)
  const steel = lit(palette.aluminyum)
  const bedding = lit(palette.kundak)
  const band = basket * 0.42
  const rim = stand + basket
  const out = [
    part(shadedBox(width, basket - band, depth, body), 0, stand + band + (basket - band) / 2, 0),
    part(shadedBox(width - 0.03, band, depth - 0.03, wicker), 0, stand + band / 2, 0),
    // The rim overhangs the body, which is what gives the cot its shoulder from across the room.
    part(shadedBox(width + 0.04, 0.035, depth + 0.04, body), 0, rim, 0),
    // Bedding heaped above the rim, with a sheet turned down over the near side and a pillow.
    part(shadedBox(width - 0.14, 0.1, depth - 0.12, bedding), 0, rim + 0.05, 0),
    part(
      shadedBox(width - 0.1, 0.06, 0.09, lit(palette.beyazTahta)),
      0,
      rim + 0.03,
      -depth / 2 + 0.07,
    ),
    part(shadedBox(0.2, 0.07, 0.15, lit(palette.yastik)), width / 2 - 0.2, rim + 0.08, 0),
  ]
  for (const x of [-width / 2 + 0.1, width / 2 - 0.1]) {
    for (const z of [-depth / 2 + 0.07, depth / 2 - 0.07]) {
      out.push(part(shadedBox(0.03, stand, 0.03, steel), x, stand / 2, z))
    }
    out.push(part(shadedBox(0.025, 0.025, depth - 0.14, steel), x, 0.14, 0))
  }
  return out
}

// Notebooks, pens and bottles left on some desks: what makes a room read as used, not rendered.
const ITEMS = { notebook: 0.35, pen: 0.5, bottle: 0.12 }
const NOTEBOOK_COVERS = [palette.adacayi, palette.alacakaranlik, palette.kolostrum, palette.onsut]

function deskItems(rand: () => number): BufferGeometry[] {
  const top = CLASSROOM.desk.height
  const out: BufferGeometry[] = []
  for (const seat of [-CLASSROOM.desk.width / 4, CLASSROOM.desk.width / 4]) {
    if (rand() < ITEMS.notebook) {
      const cover = NOTEBOOK_COVERS[Math.floor(rand() * NOTEBOOK_COVERS.length)] ?? palette.onsut
      const yaw = (rand() - 0.5) * 0.6
      const x = seat + (rand() - 0.5) * 0.12
      const z = 0.02 + rand() * 0.08
      out.push(turned(shadedBox(0.21, 0.006, 0.297, lit(palette.kagit)), x, top + 0.003, z, yaw))
      out.push(turned(shadedBox(0.212, 0.002, 0.299, lit(cover)), x, top + 0.007, z, yaw))
      if (rand() < ITEMS.pen) {
        const pen = shadedBox(0.14, 0.009, 0.009, lit(palette.murekkep))
        out.push(turned(pen, x + 0.14, top + 0.005, z + (rand() - 0.5) * 0.1, rand() * Math.PI))
      }
    }
    if (rand() < ITEMS.bottle) {
      const x = seat + (rand() < 0.5 ? -0.22 : 0.22)
      const z = -0.12 + rand() * 0.06
      out.push(part(shadedCylinder(0.033, 0.2, lit(palette.sise), 16), x, top + 0.1, z))
      out.push(part(shadedCylinder(0.017, 0.025, lit(palette.kabuk), 12), x, top + 0.2125, z))
    }
  }
  return out
}

// Marker colours on the board tray, left to right; the eraser sits at the other end.
const MARKER_CAPS = [palette.murekkep, palette.kalemMavi, palette.alarm, palette.adacayi]
const MARKER = { r: 0.0095, body: 0.105, cap: 0.035 }

/** A whiteboard marker lying along local X, cap towards +X, resting on y = 0. */
function marker(cap: string): BufferGeometry[] {
  const body = shadedCylinder(MARKER.r, MARKER.body, lit(palette.beyazTahta), 12).rotateZ(
    Math.PI / 2,
  )
  const tip = shadedCylinder(MARKER.r * 1.05, MARKER.cap, lit(cap), 12).rotateZ(Math.PI / 2)
  return [part(body, -MARKER.cap / 2, MARKER.r, 0), part(tip, MARKER.body / 2, MARKER.r * 1.05, 0)]
}

/** Square ceiling diffuser: flush plate with stepped concentric louvres, as seen from below. */
function diffuser(x: number, z: number, ceiling: number): BufferGeometry[] {
  const white = lit(palette.tavan)
  const out = [part(shadedBox(0.59, 0.006, 0.59, white, CEILING_SHADE), x, ceiling - 0.003, z)]
  for (const [i, size] of [0.5, 0.4, 0.3, 0.2, 0.1].entries()) {
    // Each louvre steps 1.5 mm further down, so no two faces share a plane.
    const bottom = ceiling - 0.006 - 0.0015 * (i + 1)
    const shade = i % 2 === 0 ? 0.82 : 1
    const box = shadedBox(size, 0.004, size, white.clone().multiplyScalar(shade), CEILING_SHADE)
    out.push(part(box, x, bottom + 0.002, z))
  }
  return out
}

function smokeDetector(x: number, z: number, ceiling: number): BufferGeometry[] {
  const white = lit(palette.tavan)
  const cyl = (r: number, h: number, c: Color) =>
    shadedCylinder(r, h, c, 20, CEILING_CYLINDER_SHADE)
  return [
    part(cyl(0.055, 0.03, white), x, ceiling - 0.015, z),
    part(cyl(0.035, 0.012, white.clone().multiplyScalar(0.94)), x, ceiling - 0.036, z),
    // Status LED on the rim.
    part(
      shadedBox(0.006, 0.004, 0.006, lit(palette.alarm), CEILING_SHADE),
      x + 0.04,
      ceiling - 0.031,
      z,
    ),
  ]
}

function ceilingSpeaker(x: number, z: number, ceiling: number): BufferGeometry[] {
  const cyl = (r: number, h: number, c: Color) =>
    shadedCylinder(r, h, c, 24, CEILING_CYLINDER_SHADE)
  return [
    part(cyl(0.11, 0.006, lit(palette.tavan)), x, ceiling - 0.003, z),
    part(cyl(0.095, 0.004, lit(palette.aluminyum).multiplyScalar(0.82)), x, ceiling - 0.008, z),
  ]
}

/**
 * What the lecturer leaves on the desk between classes: a stack of marked papers, a mug and a
 * small pot plant. Local +Z faces the students, so everything sits on the lecturer's side.
 */
function lecturerDeskItems(): BufferGeometry[] {
  const top = 0.76
  const out = [
    part(shadedBox(0.215, 0.028, 0.3, lit(palette.kagit)), -0.4, top + 0.014, -0.02),
    // The top sheet has slipped a little off the stack.
    turned(shadedBox(0.21, 0.002, 0.297, lit(palette.onsut)), -0.38, top + 0.029, 0.01, 0.09),
    part(shadedCylinder(0.037, 0.095, lit(palette.beyazTahta), 16), -0.08, top + 0.048, -0.05),
    part(
      shadedCylinder(0.034, 0.004, lit(palette.mese).multiplyScalar(0.7), 16),
      -0.08,
      top + 0.094,
      -0.05,
    ),
    part(shadedCylinder(0.062, 0.1, lit(palette.mese), 16), 0.5, top + 0.05, -0.08),
    part(
      shadedCylinder(0.066, 0.016, lit(palette.mese).multiplyScalar(1.05), 16),
      0.5,
      top + 0.096,
      -0.08,
    ),
  ]
  // Five leaves fanning out of the pot, each turned and tipped away from the centre.
  const leaves: [number, number, number, number][] = [
    [0.09, 0.0, 0.4, 1],
    [-0.07, 0.03, 1.7, 0.85],
    [0.02, -0.08, 2.9, 0.9],
    [-0.05, -0.04, 4.1, 0.75],
    [0.04, 0.06, 5.2, 0.8],
  ]
  for (const [dx, dz, yaw, scale] of leaves) {
    const leaf = shadedBox(0.115 * scale, 0.014, 0.05 * scale, lit(palette.adacayi))
    out.push(turned(leaf, 0.5 + dx, top + 0.12 + scale * 0.05, -0.08 + dz, yaw))
  }
  return out
}

/** Pedal-less waste bin: dark plastic body with a lighter rim, as in every lecture room. */
function wasteBin(): BufferGeometry[] {
  const body = lit(palette.metal).lerp(lit(palette.korumaBandi), 0.35)
  return [
    part(shadedCylinder(0.16, 0.42, body, 20), 0, 0.21, 0),
    part(shadedCylinder(0.17, 0.03, lit(palette.korumaBandi), 20), 0, 0.425, 0),
    // Dark opening, a touch below the rim.
    part(shadedCylinder(0.15, 0.004, lit(palette.murekkep).multiplyScalar(0.6), 20), 0, 0.405, 0),
  ]
}

/** Thermostatic valve and return pipe at the left end of a panel radiator. */
function radiatorValve(): BufferGeometry[] {
  const steel = lit(palette.aluminyum)
  return [
    part(shadedCylinder(0.014, 0.42, steel, 10), 0, 0.21, 0),
    part(
      shadedCylinder(0.026, 0.075, lit(palette.beyazTahta), 12).rotateZ(Math.PI / 2),
      -0.05,
      0.6,
      0,
    ),
    part(shadedCylinder(0.014, 0.12, steel, 10), 0, 0.54, 0),
  ]
}

export type BlindFabric = { geometry: BufferGeometry; rail: number }

// Notices pinned to the wall above the coat rail: a few sizes, each slightly askew.
const PAPER = { width: 0.21, height: 0.297, tilt: 0.05 }
const PIN_COLOURS = [palette.alarm, palette.kalemMavi, palette.kolostrum, palette.adacayi]

// How far apart two pieces of the same furniture can read. A row of thirty identical desks is
// the clearest sign of a copied model; a few per cent of drift reads as different batches and
// years of sunlight instead.
const WEAR_SPREAD = 0.08

/** Shifts one piece's whole colour set by a little, drawn from the room's own wear sequence. */
function weathered(parts: BufferGeometry[], wear: () => number): BufferGeometry[] {
  const k = 1 - WEAR_SPREAD / 2 + wear() * WEAR_SPREAD
  for (const g of parts) {
    const col = g.getAttribute('color')
    for (let i = 0; i < col.count; i++) {
      col.setXYZ(i, col.getX(i) * k, col.getY(i) * k, col.getZ(i) * k)
    }
  }
  return parts
}

// Ambient occlusion towards the floor: down by the tiles the floor and the neighbouring legs
// block most of the sky a surface can see, so a leg is far darker at its foot than at its top.
// Without it every chair looks pasted onto the room rather than standing in it.
const GROUND_AO = { depth: 0.36, reach: 0.62 }

const smooth = (t: number) => {
  const c = Math.min(1, Math.max(0, t))
  return c * c * (3 - 2 * c)
}

/** Folds the room's baked light and the floor's occlusion into the merged furniture's colours. */
function bakeRoomLight(g: BufferGeometry, room: RoomDef): BufferGeometry {
  const pos = g.getAttribute('position')
  const col = g.getAttribute('color')
  const tint = new Color()
  for (let i = 0; i < pos.count; i++) {
    const ao = 1 - GROUND_AO.depth * (1 - smooth(pos.getY(i) / GROUND_AO.reach))
    tint.copy(daylightColor(room, pos.getX(i), pos.getZ(i))).multiplyScalar(ao)
    col.setXYZ(i, col.getX(i) * tint.r, col.getY(i) * tint.g, col.getZ(i) * tint.b)
  }
  return g
}

export function buildClassroomFurniture(room: RoomDef, layout: ClassroomLayout): BufferGeometry {
  const c = room.classroom
  if (!c) throw new Error(`room "${room.id}" is not a classroom`)
  const parts: BufferGeometry[] = []
  const rand = seededRandom(hashSeed(`${room.id}:desk-items`))
  const wear = seededRandom(hashSeed(`${room.id}:wear`))
  const seat = layout.spawnSeat.position
  for (const d of layout.desks) {
    parts.push(...weathered(place(studentDesk(), d), wear))
    // The visitor's desk stays clear: the lesson buttons sit there.
    const own = Math.hypot(d.position[0] - seat[0], d.position[2] - seat[2]) < CLASSROOM.desk.width
    if (!own) parts.push(...place(deskItems(rand), d))
  }
  for (const ch of layout.chairs) parts.push(...weathered(place(studentChair(), ch), wear))
  const demo = layout.demo
  parts.push(
    ...place([...nursingChair(), ...nursingPillow(), ...teachingDoll()], demo.chair),
    ...place(expressingTable(), demo.table),
    ...place(bassinet(), demo.bassinet),
  )
  parts.push(...place(lecturerDesk(), layout.lecturerDesk))
  parts.push(...place(studentChair(), layout.lecturerChair))

  const front = wallFrame(room, c.front)
  const fy = wallYaw(front)
  const onWall = (u: number, v: number, depth: number, g: BufferGeometry, f = front, yaw = fy) =>
    place([g], { position: wallPoint(f, u, v, depth), yaw })[0] ?? g

  // Whiteboard: white surface in an aluminium frame, marker tray along the bottom.
  const b = layout.board
  const bw = b.u1 - b.u0
  const bh = b.v1 - b.v0
  const bu = (b.u0 + b.u1) / 2
  const bv = (b.v0 + b.v1) / 2
  const alu = lit(palette.aluminyum)
  parts.push(onWall(bu, bv, 0.012, shadedBox(bw, bh, 0.02, lit(palette.beyazTahta))))
  for (const [du, dv, w, h] of [
    [0, bh / 2 + 0.012, bw + 0.05, 0.025],
    [0, -bh / 2 - 0.012, bw + 0.05, 0.025],
    [-bw / 2 - 0.012, 0, 0.025, bh],
    [bw / 2 + 0.012, 0, 0.025, bh],
  ] as const) {
    parts.push(onWall(bu + du, bv + dv, 0.018, shadedBox(w, h, 0.035, alu)))
  }
  parts.push(onWall(bu, b.v0 - 0.03, 0.05, shadedBox(bw * 0.9, 0.02, 0.07, alu)))

  // Pull-down screen: roller housing just under the ceiling, fabric, weighted bottom bar.
  const s = layout.screen
  const su = (s.u0 + s.u1) / 2
  const sw = s.u1 - s.u0
  parts.push(
    onWall(
      su,
      room.height - 0.08,
      s.standoff,
      shadedCylinder(0.06, sw + 0.12, alu, 16).rotateZ(Math.PI / 2),
    ),
  )
  // Fabric hangs from the roller down to the bottom bar; the lesson draws onto its front face.
  const rollerV = room.height - 0.08
  parts.push(
    onWall(
      su,
      (s.v0 + rollerV) / 2,
      s.standoff - 0.004,
      shadedBox(sw, rollerV - s.v0, 0.004, lit(palette.perde)),
    ),
  )
  parts.push(onWall(su, s.v0 - 0.015, s.standoff, shadedBox(sw + 0.04, 0.03, 0.03, alu)))

  // Ceiling projector on a drop pole, aimed at the screen.
  const [px, py, pz] = layout.projector
  parts.push(
    ...place([part(shadedBox(0.34, 0.12, 0.3, lit(palette.beyazTahta)), 0, 0, 0)], {
      position: [px, py, pz],
      yaw: fy,
    }),
  )
  parts.push(
    ...place(
      [
        part(
          shadedCylinder(0.02, room.height - py - 0.06, lit(palette.metal), 8),
          0,
          (room.height - py) / 2,
          0,
        ),
      ],
      { position: [px, py, pz], yaw: fy },
    ),
  )

  // Wall clock above the board: face, rim, hands at ten past ten.
  const clockFace = shadedCylinder(0.15, 0.02, lit(palette.beyazTahta), 32).rotateX(Math.PI / 2)
  parts.push(onWall(layout.clock.u, layout.clock.v, 0.02, clockFace))
  const rim = shadedCylinder(0.165, 0.03, lit(palette.murekkep), 32).rotateX(Math.PI / 2)
  parts.push(onWall(layout.clock.u, layout.clock.v, 0.012, rim))
  for (const [angle, len] of [
    [Math.PI / 3, 0.08],
    [-Math.PI / 3, 0.12],
  ] as const) {
    const hand = shadedBox(0.01, len, 0.004, lit(palette.murekkep))
      .translate(0, len / 2, 0)
      .rotateZ(angle)
    parts.push(onWall(layout.clock.u, layout.clock.v, 0.033, hand))
  }

  // Panel radiators under the windows, with vertical convector ribs.
  for (const r of layout.radiators) {
    const f = wallFrame(room, r.wall)
    const y = wallYaw(f)
    parts.push(onWall(r.u, 0.42, 0.07, shadedBox(r.width, 0.55, 0.06, lit(palette.radyator)), f, y))
    for (let x = -r.width / 2 + 0.06; x < r.width / 2 - 0.03; x += 0.1) {
      parts.push(
        onWall(
          r.u + x,
          0.42,
          0.1,
          shadedBox(0.02, 0.5, 0.01, lit(palette.radyator).multiplyScalar(0.94)),
          f,
          y,
        ),
      )
    }
  }

  // Markers and eraser on the board tray (tray top at v0 - 0.02).
  const trayTop = b.v0 - 0.02
  for (const [i, cap] of MARKER_CAPS.entries()) {
    for (const m of marker(cap)) {
      parts.push(onWall(bu + bw * 0.18 + i * 0.16, trayTop, 0.035 + (i % 2) * 0.025, m))
    }
  }
  const eraserU = bu - bw * 0.3
  parts.push(
    onWall(eraserU, trayTop + 0.0225, 0.05, shadedBox(0.15, 0.035, 0.055, lit(palette.kabuk))),
  )
  parts.push(
    onWall(eraserU, trayTop + 0.0025, 0.05, shadedBox(0.15, 0.005, 0.055, lit(palette.murekkep))),
  )

  // Roller blind heads and their bead chains. The fabric itself is a separate mesh that rolls up
  // and down (`buildBlindFabric`), so it can be raised without rebuilding the whole room.
  for (const bl of layout.blinds) {
    const f = wallFrame(room, bl.wall)
    const y = wallYaw(f)
    const inner = bl.width - 0.02
    parts.push(
      onWall(
        bl.u,
        bl.top - 0.04,
        BLIND_DEPTH,
        shadedBox(inner, 0.08, 0.07, lit(palette.onsut)),
        f,
        y,
      ),
    )
    const chainU = bl.u + inner / 2 - 0.03
    const chainTop = bl.top - 0.08
    const chainBottom = bl.bottom - 0.45
    parts.push(
      onWall(
        chainU,
        (chainTop + chainBottom) / 2,
        -0.028,
        shadedBox(0.005, chainTop - chainBottom, 0.005, lit(palette.aluminyum)),
        f,
        y,
      ),
    )
  }

  // Wall details: double sockets, a light switch and a fire alarm call point by each door.
  const plastic = lit(palette.beyazTahta)
  const spot = (w: WallSpot) => {
    const f = wallFrame(room, w.wall)
    return { f, y: wallYaw(f) }
  }
  for (const so of layout.sockets) {
    const { f, y } = spot(so)
    parts.push(onWall(so.u, so.v, 0.005, shadedBox(0.16, 0.085, 0.01, plastic), f, y))
    for (const du of [-0.039, 0.039]) {
      const cup = shadedCylinder(0.023, 0.004, plastic.clone().multiplyScalar(0.86), 16)
      parts.push(onWall(so.u + du, so.v, 0.011, cup.rotateX(Math.PI / 2), f, y))
    }
  }
  for (const sw of layout.switches) {
    const { f, y } = spot(sw)
    parts.push(onWall(sw.u, sw.v, 0.005, shadedBox(0.085, 0.085, 0.01, plastic), f, y))
    parts.push(
      onWall(
        sw.u,
        sw.v,
        0.012,
        shadedBox(0.05, 0.05, 0.006, plastic.clone().multiplyScalar(0.93)),
        f,
        y,
      ),
    )
  }
  for (const cp of layout.callPoints) {
    const { f, y } = spot(cp)
    parts.push(onWall(cp.u, cp.v, 0.0225, shadedBox(0.095, 0.095, 0.045, lit(palette.alarm)), f, y))
    parts.push(onWall(cp.u, cp.v, 0.046, shadedBox(0.055, 0.055, 0.004, plastic), f, y))
  }

  parts.push(...place(lecturerDeskItems(), layout.lecturerDesk))

  // Waste bin beside the lecturer, coat rail on the back wall, thermostatic radiator valves.
  parts.push(...place(wasteBin(), layout.bin))
  if (layout.coatRail) {
    const f = wallFrame(room, layout.coatRail.wall)
    const y = wallYaw(f)
    const { u, v, width } = layout.coatRail
    parts.push(onWall(u, v, 0.012, shadedBox(width, 0.09, 0.024, lit(palette.laminat)), f, y))
    for (const du of [-width / 3, 0, width / 3]) {
      parts.push(
        onWall(u + du, v - 0.01, 0.045, shadedBox(0.014, 0.05, 0.06, lit(palette.aluminyum)), f, y),
      )
      parts.push(
        onWall(
          u + du,
          v - 0.035,
          0.075,
          shadedBox(0.014, 0.03, 0.014, lit(palette.aluminyum)),
          f,
          y,
        ),
      )
    }
  }
  for (const r of layout.radiators) {
    const f = wallFrame(room, r.wall)
    const y = wallYaw(f)
    for (const g of radiatorValve()) parts.push(onWall(r.u - r.width / 2 - 0.04, 0, 0.09, g, f, y))
  }

  // Notices pinned to the wall above the coat rail.
  const noticeRand = seededRandom(hashSeed(`${room.id}:notices`))
  for (const n of layout.notices) {
    const f = wallFrame(room, n.wall)
    const y = wallYaw(f)
    const scale = 0.8 + noticeRand() * 0.3
    const w = PAPER.width * scale
    const h = PAPER.height * scale
    const tilt = (noticeRand() - 0.5) * PAPER.tilt
    const sheet = shadedBox(w, h, 0.002, lit(palette.kagit)).rotateZ(tilt)
    parts.push(onWall(n.u, n.v, 0.004, sheet, f, y))
    const pin = PIN_COLOURS[Math.floor(noticeRand() * PIN_COLOURS.length)] ?? palette.alarm
    const head = shadedCylinder(0.008, 0.012, lit(pin), 10).rotateX(Math.PI / 2)
    parts.push(onWall(n.u, n.v + h / 2 - 0.025, 0.011, head, f, y))
  }

  // Ceiling equipment in the tile grid: air diffusers, smoke detectors, speakers.
  const ceil = room.height
  for (const p of layout.ceiling.diffusers) parts.push(...diffuser(p.x, p.z, ceil))
  for (const p of layout.ceiling.smokeDetectors) parts.push(...smokeDetector(p.x, p.z, ceil))
  for (const p of layout.ceiling.speakers) parts.push(...ceilingSpeaker(p.x, p.z, ceil))

  const merged = mergeGeometries(parts)
  parts.forEach((p) => p.dispose())
  if (!merged) throw new Error(`could not merge classroom furniture of room "${room.id}"`)
  return bakeRoomLight(merged, room)
}

/**
 * The hanging part of every roller blind (fabric and weighted bottom bar) in one geometry, with
 * its vertices measured down from the head rail they all share. Scaling that one mesh about the
 * rail rolls every blind up or down at once; at scale 0 it disappears into the cassettes.
 *
 * Windows with different head heights would need one pivot each, so that case is refused loudly
 * rather than drawn wrong.
 */
export function buildBlindFabric(room: RoomDef, layout: ClassroomLayout): BlindFabric | null {
  if (layout.blinds.length === 0) return null
  const tops = new Set(layout.blinds.map((b) => b.top.toFixed(6)))
  if (tops.size > 1) {
    throw new Error(
      `room "${room.id}" has blinds at different heights (${[...tops].join(', ')}); ` +
        'one shared pivot cannot roll them together',
    )
  }
  const rail = (layout.blinds[0]?.top ?? 0) - 0.08
  const parts: BufferGeometry[] = []
  for (const bl of layout.blinds) {
    const f = wallFrame(room, bl.wall)
    const y = wallYaw(f)
    const inner = bl.width - 0.02
    const drop = rail - bl.bottom
    const at = (v: number, g: BufferGeometry) =>
      place([g], { position: wallPoint(f, bl.u, v - rail, BLIND_DEPTH), yaw: y })[0]
    const fabric = at(rail - drop / 2, shadedBox(inner - 0.02, drop, 0.004, lit(palette.stor)))
    const bar = at(bl.bottom, shadedBox(inner - 0.01, 0.025, 0.018, lit(palette.aluminyum)))
    for (const g of [fabric, bar]) if (g) parts.push(g)
  }
  const merged = mergeGeometries(parts)
  parts.forEach((p) => p.dispose())
  if (!merged) throw new Error(`could not merge blinds of room "${room.id}"`)
  return { geometry: bakeRoomLight(merged, room), rail }
}

/** Soft floor quad of size w x d centred at (x, z) on height `y`, turned by `yaw`. */
function shadowQuad(
  x: number,
  z: number,
  w: number,
  d: number,
  yaw: number,
  y: number,
): BufferGeometry {
  const g = new BufferGeometry()
  const hw = w / 2
  const hd = d / 2
  g.setAttribute(
    'position',
    new Float32BufferAttribute([-hw, 0, hd, hw, 0, hd, hw, 0, -hd, -hw, 0, -hd], 3),
  )
  g.setAttribute('normal', new Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3))
  g.setAttribute('uv', new Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2))
  // Counter-clockwise seen from above (+Y).
  g.setIndex([0, 1, 2, 0, 2, 3])
  return turned(g, x, y, z, yaw)
}

// Just above the floor, under the additive sun patches (0.004) and the core shadow.
const CONTACT_SHADOW_Y = 0.002
// The core sits a hair higher so it always blends over its own penumbra, never z-fights it.
const CONTACT_CORE_Y = 0.0025
// Quad size relative to the footprint, so the blurred core covers the area between the legs.
const SPREAD = 1.45
// The second, tighter quad: where the legs actually touch the tiles the two blends stack and the
// shadow gains an umbra. One even grey over the whole footprint is what makes furniture float.
const CORE = 0.62

/** A footprint's penumbra and its darker core, both centred on (x, z) and turned by `yaw`. */
function contactShadow(x: number, z: number, w: number, d: number, yaw: number): BufferGeometry[] {
  return [
    shadowQuad(x, z, w * SPREAD, d * SPREAD, yaw, CONTACT_SHADOW_Y),
    shadowQuad(x, z, w * CORE, d * CORE, yaw, CONTACT_CORE_Y),
  ]
}

/** Contact shadows under desks, chairs and radiators, merged into one transparent mesh. */
export function buildContactShadows(room: RoomDef, layout: ClassroomLayout): BufferGeometry {
  const { desk } = CLASSROOM
  const parts: BufferGeometry[] = []
  for (const d of layout.desks) {
    parts.push(...contactShadow(d.position[0], d.position[2], desk.width, desk.depth, d.yaw))
  }
  for (const ch of [...layout.chairs, layout.lecturerChair]) {
    parts.push(...contactShadow(ch.position[0], ch.position[2], 0.44, 0.42, ch.yaw))
  }
  const l = layout.lecturerDesk
  parts.push(...contactShadow(l.position[0], l.position[2], 1.4, 0.7, l.yaw))
  const { chair, table, bassinet: crib } = layout.demo
  parts.push(...contactShadow(chair.position[0], chair.position[2], 0.62, 0.58, chair.yaw))
  parts.push(...contactShadow(table.position[0], table.position[2], 0.7, 0.45, table.yaw))
  parts.push(...contactShadow(crib.position[0], crib.position[2], 0.86, 0.5, crib.yaw))
  const bin = layout.bin
  parts.push(
    ...contactShadow(bin.position[0], bin.position[2], 0.42 / SPREAD, 0.42 / SPREAD, bin.yaw),
  )
  for (const r of layout.radiators) {
    const f = wallFrame(room, r.wall)
    const [x, , z] = wallPoint(f, r.u, 0, 0.12)
    parts.push(...contactShadow(x, z, (r.width * 1.2) / SPREAD, 0.4 / SPREAD, wallYaw(f)))
  }
  const merged = mergeGeometries(parts)
  parts.forEach((p) => p.dispose())
  if (!merged) throw new Error(`could not merge contact shadows of room "${room.id}"`)
  return merged
}
