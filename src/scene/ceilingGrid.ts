/** Standard suspended-ceiling tile (Armstrong-style 600 × 600 mm grid). */
export const CEILING_TILE = 0.6
// LED panels every third tile in both directions: a typical lecture room lighting density.
const PANEL_EVERY = 3

type Rect = { x: number; z: number; width: number; depth: number }

/** Grid lines along one axis: whole tiles centred in the span, cut tiles only against the walls. */
function lines(start: number, length: number): number[] {
  const whole = Math.floor(length / CEILING_TILE)
  const first = start + (length - whole * CEILING_TILE) / 2
  const out = [start]
  for (let i = 0; i <= whole; i++) out.push(first + i * CEILING_TILE)
  out.push(start + length)
  return [...new Set(out.map((v) => Number(v.toFixed(9))))].sort((a, b) => a - b)
}

export function ceilingGrid(rect: Rect) {
  const xs = lines(rect.x, rect.width)
  const zs = lines(rect.z, rect.depth)
  const panels: { x: number; z: number }[] = []
  // Whole tiles only (skip the cut edge tiles and one full tile next to each wall).
  const tiles = (ls: number[]) => ls.slice(1, -2).map((a, i) => [a, ls[i + 2] ?? a] as const)
  const xt = tiles(xs).filter(([a, b]) => Math.abs(b - a - CEILING_TILE) < 1e-9)
  const zt = tiles(zs).filter(([a, b]) => Math.abs(b - a - CEILING_TILE) < 1e-9)
  const pick = <T>(ts: readonly T[]) => {
    const offset = Math.floor(((ts.length - 1) % PANEL_EVERY) / 2)
    return ts.filter((_, i) => i >= 1 && i < ts.length - 1 && (i - offset) % PANEL_EVERY === 0)
  }
  for (const [x0] of pick(xt)) {
    for (const [z0] of pick(zt)) panels.push({ x: x0 + CEILING_TILE / 2, z: z0 + CEILING_TILE / 2 })
  }
  return { tile: CEILING_TILE, xs, zs, panels }
}
