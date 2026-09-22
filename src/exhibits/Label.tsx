import { Text } from '@react-three/drei'
import type { ExhibitDef } from '../schema/museum'
import { palette } from '../design/tokens'
import { useText } from '../i18n/localeStore'
import { useCardGeometry } from './useCardGeometry'
import { useBlockHeight } from './useBlockHeight'
import { EXHIBIT_VIEW_DISTANCE, fontUrls, textSizes } from '../design/typography'

const PAD = 0.06
const GAP = 0.1
const RULE = 0.012
// Narrow paintings would squeeze a title into three lines; placards may run wider, centred under the work.
const MIN_WIDTH = 1.5

/**
 * Museum placard hung below an exhibit, centred under it. The card grows with its text, so
 * long titles wrap instead of spilling off the card.
 */
export function Label({
  label,
  width: exhibitWidth,
  exhibitHeight,
}: {
  label: NonNullable<ExhibitDef['label']>
  width: number
  exhibitHeight: number
}) {
  const t = useText()
  const width = Math.max(exhibitWidth, MIN_WIDTH)
  const size = textSizes(EXHIBIT_VIEW_DISTANCE)
  const [titleH, onTitleSync] = useBlockHeight()
  const [bodyH, onBodySync] = useBlockHeight()
  const top = -exhibitHeight / 2 - GAP
  const inner = width - PAD * 2
  const bodyGap = label.body ? size.body * 0.35 : 0
  const height = PAD * 2 + RULE * 3 + titleH + bodyGap + bodyH
  const card = useCardGeometry(
    { cx: width / 2, cy: -height / 2, w: width, h: height },
    { cx: PAD + 0.09, cy: -PAD - RULE / 2, w: 0.18, h: RULE },
  )
  return (
    <group position={[-width / 2, top, 0]} visible={titleH > 0}>
      <mesh geometry={card} position-z={-0.003}>
        <meshBasicMaterial vertexColors />
      </mesh>
      <Text
        font={fontUrls.bold}
        fontSize={size.title}
        lineHeight={1.1}
        color={palette.murekkep}
        anchorX="left"
        anchorY="top"
        position={[PAD, -PAD - RULE * 3, 0]}
        maxWidth={inner}
        onSync={onTitleSync}
      >
        {t(label.title)}
      </Text>
      {label.body && (
        <Text
          font={fontUrls.regular}
          fontSize={size.body}
          lineHeight={1.3}
          color={palette.murekkep}
          anchorX="left"
          anchorY="top"
          position={[PAD, -PAD - RULE * 3 - titleH - bodyGap, 0]}
          maxWidth={inner}
          onSync={onBodySync}
        >
          {t(label.body)}
        </Text>
      )}
    </group>
  )
}
