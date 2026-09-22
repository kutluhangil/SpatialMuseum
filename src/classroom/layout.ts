import { CLASSROOM, type RoomDef, type WallSideName } from '../schema/museum'
import { wallFrame, wallPoint, wallYaw, type Vec3, type WallFrame } from '../scene/wallFrame'

export type Placed = { position: Vec3; yaw: number }
export type Footprint = { cx: number; cz: number; halfX: number; halfZ: number }
export type WallArea = { u0: number; u1: number; v0: number; v1: number }
export type ClassroomLayout = {
  frontYaw: number
  desks: Placed[]
  chairs: Placed[]
  lecturerDesk: Placed
  lecturerChair: Placed
  board: WallArea
  screen: WallArea & { standoff: number }
  projector: Vec3
  clock: { u: number; v: number }
  radiators: { wall: WallSideName; u: number; width: number }[]
  corkBoard: { wall: WallSideName; area: WallArea } | null
  footprints: Footprint[]
  spawnSeat: Placed
}

const OPPOSITE: Record<WallSideName, WallSideName> = {
  north: 'south',
  south: 'north',
  east: 'west',
  west: 'east',
}
const LECTURER_DESK = { u: 2, d: 1, width: 1.4, depth: 0.7 }
const CORK = { u0: 3.2, u1: 5.8, v0: 1, v1: 2.1 }

/** Axis-aligned footprint of a box centred at `p`; front walls are axis-aligned, so yaw is a multiple of 90°. */
function footprint(p: Vec3, frontFrame: WallFrame, width: number, depth: number): Footprint {
  const alongX = Math.abs(frontFrame.uDir[0]) > 0.5
  return {
    cx: p[0],
    cz: p[2],
    halfX: (alongX ? width : depth) / 2,
    halfZ: (alongX ? depth : width) / 2,
  }
}

export function classroomLayout(room: RoomDef): ClassroomLayout {
  const c = room.classroom
  if (!c) throw new Error(`room "${room.id}" is not a classroom`)
  const f = wallFrame(room, c.front)
  const frontYaw = wallYaw(f)
  const at = (u: number, d: number, y = 0): Vec3 => wallPoint(f, u, y, d)
  const { desk, rowPitch, firstRow, chairBehind, board: B, screen: S } = CLASSROOM

  const mid = f.length / 2
  const aisleLeft = mid - c.aisle / 2
  const aisleRight = mid + c.aisle / 2
  const desks: Placed[] = []
  const chairs: Placed[] = []
  const footprints: Footprint[] = []
  for (let row = 0; row < c.rows; row++) {
    const d = firstRow + row * rowPitch
    for (let k = 0; k < c.desksPerSide; k++) {
      // Left block grows leftwards from the aisle, right block rightwards; both listed aisle-first.
      for (const u of [
        aisleLeft - desk.width / 2 - k * desk.width,
        aisleRight + desk.width / 2 + k * desk.width,
      ]) {
        const p = at(u, d)
        desks.push({ position: p, yaw: frontYaw })
        footprints.push(footprint(p, f, desk.width, desk.depth))
        for (const s of [-desk.width / 4, desk.width / 4]) {
          chairs.push({ position: at(u + s, d + chairBehind), yaw: frontYaw })
        }
      }
    }
  }

  const lecturerDesk = { position: at(LECTURER_DESK.u, LECTURER_DESK.d), yaw: frontYaw }
  footprints.push(footprint(lecturerDesk.position, f, LECTURER_DESK.width, LECTURER_DESK.depth))
  // The lecturer's chair sits between desk and board, facing the class.
  const lecturerChair = {
    position: at(LECTURER_DESK.u, LECTURER_DESK.d - 0.6),
    yaw: frontYaw + Math.PI,
  }

  const board = { u0: B.margin, u1: B.margin + B.width, v0: B.bottom, v1: B.bottom + B.height }
  const screenU0 = board.u1 + S.gap
  const screen = {
    u0: screenU0,
    u1: screenU0 + S.width,
    v0: S.bottom,
    v1: S.bottom + S.height,
    standoff: S.standoff,
  }
  const projector = at((screen.u0 + screen.u1) / 2, 3.4, room.height - 0.45)
  const clock = { u: (board.u0 + board.u1) / 2, v: Math.min(room.height - 0.45, board.v1 + 0.55) }

  const radiators = room.windows.map((w) => ({ wall: w.wall, u: w.offset, width: w.width - 0.2 }))
  const back = OPPOSITE[c.front]
  const corkBoard =
    wallFrame(room, back).length >= CORK.u1 + 0.3 ? { wall: back, area: CORK } : null

  // Second row, first desk right of the aisle, aisle-side seat: close to the board, with the
  // screen only a small head turn away.
  const spawnRow = Math.min(1, c.rows - 1)
  const spawnU = aisleRight + desk.width / 4
  const spawnD = firstRow + spawnRow * rowPitch + chairBehind
  const lookU = ((board.u0 + board.u1) / 2 + (screen.u0 + screen.u1) / 2) / 2
  const seat = at(spawnU, spawnD)
  const look = at(lookU, 0)
  const spawnSeat = {
    position: seat,
    // yaw 0 looks along -Z; atan2 of the reversed look vector gives the camera yaw.
    yaw: Math.atan2(seat[0] - look[0], seat[2] - look[2]),
  }

  return {
    frontYaw,
    desks,
    chairs,
    lecturerDesk,
    lecturerChair,
    board,
    screen,
    projector,
    clock,
    radiators,
    corkBoard,
    footprints,
    spawnSeat,
  }
}
