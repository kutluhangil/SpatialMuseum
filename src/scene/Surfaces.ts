import { BufferGeometry, Color, Float32BufferAttribute } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { RoomDef } from '../schema/museum'
import type { RoomLight } from '../design/light'
import { ceilingGrid } from './ceilingGrid'
import { wallFrame, wallPoint } from './wallFrame'
import { daylight } from './bakedLight'

/** Physical size of one repeat of the floor texture (Poly Haven interior_tiles: 1.9 m). */
export const FLOOR_TILE_METRES = 1.9

const smooth = (t: number) => {
  const c = Math.min(1, Math.max(0, t))
  return c * c * (3 - 2 * c)
}

type Grid = { xs: number[]; zs: number[] }

function grid(room: RoomDef, step: number): Grid {
  const { x, z, width, depth } = room.rect
  const line = (a: number, len: number) => {
    const n = Math.max(2, Math.ceil(len / step))
    // Extra rows near the edges give the wall-seam darkening a soft but short falloff.
    const edge = [0.15, 0.35, 0.7].filter((e) => e < len / 2)
    const out = new Set<number>()
    for (let i = 0; i <= n; i++) out.add(a + (len * i) / n)
    for (const e of edge) {
      out.add(a + e)
      out.add(a + len - e)
    }
    return [...out].sort((p, q) => p - q)
  }
  return { xs: line(x, width), zs: line(z, depth) }
}

function edgeDistance(room: RoomDef, px: number, pz: number): number {
  const { x, z, width, depth } = room.rect
  return Math.min(px - x, x + width - px, pz - z, z + depth - pz)
}

