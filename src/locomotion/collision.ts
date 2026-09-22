import { roomOpenings, type Museum, type RoomDef } from '../schema/museum'
import { wallFrame, wallPoint, wallSegments } from '../scene/wallFrame'

export const PLAYER_RADIUS = 0.3

/** A blocking line on the floor plan (x, z). */
export type Segment = { ax: number; az: number; bx: number; bz: number }

const SIDES = ['north', 'east', 'south', 'west'] as const

/** Floor-level solid wall stretches of one room: every wall minus the doors you can walk through. */
export function roomSegments(room: RoomDef): Segment[] {
  const out: Segment[] = []
  for (const side of SIDES) {
    const f = wallFrame(room, side)
    // Doors without a target room are drawn shut (WallBuilder), so they block like wall.
    const passable = { doors: room.doors.filter((d) => d.to !== undefined), windows: room.windows }
    for (const r of wallSegments(f.length, room.height, roomOpenings(passable, side))) {
      if (r.v0 > 0) continue // wall above doors does not block walking; wall under a window does
      const a = wallPoint(f, r.u0, 0)
      const b = wallPoint(f, r.u1, 0)
      out.push({ ax: a[0], az: a[2], bx: b[0], bz: b[2] })
    }
  }
  return out
}

/** Axis-aligned box footprint as four segments. */
export function boxSegments(cx: number, cz: number, halfX: number, halfZ: number): Segment[] {
  const x0 = cx - halfX
  const x1 = cx + halfX
  const z0 = cz - halfZ
  const z1 = cz + halfZ
  return [
    { ax: x0, az: z0, bx: x1, bz: z0 },
    { ax: x1, az: z0, bx: x1, bz: z1 },
    { ax: x1, az: z1, bx: x0, bz: z1 },
    { ax: x0, az: z1, bx: x0, bz: z0 },
  ]
}

export function museumSegments(m: Museum, obstacles: Segment[] = []): Segment[] {
  return [...m.rooms.flatMap(roomSegments), ...obstacles]
}

/**
 * Pushes a circle out of every segment it overlaps. Resolving the destination (not the path)
 * makes the player slide along walls instead of stopping dead. Steps are small (< radius per
 * frame), so tunnelling through a zero-thickness wall cannot happen.
 */
export function resolveCircle(
  x: number,
  z: number,
  radius: number,
  segments: Segment[],
): [number, number] {
  let px = x
  let pz = z
  for (let iter = 0; iter < 3; iter++) {
    let moved = false
    for (const s of segments) {
      const dx = s.bx - s.ax
      const dz = s.bz - s.az
      const len2 = dx * dx + dz * dz
      const t =
        len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - s.ax) * dx + (pz - s.az) * dz) / len2))
      const cx = s.ax + dx * t
      const cz = s.az + dz * t
      const ox = px - cx
      const oz = pz - cz
      const d = Math.hypot(ox, oz)
      if (d >= radius) continue
      if (d < 1e-9) {
        // Exactly on the line: push along the segment's normal.
        const n = Math.hypot(dx, dz) || 1
        px += (-dz / n) * radius
        pz += (dx / n) * radius
      } else {
        px += (ox / d) * (radius - d)
        pz += (oz / d) * (radius - d)
      }
      moved = true
    }
    if (!moved) break
  }
  return [px, pz]
}
