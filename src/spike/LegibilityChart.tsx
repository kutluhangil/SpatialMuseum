import { Text } from '@react-three/drei'
import { palette } from '../design/tokens'
import { fontUrls, heightForDmm } from '../design/typography'

const VIEW_DISTANCE = 2
const SIZES_DMM = [30, 40, 50, 70] as const
const SAMPLE = 'Emzirme ĞÜŞİÖÇ ğüşıöç'

/**
 * Faz 0 calibration board: one line per dmm size, sized for a viewer standing VIEW_DISTANCE
 * metres away. fontSize is troika's em height, which is what the dmm rules in typography.ts mean.
 */
export function LegibilityChart() {
  const lineGap = 0.06
  const rows = SIZES_DMM.map((d) => ({ dmm: d, h: heightForDmm(d, VIEW_DISTANCE) }))
  const total = rows.reduce((a, r) => a + r.h * 1.2 + lineGap, 0)
  // Row centres, stacked top-down from the board's upper edge.
  const ys = rows.map((r, i) => {
    const above = rows.slice(0, i).reduce((a, p) => a + p.h * 1.2 + lineGap, 0)
    return total / 2 - above - (r.h * 1.2) / 2
  })
  return (
    <group>
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[2.6, total + 0.2]} />
        <meshBasicMaterial color={palette.onsut} />
      </mesh>
      {rows.map((r, i) => (
        <Text
          key={r.dmm}
          font={fontUrls.regular}
          fontSize={r.h}
          color={palette.murekkep}
          anchorX="left"
          anchorY="middle"
          position={[-1.2, ys[i] ?? 0, 0]}
          maxWidth={2.4}
        >
          {`${r.dmm} dmm — ${SAMPLE}`}
        </Text>
      ))}
    </group>
  )
}
