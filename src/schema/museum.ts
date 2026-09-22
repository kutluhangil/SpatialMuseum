import { z } from 'zod'

// Architectural constants shared by validation and geometry, so both agree on what a door blocks.
export const DOOR_HEIGHT = 2.4
export const DEFAULT_TEXT_ASPECT = 4 / 3

// Classroom dimensions shared by validation, layout and geometry (spec 2026-09-22-derslik).
export const CLASSROOM = {
  desk: { width: 1.2, depth: 0.5, height: 0.75 },
  // 1.1 m pitch leaves 0.6 m between a chair and the next desk: room for a seated person to stand.
  rowPitch: 1.1,
  firstRow: 2.5, // front wall to the first desk centre
  chairBehind: 0.55, // desk centre to chair centre
  sideMargin: 0.8, // minimum floor between the outer desks and the side walls
  backMargin: 0.35, // behind the last chair
  board: { margin: 0.7, width: 4, bottom: 0.9, height: 1.2 },
  screen: { gap: 0.3, width: 3.6, bottom: 0.95, height: 2, margin: 1, standoff: 0.15 },
} as const

// The whiteboard shows a title plus two body lines read from ~5 m (35 dmm body text).
export const BOARD_NOTE_MAX_CHARS = 90

/** Front-wall length the board, the gap and the screen need. */
export const CLASSROOM_FRONT_LENGTH =
  CLASSROOM.board.margin +
  CLASSROOM.board.width +
  CLASSROOM.screen.gap +
  CLASSROOM.screen.width +
  CLASSROOM.screen.margin

const Localized = z.object({ tr: z.string().min(1), en: z.string().optional() })
export type Localized = z.infer<typeof Localized>
const WallSide = z.enum(['north', 'east', 'south', 'west'])

const Door = z.object({
  wall: WallSide,
  offset: z.number(), // metres from the wall's left end, seen from inside
  width: z.number().positive().default(1.4),
  to: z.string().optional(), // target room id, used by wayfinding
})

const Window = z.object({
  wall: WallSide,
  offset: z.number(), // centre, metres from the wall's left end seen from inside
  width: z.number().positive().default(1.4),
  sill: z.number().nonnegative().default(1), // bottom of the opening above the floor
  height: z.number().positive().default(1.8),
})

const Placement = z.object({
  wall: WallSide,
  u: z.number(), // horizontal centre along the wall
  v: z.number().default(1.5), // vertical centre above the floor
  width: z.number().positive(),
  depthOffset: z.number().default(0.02), // lifts frames off the wall plane so they never z-fight
})

const Base = z.object({
  id: z.string().min(1),
  roomId: z.string(),
  placement: Placement,
  label: z.object({ title: Localized, body: Localized.optional() }).optional(),
})

const VideoExhibit = Base.extend({
  type: z.literal('video'),
  src: z.string(), // media key, resolved against VITE_MEDIA_BASE_URL
  poster: z.string(),
  aspect: z
    .number()
    .positive()
    .default(16 / 9),
  subtitles: z.array(z.object({ lang: z.string(), src: z.string() })).default([]),
  autoplayOnApproach: z.boolean().default(true),
  approachRadius: z.number().default(2.2),
  loop: z.boolean().default(false),
})

const ImageExhibit = Base.extend({
  type: z.literal('image'),
  src: z.string(),
  aspect: z.number().positive(),
  frame: z.enum(['none', 'thin', 'passepartout', 'wood', 'black']).default('black'),
})

const TextPanel = Base.extend({
  type: z.literal('text'),
  variant: z.enum(['roomIntro', 'fact', 'quote', 'label']),
  title: Localized.optional(),
  body: Localized,
  fontSize: z.number().optional(), // metres; the editor warns when this falls under the legibility floor
  // Panels need a known footprint for overlap and door checks; width / aspect = height.
  aspect: z.number().positive().default(DEFAULT_TEXT_ASPECT),
})

const Exhibit = z.discriminatedUnion('type', [VideoExhibit, ImageExhibit, TextPanel])

/**
 * The class's own posters, hung as one run along a wall. They are not exhibits: two dozen framed
 * exhibits would be two dozen draw calls and as many textures, so the pages are packed into KTX2
 * atlases and the whole run is drawn as one mesh per atlas.
 */
const PosterAtlas = z.object({
  src: z.string(),
  columns: z.number().int().positive(),
  rows: z.number().int().positive(),
  /** Cells actually used, filled row by row. */
  count: z.number().int().positive(),
})

