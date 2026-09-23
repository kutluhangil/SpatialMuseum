import { CLASSROOM, roomOpenings, type RoomDef, type WallSideName } from '../schema/museum'
import { wallFrame, wallPoint, wallYaw, type Vec3, type WallFrame } from '../scene/wallFrame'
import { ceilingGrid } from '../scene/ceilingGrid'
import { JAMB_WIDTH } from '../scene/WallBuilder'

export type Placed = { position: Vec3; yaw: number }
export type Footprint = { cx: number; cz: number; halfX: number; halfZ: number }
export type WallArea = { u0: number; u1: number; v0: number; v1: number }
export type WallSpot = { wall: WallSideName; u: number; v: number }
export type Blind = { wall: WallSideName; u: number; width: number; top: number; bottom: number }
export type CeilingSpot = { x: number; z: number }
/**
 * The demonstration corner every breastfeeding class is taught from: a low nursing chair with its
 * C-pillow and teaching doll, the table of expressing equipment beside it, a bassinet off to the
 * side and the mat they all stand on.
 */
export type DemoCorner = {
  chair: Placed
  table: Placed
  bassinet: Placed
}
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
  bin: Placed
  coatRail: { wall: WallSideName; u: number; v: number; width: number } | null
  notices: WallSpot[]
  blinds: Blind[]
  sockets: WallSpot[]
  switches: WallSpot[]
  callPoints: WallSpot[]
  ceiling: { diffusers: CeilingSpot[]; smokeDetectors: CeilingSpot[]; speakers: CeilingSpot[] }
  demo: DemoCorner
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
// Waste bin in the front corner beside the lecturer, out of the aisle and of the first row.
const BIN = { u: 0.35, d: 0.45, radius: 0.17 }
// Coat rail just inside the door, where a coat is actually hung; the rest of the back wall is the
// class's exhibition.
const COAT_RAIL = { width: 0.6, v: 1.7, gap: 0.35 }
// Notices pinned straight to the wall above the rail: the pin board itself carries the lesson panels.
const NOTICE = { v: 2.25, spread: 0.15 }

// The demonstration set, measured along the front wall. It stands in front of the teaching wall
// where the class can see it, split either side of the centre aisle, which stays open from the
// board to the back. Every piece is low enough not to cut into the board or the screen from a seat.
const DEMO = {
  chair: { u: 5, d: 1.3, size: 0.62, depth: 0.58 },
  table: { u: 5.9, d: 1.35, width: 0.7, depth: 0.45 },
  bassinet: { u: 8.6, d: 1.35, width: 0.86, depth: 0.5 },
}

// Chairs left by the last class: small turns and shifts. Between rows only ~3 cm of slack keeps a
// chair clear of the desk behind it; the back row has room to be pushed out further.
const SCATTER = {
  yaw: 0.18,
  lateral: 0.06,
  slack: 0.03,
  pushedChance: 0.3,
  pushed: 0.2,
  pushedYaw: 0.7,
}

// Roller blinds left part-way down: a fraction of the window height, never below the handle.
const BLIND_DROP = { min: 0.18, max: 0.42 }
// Double sockets at skirting-plus height, spread along every wall but kept out of the openings.
const SOCKET = { v: 0.3, spacing: 2.4, clearance: 0.35, endMargin: 0.3 }
// Light switch on the handle side of each door, fire alarm call point on the hinge side.
const SWITCH = { gap: 0.15, v: 1.05 }
const CALL_POINT = { gap: 0.2, v: 1.4, minU: 0.15 }
// Ceiling speakers flank the front, this far into the room and at these fractions of its width.
const SPEAKER = { d: 1.2, at: [0.2, 0.8] }

/** Small seeded PRNG (mulberry32): the same classroom on every load and in every test. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function hashSeed(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return h >>> 0
}

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

/** Centre of the whole ceiling tile containing `v`; fixtures never go into the cut edge tiles. */
function tileCentre(v: number, lines: number[], tile: number): number {
  for (let i = 0; i < lines.length - 1; i++) {
    const a = lines[i] ?? 0
    const b = lines[i + 1] ?? 0
    if (v >= a && v < b) {
      if (Math.abs(b - a - tile) > 1e-9) {
        throw new Error(`ceiling fixture at ${v} falls in a cut tile [${a}, ${b}]`)
      }
      return (a + b) / 2
    }
  }
  throw new Error(`ceiling fixture at ${v} lies outside the grid [${lines[0]}, ${lines.at(-1)}]`)
}

