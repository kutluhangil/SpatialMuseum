import { Text } from '@react-three/drei'
import type { ExhibitDef } from '../schema/museum'
import { palette } from '../design/tokens'
import { useCardGeometry } from './useCardGeometry'
import { useBlockHeight } from './useBlockHeight'
import { EXHIBIT_VIEW_DISTANCE, fontUrls, textSizes } from '../design/typography'

type TextExhibit = Extract<ExhibitDef, { type: 'text' }>

const PAD = 0.1

export function TextPanel({
  exhibit,
  withText = true,
}: {
  exhibit: TextExhibit
  withText?: boolean
}) {
  const width = exhibit.placement.width
  const height = width / exhibit.aspect
  const size = textSizes(EXHIBIT_VIEW_DISTANCE)
  const body = exhibit.fontSize ?? size.body
  const inner = width - PAD * 2
  // Titles may wrap; the body starts under the title's measured height, not an assumed one line.
  const [titleH, onTitleSync] = useBlockHeight()
  const card = useCardGeometry(
    { cx: 0, cy: 0, w: width, h: height },
    { cx: -width / 2 + PAD + 0.12, cy: height / 2 - PAD * 0.6, w: 0.24, h: 0.015 },
  )
  return (
    <group>
      {/* Accent rule: the one place kolostrum appears on a panel, never as text colour. */}
      <mesh geometry={card} position-z={-0.003}>
        <meshBasicMaterial vertexColors />
      </mesh>
      {withText && (
        <group
          position={[-width / 2 + PAD, height / 2 - PAD, 0]}
          visible={!exhibit.title || titleH > 0}
        >
          {exhibit.title && (
            <Text
              font={fontUrls.bold}
              fontSize={size.title}
              color={palette.murekkep}
              anchorX="left"
              anchorY="top"
              maxWidth={inner}
              onSync={onTitleSync}
            >
              {exhibit.title.tr}
            </Text>
          )}
          <Text
            font={fontUrls.regular}
            fontSize={body}
            lineHeight={1.35}
            color={palette.murekkep}
            anchorX="left"
            anchorY="top"
            position-y={exhibit.title ? -titleH - size.title * 0.4 : 0}
            maxWidth={inner}
          >
            {exhibit.body.tr}
          </Text>
        </group>
      )}
    </group>
  )
}
