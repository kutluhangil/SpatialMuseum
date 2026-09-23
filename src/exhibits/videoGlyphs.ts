import { BufferGeometry, Float32BufferAttribute, Path, Shape, ShapeGeometry } from 'three'

/** One rectangle's corners appended to a flat quad soup, with its own two triangles. */
function pushRect(pos: number[], idx: number[], cx: number, w: number, h: number): void {
  const base = pos.length / 3
  const x0 = cx - w / 2
  const x1 = cx + w / 2
  pos.push(x0, -h / 2, 0, x1, -h / 2, 0, x1, h / 2, 0, x0, h / 2, 0)
  idx.push(base, base + 1, base + 2, base, base + 2, base + 3)
}

function flat(pos: number[], idx: number[]): BufferGeometry {
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(pos, 3))
  g.setAttribute(
    'normal',
    new Float32BufferAttribute(
      pos.map((_, i) => (i % 3 === 2 ? 1 : 0)),
      3,
    ),
  )
  g.setIndex(idx)
  return g
}

/**
 * The two bars of a pause mark, in one geometry: a player's controls are read at a glance from a
 * seat, and two separate meshes would cost a second draw call for the sake of one rectangle.
 */
export function pauseGlyph(size: number): BufferGeometry {
  const bar = size * 0.3
  const gap = size * 0.26
  const pos: number[] = []
  const idx: number[] = []
  pushRect(pos, idx, -(gap + bar) / 2, bar, size)
  pushRect(pos, idx, (gap + bar) / 2, bar, size)
  return flat(pos, idx)
}

/** A play mark: an equilateral triangle pointing right, sized to match `pauseGlyph`. */
export function playGlyph(size: number): BufferGeometry {
  const h = size
  // Slightly narrower than it is tall, and nudged right so it reads as centred in its own box.
  const w = size * 0.86
  const g = new BufferGeometry()
  g.setAttribute(
    'position',
    new Float32BufferAttribute([-w / 2, -h / 2, 0, w / 2, 0, 0, -w / 2, h / 2, 0], 3),
  )
  g.setAttribute('normal', new Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3))
  g.setIndex([0, 1, 2])
  return g
}

/** Seconds as m:ss, or a placeholder while the browser has not read the duration yet. */
export function clockText(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '--:--'
  const total = Math.floor(seconds)
  const mins = Math.floor(total / 60)
  return `${mins}:${String(total - mins * 60).padStart(2, '0')}`
}

/**
 * The "press me" badge over an unplayed screen: a dark disc with the play triangle cut out of it,
 * so the still shows through the triangle. One mesh, where a disc and a triangle would be two.
 */
export function playBadge(radius: number): ShapeGeometry {
  const disc = new Shape().absarc(0, 0, radius, 0, Math.PI * 2, false)
  const r = radius * 0.46
  // Shifted right by a sixth of its size, the triangle's mass sits on the disc's centre.
  const shift = r * 0.18
  const hole = new Path()
  hole.moveTo(r + shift, 0)
  hole.lineTo(-r / 2 + shift, (r * Math.sqrt(3)) / 2)
  hole.lineTo(-r / 2 + shift, (-r * Math.sqrt(3)) / 2)
  hole.closePath()
  disc.holes.push(hole)
  return new ShapeGeometry(disc, 48)
}
