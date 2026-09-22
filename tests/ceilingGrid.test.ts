import { describe, expect, it } from 'vitest'
import { CEILING_TILE, ceilingGrid } from '../src/scene/ceilingGrid'

const rect = { x: -4.8, z: -3.75, width: 9.6, depth: 7.5 }

describe('ceilingGrid', () => {
  it('lays 60 cm tiles centred in the room, with cut tiles only at the walls', () => {
    const g = ceilingGrid(rect)
    expect(CEILING_TILE).toBe(0.6)
    const gaps = g.xs.slice(1).map((x, i) => x - (g.xs[i] ?? 0))
    expect(gaps.slice(1, -1).every((d) => Math.abs(d - 0.6) < 1e-9)).toBe(true)
    expect(g.xs[0]).toBe(-4.8)
    expect(g.xs.at(-1)).toBe(4.8)
    expect(g.zs[0]).toBe(-3.75)
    expect(g.zs.at(-1)).toBe(3.75)
  })

  it('places LED panels on whole tiles, at least one tile from every wall', () => {
    const g = ceilingGrid(rect)
    expect(g.panels.length).toBeGreaterThanOrEqual(8)
    for (const p of g.panels) {
      expect(p.x - 0.3).toBeGreaterThanOrEqual(rect.x + 0.6 - 1e-9)
      expect(p.x + 0.3).toBeLessThanOrEqual(rect.x + rect.width - 0.6 + 1e-9)
      expect(p.z - 0.3).toBeGreaterThanOrEqual(rect.z + 0.6 - 1e-9)
      expect(p.z + 0.3).toBeLessThanOrEqual(rect.z + rect.depth - 0.6 + 1e-9)
      expect(g.xs.some((x) => Math.abs(x - (p.x - 0.3)) < 1e-9)).toBe(true)
      expect(g.zs.some((z) => Math.abs(z - (p.z - 0.3)) < 1e-9)).toBe(true)
    }
  })
})
