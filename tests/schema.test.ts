import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { MuseumSchema } from '../src/schema/museum'
import { migrateMuseum } from '../src/schema/migrate'
import { loadedRoomIds, roomAt } from '../src/store/museumStore'

const base = () => ({
  version: 2,
  title: { tr: 'Test' },
  spawn: { roomId: 'a', position: [0, 0, 0], yaw: 0 },
  rooms: [
    {
      id: 'a',
      name: { tr: 'A' },
      rect: { x: 0, z: 0, width: 8, depth: 6 },
      doors: [{ wall: 'north', offset: 4, width: 1.6, to: 'b' }],
    },
    {
      id: 'b',
      name: { tr: 'B' },
      rect: { x: 0, z: -10, width: 8, depth: 10 },
      doors: [{ wall: 'south', offset: 4, width: 1.6, to: 'a' }],
    },
  ],
  exhibits: [] as unknown[],
})

const text = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  type: 'text',
  roomId: 'a',
  variant: 'fact',
  body: { tr: 'Metin' },
  placement: { wall: 'east', u: 2, v: 1.5, width: 1.2 },
  ...over,
})

function at<T>(xs: T[], i: number): T {
  const x = xs[i]
  if (x === undefined) throw new Error(`fixture has no index ${i}`)
  return x
}

