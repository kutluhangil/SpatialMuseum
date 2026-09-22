import { useEffect, useMemo } from 'react'
import { BufferGeometry, Color, Float32BufferAttribute } from 'three'
import { palette } from '../design/tokens'

type Rect = { cx: number; cy: number; w: number; h: number }

/**
 * A card background plus its kolostrum accent rule as one vertex-coloured geometry: one draw
 * call instead of two for every placard and panel (in VR every draw call is paid per eye).
 */
export function useCardGeometry(card: Rect, rule: Rect): BufferGeometry {
  const { cx, cy, w, h } = card
  const { cx: rx, cy: ry, w: rw, h: rh } = rule
  const geometry = useMemo(() => {
    const bg = new Color(palette.onsut)
    const accent = new Color(palette.kolostrum)
    const quad = (q: Rect, z: number) => [
      q.cx - q.w / 2,
      q.cy - q.h / 2,
      z,
      q.cx + q.w / 2,
      q.cy - q.h / 2,
      z,
      q.cx + q.w / 2,
      q.cy + q.h / 2,
      z,
      q.cx - q.w / 2,
      q.cy + q.h / 2,
      z,
    ]
    const g = new BufferGeometry()
    // The rule sits 1 mm in front of the card so it never z-fights with it.
    g.setAttribute(
      'position',
      new Float32BufferAttribute(
        [...quad({ cx, cy, w, h }, 0), ...quad({ cx: rx, cy: ry, w: rw, h: rh }, 0.001)],
        3,
      ),
    )
    g.setAttribute(
      'color',
      new Float32BufferAttribute(
        [
          ...Array(4).fill([bg.r, bg.g, bg.b]).flat(),
          ...Array(4).fill([accent.r, accent.g, accent.b]).flat(),
        ],
        3,
      ),
    )
    g.setIndex([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7])
    return g
  }, [cx, cy, w, h, rx, ry, rw, rh])
  useEffect(() => () => geometry.dispose(), [geometry])
  return geometry
}
