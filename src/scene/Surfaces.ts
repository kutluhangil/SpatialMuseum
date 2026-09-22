import { BufferGeometry, Color, Float32BufferAttribute } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { RoomDef } from '../schema/museum'
import type { RoomLight } from '../design/light'
import { ceilingGrid } from './ceilingGrid'

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
): BufferGeometry {
  const { xs, zs } = grid(room, 1)
  const pos: number[] = []
  const col: number[] = []
  const uv: number[] = []
  const idx: number[] = []
  for (const zz of zs) {
    for (const xx of xs) {
      pos.push(xx, y, zz)
      const c = colorAt(xx, zz)
      col.push(c.r, c.g, c.b)
      if (uvScale) uv.push(xx / uvScale, -zz / uvScale)
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

/** Tiled floor with world-anchored UVs and baked wall-seam shadow; the window side reads brighter. */
export function buildFloor(room: RoomDef, light: RoomLight, tileMetres: number): BufferGeometry {
  // The texture carries the floor colour; vertex colours only add seam shadow and the room light.
  const base = new Color(1, 1, 1)
    .lerp(new Color(light.light), light.tint)
    .multiplyScalar(light.exposure)
  const daylit = room.windows.some((w) => w.wall === 'west')
  return gridGeometry(
    room,
    0,
    true,
    (px, pz) => {
      const k = 1 - 0.28 * (1 - smooth(edgeDistance(room, px, pz) / 0.7))
      const daylight = daylit ? 0.06 * (1 - smooth((px - room.rect.x) / 4)) : 0
      return base.clone().multiplyScalar(k + daylight)
    },
    tileMetres,
  )
}

const T_BAR = 0.024
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
 * Suspended ceiling: 60 cm tiles with a white T-bar grid and flush LED panels, the tiles lit
 * brighter around each panel. One merged geometry, one draw call.
 */
export function buildCeiling(room: RoomDef, tileColor: string, light: RoomLight): BufferGeometry {
  const grid = ceilingGrid(room.rect)
  const base = new Color(tileColor)
    .lerp(new Color(light.light), light.tint)
    .multiplyScalar(light.exposure)
  const surface = gridGeometry(
    room,
    room.height,
    false,
    (px, pz) => {
      const seam = 1 - 0.18 * (1 - smooth(edgeDistance(room, px, pz) / 0.9))
      const near = Math.min(...grid.panels.map((p) => Math.hypot(px - p.x, pz - p.z)))
      return base.clone().multiplyScalar(0.86 * seam + 0.1 * (1 - smooth(near / 1.4)))
    },
    null,
  )
  const y = room.height - 0.003
  const bar = base.clone().multiplyScalar(0.97)
  const parts: BufferGeometry[] = [surface]
  const { x, z, width, depth } = room.rect
  for (const gx of grid.xs.slice(1, -1)) {
    parts.push(flatRect(gx - T_BAR / 2, z, gx + T_BAR / 2, z + depth, y, bar))
  }
  for (const gz of grid.zs.slice(1, -1)) {
    parts.push(flatRect(x, gz - T_BAR / 2, x + width, gz + T_BAR / 2, y - 0.001, bar))
  }
  const panel = new Color(light.light)
  const frame = base.clone().multiplyScalar(0.92)
  const h = grid.tile / 2
  for (const p of grid.panels) {
    parts.push(flatRect(p.x - h, p.z - h, p.x + h, p.z + h, y - 0.002, frame))
    parts.push(
      flatRect(
        p.x - h + PANEL_FRAME,
        p.z - h + PANEL_FRAME,
        p.x + h - PANEL_FRAME,
        p.z + h - PANEL_FRAME,
        y - 0.003,
        panel,
      ),
    )
  }
  const merged = mergeGeometries(parts)
  parts.forEach((p) => p.dispose())
  if (!merged) throw new Error(`could not merge ceiling of room "${room.id}"`)
  return merged
}
