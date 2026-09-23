import { Text } from '@react-three/drei'
import type { ExhibitDef } from '../schema/museum'
import { palette } from '../design/tokens'
import { useBilingual } from '../i18n/localeStore'
import { useCardGeometry } from './useCardGeometry'
import { useBlockHeight } from './useBlockHeight'
import { EXHIBIT_VIEW_DISTANCE, fontUrls, textSizes } from '../design/typography'

const PAD = 0.055
const GAP = 0.08
const RULE = { width: 0.14, height: 0.01 }
// A placard no narrower than this still fits a two-word title on a line.
const MIN_WIDTH = 1
// Mounted on a 12 mm board: thick enough to read as an object at arm's length.
const DEPTH = 0.012
const STANDOFF = 0.012

/**
 * Museum placard hung below an exhibit, as wide as its frame. The title is written in the
 * viewer's language and, under it, in the other one; the body (artist, date) reads the same in
 * both, so it is written once. The card grows with its text, so long titles wrap.
 */
export function Label({
  label,
  width: framedWidth,
  exhibitHeight,
}: {
  label: NonNullable<ExhibitDef['label']>
  /** Outer width of the exhibit with its frame. */
  width: number
  /** Outer height of the exhibit with its frame. */
  exhibitHeight: number
}) {
  const say = useBilingual()
  const title = say(label.title)
  const body = label.body ? say(label.body).primary : null
  const width = Math.max(framedWidth, MIN_WIDTH)
  const size = textSizes(EXHIBIT_VIEW_DISTANCE)
  const [titleH, onTitleSync] = useBlockHeight()
  const [otherH, onOtherSync] = useBlockHeight()
  const [bodyH, onBodySync] = useBlockHeight()
  const top = -exhibitHeight / 2 - GAP
  const inner = width - PAD * 2
  const titleY = -PAD - RULE.height * 3
  const otherGap = title.secondary ? size.body * 0.25 : 0
  const otherY = titleY - titleH - otherGap
  const bodyGap = body ? size.body * 0.6 : 0
  const bodyY = otherY - otherH - bodyGap
  const height = PAD * 2 + RULE.height * 3 + titleH + otherGap + otherH + bodyGap + bodyH
  const card = useCardGeometry(
    { cx: width / 2, cy: -height / 2, w: width, h: height },
    { cx: PAD + RULE.width / 2, cy: -PAD - RULE.height / 2, w: RULE.width, h: RULE.height },
    DEPTH,
  )
  const ready = titleH > 0 && (!title.secondary || otherH > 0) && (!body || bodyH > 0)
  return (
    // Stands 12 mm proud of the exhibit plane, so a placard hung over the chair rail covers it.
    <group position={[-width / 2, top, STANDOFF]} visible={ready}>
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
        position={[PAD, titleY, 0]}
        maxWidth={inner}
        onSync={onTitleSync}
      >
        {title.primary}
      </Text>
      {title.secondary && (
        <Text
          font={fontUrls.regular}
          fontSize={size.body}
          lineHeight={1.25}
          color={palette.murekkep}
          anchorX="left"
          anchorY="top"
          position={[PAD, otherY, 0]}
          maxWidth={inner}
          onSync={onOtherSync}
        >
          {title.secondary}
        </Text>
      )}
      {body && (
        <Text
          font={fontUrls.regular}
          fontSize={size.body}
          lineHeight={1.3}
          color={palette.murekkep}
          anchorX="left"
          anchorY="top"
          position={[PAD, bodyY, 0]}
          maxWidth={inner}
          onSync={onBodySync}
        >
          {body}
        </Text>
      )}
    </group>
  )
}