const PosterWall = z.object({
  roomId: z.string(),
  wall: WallSide,
  /** The run of wall the posters hang on, in metres from the wall's left end. */
  from: z.number(),
  to: z.number(),
  /** Height of the centre of each row; two rows is a salon hang, one row is a gallery hang. */
  rows: z.array(z.number()).min(1),
  width: z.number().positive(),
  aspect: z.number().positive(),
  /** Paper border around each page, as the passepartout of a frame. */
  mount: z.number().nonnegative().default(0.03),
  atlases: z.array(PosterAtlas).min(1),
})

const LessonSection = z.object({ id: z.string().min(1), title: Localized })

const LessonVideo = z.object({
  id: z.string().min(1),
  section: z.string(),
  type: z.literal('video'),
  title: Localized,
  src: z.string(),
  poster: z.string(),
  aspect: z
    .number()
    .positive()
    .default(16 / 9),
  subtitles: z.array(z.object({ lang: z.string(), src: z.string() })).default([]),
  loop: z.boolean().default(false),
})

const LessonText = z.object({
  id: z.string().min(1),
  section: z.string(),
  type: z.literal('text'),
  title: Localized.optional(),
  body: Localized,
})

const LessonStep = z.discriminatedUnion('type', [LessonVideo, LessonText])

// Steps play in array order: videos on the projection screen, notes on the whiteboard.
const Lesson = z.object({
  sections: z.array(LessonSection).default([]),
  steps: z.array(LessonStep).default([]),
})

const Room = z.object({
  id: z.string().min(1),
  name: Localized,
  rect: z.object({
    x: z.number(),
    z: z.number(),
    width: z.number().positive(),
    depth: z.number().positive(),
  }),
  height: z.number().positive().default(3.2),
  wallTone: z.enum(['kirikBeyaz']).default('kirikBeyaz'),
  doors: z.array(Door).default([]),
  windows: z.array(Window).default([]),
  // Present on the one room that is the classroom: desks, board and screen are generated from it.
  classroom: z
    .object({
      front: WallSide,
      rows: z.number().int().positive().default(5),
      desksPerSide: z.number().int().positive().default(2),
      aisle: z.number().positive().default(1),
    })
    .optional(),
})

export type WallSideName = z.infer<typeof WallSide>
export type DoorDef = z.infer<typeof Door>
export type WindowDef = z.infer<typeof Window>
export type RoomDef = z.infer<typeof Room>
export type ExhibitDef = z.infer<typeof Exhibit>
export type PlacementDef = z.infer<typeof Placement>
export type ClassroomDef = NonNullable<RoomDef['classroom']>
export type PosterWallDef = z.infer<typeof PosterWall>
export type PosterAtlasDef = z.infer<typeof PosterAtlas>
export type LessonDef = z.infer<typeof Lesson>
export type LessonSectionDef = z.infer<typeof LessonSection>
export type LessonStepDef = z.infer<typeof LessonStep>
export type LessonVideoDef = z.infer<typeof LessonVideo>
export type LessonTextDef = z.infer<typeof LessonText>

/** Every hole in a wall, doors and windows alike, as a u-range plus a floor-relative v-range. */
export type Opening = { offset: number; width: number; bottom: number; top: number }

export function roomOpenings(
  room: Pick<RoomDef, 'doors' | 'windows'>,
  side: WallSideName,
): Opening[] {
  return [
    ...room.doors
      .filter((d) => d.wall === side)
      .map((d) => ({ offset: d.offset, width: d.width, bottom: 0, top: DOOR_HEIGHT })),
    ...room.windows
      .filter((w) => w.wall === side)
      .map((w) => ({ offset: w.offset, width: w.width, bottom: w.sill, top: w.sill + w.height })),
  ]
}

/** The wall line on the floor plan: a fixed coordinate on one axis and a range on the other. */
function wallLine(room: Pick<RoomDef, 'rect'>, side: WallSideName) {
  const { x, z, width, depth } = room.rect
  switch (side) {
    case 'north':
      return { axis: 'z' as const, at: z, from: x, to: x + width }
    case 'south':
      return { axis: 'z' as const, at: z + depth, from: x, to: x + width }
    case 'west':
      return { axis: 'x' as const, at: x, from: z, to: z + depth }
    case 'east':
      return { axis: 'x' as const, at: x + width, from: z, to: z + depth }
  }
}

export function wallLength(room: Pick<RoomDef, 'rect'>, side: WallSideName): number {
  return side === 'north' || side === 'south' ? room.rect.width : room.rect.depth
}

export function exhibitHeight(exhibit: ExhibitDef): number {
  return exhibit.placement.width / exhibit.aspect
}

