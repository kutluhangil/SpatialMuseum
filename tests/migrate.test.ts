import { describe, expect, it } from 'vitest'
import { migrateMuseum } from '../src/schema/migrate'
import { MuseumSchema } from '../src/schema/museum'

const v1 = {
  version: 1,
  title: { tr: 'T' },
  spawn: { roomId: 'a', position: [0, 0, 0], yaw: 0 },
  rooms: [
    {
      id: 'a',
      name: { tr: 'A' },
      rect: { x: 0, z: 0, width: 8, depth: 6 },
      wallTone: 'adacayi',
      mood: 'night',
      decor: { plants: false },
    },
  ],
  exhibits: [
    {
      id: 'p',
      type: 'image',
      roomId: 'a',
      src: 'artworks/x.ktx2',
      aspect: 1,
      frame: 'gilt',
      tourStop: 1,
      placement: { wall: 'north', u: 4, v: 1.6, width: 1 },
    },
  ],
}

describe('migrateMuseum', () => {
  it('turns a v1 museum into a valid v2 one', () => {
    const m = MuseumSchema.parse(migrateMuseum(v1))
    expect(m.version).toBe(2)
    expect(m.rooms[0]?.wallTone).toBe('kirikBeyaz')
    expect(m.exhibits[0]).toMatchObject({ frame: 'wood' })
    expect(m.exhibits[0]).not.toHaveProperty('tourStop')
    expect(m.lesson).toEqual({ sections: [], steps: [] })
  })

  it('leaves a v2 museum untouched', () => {
    const v2 = migrateMuseum(v1)
    expect(migrateMuseum(v2)).toBe(v2)
  })

  it('refuses versions it does not know', () => {
    expect(() => migrateMuseum({ version: 7 })).toThrow('unsupported museum.json version 7')
    expect(() => migrateMuseum('x')).toThrow('museum.json must be a JSON object')
  })
})