function gridGeometry(
  room: RoomDef,
  y: number,
  facingUp: boolean,
  colorAt: (x: number, z: number) => Color,
  uvScale: number | null,
  uvOrigin: { x: number; z: number } = { x: 0, z: 0 },
  step = 1,
): BufferGeometry {
  const { xs, zs } = grid(room, step)
  const pos: number[] = []
  const col: number[] = []
  const uv: number[] = []
  const idx: number[] = []
  for (const zz of zs) {
    for (const xx of xs) {
      pos.push(xx, y, zz)
      const c = colorAt(xx, zz)
      col.push(c.r, c.g, c.b)
      if (uvScale) uv.push((xx - uvOrigin.x) / uvScale, -(zz - uvOrigin.z) / uvScale)
    }
  }
  const w = xs.length
  for (let j = 0; j < zs.length - 1; j++) {
    for (let i = 0; i < w - 1; i++) {
      const a = j * w + i
      const b = a + 1
      const c = a + w
      const d = c + 1
      // Row j+1 has larger z, so (a, c, d) winds counter-clockwise seen from above.
      if (facingUp) idx.push(a, c, d, a, d, b)
      else idx.push(a, d, c, a, b, d)
    }
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(pos, 3))
  const n = facingUp ? 1 : -1
  g.setAttribute(
    'normal',
    new Float32BufferAttribute(
      pos.map((_, i) => (i % 3 === 1 ? n : 0)),
      3,
    ),
  )
  g.setAttribute('color', new Float32BufferAttribute(col, 3))
  if (uvScale) g.setAttribute('uv', new Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  return g
}

// Years of shoes: the tiles darken where people walk in and where they file down the aisle.
const WEAR = { door: 0.09, doorRadius: 1.4, aisle: 0.05, aisleEdge: 0.35 }
// Half a metre between floor vertices: fine enough for the worn patches to read as soft blotches.
const FLOOR_STEP = 0.5

/**
 * How much the floor is worn at a point: strongest just inside each doorway, plus a band down the
 * centre aisle of a classroom. Returns a multiplier at or below 1.
 */
function floorWear(room: RoomDef, px: number, pz: number): number {
  let wear = 0
  for (const door of room.doors) {
    const f = wallFrame(room, door.wall)
    const [dx, , dz] = wallPoint(f, door.offset, 0, WEAR.doorRadius * 0.55)
    const t = Math.hypot(px - dx, pz - dz) / WEAR.doorRadius
    wear = Math.max(wear, WEAR.door * (1 - smooth(t)))
  }
  const c = room.classroom
  if (c) {
    const f = wallFrame(room, c.front)
    const [ax, , az] = wallPoint(f, f.length / 2, 0, 0)
    const [bx, , bz] = wallPoint(f, f.length / 2, 0, 1)
    // Distance from the aisle's centre line, which runs from the front wall to the back.
    const across = Math.abs((px - ax) * (bz - az) - (pz - az) * (bx - ax))
    const half = c.aisle / 2
    wear = Math.max(wear, WEAR.aisle * (1 - smooth((across - half) / WEAR.aisleEdge)))
  }
  return 1 - wear
}

/** Tiled floor with world-anchored UVs and baked wall-seam shadow; the window side reads brighter. */
export function buildFloor(room: RoomDef, light: RoomLight, tileMetres: number): BufferGeometry {
  // The texture carries the floor colour; vertex colours only add seam shadow and the room light.
  const base = new Color(1, 1, 1)
    .lerp(new Color(light.light), light.tint)
    .multiplyScalar(light.exposure)
  return gridGeometry(
    room,
    0,
    true,
    (px, pz) => {
      const k = 1 - 0.28 * (1 - smooth(edgeDistance(room, px, pz) / 0.7))
      return base.clone().multiplyScalar(k * daylight(room, px, pz) * floorWear(room, px, pz))
    },
    tileMetres,
    { x: 0, z: 0 },
    FLOOR_STEP,
  )
}

const PANEL_FRAME = 0.02

function flatRect(
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  y: number,
  c: Color,
): BufferGeometry {
  const g = new BufferGeometry()
  g.setAttribute(
    'position',
    new Float32BufferAttribute([x0, y, z0, x1, y, z0, x1, y, z1, x0, y, z1], 3),
  )
  g.setAttribute('normal', new Float32BufferAttribute([0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0], 3))
  g.setAttribute(
    'color',
    new Float32BufferAttribute([c.r, c.g, c.b, c.r, c.g, c.b, c.r, c.g, c.b, c.r, c.g, c.b], 3),
  )
  // Seen from below (normal -Y): (x0,z0) -> (x1,z1) -> (x0,z1) is counter-clockwise.
  g.setIndex([0, 2, 3, 0, 1, 2])
  return g
}

/**
 * Suspended ceiling surface, lit brighter around each LED panel. The tile pattern (T-bar grid and
 * mineral-fibre speckle) comes from a mipmapped texture repeated once per 60 cm tile: thin grid
 * geometry would shimmer in the headset, a filtered texture does not.
 */
export function buildCeiling(room: RoomDef, light: RoomLight): BufferGeometry {
  const grid = ceilingGrid(room.rect)
  const base = new Color(1, 1, 1)
    .lerp(new Color(light.light), light.tint)
    .multiplyScalar(light.exposure)
  // The first whole-tile grid line is the texture's origin, so tile edges land on the grid.
  const origin = { x: grid.xs[1] ?? room.rect.x, z: grid.zs[1] ?? room.rect.z }
  return gridGeometry(
    room,
    room.height,
    false,
    (px, pz) => {
      const seam = 1 - 0.18 * (1 - smooth(edgeDistance(room, px, pz) / 0.9))
      const near = Math.min(...grid.panels.map((p) => Math.hypot(px - p.x, pz - p.z)))
      const k = 0.9 * seam + 0.1 * (1 - smooth(near / 1.4))
      return base.clone().multiplyScalar(k * daylight(room, px, pz))
    },
    grid.tile,
    origin,
  )
}

/** Flush LED panels in their frames, just below the ceiling surface. */
export function buildCeilingPanels(
  room: RoomDef,
  frameColor: string,
  light: RoomLight,
): BufferGeometry {
  const grid = ceilingGrid(room.rect)
  const y = room.height - 0.003
  const panel = new Color(light.light)
  const frame = new Color(frameColor)
    .lerp(new Color(light.light), light.tint)
    .multiplyScalar(light.exposure * 0.92)
  const h = grid.tile / 2
  const parts: BufferGeometry[] = []
  for (const p of grid.panels) {
    parts.push(flatRect(p.x - h, p.z - h, p.x + h, p.z + h, y, frame))
    parts.push(
      flatRect(
        p.x - h + PANEL_FRAME,
        p.z - h + PANEL_FRAME,
        p.x + h - PANEL_FRAME,
        p.z + h - PANEL_FRAME,
        y - 0.001,
        panel,
      ),
    )
  }
  const merged = mergeGeometries(parts)
  parts.forEach((g) => g.dispose())
  if (!merged) throw new Error(`could not merge ceiling panels of room "${room.id}"`)
  return merged
}