type Interval = readonly [number, number]
const overlaps = (a: Interval, b: Interval) => a[0] < b[1] && b[0] < a[1]
const EPS = 1e-6
// Posters hang clear of the skirting and the scuff rail below them.
const BASEBOARD_CLEARANCE = 0.95

const MuseumBase = z.object({
  version: z.literal(2),
  title: Localized,
  spawn: z.object({
    roomId: z.string(),
    position: z.tuple([z.number(), z.number(), z.number()]),
    yaw: z.number(),
    posture: z.enum(['standing', 'seated']).default('standing'),
  }),
  rooms: z.array(Room).min(1),
  exhibits: z.array(Exhibit),
  posterWall: PosterWall.optional(),
  lesson: Lesson.prefault({}),
})

export const MuseumSchema = MuseumBase.superRefine((m, ctx) => {
  const rooms = new Map<string, RoomDef>()
  m.rooms.forEach((room, i) => {
    if (rooms.has(room.id)) {
      ctx.addIssue({
        code: 'custom',
        path: ['rooms', i, 'id'],
        message: `duplicate room id "${room.id}"`,
      })
    }
    rooms.set(room.id, room)
  })

  if (!rooms.has(m.spawn.roomId)) {
    ctx.addIssue({
      code: 'custom',
      path: ['spawn', 'roomId'],
      message: `unknown room "${m.spawn.roomId}"`,
    })
  }

  m.rooms.forEach((room, ri) => {
    room.doors.forEach((door, di) => {
      const path = ['rooms', ri, 'doors', di]
      if (door.to !== undefined && !rooms.has(door.to)) {
        ctx.addIssue({
          code: 'custom',
          path: [...path, 'to'],
          message: `unknown room "${door.to}"`,
        })
      }
      const len = wallLength(room, door.wall)
      if (door.offset - door.width / 2 < -EPS || door.offset + door.width / 2 > len + EPS) {
        ctx.addIssue({
          code: 'custom',
          path: [...path, 'offset'],
          message: `door spans ${door.offset - door.width / 2}..${door.offset + door.width / 2} m but the ${door.wall} wall is ${len} m long`,
        })
      }
      room.doors.forEach((other, oi) => {
        if (oi <= di || other.wall !== door.wall) return
        const a: Interval = [door.offset - door.width / 2, door.offset + door.width / 2]
        const b: Interval = [other.offset - other.width / 2, other.offset + other.width / 2]
        if (overlaps(a, b)) {
          ctx.addIssue({
            code: 'custom',
            path,
            message: `overlaps door ${oi} on the ${door.wall} wall`,
          })
        }
      })
    })
  })

  m.rooms.forEach((room, ri) => {
    room.windows.forEach((win, wi) => {
      const path = ['rooms', ri, 'windows', wi]
      const len = wallLength(room, win.wall)
      const u: Interval = [win.offset - win.width / 2, win.offset + win.width / 2]
      if (u[0] < -EPS || u[1] > len + EPS) {
        ctx.addIssue({
          code: 'custom',
          path: [...path, 'offset'],
          message: `window spans ${u[0]}..${u[1]} m but the ${win.wall} wall is ${len} m long`,
        })
      }
      if (win.sill + win.height > room.height - 0.3 + EPS) {
        ctx.addIssue({
          code: 'custom',
          path: [...path, 'height'],
          message: `window top ${win.sill + win.height} m leaves under 0.3 m below the ${room.height} m ceiling`,
        })
      }
      const others = roomOpenings(
        { doors: room.doors, windows: room.windows.filter((_, i) => i !== wi) },
        win.wall,
      )
      for (const o of others) {
        if (overlaps(u, [o.offset - o.width / 2, o.offset + o.width / 2])) {
          ctx.addIssue({
            code: 'custom',
            path,
            message: `overlaps another opening on the ${win.wall} wall of "${room.id}"`,
          })
        }
      }
      // A window must look outside: no other room may share this stretch of wall.
      const line = wallLine(room, win.wall)
      const along: Interval =
        win.wall === 'south' || win.wall === 'west'
          ? [line.to - u[1], line.to - u[0]]
          : [line.from + u[0], line.from + u[1]]
      for (const other of m.rooms) {
        if (other.id === room.id) continue
        for (const side of ['north', 'east', 'south', 'west'] as const) {
          const ol = wallLine(other, side)
          if (
            ol.axis === line.axis &&
            Math.abs(ol.at - line.at) < EPS &&
            overlaps(along, [ol.from, ol.to])
          ) {
            ctx.addIssue({
              code: 'custom',
              path,
              message: `window on the ${win.wall} wall of "${room.id}" would look into room "${other.id}"`,
            })
          }
        }
      }
    })
  })

  const ids = new Set<string>()
  m.exhibits.forEach((ex, ei) => {
    const path = ['exhibits', ei]
    if (ids.has(ex.id))
      ctx.addIssue({
        code: 'custom',
        path: [...path, 'id'],
        message: `duplicate exhibit id "${ex.id}"`,
      })
    ids.add(ex.id)

    const room = rooms.get(ex.roomId)
    if (!room) {
      ctx.addIssue({
        code: 'custom',
        path: [...path, 'roomId'],
        message: `unknown room "${ex.roomId}"`,
      })
      return
    }

    const p = ex.placement
    const h = exhibitHeight(ex)
    const u: Interval = [p.u - p.width / 2, p.u + p.width / 2]
    const v: Interval = [p.v - h / 2, p.v + h / 2]
    const len = wallLength(room, p.wall)
    if (u[0] < -EPS || u[1] > len + EPS || v[0] < -EPS || v[1] > room.height + EPS) {
      ctx.addIssue({
        code: 'custom',
        path: [...path, 'placement'],
        message: `exhibit spans u ${u[0].toFixed(2)}..${u[1].toFixed(2)}, v ${v[0].toFixed(2)}..${v[1].toFixed(2)} but the ${p.wall} wall is ${len} × ${room.height} m`,
      })
    }

    room.doors.forEach((door, di) => {
      if (door.wall !== p.wall) return
      const d: Interval = [door.offset - door.width / 2, door.offset + door.width / 2]
      if (overlaps(u, d) && overlaps(v, [0, DOOR_HEIGHT])) {
        ctx.addIssue({
          code: 'custom',
          path: [...path, 'placement'],
          message: `exhibit reaches into the opening of door ${di} on the ${p.wall} wall of "${room.id}"`,
        })
      }
    })
    room.windows.forEach((win, wi) => {
      if (win.wall !== p.wall) return
      const w: Interval = [win.offset - win.width / 2, win.offset + win.width / 2]
      if (overlaps(u, w) && overlaps(v, [win.sill, win.sill + win.height])) {
        ctx.addIssue({
          code: 'custom',
          path: [...path, 'placement'],
          message: `exhibit covers window ${wi} on the ${p.wall} wall of "${room.id}"`,
        })
      }
    })

    m.exhibits.forEach((other, oi) => {
      if (oi <= ei || other.roomId !== ex.roomId || other.placement.wall !== p.wall) return
      const op = other.placement
      const oh = exhibitHeight(other)
      const ou: Interval = [op.u - op.width / 2, op.u + op.width / 2]
      const ov: Interval = [op.v - oh / 2, op.v + oh / 2]
      if (overlaps(u, ou) && overlaps(v, ov)) {
        ctx.addIssue({
          code: 'custom',
          path: [...path, 'placement'],
          message: `overlaps exhibit "${other.id}" on the ${p.wall} wall of "${room.id}"`,
        })
      }
    })
  })

  m.rooms.forEach((room, ri) => {
    const c = room.classroom
    if (!c) return
    const path = ['rooms', ri, 'classroom']
    const front = wallLength(room, c.front)
    const deep = wallLength(room, c.front === 'north' || c.front === 'south' ? 'east' : 'north')
    if (front < CLASSROOM_FRONT_LENGTH - EPS) {
      ctx.addIssue({
        code: 'custom',
        path: [...path, 'front'],
        message: `the ${c.front} wall is ${front} m; board and screen need ${CLASSROOM_FRONT_LENGTH} m`,
      })
    }
    const rowsWidth = c.desksPerSide * 2 * CLASSROOM.desk.width + c.aisle + CLASSROOM.sideMargin * 2
    if (rowsWidth > front + EPS) {
      ctx.addIssue({
        code: 'custom',
        path: [...path, 'desksPerSide'],
        message: `${c.desksPerSide} desks per side need ${rowsWidth} m across; the room is ${front} m`,
      })
    }
    const rowsDepth =
      CLASSROOM.firstRow +
      (c.rows - 1) * CLASSROOM.rowPitch +
      CLASSROOM.chairBehind +
      CLASSROOM.backMargin
    if (rowsDepth > deep + EPS) {
      ctx.addIssue({
        code: 'custom',
        path: [...path, 'rows'],
        message: `${c.rows} rows need ${rowsDepth.toFixed(2)} m of depth; the room is ${deep} m`,
      })
    }
    if (roomOpenings(room, c.front).length > 0) {
      ctx.addIssue({
        code: 'custom',
        path: [...path, 'front'],
        message: `the ${c.front} wall holds the board and screen; move its doors and windows`,
      })
    }
    m.exhibits.forEach((ex, ei) => {
      if (ex.roomId === room.id && ex.placement.wall === c.front) {
        ctx.addIssue({
          code: 'custom',
          path: ['exhibits', ei, 'placement', 'wall'],
          message: `exhibit "${ex.id}" is on the ${c.front} wall, which belongs to the board and screen`,
        })
      }
    })
  })

  const wall = m.posterWall
  if (wall) {
    const path = ['posterWall']
    const room = m.rooms.find((r) => r.id === wall.roomId)
    if (!room) {
      ctx.addIssue({
        code: 'custom',
        path: [...path, 'roomId'],
        message: `unknown room "${wall.roomId}"`,
      })
    } else {
      const len = wallLength(room, wall.wall)
      if (wall.from < -EPS || wall.to > len + EPS || wall.to - wall.from < wall.width) {
        ctx.addIssue({
          code: 'custom',
          path,
          message: `the poster run spans ${wall.from}..${wall.to} m of a ${len} m ${wall.wall} wall`,
        })
      }
      const height = wall.width / wall.aspect
      for (const [ri, centre] of wall.rows.entries()) {
        if (centre - height / 2 < BASEBOARD_CLEARANCE || centre + height / 2 > room.height - EPS) {
          ctx.addIssue({
            code: 'custom',
            path: [...path, 'rows', ri],
            message: `row at ${centre} m does not fit a ${height.toFixed(2)} m poster in a ${room.height} m room`,
          })
        }
      }
      const run: Interval = [wall.from, wall.to]
      for (const opening of roomOpenings(room, wall.wall)) {
        const o: Interval = [opening.offset - opening.width / 2, opening.offset + opening.width / 2]
        if (overlaps(run, o)) {
          ctx.addIssue({
            code: 'custom',
            path,
            message: `the poster run crosses an opening at ${opening.offset} m on the ${wall.wall} wall`,
          })
        }
      }
      const total = wall.atlases.reduce((n, a) => n + a.count, 0)
      const perRow = Math.ceil(total / wall.rows.length)
      const needed = perRow * wall.width
      if (needed > wall.to - wall.from + EPS) {
        ctx.addIssue({
          code: 'custom',
          path,
          message: `${total} posters over ${wall.rows.length} rows need ${needed.toFixed(2)} m; the run is ${(wall.to - wall.from).toFixed(2)} m`,
        })
      }
      wall.atlases.forEach((atlas, ai) => {
        if (atlas.count > atlas.columns * atlas.rows) {
          ctx.addIssue({
            code: 'custom',
            path: [...path, 'atlases', ai, 'count'],
            message: `${atlas.count} posters do not fit a ${atlas.columns} × ${atlas.rows} atlas`,
          })
        }
      })
    }
  }

  const sectionIds = m.lesson.sections.map((s) => s.id)
  m.lesson.sections.forEach((s, si) => {
    if (sectionIds.indexOf(s.id) !== si) {
      ctx.addIssue({
        code: 'custom',
        path: ['lesson', 'sections', si, 'id'],
        message: `duplicate section id "${s.id}"`,
      })
    }
  })
  let lastSection = -1
  m.lesson.steps.forEach((step, si) => {
    const path = ['lesson', 'steps', si]
    if (ids.has(step.id)) {
      ctx.addIssue({ code: 'custom', path: [...path, 'id'], message: `duplicate id "${step.id}"` })
    }
    ids.add(step.id)
    if (step.type === 'text' && step.body.tr.length > BOARD_NOTE_MAX_CHARS) {
      ctx.addIssue({
        code: 'custom',
        path: [...path, 'body'],
        message: `board notes fit two lines at 5 m: keep body.tr ≤ ${BOARD_NOTE_MAX_CHARS} characters`,
      })
    }
    const at = sectionIds.indexOf(step.section)
    if (at < 0) {
      ctx.addIssue({
        code: 'custom',
        path: [...path, 'section'],
        message: `unknown section "${step.section}"`,
      })
      return
    }
    // A section is taught in one go: steps may not jump back to an earlier section.
    if (at < lastSection) {
      ctx.addIssue({
        code: 'custom',
        path: [...path, 'section'],
        message: `step "${step.id}" returns to section "${step.section}" after a later one`,
      })
    }
    lastSection = Math.max(lastSection, at)
  })
  const classrooms = m.rooms.filter((r) => r.classroom).length
  if (m.lesson.steps.length > 0 && classrooms !== 1) {
    ctx.addIssue({
      code: 'custom',
      path: ['lesson'],
      message: `a lesson needs exactly one classroom room, found ${classrooms}`,
    })
  }
})

export type Museum = z.infer<typeof MuseumSchema>