function messages(input: unknown): string[] {
  const r = MuseumSchema.safeParse(input)
  return r.success ? [] : r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`)
}

describe('MuseumSchema', () => {
  it('accepts the real content/museum.json', () => {
    const raw: unknown = JSON.parse(readFileSync('content/museum.json', 'utf8'))
    expect(messages(migrateMuseum(raw))).toEqual([])
  })

  it('references only KTX2 paintings in content/museum.json (ImageExhibit refuses anything else)', () => {
    const m = MuseumSchema.parse(
      migrateMuseum(JSON.parse(readFileSync('content/museum.json', 'utf8'))),
    )
    const images = m.exhibits.filter((e) => e.type === 'image')
    expect(images.length).toBeGreaterThan(0)
    expect(images.filter((e) => !e.src.endsWith('.ktx2')).map((e) => e.src)).toEqual([])
  })

  it('accepts a minimal valid museum and fills defaults', () => {
    const m = MuseumSchema.parse({ ...base(), exhibits: [text('t1')] })
    expect(m.rooms[0]?.height).toBe(3.2)
    expect(m.rooms[0]?.wallTone).toBe('kirikBeyaz')
    const t = m.exhibits[0]
    expect(t?.type === 'text' && t.aspect).toBeCloseTo(4 / 3)
  })

  it('rejects an exhibit in an unknown room', () => {
    expect(messages({ ...base(), exhibits: [text('t1', { roomId: 'nope' })] })).toEqual([
      'exhibits.0.roomId: unknown room "nope"',
    ])
  })

  it('rejects a door to an unknown room', () => {
    const m = base()
    at(at(m.rooms, 0).doors, 0).to = 'nope'
    expect(messages(m)).toContain('rooms.0.doors.0.to: unknown room "nope"')
  })

  it('rejects a door that runs past the wall end', () => {
    const m = base()
    at(at(m.rooms, 0).doors, 0).offset = 7.5
    expect(messages(m).join('\n')).toMatch(/rooms\.0\.doors\.0\.offset: door spans 6\.7\.\.8\.3 m/)
  })

  it('rejects overlapping exhibits on the same wall', () => {
    const msgs = messages({
      ...base(),
      exhibits: [
        text('t1'),
        text('t2', { placement: { wall: 'east', u: 2.5, v: 1.5, width: 1.2 } }),
      ],
    })
    expect(msgs).toEqual(['exhibits.0.placement: overlaps exhibit "t2" on the east wall of "a"'])
  })

  it('allows exhibits at the same u on different walls', () => {
    const msgs = messages({
      ...base(),
      exhibits: [text('t1'), text('t2', { placement: { wall: 'west', u: 2, v: 1.5, width: 1.2 } })],
    })
    expect(msgs).toEqual([])
  })

  it('rejects an exhibit that reaches into a door opening', () => {
    const msgs = messages({
      ...base(),
      exhibits: [text('t1', { placement: { wall: 'north', u: 4, v: 1.5, width: 1 } })],
    })
    expect(msgs).toEqual([
      'exhibits.0.placement: exhibit reaches into the opening of door 0 on the north wall of "a"',
    ])
  })

  it('allows an exhibit above a door head', () => {
    const msgs = messages({
      ...base(),
      exhibits: [text('t1', { placement: { wall: 'north', u: 4, v: 2.8, width: 0.8 } })],
    })
    expect(msgs).toEqual([])
  })

  it('rejects an exhibit that sticks out of its wall', () => {
    const msgs = messages({
      ...base(),
      exhibits: [text('t1', { placement: { wall: 'east', u: 5.8, v: 1.5, width: 1 } })],
    })
    expect(msgs).toHaveLength(1)
    expect(msgs[0]).toMatch(/^exhibits\.0\.placement: exhibit spans u 5\.30\.\.6\.30/)
  })

  it('rejects an unknown spawn room and duplicate ids', () => {
    const m = base()
    m.spawn.roomId = 'nope'
    at(m.rooms, 1).id = 'a'
    const msgs = messages(m)
    expect(msgs).toContain('spawn.roomId: unknown room "nope"')
    expect(msgs).toContain('rooms.1.id: duplicate room id "a"')
  })
})

describe('room lookup', () => {
  const m = MuseumSchema.parse(base())

  it('finds the room under a point', () => {
    expect(roomAt(m, 4, 3)?.id).toBe('a')
    expect(roomAt(m, 4, -5)?.id).toBe('b')
    expect(roomAt(m, 40, 3)).toBeUndefined()
  })

  it('loads the current room and its door neighbours only', () => {
    const three = MuseumSchema.parse({
      ...base(),
      rooms: [
        ...base().rooms,
        { id: 'c', name: { tr: 'C' }, rect: { x: 0, z: -20, width: 8, depth: 10 }, doors: [] },
      ],
    })
    expect([...loadedRoomIds(three, 'a')].sort()).toEqual(['a', 'b'])
    expect([...loadedRoomIds(three, 'c')]).toEqual(['c'])
  })

  it('loads rooms two doors away by default, one hop on request', () => {
    // a chain a - b - c - d
    const chain = MuseumSchema.parse({
      ...base(),
      rooms: [
        {
          id: 'a',
          name: { tr: 'A' },
          rect: { x: 0, z: 0, width: 8, depth: 6 },
          doors: [{ wall: 'north', offset: 4, to: 'b' }],
        },
        {
          id: 'b',
          name: { tr: 'B' },
          rect: { x: 0, z: -10, width: 8, depth: 10 },
          doors: [{ wall: 'north', offset: 4, to: 'c' }],
        },
        {
          id: 'c',
          name: { tr: 'C' },
          rect: { x: 0, z: -20, width: 8, depth: 10 },
          doors: [{ wall: 'north', offset: 4, to: 'd' }],
        },
        { id: 'd', name: { tr: 'D' }, rect: { x: 0, z: -30, width: 8, depth: 10 }, doors: [] },
      ],
    })
    expect([...loadedRoomIds(chain, 'a')].sort()).toEqual(['a', 'b', 'c'])
    expect([...loadedRoomIds(chain, 'a', 1)].sort()).toEqual(['a', 'b'])
    expect([...loadedRoomIds(chain, 'd')].sort()).toEqual(['b', 'c', 'd'])
  })
})

describe('classroom and lesson rules', () => {
  const classroomMuseum = (over: Record<string, unknown> = {}, lesson?: unknown) => ({
    version: 2,
    title: { tr: 'T' },
    spawn: { roomId: 'c', position: [0, 0, 0], yaw: 0 },
    rooms: [
      {
        id: 'c',
        name: { tr: 'C' },
        rect: { x: 0, z: 0, width: 10.6, depth: 8 },
        classroom: { front: 'north' },
        ...over,
      },
    ],
    exhibits: [],
    lesson: lesson ?? {
      sections: [{ id: 's', title: { tr: 'S' } }],
      steps: [{ id: 'x', section: 's', type: 'text', body: { tr: 'b' } }],
    },
  })

  it('accepts the reference classroom', () => {
    expect(messages(classroomMuseum())).toEqual([])
  })

  it('rejects a front wall too short for board and screen', () => {
    expect(messages(classroomMuseum({ rect: { x: 0, z: 0, width: 8, depth: 8 } }))).toContain(
      'rooms.0.classroom.front: the north wall is 8 m; board and screen need 10.6 m',
    )
  })

  it('rejects more rows than the room is deep', () => {
    const msgs = messages(classroomMuseum({ classroom: { front: 'north', rows: 7 } }))
    expect(msgs).toContain('rooms.0.classroom.rows: 7 rows need 10.00 m of depth; the room is 8 m')
  })

  it('keeps the front wall free of openings', () => {
    const msgs = messages(classroomMuseum({ windows: [{ wall: 'north', offset: 2 }] }))
    expect(msgs).toContain(
      'rooms.0.classroom.front: the north wall holds the board and screen; move its doors and windows',
    )
  })

  it('rejects unknown and revisited sections', () => {
    const msgs = messages(
      classroomMuseum(
        {},
        {
          sections: [
            { id: 'a', title: { tr: 'A' } },
            { id: 'b', title: { tr: 'B' } },
          ],
          steps: [
            { id: '1', section: 'a', type: 'text', body: { tr: 'x' } },
            { id: '2', section: 'b', type: 'text', body: { tr: 'x' } },
            { id: '3', section: 'a', type: 'text', body: { tr: 'x' } },
            { id: '4', section: 'z', type: 'text', body: { tr: 'x' } },
          ],
        },
      ),
    )
    expect(msgs).toEqual([
      'lesson.steps.2.section: step "3" returns to section "a" after a later one',
      'lesson.steps.3.section: unknown section "z"',
    ])
  })

  it('keeps board notes to two lines', () => {
    const msgs = messages(
      classroomMuseum(
        {},
        {
          sections: [{ id: 's', title: { tr: 'S' } }],
          steps: [
            { id: 'x', section: 's', type: 'text', body: { tr: 'a'.repeat(91), en: 'b' } },
            { id: 'y', section: 's', type: 'text', body: { tr: 'a', en: 'b'.repeat(91) } },
          ],
        },
      ),
    )
    // Both languages share the board, so each has to fit.
    expect(msgs).toEqual([
      'lesson.steps.0.body.tr: board notes fit two lines at 5 m: keep body.tr ≤ 90 characters',
      'lesson.steps.1.body.en: board notes fit two lines at 5 m: keep body.en ≤ 90 characters',
    ])
  })

  it('needs a classroom to hold a lesson', () => {
    expect(messages(classroomMuseum({ classroom: undefined }))).toEqual([
      'lesson: a lesson needs exactly one classroom room, found 0',
    ])
  })
})
