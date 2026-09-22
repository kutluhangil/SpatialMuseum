import { describe, expect, it } from 'vitest'
import { MuseumSchema } from '../src/schema/museum'
import { roomSegments } from '../src/locomotion/collision'

type Json = Record<string, unknown>

const museum = (roomA: Json = {}, exhibits: Json[] = []) => ({
  version: 2,
  title: { tr: 'T' },
  spawn: { roomId: 'a', position: [0, 0, 0], yaw: 0 },
  rooms: [
    {
      id: 'a',
      name: { tr: 'A' },
      rect: { x: 0, z: 0, width: 8, depth: 6 },
      doors: [{ wall: 'north', offset: 4, width: 1.6, to: 'b' }],
      ...roomA,
    },
    {
      id: 'b',
      name: { tr: 'B' },
      rect: { x: 0, z: -10, width: 8, depth: 10 },
      doors: [{ wall: 'south', offset: 4, width: 1.6, to: 'a' }],
    },
  ],
  exhibits,
})

function messages(input: unknown): string[] {
  const r = MuseumSchema.safeParse(input)
  return r.success ? [] : r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`)
}

describe('windows', () => {
  it('accepts a window on an exterior wall and fills defaults', () => {
    const m = MuseumSchema.parse(museum({ windows: [{ wall: 'south', offset: 2 }] }))
    expect(m.rooms[0]?.windows[0]).toEqual({
      wall: 'south',
      offset: 2,
      width: 1.4,
      sill: 1,
      height: 1.8,
    })
  })

  it('rejects a window that would look into the neighbouring room', () => {
    expect(messages(museum({ windows: [{ wall: 'north', offset: 1.5 }] }))).toEqual([
      'rooms.0.windows.0: window on the north wall of "a" would look into room "b"',
    ])
  })

  it('rejects a window overlapping a door and one too tall for the room', () => {
    const msgs = messages(museum({ height: 3, windows: [{ wall: 'north', offset: 4.5 }] }))
    expect(msgs).toContain('rooms.0.windows.0: overlaps another opening on the north wall of "a"')
    expect(msgs.some((m) => m.startsWith('rooms.0.windows.0.height: window top 2.8 m'))).toBe(true)
  })

  it('rejects an exhibit hung over a window', () => {
    const msgs = messages(
      museum({ windows: [{ wall: 'south', offset: 2 }] }, [
        {
          id: 't',
          type: 'text',
          roomId: 'a',
          variant: 'fact',
          body: { tr: 'x' },
          placement: { wall: 'south', u: 2, v: 1.8, width: 1 },
        },
      ]),
    )
    expect(msgs).toEqual(['exhibits.0.placement: exhibit covers window 0 on the south wall of "a"'])
  })

  it('the wall under a window still blocks walking', () => {
    const room = MuseumSchema.parse(museum({ windows: [{ wall: 'south', offset: 2 }] })).rooms[0]
    if (!room) throw new Error('fixture has no room')
    // south wall: pier, sill wall under the window, pier → all block; north: two piers either side of the door
    expect(roomSegments(room).filter((s) => s.az === 6 && s.bz === 6)).toHaveLength(3)
  })
})
