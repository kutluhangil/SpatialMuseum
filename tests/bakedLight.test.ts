import { describe, expect, it } from 'vitest'
import { daylight } from '../src/scene/bakedLight'

const rect = { x: -4.8, z: -4, width: 9.6, depth: 8 }
const withWindows = { rect, windows: [{ wall: 'west' as const }] }

describe('daylight', () => {
  it('is neutral in a room without windows', () => {
    expect(daylight({ rect, windows: [] }, 0, 0)).toBe(1)
  })

  it('brightens the floor near the windows and dims the far side', () => {
    const near = daylight(withWindows, -4.3, 0)
    const far = daylight(withWindows, 4.3, 0)
    expect(near).toBeGreaterThan(1.03)
    expect(far).toBeLessThan(1)
  })

  it('keeps the window wall itself in its own shadow (backlit), below the facing wall', () => {
    const windowWall = daylight(withWindows, -4.8, 0, 'west')
    const facingWall = daylight(withWindows, 4.8, 0, 'east')
    const nearSideWall = daylight(withWindows, -4, -4, 'north')
    expect(windowWall).toBeLessThan(1)
    expect(nearSideWall).toBeGreaterThan(windowWall)
    expect(facingWall).toBeGreaterThan(windowWall)
  })
})
