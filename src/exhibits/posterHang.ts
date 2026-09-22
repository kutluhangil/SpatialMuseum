import { BufferGeometry, Color } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { PosterAtlasDef, PosterWallDef, RoomDef } from '../schema/museum'
import { palette } from '../design/tokens'
import type { RoomLight } from '../design/light'
import { litColor, quad } from '../scene/WallBuilder'
import { daylight } from '../scene/bakedLight'
import { wallFrame, wallPoint, type Vec3 } from '../scene/wallFrame'

export type PosterSlot = {
  /** Metres along the wall, and the height of the poster's centre. */
  u: number
  v: number
  /** Which atlas holds this page, and which cell of it. */
  atlas: number
  cell: number
}

/**
 * Where every page hangs. The run is split into equal columns and filled row by row, so a salon
 * hang of two rows reads left to right along the top row and then along the bottom, the way the
 * pages were written.
 */
export function posterSlots(wall: PosterWallDef): PosterSlot[] {
  const total = wall.atlases.reduce((n, a) => n + a.count, 0)
  const perRow = Math.ceil(total / wall.rows.length)
  const span = wall.to - wall.from
  const slots: PosterSlot[] = []
  let atlas = 0
  let cell = 0
  for (let i = 0; i < total; i++) {
    const current = wall.atlases[atlas]
    if (current && cell >= current.count) {
      atlas++
      cell = 0
    }
    const row = Math.floor(i / perRow)
    const column = i % perRow
    slots.push({
      u: wall.from + (span * (column + 0.5)) / perRow,
      v: wall.rows[row] ?? wall.rows[wall.rows.length - 1] ?? 0,
      atlas,
      cell,
    })
    cell++
  }
  return slots
}

/** UV rectangle of one atlas cell. Cell 0 is the top-left of the sheet, v runs up from the bottom. */
export function cellUv(atlas: PosterAtlasDef, cell: number) {
  const column = cell % atlas.columns
  const row = Math.floor(cell / atlas.columns)
  return {
    u0: column / atlas.columns,
    u1: (column + 1) / atlas.columns,
    v0: 1 - (row + 1) / atlas.rows,
    v1: 1 - row / atlas.rows,
  }
}

type Rect = { u0: number; u1: number; v0: number; v1: number }

function slotRect(wall: PosterWallDef, slot: PosterSlot, grow: number): Rect {
  const height = wall.width / wall.aspect
  return {
    u0: slot.u - wall.width / 2 - grow,
    u1: slot.u + wall.width / 2 + grow,
    v0: slot.v - height / 2 - grow,
    v1: slot.v + height / 2 + grow,
  }
}

function panel(
  room: RoomDef,
  wall: PosterWallDef,
  rect: Rect,
  depth: number,
  colour: Color,
  uvs?: [number, number, number, number, number, number, number, number],
): BufferGeometry {
  const f = wallFrame(room, wall.wall)
  const at = (u: number, v: number): Vec3 => wallPoint(f, u, v, depth)
  // Each corner takes the room's baked daylight, so a page by the window is brighter than one in
  // the corner, exactly like the wall behind it.
  const lit = (u: number, v: number) => {
    const [x, , z] = at(u, v)
    return colour.clone().multiplyScalar(daylight(room, x, z, wall.wall))
  }
  return quad(
    at(rect.u0, rect.v0),
    at(rect.u1, rect.v0),
    at(rect.u1, rect.v1),
    at(rect.u0, rect.v1),
    f.normal,
    [lit(rect.u0, rect.v0), lit(rect.u1, rect.v0), lit(rect.u1, rect.v1), lit(rect.u0, rect.v1)],
    uvs,
  )
}

const FRAME_EDGE = 0.012
const MOUNT_DEPTH = 0.022
const FRAME_DEPTH = 0.018
const POSTER_DEPTH = 0.026

/** The aluminium edge and paper mount behind every page, merged into one unlit mesh. */
export function buildPosterFrames(
  room: RoomDef,
  wall: PosterWallDef,
  slots: PosterSlot[],
  light: RoomLight,
): BufferGeometry {
  const edge = litColor(palette.aluminyum, light)
  const mount = litColor(palette.onsut, light)
  const parts: BufferGeometry[] = []
  for (const slot of slots) {
    parts.push(panel(room, wall, slotRect(wall, slot, wall.mount + FRAME_EDGE), FRAME_DEPTH, edge))
    parts.push(panel(room, wall, slotRect(wall, slot, wall.mount), MOUNT_DEPTH, mount))
  }
  const merged = mergeGeometries(parts)
  parts.forEach((p) => p.dispose())
  if (!merged) throw new Error(`could not merge the poster frames of room "${room.id}"`)
  return merged
}

/** Every page of one atlas as quads carrying that atlas's UVs: one draw call for the whole sheet. */
export function buildPosterSheet(
  room: RoomDef,
  wall: PosterWallDef,
  slots: PosterSlot[],
  atlas: PosterAtlasDef,
  index: number,
): BufferGeometry {
  const white = new Color(1, 1, 1)
  const parts = slots
    .filter((s) => s.atlas === index)
    .map((slot) => {
      const uv = cellUv(atlas, slot.cell)
      return panel(room, wall, slotRect(wall, slot, 0), POSTER_DEPTH, white, [
        uv.u0,
        uv.v0,
        uv.u1,
        uv.v0,
        uv.u1,
        uv.v1,
        uv.u0,
        uv.v1,
      ])
    })
  const merged = mergeGeometries(parts)
  parts.forEach((p) => p.dispose())
  if (!merged) throw new Error(`could not merge poster sheet ${index} of room "${room.id}"`)
  return merged
}

const SHADOW_SPREAD = 0.07
const SHADOW_DEPTH = 0.004

/** Soft drop shadow behind each frame, the way a hung page lifts off the wall. */
export function buildPosterShadows(
  room: RoomDef,
  wall: PosterWallDef,
  slots: PosterSlot[],
): BufferGeometry {
  const white = new Color(1, 1, 1)
  const parts = slots.map((slot) => {
    const rect = slotRect(wall, slot, wall.mount + FRAME_EDGE + SHADOW_SPREAD)
    const g = panel(room, wall, rect, SHADOW_DEPTH, white, [0, 0, 1, 0, 1, 1, 0, 1])
    // The shadow falls a little below the frame, as the light comes from the ceiling.
    g.translate(0, -SHADOW_SPREAD * 0.35, 0)
    return g
  })
  const merged = mergeGeometries(parts)
  parts.forEach((p) => p.dispose())
  if (!merged) throw new Error(`could not merge the poster shadows of room "${room.id}"`)
  return merged
}
