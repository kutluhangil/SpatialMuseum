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
import { CLASSROOM, type RoomDef } from '../schema/museum'
import { palette } from '../design/tokens'
import { CLASSROOM_LIGHT } from '../design/light'
import { litColor } from '../scene/WallBuilder'
import { wallFrame, wallPoint, wallYaw } from '../scene/wallFrame'
import type { ClassroomLayout, Placed } from './layout'

// Faked key light from above: tops brightest, faces turned away darkest. Same idea as the
// walls' SIDE_BRIGHTNESS, so furniture sits in the room's baked light without runtime lights.
const FACE_SHADE = [0.88, 0.82, 1.06, 0.62, 0.95, 0.78] // +x, -x, +y, -y, +z, -z (BoxGeometry group order)

const lit = (hex: string) => litColor(hex, CLASSROOM_LIGHT)

/** A box with per-face baked shading, non-indexed so each face keeps its own colour. */
function shadedBox(w: number, h: number, d: number, color: Color): BufferGeometry {
  const g = new BoxGeometry(w, h, d).toNonIndexed()
  g.deleteAttribute('uv')
  const n = g.getAttribute('position').count
  const colors: number[] = []
  for (let i = 0; i < n; i++) {
    const c = color.clone().multiplyScalar(FACE_SHADE[Math.floor(i / 6)] ?? 1)
    colors.push(c.r, c.g, c.b)
  }
  g.setAttribute('color', new Float32BufferAttribute(colors, 3))
  return g
}

function shadedCylinder(r: number, h: number, color: Color, segments = 24): BufferGeometry {
  const g = new CylinderGeometry(r, r, h, segments).toNonIndexed()
  g.deleteAttribute('uv')
  const normals = g.getAttribute('normal')
  const colors: number[] = []
  for (let i = 0; i < normals.count; i++) {
    const up = normals.getY(i)
    const c = color.clone().multiplyScalar(up > 0.5 ? 1.05 : up < -0.5 ? 0.65 : 0.85)
    colors.push(c.r, c.g, c.b)
  }
  g.setAttribute('color', new Float32BufferAttribute(colors, 3))
  return g
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

function place(parts: BufferGeometry[], at: Placed): BufferGeometry[] {
  const m = new Matrix4().compose(
    new Vector3(...at.position),
    new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), at.yaw),
    new Vector3(1, 1, 1),
  )
  return parts.map((p) => p.applyMatrix4(m))
}

const TUBE = 0.03

/** Two-person student desk: laminate top, two C-shaped steel side frames, modesty panel at the front. */
function studentDesk(): BufferGeometry[] {
  const { width, depth, height } = CLASSROOM.desk
  const top = lit(palette.laminat)
  const steel = lit(palette.metal)
  const out = [part(shadedBox(width, 0.025, depth, top), 0, height - 0.0125, 0)]
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
  const out = [
    part(shadedBox(w, 0.03, d, shell), 0, seatH, 0),
    part(shadedBox(w, 0.3, 0.025, shell), 0, seatH + 0.3, d / 2 + 0.02, recline),
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

export function buildClassroomFurniture(room: RoomDef, layout: ClassroomLayout): BufferGeometry {
  const c = room.classroom
  if (!c) throw new Error(`room "${room.id}" is not a classroom`)
  const parts: BufferGeometry[] = []
  for (const d of layout.desks) parts.push(...place(studentDesk(), d))
  for (const ch of layout.chairs) parts.push(...place(studentChair(), ch))
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

  // Cork pin board on the back wall, in a light wooden frame.
  if (layout.corkBoard) {
    const f = wallFrame(room, layout.corkBoard.wall)
    const y = wallYaw(f)
    const a = layout.corkBoard.area
    const cu = (a.u0 + a.u1) / 2
    const cv = (a.v0 + a.v1) / 2
    parts.push(
      onWall(cu, cv, 0.01, shadedBox(a.u1 - a.u0, a.v1 - a.v0, 0.02, lit(palette.mantar)), f, y),
    )
    parts.push(
      onWall(
        cu,
        cv,
        0.006,
        shadedBox(a.u1 - a.u0 + 0.06, a.v1 - a.v0 + 0.06, 0.012, lit(palette.laminat)),
        f,
        y,
      ),
    )
  }

  const merged = mergeGeometries(parts)
  parts.forEach((p) => p.dispose())
  if (!merged) throw new Error(`could not merge classroom furniture of room "${room.id}"`)
  return merged
}
