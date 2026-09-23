import { useEffect, useMemo } from 'react'
import { BufferGeometry, Color, Float32BufferAttribute } from 'three'
import { palette } from '../design/tokens'

type Rect = { cx: number; cy: number; w: number; h: number }

// A card with thickness reads as a mounted placard: light falls from above (the ceiling, the
// picture lamp), so the top edge catches it, the bottom edge is in its own shadow, and the face
// fades a little towards the foot.
const EDGE_SHADE = { top: 0.93, bottom: 0.6, side: 0.78 }
const FACE_FOOT = 0.95

/**
 * A card background plus its kolostrum accent rule as one vertex-coloured geometry: one draw
 * call instead of two for every placard and panel (in VR every draw call is paid per eye).
 * With a `depth`, the card gets edges back towards the wall, shaded as lit from above.
 */
export function useCardGeometry(card: Rect, rule: Rect, depth = 0): BufferGeometry {
  const { cx, cy, w, h } = card
  const { cx: rx, cy: ry, w: rw, h: rh } = rule
  const geometry = useMemo(() => {
    const bg = new Color(palette.onsut)
    const accent = new Color(palette.kolostrum)
    const position: number[] = []
    const color: number[] = []
    const index: number[] = []
    // Corners in order around the quad; each carries its own colour.
    const quad = (corners: [number, number, number][], colours: Color[]) => {
      const base = position.length / 3
      corners.forEach((p, i) => {
        position.push(...p)
        const c = colours[i] ?? bg
        color.push(c.r, c.g, c.b)
      })
      index.push(base, base + 1, base + 2, base, base + 2, base + 3)
    }
    const x0 = cx - w / 2
    const x1 = cx + w / 2
    const y0 = cy - h / 2
    const y1 = cy + h / 2
    const foot = depth > 0 ? bg.clone().multiplyScalar(FACE_FOOT) : bg
    quad(
      [
        [x0, y0, 0],
        [x1, y0, 0],
        [x1, y1, 0],
        [x0, y1, 0],
      ],
      [foot, foot, bg, bg],
    )
    if (depth > 0) {
      const shade = (k: number) => {
        const c = bg.clone().multiplyScalar(k)
        return [c, c, c, c]
      }
      const d = -depth
      // Windings face outward from the card (front is +z).
      quad(
        [
          [x0, y1, 0],
          [x1, y1, 0],
          [x1, y1, d],
          [x0, y1, d],
        ],
        shade(EDGE_SHADE.top),
      )
      quad(
        [
          [x0, y0, d],
          [x1, y0, d],
          [x1, y0, 0],
          [x0, y0, 0],
        ],
        shade(EDGE_SHADE.bottom),
      )
      quad(
        [
          [x0, y0, d],
          [x0, y0, 0],
          [x0, y1, 0],
          [x0, y1, d],
        ],
        shade(EDGE_SHADE.side),
      )
      quad(
        [
          [x1, y0, 0],
          [x1, y0, d],
          [x1, y1, d],
          [x1, y1, 0],
        ],
        shade(EDGE_SHADE.side),
      )
    }
    // The rule sits 1 mm in front of the card so it never z-fights with it.
    quad(
      [
        [rx - rw / 2, ry - rh / 2, 0.001],
        [rx + rw / 2, ry - rh / 2, 0.001],
        [rx + rw / 2, ry + rh / 2, 0.001],
        [rx - rw / 2, ry + rh / 2, 0.001],
      ],
      [accent, accent, accent, accent],
    )
    const g = new BufferGeometry()
    g.setAttribute('position', new Float32BufferAttribute(position, 3))
    g.setAttribute('color', new Float32BufferAttribute(color, 3))
    g.setIndex(index)
    return g
  }, [cx, cy, w, h, rx, ry, rw, rh, depth])
  useEffect(() => () => geometry.dispose(), [geometry])
  return geometry
}