/**
 * Air diffusers, smoke detectors and speakers placed in whole tiles of the suspended ceiling:
 * diffusers beside alternate LED panels in the outer panel rows, detectors down the middle
 * column between panel rows, speakers flanking the front of the room.
 */
function ceilingFixtures(room: RoomDef, front: WallFrame, projector: Vec3) {
  const grid = ceilingGrid(room.rect)
  const { tile } = grid
  const cols = [...new Set(grid.panels.map((p) => p.x))].sort((a, b) => a - b)
  const rows = [...new Set(grid.panels.map((p) => p.z))].sort((a, b) => a - b)
  const clearOfProjector = (p: CeilingSpot) =>
    Math.hypot(p.x - projector[0], p.z - projector[2]) > 0.8
  const outerRows = rows.length > 1 ? [rows[0] ?? 0, rows.at(-1) ?? 0] : rows
  const diffusers = cols
    .filter((_, i) => i % 2 === 0)
    .flatMap((x) => outerRows.map((z) => ({ x: x + tile, z })))
    .filter(clearOfProjector)
  const midCol = cols[Math.floor((cols.length - 1) / 2)] ?? 0
  const smokeDetectors = rows
    .slice(0, -1)
    .map((z) => ({ x: midCol + tile, z: z + tile }))
    .filter(clearOfProjector)
  // No two fittings share a tile, and none lands on a light panel.
  const taken = new Set(
    [...grid.panels, ...diffusers, ...smokeDetectors].map((p) => `${p.x},${p.z}`),
  )
  const free = (p: CeilingSpot) => !taken.has(`${p.x},${p.z}`)
  const speakers = SPEAKER.at.map((t) => {
    const [x, , z] = wallPoint(front, front.length * t, 0, SPEAKER.d)
    let spot = { x: tileCentre(x, grid.xs, tile), z: tileCentre(z, grid.zs, tile) }
    // Step further into the room until the tile is free; the front rows still hear it.
    for (let n = 1; n <= 4 && !free(spot); n++) {
      const [sx, , sz] = wallPoint(front, front.length * t, 0, SPEAKER.d + n * tile)
      spot = { x: tileCentre(sx, grid.xs, tile), z: tileCentre(sz, grid.zs, tile) }
    }
    taken.add(`${spot.x},${spot.z}`)
    return spot
  })
  return { diffusers, smokeDetectors, speakers }
}

/** Double sockets every SOCKET.spacing along each wall, skipping doors and windows. */
function wallSockets(room: RoomDef): WallSpot[] {
  const out: WallSpot[] = []
  for (const wall of ['north', 'east', 'south', 'west'] as const) {
    const { length } = wallFrame(room, wall)
    const openings = roomOpenings(room, wall)
    for (let u = SOCKET.spacing / 2; u <= length - SOCKET.endMargin; u += SOCKET.spacing) {
      const blocked = openings.some(
        (o) => Math.abs(u - o.offset) < o.width / 2 + JAMB_WIDTH + SOCKET.clearance,
      )
      if (!blocked) out.push({ wall, u, v: SOCKET.v })
    }
  }
  return out
}

/**
 * How far each window's roller blind is left down, as a fraction of the window height. Seeded on
 * the room id, so the room looks the same on every load and the sun patches match the blinds.
 */
export function roomBlinds(room: RoomDef): Blind[] {
  const rand = seededRandom(hashSeed(`${room.id}:blinds`))
  return room.windows.map((w) => {
    const top = w.sill + w.height
    const drop = BLIND_DROP.min + (BLIND_DROP.max - BLIND_DROP.min) * rand()
    return { wall: w.wall, u: w.offset, width: w.width, top, bottom: top - w.height * drop }
  })
}

