import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { Color, Vector3 } from 'three'
import { MuseumSchema, exhibitHeight } from '../src/schema/museum'
import { migrateMuseum } from '../src/schema/migrate'
import { CLASSROOM_LIGHT } from '../src/design/light'
import { FRAME_PROFILE, VIDEO_MAT, frameBorder, mouldingOf } from '../src/exhibits/frameSpec'
import {
  buildExhibitFrames,
  buildExhibitGlass,
  buildExhibitMats,
  buildPictureWashes,
  finishU,
  loftFrame,
} from '../src/exhibits/frames'
import { buildSunFloor, buildSunShafts, sunDirection, sunOpenings } from '../src/scene/sun'
import { wallFrame } from '../src/scene/wallFrame'

const museum = MuseumSchema.parse(
  migrateMuseum(JSON.parse(readFileSync('content/museum.json', 'utf8'))),
)
const room = museum.rooms[0]
if (!room) throw new Error('content/museum.json has no room')
const exhibits = museum.exhibits.filter((e) => e.roomId === room.id)
const videos = exhibits.filter((e) => e.type === 'video')

describe('gallery framing', () => {
  it('hangs every screen in gilt behind a mat, and paintings in their own moulding', () => {
    for (const v of videos) {
      expect(mouldingOf(v)).toBe('gilt')
      expect(frameBorder(v)).toBeCloseTo(FRAME_PROFILE.gilt + VIDEO_MAT)
    }
    for (const e of exhibits.filter((x) => x.type === 'image')) {
      expect(frameBorder(e)).toBe(
        e.frame === 'wood' || e.frame === 'black' ? FRAME_PROFILE[e.frame] : 0,
      )
    }
  })

  it('lofts a moulding whose crest faces the viewer and whose outer drop faces outward', () => {
    const profile = [
      [0, 0, 1],
      [0.02, 0.03, 1],
      [0.04, 0.03, 1],
      [0.04, 0, 1],
    ] as const
    const g = loftFrame(1, 2, profile, new Color(1, 1, 1), 'gilt')
    const pos = g.getAttribute('position')
    const nrm = g.getAttribute('normal')
    // Four sides, three facets each, two triangles per facet.
    expect(pos.count).toBe(4 * 3 * 6)
    for (let i = 0; i < pos.count; i++) {
      const p = new Vector3().fromBufferAttribute(pos, i)
      const n = new Vector3().fromBufferAttribute(nrm, i)
      expect(n.length()).toBeCloseTo(1)
      // Never facing into the wall.
      expect(n.z).toBeGreaterThan(-1e-6)
      // On the outer drop (s = 0.04, below the crest) the normal points away from the picture.
      if (
        p.z < 0.029 &&
        (Math.abs(Math.abs(p.x) - 0.54) < 1e-6 || Math.abs(Math.abs(p.y) - 1.04) < 1e-6)
      ) {
        expect(n.x * p.x + n.y * p.y).toBeGreaterThan(0)
      }
    }
    expect(g.getAttribute('uv').getX(0)).toBeCloseTo(finishU('gilt'))
  })

  it('merges frames, mats, glass and light pools into one mesh each for the room', () => {
    const framed = exhibits.filter((e) => mouldingOf(e))
    const frames = buildExhibitFrames(room, exhibits)
    const mats = buildExhibitMats(room, exhibits, CLASSROOM_LIGHT)
    const glass = buildExhibitGlass(room, exhibits)
    const washes = buildPictureWashes(room, exhibits)
    expect(frames).not.toBeNull()
    // One light pool (two triangles) per framed exhibit; glazing only over the screens.
    expect(washes?.getAttribute('position').count).toBe(framed.length * 6)
    expect(glass?.getAttribute('position').count).toBe(videos.length * 6)
    expect(mats?.getAttribute('position').count).toBeGreaterThan(0)
  })

  it("keeps each screen's glazing inside its moulding and in front of the wall", () => {
    const glass = buildExhibitGlass(room, videos)
    glass?.computeBoundingBox()
    const box = glass?.boundingBox
    if (!box) throw new Error('no glazing was built')
    const v = videos[0]
    if (!v) throw new Error('no video exhibit')
    const f = wallFrame(room, v.placement.wall)
    // Every screen hangs on the east wall; the glass stands just proud of it, into the room.
    expect(f.normal[0]).toBe(-1)
    expect(box.max.x).toBeLessThan(room.rect.x + room.rect.width)
    expect(box.min.y).toBeGreaterThan(v.placement.v - exhibitHeight(v) / 2 - VIDEO_MAT - 1e-6)
  })
})

describe('the sun', () => {
  const sun = sunDirection(room)
  if (!sun) throw new Error('the classroom has no windows')

  it('comes down through the window wall into the room', () => {
    const wall = room.windows[0]?.wall
    if (!wall) throw new Error('no window')
    const f = wallFrame(room, wall)
    expect(sun.length()).toBeCloseTo(1)
    expect(sun.y).toBeLessThan(0)
    expect(sun.x * f.normal[0] + sun.z * f.normal[2]).toBeGreaterThan(0)
  })

  it("lays each window's beam on the floor inside the room, and shortens it under a blind", () => {
    const floor = buildSunFloor(room)
    floor?.computeBoundingBox()
    const box = floor?.boundingBox
    if (!box) throw new Error('no sun on the floor')
    expect(box.min.x).toBeGreaterThan(room.rect.x)
    expect(box.max.y).toBeLessThan(0.01)
    const half = sunOpenings(
      room,
      room.windows.map(() => 0.5),
    )
    const full = sunOpenings(room)
    half.forEach((o, i) => expect(o.v1).toBeLessThan(full[i]?.v1 ?? 0))
  })

  it('hangs a shaft of four faces from every open window', () => {
    const shafts = buildSunShafts(room)
    expect(shafts?.getAttribute('position').count).toBe(room.windows.length * 4 * 6)
    const closed = buildSunShafts(
      room,
      room.windows.map(() => 1),
    )
    expect(closed).toBeNull()
  })
})