// How far left of the board's edge the wall clock hangs.
const CLOCK_BESIDE_BOARD = 1.1

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
  // Second row, first desk right of the aisle, aisle-side seat: close to the board, with the
  // screen only a small head turn away.
  const spawnRow = Math.min(1, c.rows - 1)
  const spawnU = aisleRight + desk.width / 4
  const spawnD = firstRow + spawnRow * rowPitch + chairBehind
  const rand = seededRandom(hashSeed(room.id))
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
          const seatU = u + s
          // The visitor's own chair stays exactly where the spawn puts them.
          if (row === spawnRow && Math.abs(seatU - spawnU) < 1e-9) {
            chairs.push({ position: at(seatU, spawnD), yaw: frontYaw })
            continue
          }
          const lastRow = row === c.rows - 1
          const pushed = lastRow && rand() < SCATTER.pushedChance
          const back = pushed ? SCATTER.pushed * rand() : SCATTER.slack * rand()
          const turn = (rand() - 0.5) * (pushed ? SCATTER.pushedYaw : SCATTER.yaw)
          const side = (rand() - 0.5) * SCATTER.lateral
          chairs.push({ position: at(seatU + side, d + chairBehind + back), yaw: frontYaw + turn })
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

  // Board, gap and screen make one block; on a wall wider than the block it is centred, so a big
  // hall does not leave the teaching wall lopsided.
  const blockWidth = B.width + S.gap + S.width
  const boardU0 = Math.max(B.margin, (f.length - blockWidth) / 2)
  const board = { u0: boardU0, u1: boardU0 + B.width, v0: B.bottom, v1: B.bottom + B.height }
  const screenU0 = board.u1 + S.gap
  const screen = {
    u0: screenU0,
    u1: screenU0 + S.width,
    v0: S.bottom,
    v1: S.bottom + S.height,
    standoff: S.standoff,
  }
  const projector = at((screen.u0 + screen.u1) / 2, 3.4, room.height - 0.45)
  // The board now reaches the screen's top, so the clock hangs on the front wall beside it, at
  // the height of the board's upper half, where every seat still sees it.
  const clock = { u: board.u0 - Math.min(CLOCK_BESIDE_BOARD, board.u0 / 2), v: 2.35 }

  const radiators = room.windows.map((w) => ({ wall: w.wall, u: w.offset, width: w.width - 0.2 }))
  const back = OPPOSITE[c.front]

  const switches: WallSpot[] = []
  const callPoints: WallSpot[] = []
  for (const d of room.doors) {
    // The handle is on the door's right-hand edge (larger u), so the switch goes there.
    const lockU = d.offset + d.width / 2 + JAMB_WIDTH + SWITCH.gap
    switches.push({ wall: d.wall, u: lockU, v: SWITCH.v })
    const hingeU = d.offset - d.width / 2 - JAMB_WIDTH - CALL_POINT.gap
    callPoints.push(
      hingeU >= CALL_POINT.minU
        ? { wall: d.wall, u: hingeU, v: CALL_POINT.v }
        : { wall: d.wall, u: lockU, v: CALL_POINT.v },
    )
  }

  const bin = { position: at(BIN.u, BIN.d), yaw: frontYaw }

  // Everything in the demonstration set faces the class, as the lecturer's chair does.
  const facingClass = frontYaw + Math.PI
  const demo: DemoCorner = {
    chair: { position: at(DEMO.chair.u, DEMO.chair.d), yaw: facingClass },
    table: { position: at(DEMO.table.u, DEMO.table.d), yaw: facingClass },
    bassinet: { position: at(DEMO.bassinet.u, DEMO.bassinet.d), yaw: facingClass },
  }
  footprints.push(footprint(demo.chair.position, f, DEMO.chair.size, DEMO.chair.depth))
  footprints.push(footprint(demo.table.position, f, DEMO.table.width, DEMO.table.depth))
  footprints.push(footprint(demo.bassinet.position, f, DEMO.bassinet.width, DEMO.bassinet.depth))

  // Right next to the door, so it never runs into whatever hangs along the rest of the wall.
  const backFrame = wallFrame(room, back)
  const doorEnd = Math.max(
    0,
    ...room.doors
      .filter((d) => d.wall === back)
      .map((d) => d.offset + d.width / 2 + JAMB_WIDTH + COAT_RAIL.gap),
  )
  const railCentre = doorEnd + COAT_RAIL.width / 2
  const coatRail =
    railCentre + COAT_RAIL.width / 2 <= backFrame.length
      ? { wall: back, u: railCentre, v: COAT_RAIL.v, width: COAT_RAIL.width }
      : null

  const notices = coatRail
    ? [-NOTICE.spread, NOTICE.spread].map((du) => ({
        wall: coatRail.wall,
        u: coatRail.u + du,
        v: NOTICE.v,
      }))
    : []

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
    bin,
    coatRail,
    notices,
    blinds: roomBlinds(room),
    sockets: wallSockets(room),
    switches,
    callPoints,
    ceiling: ceilingFixtures(room, f, projector),
    demo,
    footprints,
    spawnSeat,
  }
}
